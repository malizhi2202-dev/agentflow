"""告警 ORM 模型（P1-16）— 告警从进程内环形 500 条改为落库。

原状：`AlertService.alerts` 是模块单例里的一个 list，重启即丢、多副本各存各的、
轮转只保留 500 条——「告警」这件事在数据库里没有任何痕迹，审计也接不上。
"""

import datetime

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from models import Base


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    alert_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    severity: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    # 指回实体（agent / orchestration / …）：去重与跳转都用它
    entity_type: Mapped[str] = mapped_column(String(32), default="", index=True)
    entity_id: Mapped[int] = mapped_column(Integer, default=0, index=True)
    metadata_json: Mapped[str] = mapped_column(Text, default="{}")
    timestamp: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow, index=True
    )
    acknowledged: Mapped[int] = mapped_column(Integer, default=0, index=True)
    acknowledged_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)
    acknowledged_by: Mapped[str | None] = mapped_column(String(64), nullable=True)

    def to_dict(self) -> dict:
        import json

        return {
            "id": self.id,
            "alert_type": self.alert_type,
            "severity": self.severity,
            "title": self.title,
            "message": self.message,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "metadata": json.loads(self.metadata_json or "{}"),
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "acknowledged": bool(self.acknowledged),
            "acknowledged_at": self.acknowledged_at.isoformat() if self.acknowledged_at else None,
            "acknowledged_by": self.acknowledged_by,
        }
