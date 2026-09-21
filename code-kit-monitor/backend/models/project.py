"""项目 ORM 模型."""
import datetime
from sqlalchemy import String, Integer, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from models import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    owner_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    requirement_raw: Mapped[str] = mapped_column(Text, default="")
    requirement_type: Mapped[str] = mapped_column(String(16), default="text")  # text | api_doc | markdown | legacy
    parsed_summary: Mapped[str] = mapped_column(Text, default="")
    agent_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("agents.id"), nullable=True)
    workflow_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("workflows.id"), nullable=True)
    orchestration_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("orchestration_instances.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="pending")  # pending|running|completed|error|stopped|cancelled
    visibility: Mapped[str] = mapped_column(String(16), default="private")
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id, "owner_id": self.owner_id, "name": self.name,
            "requirement_raw": self.requirement_raw, "requirement_type": self.requirement_type,
            "parsed_summary": self.parsed_summary,
            "agent_id": self.agent_id, "workflow_id": self.workflow_id,
            "orchestration_id": self.orchestration_id,
            "status": self.status, "visibility": self.visibility,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
