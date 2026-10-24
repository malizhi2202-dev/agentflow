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
    PROPOSAL_DIMENSIONS,
    Memory,
    Proposal,
    SurfaceManifest,
    BreakerState,
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


# ── 记忆四层：晋升门 ──────────────────────────────────────

REQUIRED_FIELDS = ("cue", "lesson", "evidence")


def propose_memory(db: Session, *, layer: str, cue: str, lesson: str,
                   evidence: list | None, kind: str = "positive",
                   scope: str = "agent", owner_id: str = "", source_ref: str = "",
                   confounded: bool | None = None,
                   evidence_is_strong: bool = True) -> dict:
    """提一条记忆。三字段缺一 → `no_entry`（合法结论），不入正式层。"""
    if layer not in MEMORY_LAYERS:
        raise RsiError(f"layer 必须是 {sorted(MEMORY_LAYERS)} 之一")
    if kind not in MEMORY_KINDS:
        raise RsiError(f"kind 必须是 {sorted(MEMORY_KINDS)} 之一（负知识合法）")

    payload = {"cue": (cue or "").strip(), "lesson": (lesson or "").strip(),
               "evidence": evidence or []}
    missing = [f for f in REQUIRED_FIELDS if not payload[f]]
    # 拿不准时的默认是 confounded（不是「已成立」）
    is_confounded = True if confounded is None else bool(confounded)
    if not evidence_is_strong:
        is_confounded = True

    if missing:
        row = Memory(layer=layer, kind=kind, scope=scope, owner_id=owner_id,
                     cue=payload["cue"], lesson=payload["lesson"],
                     evidence_json=json.dumps(payload["evidence"], ensure_ascii=False),
                     source_ref=source_ref, status="no_entry", confounded=0)
        db.add(row)
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
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"stored": True, "status": row.status, "missing": [],
            "memory": row.to_dict()}


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
