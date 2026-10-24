"""声明式 API 的账本与状态（P2-5）。

四件组里需要落库的两件：
- `change_log`：**全局单账本**，同事务写入（不另开审计文件）——`/api/watch` 的事件源，
  也是 generation 的唯一来源（`MAX(generation)+1`，MySQL 重启取 MAX+1 同有洞，
  所以游标纪律是「cursor > 最新 + resync」，两库通用）。
- `resource_conditions`：K8s 式 `conditions` + `observedGeneration`——区分「没处理」
  与「处理了但结果未变」。
"""
import datetime

from sqlalchemy import DateTime, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from models import Base


class ChangeLog(Base):
    __tablename__ = "change_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    # 资源身份：resource_type + resource_id（文件类资源 id=0）
    resource_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    resource_id: Mapped[str] = mapped_column(String(64), default="", index=True)
    generation: Mapped[int] = mapped_column(Integer, default=1, index=True)
    actor: Mapped[str] = mapped_column(String(64), default="")
    action: Mapped[str] = mapped_column(String(32), default="update")
    before_hash: Mapped[str] = mapped_column(String(64), default="")
    after_hash: Mapped[str] = mapped_column(String(64), default="")
    payload_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow, index=True
    )

    def to_event(self) -> dict:
        import json

        return {
            "id": self.id,
            "resource_type": self.resource_type,
            "resource_id": self.resource_id,
            "generation": self.generation,
            "actor": self.actor,
            "action": self.action,
            "before_hash": self.before_hash,
            "after_hash": self.after_hash,
            "payload": json.loads(self.payload_json or "{}"),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class ResourceCondition(Base):
    __tablename__ = "resource_conditions"
    __table_args__ = (
        UniqueConstraint("resource_type", "resource_id", "condition_type",
                         name="ux_resource_condition"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    resource_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    resource_id: Mapped[str] = mapped_column(String(64), default="", index=True)
    condition_type: Mapped[str] = mapped_column(String(32), default="Ready")
    status: Mapped[str] = mapped_column(String(8), default="True")   # True|False|Unknown
    reason: Mapped[str] = mapped_column(String(64), default="")
    message: Mapped[str] = mapped_column(Text, default="")
    generation: Mapped[int] = mapped_column(Integer, default=1)
    observed_generation: Mapped[int] = mapped_column(Integer, default=0)
    last_transition_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )

    def to_dict(self) -> dict:
        return {
            "type": self.condition_type,
            "status": self.status,
            "reason": self.reason,
            "message": self.message,
            "observedGeneration": self.observed_generation,
            "lastTransitionTime": self.last_transition_at.isoformat() if self.last_transition_at else None,
        }
