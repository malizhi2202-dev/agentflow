"""SchedulerQueue ORM 模型 — Agent 调度队列."""

import datetime
from sqlalchemy import String, Integer, DateTime, Text, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from models import Base


class SchedulerQueue(Base):
    __tablename__ = "scheduler_queue"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    task_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    agent_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("agents.id"), nullable=False, index=True
    )
    priority: Mapped[int] = mapped_column(Integer, default=50)
    score: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(
        String(16), default="queued", index=True
    )  # queued|running|done|failed
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
    started_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)
