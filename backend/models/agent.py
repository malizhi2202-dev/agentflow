"""Agent ORM 模型."""
import datetime
from sqlalchemy import String, Integer, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from models import Base

# v21 T-02：`hermes` / `dsh` 是本机可**真执行**的 CLI 运行时（其余仍走进程内 provider）
# §6.28（v11 运行时口径）：运行时**只有成员机器上探测到的 AI 编码 CLI**。
# langchain/langgraph/autogen/crewai 已从白名单清除（v24-doc-refresh D8）——
# 它们不再作为运行时表述；存量行读侧不受影响（白名单只在创建/更新的**写路径**校验）。
SUPPORTED_RUNTIMES = frozenset({
    "hermes", "dsh", "codex", "custom",
})


class Agent(Base):
    __tablename__ = "agents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    owner_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    # R5-3：归属（personal|team|platform）。存量行默认 personal，team_id 为空——零回填
    team_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    owner_kind: Mapped[str] = mapped_column(String(16), default="personal", index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    # D8：默认不再是 langgraph（旧宇宙）；留空=未选，创建 API 必填校验。
    runtime: Mapped[str] = mapped_column(String(32), default="")
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
    # T-05：人设三件（此前只在请求体里传、不落库 → 编辑后丢）。统一存 Text，可空。
    system_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    role_def: Mapped[str | None] = mapped_column(Text, nullable=True)
    sop: Mapped[str | None] = mapped_column(Text, nullable=True)
    # v23（multica 迁移）：Agent 维度的展示/配置块
    # avatar_url 是 multica 的 `emoji:🧠` 形态；其余是 opaque 配置（JSON 文本），来源侧当前多为空
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    custom_env: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    custom_args: Mapped[list | None] = mapped_column(JSON, nullable=True)
    mcp_config: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    thinking_level: Mapped[str | None] = mapped_column(String(16), nullable=True)
    service_tier: Mapped[str | None] = mapped_column(String(16), nullable=True)
    composio_toolkit_allowlist: Mapped[list | None] = mapped_column(JSON, nullable=True)
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
            "system_prompt": self.system_prompt,
            "role_def": self.role_def,
            "sop": self.sop,
            "gate_pre_check": self.gate_pre_check, "gate_post_check": self.gate_post_check, "io_filter": self.io_filter,
            "status": self.status, "visibility": self.visibility,
            "domain_id": self.domain_id,
            "project_count": self.project_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "api_key": self._mask_key() if self.api_key_encrypted else None,
            # v23（multica 迁移）：这些字段原来是「有源无列」，现在有列也有出参
            "avatar_url": self.avatar_url,
            "custom_env": self.custom_env,
            "custom_args": self.custom_args,
            "mcp_config": self.mcp_config,
            "thinking_level": self.thinking_level,
            "service_tier": self.service_tier,
            "composio_toolkit_allowlist": self.composio_toolkit_allowlist,
        }

    def _mask_key(self) -> str:
        if len(self.api_key_encrypted) <= 8:
            return "***"
        return self.api_key_encrypted[:3] + "***" + self.api_key_encrypted[-4:]
