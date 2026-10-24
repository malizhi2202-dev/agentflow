"""决策模型 / 微调批次的 ORM 模型（P4：小模型决策面，先落表再谈能力）。

命名口径（原型 6.23）：轨道 = `local`（本机/llama.cpp/MLX）或 `cloud`（云 API 备轨）；
用途绑定三档独立开关（route / chat_triage / simple_task），**默认全关**——未绑定即直通。
健康态只有探测得出的三种：`healthy` / `degraded` / `unprobed`（没探测过就写 unprobed，不假装健康）。
"""
import datetime

from sqlalchemy import JSON, Boolean, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from models import Base

BINDINGS = ("route", "chat_triage", "simple_task")
HEALTH_STATES = ("healthy", "degraded", "unprobed")
GATE_VERDICTS = ("promote", "blocked")


class DecisionModel(Base):
    __tablename__ = "decision_models"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    owner_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    track: Mapped[str] = mapped_column(String(16), default="local")
    kind: Mapped[str] = mapped_column(String(64), default="")
    health: Mapped[str] = mapped_column(String(16), default="unprobed")
    latency_p95_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    threshold: Mapped[float] = mapped_column(Float, default=0.6)
    escalated: Mapped[int] = mapped_column(Integer, default=0)
    fallback: Mapped[int] = mapped_column(Integer, default=0)
    bindings: Mapped[list] = mapped_column(JSON, default=list)   # 已开启的用途
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id, "name": self.name, "track": self.track, "kind": self.kind,
            "health": self.health, "latency_p95_ms": self.latency_p95_ms,
            "threshold": self.threshold, "escalated": self.escalated, "fallback": self.fallback,
            "bindings": list(self.bindings or []), "enabled": bool(self.enabled),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class FinetuneBatch(Base):
    __tablename__ = "finetune_batches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    owner_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    task_name: Mapped[str] = mapped_column(String(128), nullable=False)
    base_model: Mapped[str] = mapped_column(String(128), default="")
    data_sessions: Mapped[int] = mapped_column(Integer, default=0)
    data_memories: Mapped[int] = mapped_column(Integer, default=0)
    fingerprint: Mapped[str] = mapped_column(String(64), default="")
    engine: Mapped[str] = mapped_column(String(128), default="")
    hw_ok: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(24), default="draft")
    acc: Mapped[float | None] = mapped_column(Float, nullable=True)
    ece: Mapped[float | None] = mapped_column(Float, nullable=True)
    agree: Mapped[float | None] = mapped_column(Float, nullable=True)
    gate_verdict: Mapped[str] = mapped_column(String(16), default="blocked")
    gate_reason: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id, "task_name": self.task_name, "base_model": self.base_model,
            "data_sessions": self.data_sessions, "data_memories": self.data_memories,
            "fingerprint": self.fingerprint, "engine": self.engine, "hw_ok": bool(self.hw_ok),
            "status": self.status, "acc": self.acc, "ece": self.ece, "agree": self.agree,
            "gate_verdict": self.gate_verdict, "gate_reason": self.gate_reason,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
