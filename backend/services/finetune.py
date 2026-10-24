"""微调批次与三指标门禁（P4 · 原型 6.24）。

门禁口径（原型 AC-C2）：**准确率门 + ECE 门**双门；任一不过即 `blocked` 并写原因。
本服务只登记与判定，不调度训练（平台只编排、不代装引擎）。
"""
from __future__ import annotations

import datetime

from sqlalchemy.orm import Session

from models.decision import FinetuneBatch

ECE_MAX = 0.05          # 原型门槛：ECE > 0.05 拒绝切产
ACC_MIN = 70.0          # 准确率下限（与原型示例同量纲：百分数）


def _now() -> datetime.datetime:
    return datetime.datetime.utcnow()


def gate(acc: float | None, ece: float | None, hw_ok: bool) -> tuple[str, str]:
    """返回 (verdict, reason)。判定顺序：硬件 → 准确率 → ECE（每条都写给用户看的原因）。"""
    if not hw_ok:
        return "blocked", "硬件预检未通过：不允许开跑/切产"
    if acc is None or ece is None:
        return "blocked", "缺三指标自测（准确率 / ECE）：机器批次不能凭训练完成就切产"
    if acc < ACC_MIN:
        return "blocked", f"准确率 {acc:.1f}% < 门槛 {ACC_MIN:.0f}% · 服务端拒绝（AC-C2）"
    if ece > ECE_MAX:
        return "blocked", f"ECE {ece:.3f} > 门槛 {ECE_MAX:.3f} · 服务端拒绝（AC-C2）"
    return "promote", "过门槛 · 血缘可回滚"


def list_batches(db: Session, owner_id: str, is_admin: bool = False) -> list[dict]:
    q = db.query(FinetuneBatch)
    if not is_admin:
        q = q.filter(FinetuneBatch.owner_id == owner_id)
    return [b.to_dict() for b in q.order_by(FinetuneBatch.id.desc()).all()]


def create_batch(db: Session, owner_id: str, payload: dict) -> FinetuneBatch:
    name = (payload.get("task_name") or "").strip()
    if not name:
        raise ValueError("task_name 不能为空")
    hw_ok = bool(payload.get("hw_ok", False))
    acc = payload.get("acc")
    ece = payload.get("ece")
    acc = None if acc is None else float(acc)
    ece = None if ece is None else float(ece)
    verdict, reason = gate(acc, ece, hw_ok)
    row = FinetuneBatch(
        owner_id=owner_id, task_name=name,
        base_model=(payload.get("base_model") or "").strip(),
        data_sessions=int(payload.get("data_sessions") or 0),
        data_memories=int(payload.get("data_memories") or 0),
        fingerprint=(payload.get("fingerprint") or "").strip(),
        engine=(payload.get("engine") or "").strip(),
        hw_ok=hw_ok,
        status=(payload.get("status") or "done").strip(),
        acc=acc, ece=ece,
        agree=None if payload.get("agree") is None else float(payload.get("agree")),
        gate_verdict=verdict, gate_reason=reason,
        created_at=_now(),
    )
    db.add(row); db.commit(); db.refresh(row)
    return row
