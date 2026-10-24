"""归因策略（R8-2 剩余面）：域级 accountable 解析规则。

设计口径（RULINGS R8-2 · 主档 §7 归因瀑布）：
- **无策略 = 现状**（accountable 缺省 = originator）；
- **有策略但不可解析 = 拒绝**（fail-closed）——声明了规则就必须能解析，不猜、不回落；
- `team_owner` 在个人域（`domains.team_id` 为空）无解 → 同样拒绝。
"""
import datetime

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from models import Base

ACCOUNTABLE_KINDS: tuple[str, ...] = ("member", "team_owner", "originator")


class DomainAttributionPolicy(Base):
    __tablename__ = "domain_attribution_policies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    domain_id: Mapped[int] = mapped_column(Integer, unique=True, index=True, nullable=False)
    accountable_kind: Mapped[str] = mapped_column(String(16), default="originator")
    # kind == member 时必填（user id）；其它 kind 忽略
    accountable_ref: Mapped[str] = mapped_column(String(64), default="")
    updated_by: Mapped[str] = mapped_column(String(64), default="")
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )

    def to_dict(self) -> dict:
        return {
            "domain_id": self.domain_id,
            "accountable_kind": self.accountable_kind,
            "accountable_ref": self.accountable_ref,
            "updated_by": self.updated_by,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
