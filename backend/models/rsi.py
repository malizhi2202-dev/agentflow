"""RSI 产物治理（R6/R7）— 记忆四层 / 提案 / 可改面 / 熔断。

设计口径（RULINGS R6-1..R6-4、R7-1..R7-6）：
- **记忆四层唯一管道**：L0 原文 → L1 原子 → L2 场景 → L3 核心；**层级 ≠ 权限**。
  晋升准入**三字段缺一不入库**（cue / lesson / evidence），拿不准默认 `confounded`，
  `no_entry` 是合法结果（明确「这次不学」也是结论）。
- **提案制三权分离**：生成（限步限钱）/ 评估（探针快筛 + 影子重放终身门）/ 发布（人批）。
  **Probe 永不作发布依据**；影子重放要求冻结金标 + 异厂系 judge。
- **禁改面 = 可改面声明对象**（`surface_manifest`），scripts/plugins/hooks **永久禁改**；
  代码层 RSI 禁止（线上稳定优先）——不是「提示词说不要改代码」。
- **四熔断**（预算 / 步数 / 塌缩 / 错误率）+ NOISE FLOOR（低于噪声的改进不算改进）。
"""

import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from models import Base

MEMORY_LAYERS: frozenset[str] = frozenset({"L1", "L2", "L3"})
MEMORY_KINDS: frozenset[str] = frozenset({"positive", "negative"})   # 负知识合法
MEMORY_STATUSES: frozenset[str] = frozenset(
    {"promoted", "confounded", "quarantined", "no_entry"}
)
PROPOSAL_DIMENSIONS: frozenset[str] = frozenset({"invariant", "domain"})
PROPOSAL_STATUSES: frozenset[str] = frozenset(
    {"generated", "probed", "shadowing", "awaiting_approval", "published",
     "rejected", "collapsed", "blocked"}
)
BREAKER_NAMES: tuple[str, ...] = ("budget", "steps", "collapse", "error_rate")
# 永久禁改的路径前缀（不是提示词，是服务端判定）
IMMUTABLE_PREFIXES: tuple[str, ...] = ("scripts/", "plugins/", "hooks/")


class Memory(Base):
    """晋升门在状态转换层：三字段齐才可能是 promoted。"""

    __tablename__ = "memories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    layer: Mapped[str] = mapped_column(String(4), default="L1", index=True)
    kind: Mapped[str] = mapped_column(String(8), default="positive", index=True)
    scope: Mapped[str] = mapped_column(String(16), default="agent", index=True)
    owner_id: Mapped[str] = mapped_column(String(64), default="", index=True)
    cue: Mapped[str] = mapped_column(Text, default="")
    lesson: Mapped[str] = mapped_column(Text, default="")
    evidence_json: Mapped[str] = mapped_column(Text, default="[]")
    source_ref: Mapped[str] = mapped_column(String(256), default="", index=True)
    status: Mapped[str] = mapped_column(String(16), default="no_entry", index=True)
    confounded: Mapped[int] = mapped_column(Integer, default=0)
    decay_score: Mapped[float] = mapped_column(Integer, default=100)
    last_used_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )

    def to_dict(self) -> dict:
        import json

        return {
            "id": self.id, "layer": self.layer, "kind": self.kind, "scope": self.scope,
            "owner_id": self.owner_id, "cue": self.cue, "lesson": self.lesson,
            "evidence": json.loads(self.evidence_json or "[]"),
            "source_ref": self.source_ref, "status": self.status,
            "confounded": bool(self.confounded), "decay_score": self.decay_score,
            "last_used_at": self.last_used_at.isoformat() if self.last_used_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Proposal(Base):
    __tablename__ = "orchestration_proposals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), default="")
    dimension: Mapped[str] = mapped_column(String(16), default="invariant", index=True)
    surface_name: Mapped[str] = mapped_column(String(64), default="", index=True)
    target: Mapped[str] = mapped_column(String(256), default="")
    status: Mapped[str] = mapped_column(String(24), default="generated", index=True)
    # 生成阶段的两道限额（限步限钱）
    budget_steps: Mapped[int] = mapped_column(Integer, default=10)
    used_steps: Mapped[int] = mapped_column(Integer, default=0)
    budget_tokens: Mapped[int] = mapped_column(Integer, default=20000)
    used_tokens: Mapped[int] = mapped_column(Integer, default=0)
    probe_json: Mapped[str] = mapped_column(Text, default="{}")
    shadow_json: Mapped[str] = mapped_column(Text, default="{}")
    judge_model: Mapped[str] = mapped_column(String(128), default="")
    domain_signoff_json: Mapped[str] = mapped_column(Text, default="[]")
    approved_by: Mapped[str] = mapped_column(String(64), default="")
    approved_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )

    def to_dict(self) -> dict:
        import json

        return {
            "id": self.id, "title": self.title, "dimension": self.dimension,
            "surface_name": self.surface_name, "target": self.target, "status": self.status,
            "budget": {"steps": self.budget_steps, "tokens": self.budget_tokens},
            "used": {"steps": self.used_steps, "tokens": self.used_tokens},
            "probe": json.loads(self.probe_json or "{}"),
            "shadow": json.loads(self.shadow_json or "{}"),
            "judge_model": self.judge_model,
            "domain_signoffs": json.loads(self.domain_signoff_json or "[]"),
            "approved_by": self.approved_by or None,
            "approved_at": self.approved_at.isoformat() if self.approved_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class SurfaceManifest(Base):
    """可改面声明对象——禁改面不是靠 prompt 措辞。"""

    __tablename__ = "surface_manifests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    allow_edit_json: Mapped[str] = mapped_column(Text, default="[]")
    owner_id: Mapped[str] = mapped_column(String(64), default="")
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )

    def to_dict(self) -> dict:
        import json

        return {
            "id": self.id, "name": self.name,
            "allow_edit": json.loads(self.allow_edit_json or "[]"),
            "immutable": list(IMMUTABLE_PREFIXES),
            "owner_id": self.owner_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class BreakerState(Base):
    __tablename__ = "breaker_states"

    name: Mapped[str] = mapped_column(String(32), primary_key=True)
    status: Mapped[str] = mapped_column(String(16), default="closed")  # closed|open|half_open
    reason: Mapped[str] = mapped_column(String(255), default="")
    counter: Mapped[int] = mapped_column(Integer, default=0)
    opened_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )

    def to_dict(self) -> dict:
        return {
            "name": self.name, "status": self.status, "reason": self.reason,
            "counter": self.counter,
            "opened_at": self.opened_at.isoformat() if self.opened_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
