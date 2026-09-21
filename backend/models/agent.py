"""Agent ORM 模型."""
import datetime
from sqlalchemy import String, Integer, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from models import Base

SUPPORTED_RUNTIMES = frozenset({"langchain", "langgraph", "autogen", "crewai", "codex", "custom"})


class Agent(Base):
    __tablename__ = "agents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    owner_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    runtime: Mapped[str] = mapped_column(String(32), default="langgraph")
    model_provider: Mapped[str] = mapped_column(String(64), nullable=False)
    model_name: Mapped[str] = mapped_column(String(128), nullable=False)
    model_config_json: Mapped[dict] = mapped_column(JSON, default=dict)
    api_key_encrypted: Mapped[str] = mapped_column(String(512), nullable=False)
    domain_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("domains.id", ondelete="SET NULL"), nullable=True)
    workflow_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("workflows.id"), nullable=True)
    workflow_ids: Mapped[dict] = mapped_column(JSON, default=list)  # [1, 2, 3] 绑定多个工作流
    token_soft_limit: Mapped[int] = mapped_column(Integer, default=800000)
    token_hard_limit: Mapped[int] = mapped_column(Integer, default=1000000)
    total_tokens_used: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(16), default="standby")
    # 安全闸门（null=使用全局默认值）
    gate_pre_check: Mapped[str | None] = mapped_column(Text, nullable=True)
    gate_post_check: Mapped[str | None] = mapped_column(Text, nullable=True)
    io_filter: Mapped[str | None] = mapped_column(String(16), nullable=True)
    visibility: Mapped[str] = mapped_column(String(16), default="private")
    project_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id, "owner_id": self.owner_id, "name": self.name,
            "description": self.description, "runtime": self.runtime,
            "model_provider": self.model_provider, "model_name": self.model_name,
            "model_config_json": self.model_config_json or {},
            "workflow_id": self.workflow_id,
            "token_soft_limit": self.token_soft_limit, "token_hard_limit": self.token_hard_limit,
            "total_tokens_used": self.total_tokens_used,
            "gate_pre_check": self.gate_pre_check, "gate_post_check": self.gate_post_check, "io_filter": self.io_filter,
            "status": self.status, "visibility": self.visibility,
            "domain_id": self.domain_id,
            "project_count": self.project_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "api_key": self._mask_key() if self.api_key_encrypted else None,
        }

    def _mask_key(self) -> str:
        if len(self.api_key_encrypted) <= 8:
            return "***"
        return self.api_key_encrypted[:3] + "***" + self.api_key_encrypted[-4:]
