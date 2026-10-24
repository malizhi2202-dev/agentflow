"""协作层服务（P1-4）— 任务状态机 / 订阅 / 收件箱三规则。

状态机（**在状态转换层校验**，不写进提示词——CLAUDE.md 的硬规矩）：
- `status` 四类（unstarted/started/done/closed）+ `blocked` 显式例外；
- 只允许白名单里的转移；非法转移抛 `TransitionError`（路由映射 400）；
- 状态标签不授予行为：进 in_progress **不会**自动启动 Agent，指派也不等于运行。

收件箱三规则（§6.0 ⑫）：
1. **值得打扰才 ping**：只有 `action_required` 的条目进「需我处理」并计数；其余进「已读」折叠组；
2. **读失败宁多发不漏发**：读取异常向外抛，绝不 catch 成空列表（漏发会把任务困住）；
3. **旧失败随任务推进自愈归档**：任务到达「交还给人」状态（in_review / done / cancelled）时，
   该任务的 `task_failed` / `run_failed` 条目批量归档；`blocked` 是显式例外。
"""
from __future__ import annotations

import datetime
import json

from sqlalchemy.orm import Session

from models.collab import (
    HANDED_BACK_TO_HUMAN,
    ASSIGNEE_KINDS,
    TRIAGE_STATES,
    InboxItem,
    WorkItem,
    WorkItemRun,
    WorkItemSubscription,
)

# 状态转移白名单：只认这里，其余一律拒绝
TRANSITIONS: dict[str, set[str]] = {
    "backlog": {"todo", "cancelled"},
    "todo": {"in_progress", "backlog", "cancelled"},
    "in_progress": {"in_review", "blocked", "todo", "cancelled"},
    "in_review": {"done", "in_progress", "cancelled"},
    "blocked": {"in_progress", "todo", "cancelled"},
    "done": {"in_progress"},      # 允许重开，但必须显式
    "cancelled": set(),           # 终态
}

# 失败类事件：任务交还给人后自愈归档
FAILURE_EVENTS = ("task_failed", "run_failed")

# 需要人拍板的事件（进「需我处理」并 ping）
ACTION_REQUIRED_EVENTS = ("assigned", "mentioned", "task_failed", "review_requested")


class TransitionError(ValueError):
    """非法状态转移（路由映射 400）。"""


class InboxError(ValueError):
    """收件箱操作非法（路由映射 400）。"""


def _now() -> datetime.datetime:
    return datetime.datetime.utcnow()


# ── 任务 ──────────────────────────────────────────────────

def create_item(db: Session, creator: str, title: str, description: str = "",
                assignee_kind: str | None = None, assignee_id: str | None = None,
                priority: int = 50, due_date: str | None = None,
                parent_id: int | None = None, team_id: str | None = None,
                accountable_id: str | None = None) -> WorkItem:
    if not title.strip():
        raise ValueError("title 不能为空")
    if not (creator or "").strip():
        # R8-2 fail-closed：算不出链顶人类就不建任务，不猜、不回退 admin
        raise ValueError("缺创建者：归因无法确定，拒绝创建")
    if assignee_kind is not None and assignee_kind not in ASSIGNEE_KINDS:
        raise ValueError(f"assignee_kind 必须是 {sorted(ASSIGNEE_KINDS)} 之一")
    if assignee_kind is None and assignee_id is not None:
        raise ValueError("给了 assignee_id 就必须给 assignee_kind")
    item = WorkItem(
        title=title.strip(), description=description or "", creator_id=creator,
        assignee_kind=assignee_kind, assignee_id=assignee_id,
        priority=priority, due_date=due_date, parent_id=parent_id, team_id=team_id,
        # R8-2：创建者（人类）即 originator；accountable 缺省同源
        originator_id=creator, accountable_id=accountable_id or creator,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    subscribe(db, item, creator, source="creator")
    if assignee_kind == "member" and assignee_id:
        subscribe(db, item, assignee_id, source="assignee")
        notify(db, item, "assigned", actor=creator, action_required=True)
    return item


def subscribe(db: Session, item: WorkItem, user_id: str, source: str = "commenter") -> None:
    """订阅只增不减：已有记录不重复写，也不覆盖首次来源。"""
    row = db.query(WorkItemSubscription).filter(
        WorkItemSubscription.work_item_id == item.id,
        WorkItemSubscription.user_id == user_id,
    ).first()
    if row is None:
        db.add(WorkItemSubscription(
            work_item_id=item.id, user_id=user_id, source=source, unsubscribed=0,
        ))
        db.commit()


def unsubscribe(db: Session, item: WorkItem, user_id: str) -> bool:
    """退订只挡普通动静；@ 永远穿透（notify 侧按 mentioned 优先）。"""
    row = db.query(WorkItemSubscription).filter(
        WorkItemSubscription.work_item_id == item.id,
        WorkItemSubscription.user_id == user_id,
    ).first()
    if row is None:
        return False
    row.unsubscribed = 1
    db.commit()
    return True


def change_status(db: Session, item: WorkItem, user: str, new_status: str,
                  evidence: list[dict] | None = None) -> dict:
    """状态转移（唯一入口）。返回 {'warnings': [...], 'archived_notifications': N}。"""
    current = item.status
    if new_status not in TRANSITIONS:
        raise TransitionError(f"未知状态: {new_status}")
    if new_status == current:
        return {"warnings": [], "archived_notifications": 0}
    if new_status not in TRANSITIONS[current]:
        raise TransitionError(f"不允许的状态转移: {current} → {new_status}")

    warnings: list[str] = []
    if new_status == "done":
        evidence = evidence if evidence is not None else json.loads(item.evidence_json or "[]")
        if not evidence:
            # R0-2：done 需证据是**建议层**——不拦，但要留痕，界面可见
            item.evidence_warned = 1
            warnings.append("done_without_evidence")

    item.status = new_status
    item.updated_at = _now()
    if evidence is not None:
        item.evidence_json = json.dumps(evidence, ensure_ascii=False)
    db.commit()

    # 规则③：交还给人（blocked 例外）→ 历史失败通知自愈归档
    archived = 0
    if new_status in HANDED_BACK_TO_HUMAN:
        archived = archive_failures(db, item)

    # 规则①：进 in_review = 待人验收，属需决策事件；其它普通状态变化只进折叠组
    if new_status == "in_review":
        notify(db, item, "review_requested", actor=user, action_required=True)
    else:
        notify(db, item, "status", actor=user, action_required=False,
               body=f"{current} → {new_status}")
    return {"warnings": warnings, "archived_notifications": archived}


def assign(db: Session, item: WorkItem, actor: str, kind: str, assignee_id: str) -> WorkItem:
    if kind not in ASSIGNEE_KINDS:
        raise ValueError(f"assignee_kind 必须是 {sorted(ASSIGNEE_KINDS)} 之一")
    if not assignee_id:
        raise ValueError("assignee_id 不能为空")
    old = item.assignee_id
    item.assignee_kind = kind
    item.assignee_id = assignee_id
    item.updated_at = _now()
    db.commit()
    if kind == "member":
        subscribe(db, item, assignee_id, source="assignee")
    notify(db, item, "assigned", actor=actor, action_required=True)
    if old and old != assignee_id:
        notify(db, item, "unassigned", actor=actor, action_required=False,
               body=f"负责人已改派给 {assignee_id}")
    return item


def add_comment(db: Session, item: WorkItem, actor: str, body: str,
                mentions: list[str] | None = None) -> dict:
    """评论只落订阅关系与收件箱（任务本体暂无评论表，全文留在调用方）。"""
    mentions = mentions or []
    for uid in mentions:
        subscribe(db, item, uid, source="mentioned")
    # 评论者自动订阅
    subscribe(db, item, actor, source="commenter")
    if mentions:
        notify(db, item, "mentioned", actor=actor, action_required=True,
               body=body, mentions=mentions)
    else:
        notify(db, item, "comment", actor=actor, action_required=False, body=body)
    return {"ok": True, "mentioned": len(mentions)}


def record_run(db: Session, item: WorkItem, run_id: str, status: str = "queued",
               agent_id: int | None = None, summary: str = "",
               evidence: list[dict] | None = None) -> WorkItemRun:
    if status not in ("queued", "running", "succeeded", "failed"):
        raise ValueError(f"未知运行状态: {status}")
    now = _now()
    run = WorkItemRun(
        work_item_id=item.id, run_id=run_id, agent_id=agent_id, status=status,
        summary=summary, evidence_json=json.dumps(evidence or [], ensure_ascii=False),
        # R8-2：运行的归因继承任务（谁鉴权/谁记账两列分开传，不合并）
        originator_id=item.originator_id or item.creator_id,
        accountable_id=item.accountable_id or item.originator_id or item.creator_id,
        started_at=now if status in ("running", "succeeded", "failed") else None,
        finished_at=now if status in ("succeeded", "failed") else None,
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    if status == "failed":
        # task_failed：重试打满/不自动重试的运行失败升格为需决策
        notify(db, item, "task_failed", actor=agent_id and f"agent:{agent_id}" or "system",
               action_required=True, body=summary or f"运行 {run_id} 失败")
    return run


# ── 收件箱 ────────────────────────────────────────────────

def _recipients(db: Session, item: WorkItem, mentions: list[str] | None) -> dict[str, str]:
    """返回 {user_id: relation}；relation 优先级 mentioned > responsible > subscribed。"""
    out: dict[str, str] = {}
    subs = db.query(WorkItemSubscription).filter(
        WorkItemSubscription.work_item_id == item.id,
        WorkItemSubscription.unsubscribed == 0,
    ).all()
    for s in subs:
        out[s.user_id] = "subscribed"
    if item.creator_id:
        out[item.creator_id] = "responsible"
    if item.assignee_kind == "member" and item.assignee_id:
        out[item.assignee_id] = "responsible"
    for uid in (mentions or []):
        out[uid] = "mentioned"
    return out


def notify(db: Session, item: WorkItem, event_type: str, actor: str,
           action_required: bool = False, body: str = "",
           mentions: list[str] | None = None, title: str | None = None) -> int:
    """写收件箱（合并键 = 任务本身；自己的动作不进自己的箱）。返回触达人数。"""
    recipients = _recipients(db, item, mentions)
    touched = 0
    for user_id, relation in recipients.items():
        if user_id == actor:
            continue  # 自己的动作不进箱，否则自己把自己淹死
        touched += _upsert_inbox(
            db, user_id=user_id, item=item, event_type=event_type,
            relation=relation, action_required=action_required,
            body=body, title=title or item.title,
        )
    return touched


def _upsert_inbox(db: Session, user_id: str, item: WorkItem, event_type: str,
                  relation: str, action_required: bool, body: str, title: str) -> int:
    now = _now()
    row = db.query(InboxItem).filter(
        InboxItem.user_id == user_id,
        InboxItem.work_item_id == item.id,
    ).first()
    is_failure = event_type in FAILURE_EVENTS
    if row is None:
        row = InboxItem(
            user_id=user_id, work_item_id=item.id, event_type=event_type,
            relation=relation, title=title, body=body,
            action_required=1 if action_required else 0,
            has_failure=1 if is_failure else 0, merged_count=1,
        )
        db.add(row)
    else:
        # 同一任务的多次动静合并为一条；新的需决策事件重新浮出（清已读与归档）
        row.merged_count += 1
        row.event_type = event_type if action_required or row.read_at is None else row.event_type
        row.relation = relation
        row.title = title
        row.body = body or row.body
        row.updated_at = now
        if is_failure:
            row.has_failure = 1
        if action_required:
            row.action_required = 1
            row.read_at = None
            row.archived_at = None
    db.commit()
    return 1


def archive_failures(db: Session, item: WorkItem) -> int:
    """规则③：把该任务的历史失败通知批量归档（所有收件人）。"""
    now = _now()
    count = db.query(InboxItem).filter(
        InboxItem.work_item_id == item.id,
        InboxItem.has_failure == 1,
        InboxItem.archived_at.is_(None),
    ).update({InboxItem.archived_at: now}, synchronize_session=False)
    db.commit()
    return int(count or 0)


def inbox_for(db: Session, user_id: str, include_archived: bool = False,
              include_read: bool = True, limit: int = 100) -> dict:
    """读收件箱。**读失败不吞异常**（规则②：宁多发不漏发）。"""
    q = db.query(InboxItem).filter(InboxItem.user_id == user_id)
    if not include_archived:
        q = q.filter(InboxItem.archived_at.is_(None))
    if not include_read:
        q = q.filter(InboxItem.read_at.is_(None))
    rows = q.order_by(InboxItem.updated_at.desc()).limit(limit).all()

    items = [r.to_dict() for r in rows]
    action = [r for r in items if r["action_required"] and not r["read"]]
    muted = [r for r in items if not (r["action_required"] and not r["read"])]
    return {
        "action_required": action,
        "muted": muted,
        "total": len(items),
        "unread_count": sum(1 for r in items if not r["read"]),
        "unarchived_count": sum(1 for r in items if not r["archived"]),
    }


def inbox_count(db: Session, user_id: str) -> dict:
    base = db.query(InboxItem).filter(
        InboxItem.user_id == user_id, InboxItem.archived_at.is_(None),
    )
    return {
        "unread": base.filter(InboxItem.read_at.is_(None)).count(),
        "action_required": base.filter(
            InboxItem.read_at.is_(None), InboxItem.action_required == 1,
        ).count(),
    }


def _owned_row(db: Session, user_id: str, inbox_id: int) -> InboxItem:
    row = db.query(InboxItem).filter(
        InboxItem.id == inbox_id, InboxItem.user_id == user_id,
    ).first()
    # 越权与不存在统一处理，不给探测空间
    if row is None:
        raise InboxError("通知不存在")
    return row


def mark_read(db: Session, user_id: str, inbox_id: int) -> InboxItem:
    row = _owned_row(db, user_id, inbox_id)
    if row.read_at is None:
        row.read_at = _now()
        db.commit()
    return row


def mark_all_read(db: Session, user_id: str) -> int:
    count = db.query(InboxItem).filter(
        InboxItem.user_id == user_id, InboxItem.read_at.is_(None),
    ).update({InboxItem.read_at: _now()}, synchronize_session=False)
    db.commit()
    return int(count or 0)


def archive(db: Session, user_id: str, inbox_id: int) -> InboxItem:
    row = _owned_row(db, user_id, inbox_id)
    if row.archived_at is None:
        row.archived_at = _now()
        db.commit()
    return row


def archive_read(db: Session, user_id: str, only_closed_tasks: bool = False) -> int:
    """批量归档：已读条目；`only_closed_tasks` 时额外只归档任务已终结（done/cancelled）的."""
    q = db.query(InboxItem).filter(
        InboxItem.user_id == user_id,
        InboxItem.archived_at.is_(None),
        InboxItem.read_at.isnot(None),
    )
    if only_closed_tasks:
        closed_ids = [
            i for (i,) in db.query(WorkItem.id).filter(
                WorkItem.status.in_(("done", "cancelled"))
            ).all()
        ]
        if not closed_ids:
            return 0
        q = q.filter(InboxItem.work_item_id.in_(closed_ids))
    count = q.update({InboxItem.archived_at: _now()}, synchronize_session=False)
    db.commit()
    return int(count or 0)
