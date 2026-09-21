"""Agent 跨渠道长期记忆 ORM 模型 — Web/飞书/钉钉/企微/API 共享记忆."""
import datetime
from sqlalchemy import String, Integer, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from models import Base

CHANNELS = ["web", "feishu", "dingtalk", "wechat_work", "api", "slack", "telegram"]
MEMORY_TYPES = ["preference", "fact", "conversation", "context", "decision", "document"]


class AgentMemory(Base):
    """Agent 跨渠道长期记忆，按 key 存取，支持 TTL 过期."""
    __tablename__ = "agent_memories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    agent_id: Mapped[int] = mapped_column(Integer, ForeignKey("agents.id"), nullable=False, index=True)
    owner_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    domain_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("domains.id", ondelete="SET NULL"), nullable=True, index=True)
    channel: Mapped[str] = mapped_column(String(32), nullable=False, default="web")  # web/feishu/dingtalk/wechat_work/api/slack/telegram
    session_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    key: Mapped[str] = mapped_column(String(256), nullable=False, index=True)
    value: Mapped[str] = mapped_column(Text, nullable=False)  # JSON string
    memory_type: Mapped[str] = mapped_column(String(32), nullable=False, default="fact")  # preference/fact/conversation/context/decision
    priority: Mapped[int] = mapped_column(Integer, default=5)  # 1-10, 检索优先级
    ttl_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)  # null=永不过期
    expires_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    def to_dict(self) -> dict:
        import json
        try:
            v = json.loads(self.value)
        except (json.JSONDecodeError, TypeError):
            v = self.value
        return {
            "id": self.id, "agent_id": self.agent_id, "owner_id": self.owner_id,
            "domain_id": self.domain_id,
            "channel": self.channel, "session_id": self.session_id,
            "key": self.key, "value": v, "memory_type": self.memory_type,
            "priority": self.priority, "ttl_seconds": self.ttl_seconds,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
