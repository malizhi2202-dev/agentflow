"""Agent ↔ 工具/技能 关联（v23 · multica `agent_skill` 的落点）。

语义：**绑定 ≠ 授权**。绑上只是「这个 Agent 可以用这个技能/工具」，
真正的调用权仍按平台的执行与安全闸门判定（与小队入池同一条口径）。
"""
import datetime

from sqlalchemy import DateTime, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from models import Base


class AgentTool(Base):
    __tablename__ = "agent_tools"
    __table_args__ = (
        UniqueConstraint("agent_id", "tool_id", name="ux_agent_tool"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    agent_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    tool_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )

    def to_dict(self) -> dict:
        return {"id": self.id, "agent_id": self.agent_id, "tool_id": self.tool_id}
