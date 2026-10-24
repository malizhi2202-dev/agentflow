"""会话与 PAT 令牌 ORM 模型（P0-1）。

两张表都只存 **token 的 sha256 哈希**，明文只在签发那一刻返回给客户端
（会话走 cookie，PAT 走创建响应体）；数据库泄露不等于身份泄露。
"""
import datetime

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from models import Base


class SessionToken(Base):
    """服务端会话：login 签发，idle/absolute 双到期。"""

    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
    last_seen: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
    # 空闲到期（随活动前移）；绝对到期（固定 8h，不因活动延长）
    expires_at: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)
    absolute_expires_at: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)
    ip: Mapped[str] = mapped_column(String(64), default="")
    ua: Mapped[str] = mapped_column(String(255), default="")
    revoked_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)

    def to_public(self) -> dict:
        return {
            "id": self.id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_seen": self.last_seen.isoformat() if self.last_seen else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "absolute_expires_at": self.absolute_expires_at.isoformat() if self.absolute_expires_at else None,
            "ip": self.ip,
            "ua": self.ua,
        }


class PatToken(Base):
    """个人访问令牌：脚本/Agent 用，scopes 复用平台权限点字符串。"""

    __tablename__ = "pat_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    scopes_json: Mapped[str] = mapped_column(Text, default="[]")
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
    expires_at: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)
    last_used_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)
    revoked_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)

    def to_public(self) -> dict:
        import json

        return {
            "id": self.id,
            "name": self.name,
            "scopes": json.loads(self.scopes_json or "[]"),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "last_used_at": self.last_used_at.isoformat() if self.last_used_at else None,
        }
