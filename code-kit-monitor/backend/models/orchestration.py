"""编排模块 ORM 模型 — k8s 风格编排实例、拓扑快照、模板、调度队列、调用链追踪."""
import datetime
from sqlalchemy import String, Integer, DateTime, Text, JSON, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from models import Base


class OrchestrationInstance(Base):
    """编排实例 — 一个已部署的 Agent 拓扑."""

    __tablename__ = "orchestration_instances"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    owner_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    yaml_raw: Mapped[str] = mapped_column(Text, nullable=False)
    edges_json: Mapped[dict] = mapped_column(JSON, default=list)  # 连线配置数组
    status: Mapped[str] = mapped_column(
        String(16), default="draft", index=True
    )  # draft|pending|running|converging|success|failed|degraded
    transition_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    agent_ids: Mapped[dict] = mapped_column(JSON, default=list)  # [1, 2, 3]
    priority: Mapped[int] = mapped_column(Integer, default=50)
    token_soft_limit: Mapped[int] = mapped_column(Integer, default=800000)
    token_hard_limit: Mapped[int] = mapped_column(Integer, default=1000000)
    max_retries: Mapped[int] = mapped_column(Integer, default=3)
    retry_backoff: Mapped[str] = mapped_column(String(16), default="exponential")
    on_failure: Mapped[str] = mapped_column(String(16), default="degrade")
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class TopologySnapshot(Base):
    """拓扑快照 — 编排部署时的期望状态记录，用于漂移检测."""

    __tablename__ = "topology_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    instance_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("orchestration_instances.id"), nullable=False, index=True
    )
    yaml_raw: Mapped[str] = mapped_column(Text, nullable=False)
    node_count: Mapped[int] = mapped_column(Integer, default=0)
    edge_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)


class OrchestrationTemplate(Base):
    """编排模板 — 参数化的已验证拓扑，支持模板市场发布."""

    __tablename__ = "orchestration_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    owner_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    yaml_raw: Mapped[str] = mapped_column(Text, nullable=False)
    params_schema: Mapped[dict] = mapped_column(JSON, default=list)  # ["name", "model", ...]
    published: Mapped[bool] = mapped_column(Boolean, default=False)
    deploy_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class SchedulingQueue(Base):
    """调度队列 — 待执行的编排任务，按优先级排序."""

    __tablename__ = "scheduling_queue"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    instance_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("orchestration_instances.id"), nullable=False, index=True
    )
    priority: Mapped[int] = mapped_column(Integer, default=50)
    status: Mapped[str] = mapped_column(
        String(16), default="queued", index=True
    )  # queued|scheduled|executing|evicted|completed|failed
    enqueued_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
    scheduled_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)
    max_wait_until: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)


class TraceSpan(Base):
    """调用链追踪 span — 一次 Agent 调用的耗时和 token 记录."""

    __tablename__ = "trace_spans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    instance_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("orchestration_instances.id"), nullable=False, index=True
    )
    from_agent_id: Mapped[int | None] = mapped_column(Integer, nullable=True)  # None = 触发源
    to_agent_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    duration_ms: Mapped[int] = mapped_column(Integer, default=0)
    tokens: Mapped[int] = mapped_column(Integer, default=0)
    input_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    output_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    span_type: Mapped[str] = mapped_column(
        String(16), default="agent_call"
    )  # agent_call|retry|degrade
    timestamp: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
