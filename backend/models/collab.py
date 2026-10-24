"""协作层 ORM 模型（P1-4）— 任务 / 运行连接 / 订阅 / 收件箱。

设计口径（PRODUCT-DESIGN v20 §1.6.2 P1-4 · §6.0 ⑫）：
- **任务 = 上下文容器**：`status`（四类状态 + blocked）与 `triage_state` 是**正交**两维；
  状态标签不授予行为，进入状态也不启动 Agent。
- **负责人三轨**：`assignee_kind ∈ {member, agent, squad}` + `assignee_id`（波 4 再与外键对齐）。
- **任务 ↔ 运行**：`work_item_runs` 连接表，一次运行一条；失败/成功都可回放。
- **收件箱 = 指针，不是副本**：只记「哪儿、动了什么、为什么值得你看」，全文在任务上。
"""

import datetime

from sqlalchemy import DateTime, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from models import Base

# 状态 → 类别（四类：unstarted / started / done / closed）
STATUS_CATEGORY: dict[str, str] = {
    "backlog": "unstarted",
    "todo": "unstarted",
    "in_progress": "started",
    "in_review": "started",
    "blocked": "started",
    "done": "done",
    "cancelled": "closed",
}

# 「交还给人」的状态：任务进入这些状态后，其历史运行失败通知自愈归档（blocked 显式例外）
HANDED_BACK_TO_HUMAN: frozenset[str] = frozenset({"in_review", "done", "cancelled"})

ASSIGNEE_KINDS: frozenset[str] = frozenset({"member", "agent", "squad"})
TRIAGE_STATES: frozenset[str] = frozenset({"needs_triage", "triaged"})


class WorkItem(Base):
    __tablename__ = "work_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    # 任务归属（波 4 建 Team 后回填；现在可空 = 未归属）
    team_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    creator_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(24), default="backlog", index=True)
    triage_state: Mapped[str] = mapped_column(String(16), default="needs_triage", index=True)
    assignee_kind: Mapped[str | None] = mapped_column(String(16), nullable=True, index=True)
    assignee_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    priority: Mapped[int] = mapped_column(Integer, default=50)
    due_date: Mapped[str | None] = mapped_column(String(32), nullable=True)
    parent_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    # 指派给小队 = 给 leader 入队一条 leader 任务（同 (任务, Agent) 活跃去重）
    squad_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    is_leader_task: Mapped[int] = mapped_column(Integer, default=0, index=True)
    # done 证据（[{label, ref}]）；缺失不阻断（R0-2：硬门不拦，留建议层），但会记 warned
    evidence_json: Mapped[str] = mapped_column(Text, default="[]")
    evidence_warned: Mapped[int] = mapped_column(Integer, default=0)
    # R8-2 归因双列：originator 只鉴权 / accountable 只审计与成本（不许一列兼两职）
    originator_id: Mapped[str] = mapped_column(String(64), default="", index=True)
    accountable_id: Mapped[str] = mapped_column(String(64), default="", index=True)
    archived_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow, index=True
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )

    @property
    def status_category(self) -> str:
        return STATUS_CATEGORY.get(self.status, "unstarted")

    def to_dict(self) -> dict:
        import json

        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "team_id": self.team_id,
            "creator_id": self.creator_id,
            "status": self.status,
            "status_category": self.status_category,
            "triage_state": self.triage_state,
            "assignee_kind": self.assignee_kind,
            "assignee_id": self.assignee_id,
            "priority": self.priority,
            "due_date": self.due_date,
            "parent_id": self.parent_id,
            "squad_id": self.squad_id,
            "is_leader_task": bool(self.is_leader_task),
            "evidence": json.loads(self.evidence_json or "[]"),
            "evidence_warned": bool(self.evidence_warned),
            "originator_id": self.originator_id or "",
            "accountable_id": self.accountable_id or "",
            "archived_at": self.archived_at.isoformat() if self.archived_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class WorkItemRun(Base):
    """任务 ↔ 运行连接（一次 Agent/人运行一条）."""

    __tablename__ = "work_item_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    work_item_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    run_id: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    agent_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(16), default="queued", index=True)
    # queued | running | succeeded | failed
    summary: Mapped[str] = mapped_column(Text, default="")
    evidence_json: Mapped[str] = mapped_column(Text, default="[]")
    # R8-2：运行侧同样双列（谁鉴权 / 谁记账分开）
    originator_id: Mapped[str] = mapped_column(String(64), default="", index=True)
    accountable_id: Mapped[str] = mapped_column(String(64), default="", index=True)
    started_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)
    finished_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )

    def to_dict(self) -> dict:
        import json

        return {
            "id": self.id,
            "work_item_id": self.work_item_id,
            "run_id": self.run_id,
            "agent_id": self.agent_id,
            "status": self.status,
            "summary": self.summary,
            "evidence": json.loads(self.evidence_json or "[]"),
            "originator_id": self.originator_id or "",
            "accountable_id": self.accountable_id or "",
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "finished_at": self.finished_at.isoformat() if self.finished_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class WorkItemSubscription(Base):
    """订阅只增不减；退订只挡普通动静，@ 永远穿透。"""

    __tablename__ = "work_item_subscriptions"
    __table_args__ = (UniqueConstraint("work_item_id", "user_id", name="ux_work_item_sub"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    work_item_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    # creator | assignee | commenter | mentioned | automation
    source: Mapped[str] = mapped_column(String(16), default="creator")
    unsubscribed: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )


class InboxItem(Base):
    """收件箱条目 = 指针；同一任务（同一人）合并为一条。"""

    __tablename__ = "inbox_items"
    __table_args__ = (UniqueConstraint("user_id", "work_item_id", name="ux_inbox_user_item"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    work_item_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    # assigned | unassigned | mentioned | comment | status | priority | date |
    # reactions | task_failed | quick_create | automation
    event_type: Mapped[str] = mapped_column(String(24), default="status", index=True)
    # mentioned | subscribed | responsible —— 进箱必须命中其一
    relation: Mapped[str] = mapped_column(String(16), default="responsible", index=True)
    title: Mapped[str] = mapped_column(String(255), default="")
    body: Mapped[str] = mapped_column(Text, default="")
    action_required: Mapped[int] = mapped_column(Integer, default=0, index=True)
    # 合并键=任务会把多条动静折成一行；失败这件事必须单独记，
    # 否则后续普通状态变化覆盖 event_type 后，规则③就再也归档不到它了。
    has_failure: Mapped[int] = mapped_column(Integer, default=0, index=True)
    merged_count: Mapped[int] = mapped_column(Integer, default=1)
    read_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)
    archived_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow, index=True
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "work_item_id": self.work_item_id,
            "event_type": self.event_type,
            "relation": self.relation,
            "title": self.title,
            "body": self.body,
            "action_required": bool(self.action_required),
            "has_failure": bool(self.has_failure),
            "merged_count": self.merged_count,
            "read": self.read_at is not None,
            "archived": self.archived_at is not None,
            "read_at": self.read_at.isoformat() if self.read_at else None,
            "archived_at": self.archived_at.isoformat() if self.archived_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
