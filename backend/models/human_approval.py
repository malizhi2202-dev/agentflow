"""人机协同审批模型."""
import datetime
from sqlalchemy import String, Integer, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column
from models import Base


class HumanApproval(Base):
    """Agent 暂停请求人工审批."""
    __tablename__ = "human_approvals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    agent_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    owner_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    task_id: Mapped[str | None] = mapped_column(String(128), nullable=True)  # 关联任务
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")  # pending/approved/rejected
    form_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # 审批表单数据
    response_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # 人工回复数据
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
    resolved_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "agent_id": self.agent_id,
            "owner_id": self.owner_id,
            "task_id": self.task_id,
            "status": self.status,
            "form_data": self.form_data,
            "response_data": self.response_data,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
        }
