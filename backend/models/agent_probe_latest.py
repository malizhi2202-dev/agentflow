"""AgentProbeLatest 模型 — 每个 agent+probe_type 只存最新一条探针状态."""

import datetime
from sqlalchemy import String, Integer, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from models import Base


class AgentProbeLatest(Base):
    __tablename__ = "agent_probe_latest"

    agent_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("agents.id"), primary_key=True
    )
    probe_type: Mapped[str] = mapped_column(String(32), primary_key=True)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="unknown")
    detail: Mapped[str] = mapped_column(Text, default="")
    consecutive_failures: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
