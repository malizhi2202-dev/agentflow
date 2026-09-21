"""监控指标 ORM 模型 — 会话级 + 工具调用级 + Agent级."""
import datetime
from sqlalchemy import String, Integer, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column
from models import Base


class MetricRaw(Base):
    """通用聚合 metrics（保留兼容）."""
    __tablename__ = "metrics_raw"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    entity_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)  # tool | workflow | agent | project
    entity_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    owner_id: Mapped[str] = mapped_column(String(64), nullable=False)
    model_name: Mapped[str] = mapped_column(String(128), default="")
    token_count: Mapped[int] = mapped_column(Integer, default=0)
    tool_hit_count: Mapped[int] = mapped_column(Integer, default=0)
    execution_time_ms: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(16), default="success")
    timestamp: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id, "entity_type": self.entity_type, "entity_id": self.entity_id,
            "owner_id": self.owner_id, "model_name": self.model_name,
            "token_count": self.token_count, "tool_hit_count": self.tool_hit_count,
            "execution_time_ms": self.execution_time_ms, "status": self.status,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }


class SessionMetric(Base):
    """模型会话级 metrics — 每次模型调用记录."""
    __tablename__ = "session_metrics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    entity_type: Mapped[str] = mapped_column(String(32), nullable=False)  # tool | workflow | agent | project
    entity_id: Mapped[int] = mapped_column(Integer, nullable=False)
    owner_id: Mapped[str] = mapped_column(String(64), nullable=False)
    model_name: Mapped[str] = mapped_column(String(128), nullable=False)  # 实际调用的模型
    prompt_tokens: Mapped[int] = mapped_column(Integer, default=0)
    completion_tokens: Mapped[int] = mapped_column(Integer, default=0)
    total_tokens: Mapped[int] = mapped_column(Integer, default=0)
    duration_ms: Mapped[int] = mapped_column(Integer, default=0)
    tool_name: Mapped[str] = mapped_column(String(128), default="")  # 使用的工具名
    tool_calls: Mapped[int] = mapped_column(Integer, default=0)  # 工具调用次数
    status: Mapped[str] = mapped_column(String(16), default="success")
    error_msg: Mapped[str] = mapped_column(Text, default="")
    timestamp: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id, "session_id": self.session_id,
            "entity_type": self.entity_type, "entity_id": self.entity_id,
            "owner_id": self.owner_id, "model_name": self.model_name,
            "prompt_tokens": self.prompt_tokens, "completion_tokens": self.completion_tokens,
            "total_tokens": self.total_tokens, "duration_ms": self.duration_ms,
            "tool_name": self.tool_name, "tool_calls": self.tool_calls,
            "status": self.status, "error_msg": self.error_msg,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }
