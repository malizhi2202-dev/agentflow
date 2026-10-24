"""RSI 产物治理 API（R6/R7）— 记忆四层 / 提案 / 可改面 / 熔断。

门禁全部在 `services/rsi_service.py`（状态转换层）；本文件只做参数映射与 401/403：
- 记忆写入、提案创建、探针/影子记录：登录用户即可；
- **发布必须人类管理员**（`is_admin`），否则 403；
- 可改面判定失败 → 409（不是 400：语义是「当前治理状态不允许」）。
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from auth import is_admin, write_audit
from database import get_db
from models.rsi import RSI_CATEGORIES, Proposal, SurfaceManifest
from services import judge_adapter, l0_extractor, rsi_service as rsi, shadow_runner

router = APIRouter(prefix="/api/rsi", tags=["rsi"])


def _user(request: Request) -> dict:
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="未认证")
    return user


def _map(exc: Exception):
    # 本模块新增的三类业务错（runner / judge / 抽取）都映射 400：是"调用方给错了"，
    # 不是服务端 500；Gate 类仍是 409（治理状态不允许）。
    for err_type in (shadow_runner.RunnerError, judge_adapter.JudgeError,
                     l0_extractor.ExtractorError):
        if isinstance(exc, err_type):
            raise HTTPException(status_code=400, detail=str(exc))
    if isinstance(exc, rsi.GateError):
        raise HTTPException(status_code=409, detail=str(exc))
    if isinstance(exc, rsi.RsiError):
        raise HTTPException(status_code=400, detail=str(exc))
    raise exc


def _proposal(db: Session, proposal_id: int) -> Proposal:
    row = db.query(Proposal).filter(Proposal.id == proposal_id).first()
    if row is None:
        raise HTTPException(status_code=404, detail="提案不存在")
    return row


# ── 记忆 ──────────────────────────────────────────────────

@router.get("/memories")
def list_memories(request: Request, layer: str | None = Query(default=None),
                  status: str | None = Query(default=None),
                  db: Session = Depends(get_db)):
    _user(request)
    return {"memories": rsi.list_memories(db, layer=layer, status=status)}


@router.post("/memories")
def propose_memory(payload: dict, request: Request, db: Session = Depends(get_db)):
    user = _user(request)
    try:
        result = rsi.propose_memory(
            db, layer=payload.get("layer", "L1"), cue=payload.get("cue", ""),
            lesson=payload.get("lesson", ""), evidence=payload.get("evidence"),
            kind=payload.get("kind", "positive"), scope=payload.get("scope", "agent"),
            owner_id=user["id"], source_ref=payload.get("source_ref", ""),
            confounded=payload.get("confounded"),
            evidence_is_strong=bool(payload.get("evidence_is_strong", True)),
            source_seq=int(payload.get("source_seq", 0) or 0),
            cites_seq=int(payload.get("cites_seq", 0) or 0),
            reviewer=user["id"],
        )
    except Exception as e:  # noqa: BLE001
        _map(e)
    return result


@router.post("/memories/quarantine")
def quarantine(payload: dict, request: Request, db: Session = Depends(get_db)):
    _user(request)
    source_ref = (payload.get("source_ref") or "").strip()
    if not source_ref:
        raise HTTPException(status_code=400, detail="source_ref 不能为空")
    return {"ok": True, "quarantined": rsi.quarantine_source(db, source_ref)}


@router.get("/memories/decay")
def decay(days: int = Query(default=90, ge=1, le=3650),
          request: Request = None, db: Session = Depends(get_db)):
    _user(request)
    return {"candidates": rsi.decay_candidates(db, days=days)}


# ── 可改面 ────────────────────────────────────────────────

@router.get("/surfaces")
def list_surfaces(request: Request, db: Session = Depends(get_db)):
    _user(request)
    return {"surfaces": [s.to_dict() for s in db.query(SurfaceManifest).all()],
            "immutable_prefixes": list(rsi.IMMUTABLE_PREFIXES)}


@router.post("/surfaces")
def create_surface(payload: dict, request: Request, db: Session = Depends(get_db)):
    user = _user(request)
    if not is_admin(user):
        raise HTTPException(status_code=403, detail="只有管理员可以声明可改面")
    try:
        row = rsi.create_surface(db, payload.get("name", ""),
                                 payload.get("allow_edit") or [], user["id"])
    except Exception as e:  # noqa: BLE001
        _map(e)
    return {"ok": True, "surface": row.to_dict()}


# ── 自动化类目开关（R6-4）────────────────────────────────

@router.get("/switches")
def list_switches(request: Request, db: Session = Depends(get_db)):
    _user(request)
    return {"switches": rsi.switches(db), "categories": list(RSI_CATEGORIES)}


@router.post("/switches/{category}")
def set_switch(category: str, payload: dict, request: Request,
               db: Session = Depends(get_db)):
    user = _user(request)
    if not is_admin(user):
        raise HTTPException(status_code=403, detail="只有管理员可以暂停/恢复自动体")
    enabled = bool(payload.get("enabled", False))
    try:
        row = rsi.set_switch(db, category, enabled, user["id"])
    except Exception as e:  # noqa: BLE001
        _map(e)
    # 双入口校验：服务层已判一次类目合法性，这里再按白名单判一次（不假设前一处覆盖）
    if category not in RSI_CATEGORIES:
        raise HTTPException(status_code=400, detail="不是可开关的四类产物")
    write_audit(user, "rsi:switch", category, "rsi_switch",
                "自动体已暂停" if not row.enabled else "自动体已恢复",
                request=request)
    return {"ok": True, "switch": row.to_dict()}


# ── 晋升评审账（R7-4/R7-5）───────────────────────────────

@router.get("/reviews")
def list_reviews(memory_id: int | None = Query(default=None),
                 request: Request = None, db: Session = Depends(get_db)):
    _user(request)
    return {"reviews": rsi.list_reviews(db, memory_id=memory_id)}


@router.post("/proposals/{proposal_id}/shadow/run")
def run_shadow(proposal_id: int, payload: dict, request: Request,
               db: Session = Depends(get_db)):
    """影子重放 runner：用金标用例算 pass_rate，再走既有影子门（不新开门禁）。"""
    _user(request)
    try:
        cases = payload.get("cases") or []
        mode = (payload.get("judge") or "exact_match").strip()
        if mode == "llm":
            scorer = lambda cs: judge_adapter.judge_cases(cs)   # noqa: E731 — 真实 judge（需显式配置）
        elif mode == "exact_match":
            scorer = None
        else:
            raise HTTPException(status_code=400, detail="judge 只能是 exact_match 或 llm")
        result = shadow_runner.run_shadow(
            db, _proposal(db, proposal_id),
            cases=cases,
            judge_model=payload.get("judge_model", ""),
            golden_set_frozen=bool(payload.get("golden_set_frozen", False)),
            cross_vendor=bool(payload.get("cross_vendor", False)),
            baseline=float(payload.get("baseline", 0.0) or 0.0),
            scorer=scorer, judge_kind=mode if mode == "llm" else "exact_match",
        )
    except Exception as e:  # noqa: BLE001
        _map(e)
    return {"ok": True, **result}


# ── L0 → L1 抽取（默认 dry_run）──────────────────────────

@router.post("/l0/extract")
def l0_extract(payload: dict, request: Request, db: Session = Depends(get_db)):
    user = _user(request)
    conversation_id = int(payload.get("conversation_id") or 0)
    if not conversation_id:
        raise HTTPException(status_code=400, detail="conversation_id 必填")
    from models.conversation import Conversation

    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if conv is None or (conv.owner_id != user["id"] and not is_admin(user)):
        # 越权与不存在统一 404（不给探测面）
        raise HTTPException(status_code=404, detail="会话不存在")
    try:
        result = l0_extractor.extract(
            db, conv, extractor=None,        # 端点上永远 dry_run：真实抽取需服务层注入适配器
            limit=int(payload.get("limit", 50) or 50),
        )
    except Exception as e:  # noqa: BLE001
        _map(e)
    return {"ok": True, **result}


# ── 提案（三权分离）───────────────────────────────────────

@router.get("/proposals")
def list_proposals(request: Request, status: str | None = Query(default=None),
                   db: Session = Depends(get_db)):
    _user(request)
    return {"proposals": rsi.list_proposals(db, status=status)}


@router.post("/proposals")
def create_proposal(payload: dict, request: Request, db: Session = Depends(get_db)):
    _user(request)
    try:
        row = rsi.create_proposal(
            db, title=payload.get("title", ""),
            dimension=payload.get("dimension", "invariant"),
            surface_name=payload.get("surface_name", ""),
            target=payload.get("target", ""),
            budget_steps=int(payload.get("budget_steps", 10)),
            budget_tokens=int(payload.get("budget_tokens", 20000)),
        )
    except Exception as e:  # noqa: BLE001
        _map(e)
    return {"ok": True, "proposal": row.to_dict()}


@router.post("/proposals/{proposal_id}/probe")
def record_probe(proposal_id: int, payload: dict, request: Request,
                 db: Session = Depends(get_db)):
    _user(request)
    try:
        row = rsi.record_probe(db, _proposal(db, proposal_id), payload)
    except Exception as e:  # noqa: BLE001
        _map(e)
    return {"ok": True, "proposal": row.to_dict()}


@router.post("/proposals/{proposal_id}/shadow")
def record_shadow(proposal_id: int, payload: dict, request: Request,
                  db: Session = Depends(get_db)):
    _user(request)
    try:
        row = rsi.record_shadow(
            db, _proposal(db, proposal_id),
            judge_model=payload.get("judge_model", ""),
            golden_set_frozen=bool(payload.get("golden_set_frozen", False)),
            cross_vendor=bool(payload.get("cross_vendor", False)),
            pass_rate=float(payload.get("pass_rate", 0.0)),
            baseline=float(payload.get("baseline", 0.0)),
        )
    except Exception as e:  # noqa: BLE001
        _map(e)
    return {"ok": True, "proposal": row.to_dict()}


@router.post("/proposals/{proposal_id}/signoff")
def signoff(proposal_id: int, request: Request, db: Session = Depends(get_db)):
    user = _user(request)
    try:
        row = rsi.domain_signoff(db, _proposal(db, proposal_id), user["id"])
    except Exception as e:  # noqa: BLE001
        _map(e)
    return {"ok": True, "proposal": row.to_dict()}


@router.post("/proposals/{proposal_id}/publish")
def publish(proposal_id: int, request: Request, db: Session = Depends(get_db)):
    user = _user(request)
    try:
        row = rsi.publish(db, _proposal(db, proposal_id), user["id"], is_admin(user))
    except Exception as e:  # noqa: BLE001
        _map(e)
    return {"ok": True, "proposal": row.to_dict()}


# ── 熔断 ──────────────────────────────────────────────────

@router.get("/breakers")
def list_breakers(request: Request, db: Session = Depends(get_db)):
    _user(request)
    return {"breakers": rsi.breakers(db), "noise_floor": rsi.NOISE_FLOOR}


@router.post("/breakers/{name}/trip")
def trip_breaker(name: str, payload: dict, request: Request, db: Session = Depends(get_db)):
    user = _user(request)
    if not is_admin(user):
        raise HTTPException(status_code=403, detail="只有管理员可以手动熔断")
    try:
        row = rsi.trip(db, name, payload.get("reason", "manual"))
    except Exception as e:  # noqa: BLE001
        _map(e)
    return {"ok": True, "breaker": row.to_dict()}


@router.post("/breakers/{name}/reset")
def reset_breaker(name: str, request: Request, db: Session = Depends(get_db)):
    user = _user(request)
    if not is_admin(user):
        raise HTTPException(status_code=403, detail="只有管理员可以复位熔断")
    try:
        row = rsi.reset_breaker(db, name)
    except Exception as e:  # noqa: BLE001
        _map(e)
    return {"ok": True, "breaker": row.to_dict()}
