"""平台用户与审计日志的 ORM 模型（v21 T-07，裁定⑦收尾）。

`users.json` / `audit.jsonl` 是文件态权威数据的最后两处；本迁移把它们表化：
- `app_users`：静态用户档案（口令只存哈希）。会话/PAT 在 `sessions` 表（早已入库）。
- `audit_log`：审计行。文件态降级为「本地兜底 / 导出」，查询以表为准。
"""
import datetime

from sqlalchemy import JSON, Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from models import Base


class AppUser(Base):
    __tablename__ = "app_users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(128), default="")
    role: Mapped[str] = mapped_column(String(16), default="member")
    password_hash: Mapped[str] = mapped_column(String(512), default="")
    must_change_password: Mapped[bool] = mapped_column(Boolean, default=False)
    project_ids: Mapped[list] = mapped_column(JSON, default=list)
    custom_permissions: Mapped[list] = mapped_column(JSON, default=list)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[str] = mapped_column(String(32), default="")
    updated_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name or "",
            "role": self.role or "member",
            "password_hash": self.password_hash or "",
            "must_change_password": bool(self.must_change_password),
            "project_ids": list(self.project_ids or []),
            "custom_permissions": list(self.custom_permissions or []),
            "active": bool(self.active),
            "created_at": self.created_at or "",
        }


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    timestamp: Mapped[str] = mapped_column(String(32), index=True, default="")
    user_id: Mapped[str] = mapped_column(String(64), index=True, default="")
    user_name: Mapped[str] = mapped_column(String(128), default="")
    action: Mapped[str] = mapped_column(String(64), index=True, default="")
    target: Mapped[str] = mapped_column(Text, default="")
    target_type: Mapped[str] = mapped_column(String(64), default="")
    detail: Mapped[str] = mapped_column(Text, default="")
    ip: Mapped[str] = mapped_column(String(64), default="")
    result: Mapped[str] = mapped_column(String(16), default="success")

    def to_dict(self) -> dict:
        return {
            "timestamp": self.timestamp,
            "user_id": self.user_id,
            "user_name": self.user_name,
            "action": self.action,
            "target": self.target,
            "target_type": self.target_type,
            "detail": self.detail,
            "ip": self.ip,
            "result": self.result,
        }
