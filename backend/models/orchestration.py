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


class TraceSpan(Base):
    """调用链追踪 span — 一次模型/工具/Agent 调用的耗时与 token（P2-4 产生端）。

    P2-4 之前这张表**零写入**（只有表结构与读 API）。现在由 `runtime_tracer` 真正写：
    - `trace_id`：一次请求内的 span 串起来。**合成 ID，不是 W3C traceparent**（书面声明，
      见 `PRODUCT-DESIGN` P2-4 B 档：不冻契约、不冒充原生 W3C）。
    - `parent_span_id`：父子链（根 span 为 NULL）。
    - `instance_id` / `to_agent_id` 改为可空：多数调用（chat/tool）不属于某个编排实例。
    """

    __tablename__ = "trace_spans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    trace_id: Mapped[str] = mapped_column(String(32), default="", index=True)
    parent_span_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    instance_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("orchestration_instances.id"), nullable=True, index=True
    )
    from_agent_id: Mapped[int | None] = mapped_column(Integer, nullable=True)  # None = 触发源
    to_agent_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    owner_id: Mapped[str] = mapped_column(String(64), default="", index=True)
    name: Mapped[str] = mapped_column(String(128), default="")
    span_kind: Mapped[str] = mapped_column(
        String(16), default="internal"
    )  # internal|server|client
    status: Mapped[str] = mapped_column(String(16), default="ok", index=True)  # ok|error
    duration_ms: Mapped[int] = mapped_column(Integer, default=0)
    tokens: Mapped[int] = mapped_column(Integer, default=0)
    input_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    output_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    span_type: Mapped[str] = mapped_column(
        String(16), default="agent_call"
    )  # agent_call|retry|degrade|model_call|tool_call
    timestamp: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "trace_id": self.trace_id,
            "parent_span_id": self.parent_span_id,
            "instance_id": self.instance_id,
            "from_agent_id": self.from_agent_id,
            "to_agent_id": self.to_agent_id,
            "owner_id": self.owner_id,
            "name": self.name,
            "span_kind": self.span_kind,
            "status": self.status,
            "duration_ms": self.duration_ms,
            "tokens": self.tokens,
            "span_type": self.span_type,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }
