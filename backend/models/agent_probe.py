"""AgentProbe ORM 模型 — Agent 健康探针记录."""

import datetime
from sqlalchemy import String, Integer, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from models import Base


class AgentProbe(Base):
    __tablename__ = "agent_probes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    agent_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("agents.id"), nullable=False, index=True
    )
    probe_type: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    detail: Mapped[str] = mapped_column(Text, default="")
    consecutive_failures: Mapped[int] = mapped_column(Integer, default=0)
    # created_at 必须带索引：保留期清理按它过滤，无索引时每轮把全表扫两遍。
    # 2026-10-25 实测：54 万行、每 4 秒扫 ~108 万行，稳定占掉约 28% 单核且一条也删不掉。
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow, index=True
    )
