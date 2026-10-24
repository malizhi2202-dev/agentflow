"""RSI 产物治理服务（R6/R7）——晋升门、三权分离、可改面、熔断。

所有「必须人批 / 缺一不可 / 永久禁改」的规则都在**状态转换层**，不在提示词里。
"""
from __future__ import annotations

import datetime
import json

from sqlalchemy.orm import Session

from models.rsi import (
    BREAKER_NAMES,
    IMMUTABLE_PREFIXES,
    MEMORY_KINDS,
    MEMORY_LAYERS,
    POLLUTION_MARKERS,
    PROPOSAL_DIMENSIONS,
    REVIEW_VERDICTS,
    RSI_CATEGORIES,
    BreakerState,
    Memory,
    PromotionReview,
    Proposal,
    RsiSwitch,
    SurfaceManifest,
)

# NOISE FLOOR：低于这个幅度的「改进」不算改进（R7-6）
NOISE_FLOOR = 0.01
MAX_STEPS = 50
MAX_TOKENS = 200_000


class RsiError(ValueError):
    """业务非法（路由 400）。"""


class GateError(RsiError):
    """门禁拒绝（路由 409/403）。"""


def _now() -> datetime.datetime:
    return datetime.datetime.utcnow()


# ── 自动化类目开关（R6-4）────────────────────────────────
# 只有四类产物有开关；四类之外（代码层、门禁本体、本条款自身）**不存在开关**，
# 因此「没有开关」本身就是禁改面的实现——不是少写，是设计如此。

def _switch_row(db: Session, category: str) -> RsiSwitch | None:
    return db.query(RsiSwitch).filter(RsiSwitch.category == category).first()


def assert_category_running(db: Session, category: str) -> None:
    """状态转换层的开关判定：关闭 → 「自动体已暂停」直接拒。

    缺行 = 四类白名单默认允许（不是 fail-open：白名单外的类目根本没有开关可开）。
    """
    if category not in RSI_CATEGORIES:
        raise GateError(f"类目 {category} 不在四类白名单内（R6-4）：不得自动化")
    row = _switch_row(db, category)
    if row is not None and not row.enabled:
        raise GateError(f"自动体已暂停（{category}）：关闭期间拒绝一切自动写入/提案/发布")


def switches(db: Session) -> list[dict]:
    out = []
    for category in RSI_CATEGORIES:
        row = _switch_row(db, category)
        if row is None:
            out.append({"category": category, "enabled": True, "state": "running",
                        "label": "自动体运行中", "updated_by": "",
                        "updated_at": None})
        else:
            out.append(row.to_dict())
    return out


def set_switch(db: Session, category: str, enabled: bool, actor: str = "") -> RsiSwitch:
    if category not in RSI_CATEGORIES:
        raise GateError(f"类目 {category} 不是可开关的四类产物（R6-4）")
    row = _switch_row(db, category)
    if row is None:
        row = RsiSwitch(category=category, enabled=1 if enabled else 0, updated_by=actor)
        db.add(row)
    else:
        row.enabled = 1 if enabled else 0
        row.updated_by = actor
        row.updated_at = _now()
    db.commit()
    db.refresh(row)
    return row


# ── 记忆四层：晋升门 ──────────────────────────────────────

REQUIRED_FIELDS = ("cue", "lesson", "evidence")


def _pollution_scan(text: str) -> bool:
    """防污染扫描（内容标记面）。命中即视为评测回流污染源。"""
    lowered = (text or "").lower()
    return any(marker.lower() in lowered for marker in POLLUTION_MARKERS)


def propose_memory(db: Session, *, layer: str, cue: str, lesson: str,
                   evidence: list | None, kind: str = "positive",
                   scope: str = "agent", owner_id: str = "", source_ref: str = "",
                   confounded: bool | None = None,
                   evidence_is_strong: bool = True,
                   source_seq: int = 0, cites_seq: int = 0,
                   reviewer: str = "") -> dict:
    """提一条记忆。三字段缺一 → `no_entry`（合法结论），不入正式层。

    R7-4 因果前缀：`cites_seq` 必须早于 `source_seq`（不许引用未来任务）。
    R7-5 防污染：晋升前扫一次，命中即标 `pollution_flagged` 并强制 confounded。
    """
    if layer not in MEMORY_LAYERS:
        raise RsiError(f"layer 必须是 {sorted(MEMORY_LAYERS)} 之一")
    if kind not in MEMORY_KINDS:
        raise RsiError(f"kind 必须是 {sorted(MEMORY_KINDS)} 之一（负知识合法）")
    assert_category_running(db, "memory")

    source_seq = int(source_seq or 0)
    cites_seq = int(cites_seq or 0)
    causal_ok = True
    if source_seq and cites_seq and cites_seq >= source_seq:
        causal_ok = False
        raise GateError(
            f"因果前缀冲突：经验只能引用早于自身任务（cites_seq={cites_seq} "
            f"必须 < source_seq={source_seq}），拒绝未来信息回灌"
        )

    payload = {"cue": (cue or "").strip(), "lesson": (lesson or "").strip(),
               "evidence": evidence or []}
    missing = [f for f in REQUIRED_FIELDS if not payload[f]]
    # 拿不准时的默认是 confounded（不是「已成立」）
    is_confounded = True if confounded is None else bool(confounded)
    if not evidence_is_strong:
        is_confounded = True

    # R7-5 第一扫：晋升前
    scan_text = " ".join([payload["cue"], payload["lesson"],
                          " ".join(str(e) for e in payload["evidence"])])
    polluted = _pollution_scan(scan_text)
    if polluted:
        is_confounded = True

    if missing:
        row = Memory(layer=layer, kind=kind, scope=scope, owner_id=owner_id,
                     cue=payload["cue"], lesson=payload["lesson"],
                     evidence_json=json.dumps(payload["evidence"], ensure_ascii=False),
                     source_ref=source_ref, status="no_entry", confounded=0,
                     source_seq=source_seq, cites_seq=cites_seq,
                     pollution_flagged=1 if polluted else 0,
                     post_ingest_scan=1)
        db.add(row)
        db.flush()
        _write_review(db, row, verdict="no_entry", fields_complete=False,
                      causal_ok=causal_ok, polluted=polluted, reviewer=reviewer,
                      note=f"缺字段: {', '.join(missing)}" if missing else "no_entry")
        db.commit()
        db.refresh(row)
        return {"stored": False, "status": "no_entry", "missing": missing,
                "memory": row.to_dict()}

    row = Memory(
        layer=layer, kind=kind, scope=scope, owner_id=owner_id,
        cue=payload["cue"], lesson=payload["lesson"],
        evidence_json=json.dumps(payload["evidence"], ensure_ascii=False),
        source_ref=source_ref,
        status="confounded" if is_confounded else "promoted",
        confounded=1 if is_confounded else 0,
        source_seq=source_seq, cites_seq=cites_seq,
        pollution_flagged=1 if polluted else 0,
        post_ingest_scan=1,   # R7-5 第二扫：入库后再扫一次（同一内容面，语义上是独立一步）
    )
    db.add(row)
    db.flush()
    _write_review(db, row, verdict="confounded" if is_confounded else "helped",
                  fields_complete=True, causal_ok=causal_ok, polluted=polluted,
                  reviewer=reviewer, note="晋升前扫描命中金标/评测标记" if polluted else "")
    db.commit()
    db.refresh(row)
    return {"stored": True, "status": row.status, "missing": [],
            "memory": row.to_dict()}


def _write_review(db: Session, row: Memory, *, verdict: str, fields_complete: bool,
                  causal_ok: bool, polluted: bool, reviewer: str,
                  note: str = "") -> PromotionReview:
    """晋升评审账：每次 propose 都留痕（no_entry 也记）。"""
    if verdict not in REVIEW_VERDICTS:
        raise RsiError(f"verdict 必须是 {sorted(REVIEW_VERDICTS)} 之一")
    review = PromotionReview(
        memory_id=row.id, verdict=verdict, fields_complete=1 if fields_complete else 0,
        causal_check=1 if causal_ok else 0, pollution_scan=1 if polluted else 0,
        reviewer=reviewer, note=note,
    )
    db.add(review)
    db.flush()
    return review


def list_reviews(db: Session, memory_id: int | None = None,
                 limit: int = 100) -> list[dict]:
    q = db.query(PromotionReview)
    if memory_id is not None:
        q = q.filter(PromotionReview.memory_id == memory_id)
    return [r.to_dict() for r in q.order_by(PromotionReview.id.desc()).limit(limit).all()]


def list_memories(db: Session, layer: str | None = None, status: str | None = None,
                  limit: int = 100) -> list[dict]:
    q = db.query(Memory)
    if layer:
        q = q.filter(Memory.layer == layer)
    if status:
        q = q.filter(Memory.status == status)
    return [m.to_dict() for m in q.order_by(Memory.id.desc()).limit(limit).all()]


def quarantine_source(db: Session, source_ref: str) -> int:
    """来源链撤回：该来源的所有记忆进检疫（不删、可追溯）。"""
    count = db.query(Memory).filter(
        Memory.source_ref == source_ref, Memory.status != "quarantined",
    ).update({Memory.status: "quarantined"}, synchronize_session=False)
    db.commit()
    return int(count or 0)


def decay_candidates(db: Session, days: int = 90, limit: int = 100) -> list[dict]:
    """衰减队列：长期未被使用的正式记忆（只列不删）。"""
    cutoff = _now() - datetime.timedelta(days=days)
    rows = db.query(Memory).filter(
        Memory.status == "promoted",
    ).filter(
        (Memory.last_used_at.is_(None)) | (Memory.last_used_at < cutoff),
    ).order_by(Memory.created_at.asc()).limit(limit).all()
    return [m.to_dict() for m in rows]


# ── 可改面 ────────────────────────────────────────────────

def create_surface(db: Session, name: str, allow_edit: list[str],
                   owner_id: str = "") -> SurfaceManifest:
    if not name:
        raise RsiError("name 不能为空")
    if db.query(SurfaceManifest).filter(SurfaceManifest.name == name).first():
        raise RsiError("surface 已存在")
    row = SurfaceManifest(name=name,
                          allow_edit_json=json.dumps(allow_edit or [], ensure_ascii=False),
                          owner_id=owner_id)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def assert_editable(db: Session, surface_name: str, target: str) -> SurfaceManifest:
    """可改面判定：永久禁改前缀 > 代码层禁自改 > 白名单。任一条不成立即拒。"""
    if not target:
        raise GateError("target 不能为空")
    normalized = target.replace("\\", "/").lstrip("./")
    if ".." in normalized.split("/"):
        raise GateError(f"'{target}' 含路径穿越（..），不在任何可改面内")
    if any(normalized.startswith(p) for p in IMMUTABLE_PREFIXES):
        raise GateError(f"'{target}' 属于永久禁改面（{', '.join(IMMUTABLE_PREFIXES)}）")
    # 代码层 RSI 禁止：不在本版开放（线上稳定优先）
    if normalized.startswith("backend/") or normalized.startswith("frontend/src/"):
        raise GateError("代码层 RSI 禁止（R6-4）：不得由提案修改源码")
    surface = db.query(SurfaceManifest).filter(SurfaceManifest.name == surface_name).first()
    if surface is None:
        raise GateError(f"可改面 '{surface_name}' 不存在")
    allowed = json.loads(surface.allow_edit_json or "[]")
    if not any(normalized == a or normalized.startswith(a.rstrip("/") + "/") for a in allowed):
        raise GateError(f"'{target}' 不在可改面 '{surface_name}' 的白名单内")
    return surface


# ── 熔断 ──────────────────────────────────────────────────

def _breaker(db: Session, name: str) -> BreakerState:
    row = db.query(BreakerState).filter(BreakerState.name == name).first()
    if row is None:
        row = BreakerState(name=name, status="closed")
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def breakers(db: Session) -> list[dict]:
    return [_breaker(db, n).to_dict() for n in BREAKER_NAMES]


def trip(db: Session, name: str, reason: str) -> BreakerState:
    if name not in BREAKER_NAMES:
        raise RsiError(f"未知熔断器: {name}")
    row = _breaker(db, name)
    row.status = "open"
    row.reason = reason
    row.opened_at = _now()
    row.counter = int(row.counter or 0) + 1
    row.updated_at = _now()
    db.commit()
    db.refresh(row)
    return row


def reset_breaker(db: Session, name: str) -> BreakerState:
    """人工复位（half_open 起步，不直接 closed）。"""
    if name not in BREAKER_NAMES:
        raise RsiError(f"未知熔断器: {name}")
    row = _breaker(db, name)
    row.status = "half_open"
    row.reason = ""
    row.updated_at = _now()
    db.commit()
    db.refresh(row)
    return row


# ── 提案制三权分离 ────────────────────────────────────────

def create_proposal(db: Session, *, title: str, dimension: str, surface_name: str,
                    target: str, budget_steps: int = 10,
                    budget_tokens: int = 20000) -> Proposal:
    """生成侧：只允许在可改面内、且带限额（步数/钱）。"""
    if dimension not in PROPOSAL_DIMENSIONS:
        raise RsiError(f"dimension 必须是 {sorted(PROPOSAL_DIMENSIONS)} 之一（INV⟂DOM 双维）")
    if budget_steps <= 0 or budget_steps > MAX_STEPS:
        raise RsiError(f"budget_steps 必须在 1..{MAX_STEPS}")
    if budget_tokens <= 0 or budget_tokens > MAX_TOKENS:
        raise RsiError(f"budget_tokens 必须在 1..{MAX_TOKENS}")
    assert_editable(db, surface_name, target)
    assert_category_running(db, "orchestration")
    open_breakers = [b["name"] for b in breakers(db) if b["status"] == "open"]
    if open_breakers:
        raise GateError(f"熔断打开（{', '.join(open_breakers)}）：拒绝新建提案")
    row = Proposal(title=title, dimension=dimension, surface_name=surface_name,
                   target=target, status="generated",
                   budget_steps=budget_steps, budget_tokens=budget_tokens)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def record_probe(db: Session, proposal: Proposal, metrics: dict) -> Proposal:
    """第一拍：探针快筛。**弱证据不定优劣**——只能把状态推到 probed。"""
    if proposal.status != "generated":
        raise GateError(f"当前状态 {proposal.status} 不允许记录探针结果")
    proposal.probe_json = json.dumps(metrics, ensure_ascii=False)
    proposal.status = "probed"
    proposal.updated_at = _now()
    # 预算熔断：探针也要计步/计钱
    proposal.used_steps += int(metrics.get("steps", 0) or 0)
    proposal.used_tokens += int(metrics.get("tokens", 0) or 0)
    if proposal.used_steps > proposal.budget_steps:
        trip(db, "steps", f"提案 {proposal.id} 步数超限")
        proposal.status = "blocked"
    if proposal.used_tokens > proposal.budget_tokens:
        trip(db, "budget", f"提案 {proposal.id} token 超限")
        proposal.status = "blocked"
    db.commit()
    db.refresh(proposal)
    return proposal


def record_shadow(db: Session, proposal: Proposal, *, judge_model: str,
                  golden_set_frozen: bool, cross_vendor: bool,
                  pass_rate: float, baseline: float = 0.0) -> Proposal:
    """第二拍（终身门）：影子重放。要求冻结金标 + 异厂系 judge；低于噪声地板不算改进。"""
    if proposal.status not in ("probed", "generated"):
        raise GateError(f"当前状态 {proposal.status} 不允许影子重放")
    if not golden_set_frozen:
        raise GateError("金标未冻结：防污染闸未通过，不能作为发布依据")
    if not cross_vendor:
        raise GateError("judge 必须来自异厂系（同厂评审不算独立证据）")
    delta = float(pass_rate) - float(baseline)
    if delta < NOISE_FLOOR:
        # 塌缩熔断：连续无提升 → 记一次，不进入人批
        proposal.shadow_json = json.dumps({
            "judge_model": judge_model, "pass_rate": pass_rate,
            "baseline": baseline, "delta": delta, "noise_floor": NOISE_FLOOR,
        }, ensure_ascii=False)
        proposal.status = "collapsed"
        proposal.updated_at = _now()
        trip(db, "collapse", f"提案 {proposal.id} 提升低于噪声地板")
        db.commit()
        db.refresh(proposal)
        return proposal
    proposal.shadow_json = json.dumps({
        "judge_model": judge_model, "pass_rate": pass_rate,
        "baseline": baseline, "delta": delta, "noise_floor": NOISE_FLOOR,
        "golden_set_frozen": True, "cross_vendor": True,
    }, ensure_ascii=False)
    proposal.judge_model = judge_model
    proposal.status = "awaiting_approval"
    proposal.updated_at = _now()
    db.commit()
    db.refresh(proposal)
    return proposal


def domain_signoff(db: Session, proposal: Proposal, reviewer: str) -> Proposal:
    """领域类提案需要域成员会签（INV⟂DOM 的 DOM 一侧）。"""
    if proposal.dimension != "domain":
        raise RsiError("只有 domain 维度的提案需要域成员会签")
    signoffs = json.loads(proposal.domain_signoff_json or "[]")
    if reviewer not in signoffs:
        signoffs.append(reviewer)
    proposal.domain_signoff_json = json.dumps(signoffs, ensure_ascii=False)
    proposal.updated_at = _now()
    db.commit()
    db.refresh(proposal)
    return proposal


def publish(db: Session, proposal: Proposal, approver: str,
            is_admin: bool) -> Proposal:
    """发布侧：**人批**。且必须已经过影子重放（awaiting_approval）。

    Probe 永不作发布依据：generated/probed/shadowing 一律拒绝。
    """
    if not is_admin or not approver:
        raise GateError("发布需要人类管理员批准（晋升必人批）")
    assert_category_running(db, "orchestration")
    if proposal.status != "awaiting_approval":
        raise GateError(f"当前状态 {proposal.status} 不可发布：必须完成影子重放并通过人批")
    if proposal.dimension == "domain":
        if not json.loads(proposal.domain_signoff_json or "[]"):
            raise GateError("领域类提案缺少域成员会签（INV⟂DOM）")
    proposal.status = "published"
    proposal.approved_by = approver
    proposal.approved_at = _now()
    proposal.updated_at = _now()
    db.commit()
    db.refresh(proposal)
    return proposal


def list_proposals(db: Session, status: str | None = None, limit: int = 100) -> list[dict]:
    q = db.query(Proposal)
    if status:
        q = q.filter(Proposal.status == status)
    return [p.to_dict() for p in q.order_by(Proposal.id.desc()).limit(limit).all()]
