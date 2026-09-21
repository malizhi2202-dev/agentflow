"""渠道配置 ORM 模型 — Agent 接入 IM/邮箱渠道的连接参数."""
import datetime
from sqlalchemy import String, Integer, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from models import Base

CHANNEL_TYPES = ["feishu", "dingtalk", "slack", "telegram", "smtp_email"]
CHANNEL_STATUSES = ["draft", "active", "error", "disabled"]


class ChannelConfig(Base):
    """Agent 绑定的渠道连接配置，凭证加密存储."""
    __tablename__ = "channel_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    agent_id: Mapped[int] = mapped_column(Integer, ForeignKey("agents.id"), nullable=False, index=True)
    owner_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    channel_type: Mapped[str] = mapped_column(String(32), nullable=False)
    credentials_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="draft")
    webhook_uuid: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    enabled: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    def to_dict(self, mask_credentials: bool = True) -> dict:
        return {
            "id": self.id, "agent_id": self.agent_id, "owner_id": self.owner_id,
            "channel_type": self.channel_type,
            "credentials_encrypted": "***" if mask_credentials else self.credentials_encrypted,
            "status": self.status, "webhook_uuid": self.webhook_uuid,
            "enabled": self.enabled,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
