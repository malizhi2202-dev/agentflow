"""Domain ORM 模型 — Agent 隔离域."""
import datetime
from sqlalchemy import String, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from models import Base


class Domain(Base):
    __tablename__ = "domains"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    owner_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    # R5-3：归属（personal|team|platform）。存量行默认 personal，team_id 为空——零回填
    team_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    owner_kind: Mapped[str] = mapped_column(String(16), default="personal", index=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "owner_id": self.owner_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
