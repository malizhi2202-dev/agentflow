"""工作流 ORM 模型."""
import datetime
from sqlalchemy import String, Integer, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from models import Base


class Workflow(Base):
    __tablename__ = "workflows"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    owner_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    definition_mode: Mapped[str] = mapped_column(String(16), default="visual")  # text | visual
    spec_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(String(16), default="draft")  # draft|published|running|completed|failed|stopped
    token_soft_limit: Mapped[int] = mapped_column(Integer, default=800000)
    token_hard_limit: Mapped[int] = mapped_column(Integer, default=1000000)
    # 安全闸门（null=使用全局默认值）
    gate_pre_check: Mapped[str | None] = mapped_column(Text, nullable=True)
    gate_post_check: Mapped[str | None] = mapped_column(Text, nullable=True)
    io_filter: Mapped[str | None] = mapped_column(String(16), nullable=True)
    visibility: Mapped[str] = mapped_column(String(16), default="private")
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "owner_id": self.owner_id,
            "name": self.name,
            "description": self.description,
            "definition_mode": self.definition_mode,
            "spec_json": self.spec_json or {},
            "status": self.status,
            "token_soft_limit": self.token_soft_limit,
            "token_hard_limit": self.token_hard_limit,
            "gate_pre_check": self.gate_pre_check,
            "gate_post_check": self.gate_post_check,
            "io_filter": self.io_filter,
            "visibility": self.visibility,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class WorkflowSnapshot(Base):
    __tablename__ = "workflow_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    workflow_id: Mapped[int] = mapped_column(Integer, ForeignKey("workflows.id"), nullable=False, index=True)
    tool_snapshots_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    version: Mapped[int] = mapped_column(Integer, default=1)
    captured_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "workflow_id": self.workflow_id,
            "version": self.version,
            "tool_count": len(self.tool_snapshots_json.get("tools", []) if isinstance(self.tool_snapshots_json, dict) else []),
            "captured_at": self.captured_at.isoformat() if self.captured_at else None,
        }
