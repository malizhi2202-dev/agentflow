"""自定义角色 ORM 模型."""
import datetime
from sqlalchemy import String, Integer, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column
from models import Base


class CustomRole(Base):
    __tablename__ = "custom_roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    owner_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    based_on: Mapped[str | None] = mapped_column(String(64), nullable=True)  # 基于哪个内置角色
    temperament: Mapped[str] = mapped_column(Text, default="")
    responsibilities: Mapped[dict] = mapped_column(JSON, default=list)  # 职责列表
    triggers: Mapped[dict] = mapped_column(JSON, default=list)  # 触发场景 [{gate, topic}]
    boundaries_can: Mapped[dict] = mapped_column(JSON, default=list)  # 能做
    boundaries_cannot: Mapped[dict] = mapped_column(JSON, default=list)  # 不能做
    evaluation: Mapped[dict] = mapped_column(JSON, default=list)  # 评估框架
    inputs: Mapped[dict] = mapped_column(JSON, default=list)  # 输入文件
    outputs: Mapped[dict] = mapped_column(JSON, default=list)  # 输出格式
    # 安全闸门
    gate_pre_check: Mapped[str | None] = mapped_column(Text, nullable=True)
    gate_post_check: Mapped[str | None] = mapped_column(Text, nullable=True)
    io_filter: Mapped[str | None] = mapped_column(String(16), nullable=True)
    visibility: Mapped[str] = mapped_column(String(16), default="private")
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id, "owner_id": self.owner_id, "name": self.name,
            "based_on": self.based_on, "temperament": self.temperament,
            "responsibilities": self.responsibilities or [],
            "triggers": self.triggers or [],
            "boundaries": {"can": self.boundaries_can or [], "cannot": self.boundaries_cannot or []},
            "evaluation": self.evaluation or [],
            "inputs": self.inputs or [], "outputs": self.outputs or [],
            "gate_pre_check": self.gate_pre_check, "gate_post_check": self.gate_post_check,
            "io_filter": self.io_filter, "visibility": self.visibility,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
