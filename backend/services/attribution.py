"""归因双列与归属瀑布（R8-2 · 主档 §7）。

两个**不同**问题，不许用一列兼两职：
- `originator`（归因发起人）→ **只用于鉴权**：谁能替这次动作背书（链顶人类）。
- `accountable`（责任/成本主体）→ **只用于审计与成本记账**：失败算在谁头上。

归属瀑布（fail-closed）：
1. 动作者是 member → originator = 动作者本人（人对自己负责）。
2. 动作者是 agent → 沿任务链 `parent_id` 往上找**链顶人类**（assignee 是 member 就用他，
   否则用任务 `creator_id`）。
3. **读不出人类 → 拒绝**：不猜、不回退 admin、不把 agent 当人类（R8-2 明写 fail-closed）。
4. accountable 缺省 = originator；显式传入的 accountable 由调用方（路由层）负责权限校验。
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from models.attribution import ACCOUNTABLE_KINDS, DomainAttributionPolicy
from models.collab import WorkItem
from models.domain import Domain
from models.teams import Team

MAX_WALK = 32


# ── 域策略（R8-2 剩余面）──────────────────────────────────

def get_policy(db: Session, domain_id: int | None) -> DomainAttributionPolicy | None:
    if not domain_id:
        return None
    return db.query(DomainAttributionPolicy).filter(
        DomainAttributionPolicy.domain_id == domain_id
    ).first()


def set_policy(db: Session, *, domain_id: int, accountable_kind: str,
               accountable_ref: str = "", actor: str = "") -> DomainAttributionPolicy:
    """写策略。非法 kind / member 缺 ref → ValueError（路由 400）。"""
    if accountable_kind not in ACCOUNTABLE_KINDS:
        raise ValueError(f"accountable_kind 必须是 {sorted(ACCOUNTABLE_KINDS)} 之一")
    ref = (accountable_ref or "").strip()
    if accountable_kind == "member" and not ref:
        raise ValueError("accountable_kind=member 时必须给 accountable_ref（成员 user id）")
    row = get_policy(db, domain_id)
    if row is None:
        row = DomainAttributionPolicy(domain_id=domain_id, updated_by=actor)
        db.add(row)
    row.accountable_kind = accountable_kind
    row.accountable_ref = ref if accountable_kind == "member" else ""
    row.updated_by = actor
    db.commit()
    db.refresh(row)
    return row


def resolve_accountable(db: Session, domain_id: int | None, originator: str) -> str:
    """按域策略解析 accountable。**有策略就必须能解析**，否则 fail-closed。"""
    row = get_policy(db, domain_id)
    if row is None:
        return originator                      # 无策略 = 现状
    kind = (row.accountable_kind or "").strip()
    if kind == "originator":
        return originator
    if kind == "member":
        ref = (row.accountable_ref or "").strip()
        if not ref:
            raise AttributionError("域策略指向空成员：归因无法确定，拒绝执行")
        return ref
    if kind == "team_owner":
        domain = db.query(Domain).filter(Domain.id == domain_id).first()
        if domain is None:
            raise AttributionError(f"域 {domain_id} 不存在：策略无法解析，拒绝执行")
        team_id = getattr(domain, "team_id", None)
        if not team_id:
            raise AttributionError("域未归属团队（个人域）：team_owner 策略无法解析，拒绝执行")
        team = db.query(Team).filter(Team.id == team_id).first()
        if team is None or not (team.owner_user_id or "").strip():
            raise AttributionError("域所属团队缺少 owner：策略无法解析，拒绝执行")
        return team.owner_user_id
    raise AttributionError(f"未知的域策略类型 {kind!r}：fail-closed 拒绝")


class AttributionError(ValueError):
    """归因算不出来（fail-closed 拒绝，路由层映射 409）。"""


def _task_human(db: Session, task_id: int, depth: int = 0) -> str:
    if depth > MAX_WALK:
        raise AttributionError("任务链过深（疑似环）：归因无法确定，拒绝执行")
    task = db.query(WorkItem).filter(WorkItem.id == task_id).first()
    if task is None:
        raise AttributionError(f"任务 {task_id} 不存在：归因无法确定，拒绝执行")
    if task.assignee_kind == "member" and task.assignee_id:
        return task.assignee_id
    if task.creator_id:
        return task.creator_id
    if task.parent_id:
        return _task_human(db, task.parent_id, depth + 1)
    raise AttributionError("任务链上读不出人类：归因无法确定，拒绝执行")


def resolve_attribution(db: Session, *, actor_id: str, actor_kind: str = "member",
                        task_id: int | None = None,
                        accountable_id: str | None = None,
                        domain_id: int | None = None) -> dict:
    """返回 {'originator_id', 'accountable_id', 'source'}；算不出即 raise。"""
    if not actor_id:
        raise AttributionError("动作者为空：归因无法确定，拒绝执行")

    if actor_kind == "member":
        originator = actor_id
        source = "actor"
    elif actor_kind == "agent":
        if task_id is None:
            raise AttributionError("Agent 动作必须带任务上下文才能定位链顶人类")
        originator = _task_human(db, task_id)
        source = "parent_chain"
    else:
        raise AttributionError(f"未知动作者类型: {actor_kind}")

    if not originator:
        raise AttributionError("链顶人类为空：归因无法确定，拒绝执行")

    # 缺省同源；显式传入时调用方必须已校验权限（本层不做权限判断）；
    # 给了 domain_id 则按域策略解析（无策略时仍回退 originator，见 resolve_accountable）
    resolved_accountable = accountable_id or resolve_accountable(db, domain_id, originator)
    return {
        "originator_id": originator,
        "accountable_id": resolved_accountable,
        "source": source,
    }


def apply_attribution(db: Session, item: WorkItem, *, actor_id: str,
                      actor_kind: str = "member",
                      accountable_id: str | None = None,
                      domain_id: int | None = None) -> dict:
    """把双列写到任务行上（不动 `creator_id`：创建者语义与归因语义分开）。"""
    resolved = resolve_attribution(db, actor_id=actor_id, actor_kind=actor_kind,
                                   task_id=item.id, accountable_id=accountable_id,
                                   domain_id=domain_id)
    item.originator_id = resolved["originator_id"]
    item.accountable_id = resolved["accountable_id"]
    db.flush()
    return resolved
