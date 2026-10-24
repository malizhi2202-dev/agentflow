"""团队与小隊服务（R5-3 / R5-4 / R5-6）。

硬口径（写在服务层，不靠提示词）：
- **非成员一律 404**（不泄露团队存在性，不用 403 探测）；
- **Team 不可被指派**：指派目标只有 member / agent / squad 三轨；
- **Squad 不拥有资产**：`team_id` 永远只能挂在 Team 上；
- **指派小队 = 给 leader 入队一条 leader 任务**（同 (任务, Agent) 活跃去重），成员不抢单；
- **归档只停未来指派**：在跑 run 不自动取消（要停走显式停运行动作）；
- leader 必须是 Agent 且不可归档：归档已被归档的 leader → 409 `leader_bound`。
"""
from __future__ import annotations

import datetime
import re

from sqlalchemy import func
from sqlalchemy.orm import Session

from models.agent import Agent
from models.collab import WorkItem
from models.domain import Domain
from models.knowledge_source import KnowledgeSource
from models.metrics import SessionMetric
from models.teams import (
    MEMBER_ROLES,
    OWNER_KINDS,
    SQUAD_STATUSES,
    TEAM_ASSET_KINDS,
    TEAM_STATUSES,
    Squad,
    SquadMember,
    Team,
    TeamMember,
)
from models.tool import Tool
from models.workflow import Workflow

SLUG_RE = re.compile(r"^[a-z][a-z0-9-]{1,31}$")

# 团队 token 配额窗口：近 30 天（软=告警不拦 / 硬=拒绝新增指派）
TOKEN_WINDOW_DAYS = 30

# 五类资产 → ORM 类（首批；编排实例与模板次批）
ASSET_MODELS = {
    "agents": Agent,
    "workflows": Workflow,
    "tools": Tool,
    "knowledge_sources": KnowledgeSource,
    "domains": Domain,
}


class TeamError(ValueError):
    """业务非法（路由映射 400/409）。"""


class TeamConflict(TeamError):
    """与现有状态冲突（路由映射 409）：slug 占用、leader 已归档、已归档不可再动。"""


class NotFound(LookupError):
    """不存在或无权（路由统一 404）。"""


class Rejection(TeamError):
    """带拒因码的拒绝（路由映射 status_code + {"code","message"}，拒因原样回给界面）。"""

    def __init__(self, code: str, message: str, status_code: int = 403):
        super().__init__(message)
        self.code = code
        self.status_code = status_code


def _now() -> datetime.datetime:
    return datetime.datetime.utcnow()


def _is_admin(user: dict) -> bool:
    return user.get("role") == "admin"


def can_invoke(db: Session, user: dict, agent: Agent) -> bool:
    """§2.11「可见 ≠ 可运行」：可调用 = 未归档/停用 且（公开 或 我是 owner）。

    **管理员不旁路**（canInvokeAgent 拒绝 admin 旁路）——可见性走 is_admin，可调用性不走。
    精确 ACL 待 P1-13 归因落地；当前按 owner_id + visibility 两列判定。
    """
    if agent is None:
        return False
    if agent.status in ("archived", "disabled"):
        return False
    return agent.visibility == "public" or agent.owner_id == user["id"]


# ── 团队读取与成员校验 ────────────────────────────────────

def _find_team(db: Session, ref: str) -> Team | None:
    if ref.isdigit():
        return db.query(Team).filter(Team.id == int(ref)).first()
    return db.query(Team).filter(Team.slug == ref).first()


def member_role(db: Session, team: Team, user_id: str) -> str | None:
    row = db.query(TeamMember).filter(
        TeamMember.team_id == team.id, TeamMember.user_id == user_id,
    ).first()
    return row.role if row else None


def get_for_member(db: Session, user: dict, ref: str) -> Team:
    """按 slug/id 取团队；非成员（且非平台管理员）→ NotFound（路由 404）。"""
    team = _find_team(db, ref)
    if team is None:
        raise NotFound("团队不存在")
    if user.get("role") == "admin":
        return team
    if member_role(db, team, user["id"]) is None:
        raise NotFound("团队不存在")
    return team


def list_for_user(db: Session, user: dict) -> list[dict]:
    if user.get("role") == "admin":
        teams = db.query(Team).order_by(Team.id.asc()).all()
    else:
        ids = [r.team_id for r in db.query(TeamMember).filter(
            TeamMember.user_id == user["id"]
        ).all()]
        if not ids:
            return []
        teams = db.query(Team).filter(Team.id.in_(ids)).order_by(Team.id.asc()).all()
    return [_team_dict(db, t) for t in teams]


def _team_dict(db: Session, team: Team) -> dict:
    data = team.to_dict()
    data["member_count"] = db.query(TeamMember).filter(TeamMember.team_id == team.id).count()
    data["asset_counts"] = asset_counts(db, team)
    return data


def asset_counts(db: Session, team: Team) -> dict:
    return {
        kind: db.query(model).filter(model.team_id == team.id).count()
        for kind, model in ASSET_MODELS.items()
    }


# ── 团队写操作 ────────────────────────────────────────────

def create_team(db: Session, user: dict, slug: str, name: str,
                owner_user_id: str | None = None, description: str = "",
                quotas: dict | None = None) -> Team:
    if not SLUG_RE.match(slug or ""):
        raise TeamError("slug 必须匹配 ^[a-z][a-z0-9-]{1,31}$")
    if not (name or "").strip():
        raise TeamError("name 不能为空")
    if db.query(Team).filter(Team.slug == slug).first() is not None:
        raise TeamConflict("slug 已被占用")
    owner = owner_user_id or user["id"]
    team = Team(slug=slug, name=name.strip(), description=description or "",
                owner_user_id=owner, status="active")
    for key, value in (quotas or {}).items():
        if hasattr(team, key):
            setattr(team, key, int(value))
    db.add(team)
    db.commit()
    db.refresh(team)
    # 创建只建 Team 行 + Owner 成员行，不动任何资产表
    db.add(TeamMember(team_id=team.id, user_id=owner, role="owner"))
    if owner != user["id"]:
        db.add(TeamMember(team_id=team.id, user_id=user["id"], role="admin"))
    db.commit()
    return team


def add_member(db: Session, team: Team, user_id: str, role: str = "member") -> TeamMember:
    if role not in MEMBER_ROLES:
        raise TeamError(f"role 必须是 {sorted(MEMBER_ROLES)} 之一")
    if role == "owner":
        raise TeamError("owner 只能通过转让产生")
    if member_role(db, team, user_id) is not None:
        raise TeamError("成员已存在")
    if team.status == "archived":
        raise TeamError("团队已归档，不能再加成员")
    count = db.query(TeamMember).filter(TeamMember.team_id == team.id).count()
    if count >= team.max_members:
        raise TeamError(f"成员数已达上限 {team.max_members}")
    row = TeamMember(team_id=team.id, user_id=user_id, role=role)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def remove_member(db: Session, team: Team, user_id: str) -> bool:
    row = db.query(TeamMember).filter(
        TeamMember.team_id == team.id, TeamMember.user_id == user_id,
    ).first()
    if row is None:
        return False
    if row.role == "owner":
        raise TeamError("不能移除 owner（要走转让）")
    db.delete(row)
    db.commit()
    return True


def transfer_owner(db: Session, team: Team, new_owner: str, confirm: bool) -> Team:
    """转让 owner = 双人确认动作；不接受「离职自动顺延」。"""
    if not confirm:
        raise TeamError("转让 owner 需要 confirm=true（双人确认）")
    if member_role(db, team, new_owner) is None:
        raise TeamError("新 owner 必须是团队在职成员")
    old = db.query(TeamMember).filter(
        TeamMember.team_id == team.id, TeamMember.user_id == team.owner_user_id,
    ).first()
    if old is not None:
        old.role = "admin"
    new = db.query(TeamMember).filter(
        TeamMember.team_id == team.id, TeamMember.user_id == new_owner,
    ).first()
    new.role = "owner"
    team.owner_user_id = new_owner
    team.updated_at = _now()
    db.commit()
    db.refresh(team)
    return team


def set_status(db: Session, team: Team, status: str) -> Team:
    if status not in TEAM_STATUSES:
        raise TeamError(f"status 必须是 {sorted(TEAM_STATUSES)} 之一")
    team.status = status
    team.updated_at = _now()
    db.commit()
    db.refresh(team)
    return team


# ── 资产归属（五类）───────────────────────────────────────

def list_assets(db: Session, team: Team) -> dict:
    out: dict[str, list[dict]] = {kind: [] for kind in TEAM_ASSET_KINDS}
    for kind, model in ASSET_MODELS.items():
        rows = db.query(model).filter(model.team_id == team.id).all()
        out[kind] = [
            {
                "id": row.id,
                "name": getattr(row, "name", ""),
                "owner_id": getattr(row, "owner_id", None),
                "owner_kind": getattr(row, "owner_kind", "personal"),
                "team_id": row.team_id,
            }
            for row in rows
        ]
    return out


def _asset(db: Session, kind: str, asset_id: int):
    model = ASSET_MODELS.get(kind)
    if model is None:
        raise TeamError(f"不支持的资产类型: {kind}（首批仅 {sorted(ASSET_MODELS)}）")
    row = db.query(model).filter(model.id == asset_id).first()
    if row is None:
        raise NotFound("资产不存在")
    return row


def claim_asset(db: Session, team: Team, actor: str, kind: str, asset_id: int) -> dict:
    """把个人资产挂到团队（一次转让 + 审计）：之后原个人不再自动共享。"""
    if team.status == "archived":
        raise TeamError("团队已归档，不能再挂资产")
    row = _asset(db, kind, asset_id)
    if row.team_id == team.id:
        return {"id": row.id, "team_id": row.team_id, "owner_kind": row.owner_kind}
    if row.team_id is not None:
        raise TeamError("资产已属于其他团队（一个资产只属于一个 team，不做多归属）")
    if actor != getattr(row, "owner_id", actor):
        raise TeamError("只能转让自己的资产")
    # 对象计数配额
    cap = {"agents": team.max_agents, "workflows": team.max_workflows}.get(kind)
    if cap is not None:
        used = db.query(ASSET_MODELS[kind]).filter(
            ASSET_MODELS[kind].team_id == team.id
        ).count()
        if used >= cap:
            raise TeamError(f"{TEAM_ASSET_KINDS[kind]} 数量已达上限 {cap}")
    row.team_id = team.id
    row.owner_kind = "team"
    db.commit()
    return {"id": row.id, "team_id": row.team_id, "owner_kind": row.owner_kind}


def release_asset(db: Session, team: Team, actor: str, kind: str, asset_id: int) -> dict:
    row = _asset(db, kind, asset_id)
    if row.team_id != team.id:
        return {"id": row.id, "team_id": row.team_id, "owner_kind": row.owner_kind}
    row.team_id = None
    row.owner_kind = "personal"
    db.commit()
    return {"id": row.id, "team_id": row.team_id, "owner_kind": row.owner_kind}


# ── 小队 ──────────────────────────────────────────────────

def _squad(db: Session, ref: str) -> Squad:
    if ref.isdigit():
        squad = db.query(Squad).filter(Squad.id == int(ref)).first()
    else:
        squad = db.query(Squad).filter(Squad.slug == ref).first()
    if squad is None:
        raise NotFound("小队不存在")
    return squad


def list_squads(db: Session) -> list[dict]:
    return [_squad_dict(db, s) for s in db.query(Squad).order_by(Squad.id.asc()).all()]


def _squad_dict(db: Session, squad: Squad) -> dict:
    data = squad.to_dict()
    leader = db.query(Agent).filter(Agent.id == squad.leader_agent_id).first()
    data["leader_name"] = leader.name if leader else None
    data["leader_archived"] = bool(leader and leader.status in ("archived", "disabled"))
    data["members"] = [
        m.to_dict() for m in db.query(SquadMember).filter(
            SquadMember.squad_id == squad.id
        ).order_by(SquadMember.id.asc()).all()
    ]
    return data


def create_squad(db: Session, slug: str, name: str, leader_agent_id: int,
                 instructions: str = "") -> Squad:
    if not SLUG_RE.match(slug or ""):
        raise TeamError("slug 必须匹配 ^[a-z][a-z0-9-]{1,31}$")
    if not (name or "").strip():
        raise TeamError("name 不能为空")
    if db.query(Squad).filter(Squad.slug == slug).first() is not None:
        raise TeamConflict("slug 已被占用")
    leader = db.query(Agent).filter(Agent.id == leader_agent_id).first()
    if leader is None:
        raise TeamError("leader Agent 不存在")
    if leader.status in ("archived", "disabled"):
        raise TeamConflict("leader Agent 已归档/停用，不能担任 leader（leader_bound）")
    squad = Squad(slug=slug, name=name.strip(), leader_agent_id=leader_agent_id,
                  instructions=instructions or "", status="active")
    db.add(squad)
    db.commit()
    db.refresh(squad)
    return squad


def add_squad_member(db: Session, squad: Squad, member_kind: str, member_id: str) -> SquadMember:
    if member_kind not in ("agent", "member"):
        raise TeamError("member_kind 只能是 agent | member")
    if squad.status == "archived":
        raise TeamError("小队已归档，不能再加成员")
    exists = db.query(SquadMember).filter(
        SquadMember.squad_id == squad.id,
        SquadMember.member_kind == member_kind,
        SquadMember.member_id == member_id,
    ).first()
    if exists is not None:
        raise TeamError("成员已在池中")
    row = SquadMember(squad_id=squad.id, member_kind=member_kind, member_id=member_id)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def remove_squad_member(db: Session, squad: Squad, member_kind: str, member_id: str) -> bool:
    row = db.query(SquadMember).filter(
        SquadMember.squad_id == squad.id,
        SquadMember.member_kind == member_kind,
        SquadMember.member_id == member_id,
    ).first()
    if row is None:
        return False
    db.delete(row)
    db.commit()
    return True


def archive_squad(db: Session, squad: Squad) -> Squad:
    """归档 = 停未来指派；**在跑 run 不自动取消**（要停走显式停运行动作）。"""
    leader = db.query(Agent).filter(Agent.id == squad.leader_agent_id).first()
    if leader is not None and leader.status in ("archived", "disabled"):
        raise TeamConflict("leader Agent 已归档：归档该小队会让它失去执行者（leader_bound）")
    squad.status = "archived"
    squad.updated_at = _now()
    db.commit()
    db.refresh(squad)
    return squad


def assign_task_to_squad(db: Session, squad: Squad, actor: str, task_id: int) -> dict:
    """指派小队 = 给 leader 入队一条 leader 任务（成员不抢单）。

    同 (任务, Agent) 的活跃 leader 任务合并去重——重复指派不会产生两条。
    """
    if squad.status == "archived":
        raise TeamError("小队已归档：只停未来指派，如需继续请先恢复")
    item = db.query(WorkItem).filter(WorkItem.id == task_id).first()
    if item is None:
        raise NotFound("任务不存在")
    existing = db.query(WorkItem).filter(
        WorkItem.parent_id == item.id,
        WorkItem.squad_id == squad.id,
        WorkItem.is_leader_task == 1,
        WorkItem.status.notin_(("done", "cancelled")),
    ).first()
    if existing is not None:
        return {"ok": True, "deduped": True, "leader_task": existing.to_dict()}

    item.assignee_kind = "squad"
    item.assignee_id = str(squad.id)
    item.updated_at = _now()
    leader_task = WorkItem(
        title=f"[leader] {item.title}",
        description=f"由小队 {squad.name} 承接的任务 #{item.id}；成员不抢单，委派只在 leader 评论流里。",
        creator_id=actor,
        status="todo",
        triage_state="triaged",
        assignee_kind="agent",
        assignee_id=str(squad.leader_agent_id),
        priority=item.priority,
        parent_id=item.id,
        squad_id=squad.id,
        is_leader_task=1,
        team_id=item.team_id,
    )
    db.add(leader_task)
    db.commit()
    db.refresh(leader_task)
    return {"ok": True, "deduped": False, "leader_task": leader_task.to_dict()}
