"""工具库 ORM 模型 — Plugin / Skill / MCP."""
import datetime
from sqlalchemy import String, Integer, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column
from models import Base


class Tool(Base):
    __tablename__ = "tools"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    owner_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(16), nullable=False)  # plugin | skill | mcp
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    token_soft_limit: Mapped[int] = mapped_column(Integer, default=80000)
    token_hard_limit: Mapped[int] = mapped_column(Integer, default=100000)
    permissions: Mapped[dict] = mapped_column(JSON, default=list)
    mcp_host_config: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    content_md: Mapped[str] = mapped_column(Text, default="")  # markdown 内容
    # 安全闸门（null=使用全局默认值）
    gate_pre_check: Mapped[str | None] = mapped_column(Text, nullable=True)
    gate_post_check: Mapped[str | None] = mapped_column(Text, nullable=True)
    io_filter: Mapped[str | None] = mapped_column(String(16), nullable=True)  # none | sanitize | strict
    status: Mapped[str] = mapped_column(String(16), default="active")  # active | disabled
    visibility: Mapped[str] = mapped_column(String(16), default="private")
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    def to_dict(self, include_sensitive: bool = False) -> dict:
        d = {
            "id": self.id,
            "owner_id": self.owner_id,
            "type": self.type,
            "name": self.name,
            "description": self.description,
            "token_soft_limit": self.token_soft_limit,
            "token_hard_limit": self.token_hard_limit,
            "permissions": self.permissions or [],
            "mcp_host_config": self.mcp_host_config,
            "content_md": self.content_md,
            "gate_pre_check": self.gate_pre_check,
            "gate_post_check": self.gate_post_check,
            "io_filter": self.io_filter,
            "status": self.status,
            "visibility": self.visibility,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        return d
