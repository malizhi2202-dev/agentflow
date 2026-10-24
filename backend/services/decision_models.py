"""决策模型登记与用途绑定（P4 · 原型 6.23）。

口径：
- **未绑定 ⇒ 直通**：登记 ≠ 在用；绑定是每行独立开关，默认全关。
- 健康态只由**探测**得出；没配探测适配器时 `reprobe` 一律返回 `unprobed`（fail-closed，不假装健康）。
- 可见性：owner 或平台管理员（与平台其它资源一致）。
"""
from __future__ import annotations

import datetime

from sqlalchemy.orm import Session

from models.decision import BINDINGS, DecisionModel


class DecisionError(ValueError):
    """入参/状态非法（路由 400）。"""


class NotFound(LookupError):
    """资源不存在或不可见（路由 404，不用 403 探测他人资源）。"""


def _now() -> datetime.datetime:
    return datetime.datetime.utcnow()


def list_models(db: Session, owner_id: str, is_admin: bool = False) -> list[dict]:
    q = db.query(DecisionModel)
    if not is_admin:
        q = q.filter(DecisionModel.owner_id == owner_id)
    return [m.to_dict() for m in q.order_by(DecisionModel.id.asc()).all()]


def get_visible(db: Session, model_id: int, owner_id: str, is_admin: bool = False) -> DecisionModel:
    q = db.query(DecisionModel).filter(DecisionModel.id == model_id)
    if not is_admin:
        q = q.filter(DecisionModel.owner_id == owner_id)
    row = q.first()
    if row is None:
        raise NotFound("决策模型不存在")
    return row


def register(db: Session, owner_id: str, payload: dict) -> DecisionModel:
    name = (payload.get("name") or "").strip()
    if not name:
        raise DecisionError("name 不能为空")
    track = (payload.get("track") or "local").strip()
    if track not in ("local", "cloud"):
        raise DecisionError("track 必须是 local 或 cloud")
    if db.query(DecisionModel).filter(DecisionModel.name == name,
                                      DecisionModel.owner_id == owner_id).first():
        raise DecisionError("同名模型已登记")
    row = DecisionModel(
        owner_id=owner_id, name=name, track=track,
        kind=(payload.get("kind") or "").strip(),
        threshold=float(payload.get("threshold", 0.6)),
        # 健康态默认 unprobed：登记不产生健康事实
        health="unprobed",
        bindings=[],           # 默认全关（未绑定 ⇒ 直通）
        enabled=True,
    )
    db.add(row); db.commit(); db.refresh(row)
    return row


def set_binding(db: Session, row: DecisionModel, binding: str, enabled: bool) -> DecisionModel:
    if binding not in BINDINGS:
        raise DecisionError(f"binding 必须是 {sorted(BINDINGS)} 之一")
    current = [b for b in (row.bindings or []) if b in BINDINGS]
    if enabled and binding not in current:
        current.append(binding)
    if not enabled:
        current = [b for b in current if b != binding]
    row.bindings = current
    row.updated_at = _now()
    db.commit(); db.refresh(row)
    return row


def reprobe(db: Session, row: DecisionModel) -> dict:
    """重探健康态。没有探测适配器 = 返回 unprobed（如实，不假装 healthy）。"""
    row.health = "unprobed"
    row.latency_p95_ms = None
    row.updated_at = _now()
    db.commit(); db.refresh(row)
    return {"health": row.health,
            "detail": "未配置探测适配器：健康态保持 unprobed（fail-closed，不作为可路由依据）"}


def set_enabled(db: Session, row: DecisionModel, enabled: bool) -> DecisionModel:
    row.enabled = bool(enabled)
    row.updated_at = _now()
    db.commit(); db.refresh(row)
    return row
