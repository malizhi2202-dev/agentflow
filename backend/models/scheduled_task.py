"""定时任务 ORM 模型."""
import datetime
from sqlalchemy import String, Integer, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from models import Base


class ScheduledTask(Base):
    """Agent 定时任务 — cron 触发执行指定 capability."""
    __tablename__ = "scheduled_tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    agent_id: Mapped[int] = mapped_column(Integer, ForeignKey("agents.id", ondelete="CASCADE"), nullable=False, index=True)
    cron_expr: Mapped[str] = mapped_column(String(64), nullable=False)  # 如 "0 9 * * 1" 或 "*/5 * * * *"
    capability: Mapped[str] = mapped_column(String(128), nullable=False)  # 触发的能力名称
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    last_run: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)
    owner_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(128), default="")
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "agent_id": self.agent_id,
            "name": self.name,
            "cron_expr": self.cron_expr,
            "capability": self.capability,
            "enabled": self.enabled,
            "last_run": self.last_run.isoformat() if self.last_run else None,
            "owner_id": self.owner_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
