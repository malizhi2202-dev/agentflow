"""消息 ORM 模型 — 单条对话消息."""
import datetime
from sqlalchemy import String, Integer, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from models import Base

ROLES = ["user", "agent", "system"]
MSG_STATUSES = ["pending", "processing", "done", "error"]


class Message(Base):
    """对话中的单条消息记录."""
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    conversation_id: Mapped[int] = mapped_column(Integer, ForeignKey("conversations.id"), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(16), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="done")
    channel_message_id: Mapped[str | None] = mapped_column(String(256), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id, "conversation_id": self.conversation_id,
            "role": self.role, "content": self.content,
            "status": self.status,
            "channel_message_id": self.channel_message_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
