"""Agent 任务队列（scheduler_queue）— 落库 + 租约/心跳（P1-7）。

原状：这条队列只存在于 `engine.scheduler.PriorityQueue` 的进程内存里，
而生产路径从来没人往里 enqueue（`route_to_agent` 只加了个 `_queued_by_capability`
计数器）——重启即丢、多副本各自计数、进程崩了任务就消失。

现在：一行一个待调度任务，带 `lease_owner / lease_expires_at / heartbeat_at`。
租约到期未心跳 = 持有者已死，任务自动重新可被 claim（至少一次语义）。

P1-16 并表：原先还有一张 `scheduling_queue`（编排实例队列）与这张并存，
两套状态机、两处深度统计。现在统一到本表，用 `kind` 区分：
`agent_task`（能力标签路由）与 `orchestration_instance`（`instance_id` 指向编排实例）。
"""

import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from models import Base


class SchedulerQueue(Base):
    __tablename__ = "scheduler_queue"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    task_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    # 能力标签（原 SchedulerService._task_labels 的内容）
    label: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    domain_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    # 目标 Agent：入队时未知，claim 后回填
    agent_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("agents.id"), nullable=True, index=True
    )
    # P1-16 并表：一条队列同时承载 agent 任务与编排实例
    kind: Mapped[str] = mapped_column(String(24), default="agent_task", index=True)
    instance_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    priority: Mapped[int] = mapped_column(Integer, default=50)
    score: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(16), default="queued", index=True)
    # queued | leased | done | failed
    enqueued_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow, index=True
    )
    started_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    lease_owner: Mapped[str | None] = mapped_column(String(128), nullable=True)
    lease_expires_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)
    heartbeat_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)
    finished_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "task_id": self.task_id,
            "kind": self.kind,
            "instance_id": self.instance_id,
            "label": self.label,
            "domain_id": self.domain_id,
            "agent_id": self.agent_id,
            "priority": self.priority,
            "score": self.score,
            "status": self.status,
            "attempts": self.attempts,
            "enqueued_at": self.enqueued_at.isoformat() if self.enqueued_at else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "finished_at": self.finished_at.isoformat() if self.finished_at else None,
            "lease_owner": self.lease_owner,
            "lease_expires_at": self.lease_expires_at.isoformat() if self.lease_expires_at else None,
            "heartbeat_at": self.heartbeat_at.isoformat() if self.heartbeat_at else None,
        }
