"""工具库 ORM 模型 — Plugin / Skill / MCP."""
import datetime
from sqlalchemy import String, Integer, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column
from models import Base


class Tool(Base):
    __tablename__ = "tools"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    owner_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    # R5-3：归属（personal|team|platform）。存量行默认 personal，team_id 为空——零回填
    team_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    owner_kind: Mapped[str] = mapped_column(String(16), default="personal", index=True)
    type: Mapped[str] = mapped_column(String(16), nullable=False)  # plugin | skill | mcp
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    token_soft_limit: Mapped[int] = mapped_column(Integer, default=80000)
    token_hard_limit: Mapped[int] = mapped_column(Integer, default=100000)
    permissions: Mapped[dict] = mapped_column(JSON, default=list)
    mcp_host_config: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    content_md: Mapped[str] = mapped_column(Text, default="")  # markdown 内容（技能的主 SKILL.md）
    # v23：多文件技能包（[{path, content}]）。技能 = tools.type='skill'，文件是它的附属内容；
    # 迁移 020 用 TEXT 落列（方言无关），这里仍按 JSON 读写 → 读侧统一成 list。
    files_json: Mapped[list] = mapped_column(JSON, default=list)
    # v23（multica 迁移）：工具/技能的通用 config（multica `skill.config`，本机 30 条全为空对象）
    config_json: Mapped[dict] = mapped_column(JSON, default=dict)
    # 安全闸门（null=使用全局默认值）
    gate_pre_check: Mapped[str | None] = mapped_column(Text, nullable=True)
    gate_post_check: Mapped[str | None] = mapped_column(Text, nullable=True)
    io_filter: Mapped[str | None] = mapped_column(String(16), nullable=True)  # none | sanitize | strict
    status: Mapped[str] = mapped_column(String(16), default="active")  # active | disabled
    visibility: Mapped[str] = mapped_column(String(16), default="private")
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    def to_dict(self, include_sensitive: bool = False, with_files: bool = True) -> dict:
        """`with_files=False` 用于**列表**：只给 `files_count`。

        多文件技能包会让单个技能到 86KB，30 个技能全带上就把 `/api/tools` 撑到 1MB+；
        列表页只需要「几个文件」，正文与文件详情由详情接口按需取。
        """
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
            "config_json": self.config_json or {},
            "files_count": len(self.files_json or []),
            "files_json": (self.files_json or []) if with_files else [],
            "gate_pre_check": self.gate_pre_check,
            "gate_post_check": self.gate_post_check,
            "io_filter": self.io_filter,
            "status": self.status,
            "visibility": self.visibility,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        return d
