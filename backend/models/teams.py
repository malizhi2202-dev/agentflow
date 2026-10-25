"""团队（Team）与小队（Squad）ORM 模型 —— R5-3 / R5-4 / R5-6。

两词两义（禁止混用）：
- **Team 团队** = 组织层资源容器：成员四档 + 五类资产（`team_id` + `owner_kind`）+ 配额 + 审计边界；
  **不可被指派**。
- **Squad 协作小队** = 执行层可指派编组：1 个 leader Agent + 人/Agent 混编 + 自由指令；
  **不拥有任何资产、不是成本主体**。
- 两者**没有外键关系**（「拥有」与「一起干活」是两件事）。
"""

import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from models import Base

# 成员四档：owner 唯一且不可自动顺延；admin 可改配置；member 可用资产；viewer 只读
MEMBER_ROLES: frozenset[str] = frozenset({"owner", "admin", "member", "viewer"})
TEAM_STATUSES: frozenset[str] = frozenset({"active", "paused", "archived"})
SQUAD_STATUSES: frozenset[str] = frozenset({"active", "archived"})
OWNER_KINDS: frozenset[str] = frozenset({"personal", "team", "platform"})

# 首批五类资产（域进首批；编排实例与模板次批）
TEAM_ASSET_KINDS: dict[str, str] = {
    "agents": "Agent",
    "workflows": "工作流",
    "tools": "工具",
    "knowledge_sources": "知识源",
    "domains": "域",
}


class Team(Base):
    __tablename__ = "teams"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(32), nullable=False, unique=True, index=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    owner_user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(16), default="active", index=True)
    # 配额：token 近 30 天（软=告警不拦 / 硬=拦并说明）+ 对象计数上限
    token_soft_limit: Mapped[int] = mapped_column(Integer, default=80000)
    token_hard_limit: Mapped[int] = mapped_column(Integer, default=100000)
    max_agents: Mapped[int] = mapped_column(Integer, default=10)
    max_workflows: Mapped[int] = mapped_column(Integer, default=5)
    max_members: Mapped[int] = mapped_column(Integer, default=20)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "slug": self.slug,
            "name": self.name,
            "description": self.description,
            "owner_user_id": self.owner_user_id,
            "status": self.status,
            "quota": {
                "token_soft_limit": self.token_soft_limit,
                "token_hard_limit": self.token_hard_limit,
                "max_agents": self.max_agents,
                "max_workflows": self.max_workflows,
                "max_members": self.max_members,
            },
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class TeamMember(Base):
    __tablename__ = "team_members"
    __table_args__ = (UniqueConstraint("team_id", "user_id", name="ux_team_member"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    team_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(16), default="member", index=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "team_id": self.team_id,
            "user_id": self.user_id,
            "role": self.role,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Squad(Base):
    __tablename__ = "squads"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(32), nullable=False, unique=True, index=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    # leader 必须是 Agent，且不可归档（归档 leader 会让小队失去执行者）
    # R25-11（v25）：列名 leader_agent_id 保留（行注 v21/v23 已认账，不做破坏性 rename），
    # 但**真外键**补实——新建库由此声明建出；已部署库由迁移 033 在 MySQL 补表级约束
    # （SQLite 存量库无法 ALTER 加 FK，本地体验档豁免、权威档 MySQL 为真）。
    leader_agent_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("agents.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    instructions: Mapped[str] = mapped_column(Text, default="")
    # 主档 §3.3 squad 注的 avatar_url（v25 R25-11 补列）
    avatar_url: Mapped[str] = mapped_column(String(256), default="")
    status: Mapped[str] = mapped_column(String(16), default="active", index=True)
    # 写操作授权：creator 或平台管理员（§2.11「小队不是授权单位」）
    created_by: Mapped[str] = mapped_column(String(64), default="", index=True)
    # 归档不可恢复：archived_at 非空即冻结（原因必填并随快照保留）
    archive_reason: Mapped[str] = mapped_column(Text, default="")
    archived_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)
    # 最近一次评估（P1-12 预留；当前只记时间，不参与判定）
    last_evaluated_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "slug": self.slug,
            "name": self.name,
            "leader_agent_id": self.leader_agent_id,
            "avatar_url": self.avatar_url,
            "instructions": self.instructions,
            "status": self.status,
            "created_by": self.created_by,
            "archive_reason": self.archive_reason,
            "archived_at": self.archived_at.isoformat() if self.archived_at else None,
            "last_evaluated_at": self.last_evaluated_at.isoformat() if self.last_evaluated_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class SquadMember(Base):
    """成员池：Agent 与人混编；入池不授予调用权（委派仍按链顶人类逐次判定）。"""

    __tablename__ = "squad_members"
    __table_args__ = (
        UniqueConstraint("squad_id", "member_kind", "member_id", name="ux_squad_member"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    squad_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    member_kind: Mapped[str] = mapped_column(String(16), default="agent", index=True)
    # agent | member
    member_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    # v23（multica 迁移）：成员角色（member / leader / expert-reviewer）；'' = 未标注
    role: Mapped[str] = mapped_column(String(32), default="")
    # R25-11（v25）：主档 squad_member 注的 created_by（入池动作留痕，'' = 历史行无主）
    created_by: Mapped[str] = mapped_column(String(64), default="")
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "squad_id": self.squad_id,
            "role": self.role or "",
            "member_kind": self.member_kind,
            "member_id": self.member_id,
            "created_by": self.created_by or "",
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
