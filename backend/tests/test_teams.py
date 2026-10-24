"""R5-3/R5-4：Team（组织容器）与 Squad（可指派编组）——两词两义、无外键。"""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("ENCRYPTION_KEY", "test-key-for-ci-32bytes!!")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from models import Base
from models.agent import Agent
from models.collab import WorkItem
from models.teams import Team, TeamMember
from services import collab_service as cs
from services import team_service as ts

ADMIN = {"id": "root", "role": "admin"}
ALICE = {"id": "alice", "role": "member"}
BOB = {"id": "bob", "role": "member"}
CAROL = {"id": "carol", "role": "member"}


class _Base(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
        )
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine, autocommit=False, autoflush=False)
        self.db = self.Session()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def _team(self, slug="agentflow", owner=ALICE):
        return ts.create_team(self.db, owner, slug=slug, name="AgentFlow 平台团队",
                              owner_user_id=owner["id"])

    def _agent(self, name="汇总 Agent", owner="alice", status="active"):
        a = Agent(name=name, owner_id=owner, runtime="claude_code",
                  model_provider="deepseek", model_name="deepseek-flash",
                  api_key_encrypted="", status=status)
        self.db.add(a)
        self.db.commit()
        self.db.refresh(a)
        return a

    def _squad(self, slug="code-review", leader=None):
        leader = leader or self._agent()
        return ts.create_squad(self.db, slug=slug, name="代码审查小队",
                               leader_agent_id=leader.id)


class TestTeamMembers(_Base):
    def test_create_creates_owner_membership(self):
        team = self._team()
        self.assertEqual(team.status, "active")
        rows = self.db.query(TeamMember).filter(TeamMember.team_id == team.id).all()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].user_id, "alice")
        self.assertEqual(rows[0].role, "owner")

    def test_slug_rules_and_conflict(self):
        with self.assertRaises(ts.TeamError):
            ts.create_team(self.db, ALICE, slug="Bad Slug", name="x")
        with self.assertRaises(ts.TeamError):
            ts.create_team(self.db, ALICE, slug="ok-slug", name="  ")
        self._team()
        with self.assertRaises(ts.TeamConflict):
            self._team()

    def test_member_lifecycle_and_quota(self):
        team = self._team()
        team.max_members = 2
        self.db.commit()
        ts.add_member(self.db, team, "bob", "member")
        with self.assertRaises(ts.TeamError):
            ts.add_member(self.db, team, "carol", "member")   # 超上限
        with self.assertRaises(ts.TeamError):
            ts.add_member(self.db, team, "carol", "owner")    # owner 只能转让
        with self.assertRaises(ts.TeamError):
            ts.add_member(self.db, team, "bob", "viewer")     # 重复
        with self.assertRaises(ts.TeamError):
            ts.remove_member(self.db, team, "alice")          # 不能移除 owner
        self.assertTrue(ts.remove_member(self.db, team, "bob"))
        self.assertFalse(ts.remove_member(self.db, team, "bob"))

    def test_transfer_owner_needs_confirm_and_membership(self):
        team = self._team()
        ts.add_member(self.db, team, "bob", "admin")
        with self.assertRaises(ts.TeamError):
            ts.transfer_owner(self.db, team, "bob", confirm=False)
        with self.assertRaises(ts.TeamError):
            ts.transfer_owner(self.db, team, "carol", confirm=True)
        team = ts.transfer_owner(self.db, team, "bob", confirm=True)
        self.assertEqual(team.owner_user_id, "bob")
        roles = {r.user_id: r.role for r in self.db.query(TeamMember).filter(
            TeamMember.team_id == team.id).all()}
        self.assertEqual(roles, {"alice": "admin", "bob": "owner"})

    def test_non_member_is_404_but_admin_passes(self):
        self._team()
        with self.assertRaises(ts.NotFound):
            ts.get_for_member(self.db, BOB, "agentflow")
        self.assertEqual(ts.get_for_member(self.db, ALICE, "agentflow").slug, "agentflow")
        self.assertEqual(ts.get_for_member(self.db, ADMIN, "agentflow").slug, "agentflow")
        with self.assertRaises(ts.NotFound):
            ts.get_for_member(self.db, ALICE, "nope")

    def test_status_gates_writes(self):
        team = self._team()
        ts.set_status(self.db, team, "archived")
        with self.assertRaises(ts.TeamError):
            ts.add_member(self.db, team, "bob")
        with self.assertRaises(ts.TeamError):
            ts.set_status(self.db, team, "weird")


class TestAssets(_Base):
    def test_claim_and_release(self):
        team = self._team()
        agent = self._agent(owner="alice")
        self.assertEqual(agent.owner_kind, "personal")
        result = ts.claim_asset(self.db, team, "alice", "agents", agent.id)
        self.assertEqual(result["team_id"], team.id)
        self.assertEqual(result["owner_kind"], "team")
        self.db.refresh(agent)
        self.assertEqual(agent.owner_id, "alice")   # owner_id 不动（零回填）
        # 再 claim 幂等
        again = ts.claim_asset(self.db, team, "alice", "agents", agent.id)
        self.assertEqual(again["team_id"], team.id)
        # release 回个人
        released = ts.release_asset(self.db, team, "alice", "agents", agent.id)
        self.assertEqual(released["owner_kind"], "personal")
        self.assertIsNone(released["team_id"])

    def test_cannot_claim_others_or_cross_team(self):
        team = self._team()
        other = ts.create_team(self.db, BOB, slug="dev-qa", name="研发/测试", owner_user_id="bob")
        agent = self._agent(owner="alice")
        with self.assertRaises(ts.TeamError):
            ts.claim_asset(self.db, team, "bob", "agents", agent.id)   # 不是自己的
        ts.claim_asset(self.db, team, "alice", "agents", agent.id)
        with self.assertRaises(ts.TeamError):
            ts.claim_asset(self.db, other, "bob", "agents", agent.id)  # 已属别的团队

    def test_agent_quota(self):
        team = self._team()
        team.max_agents = 1
        self.db.commit()
        a1, a2 = self._agent(name="a1"), self._agent(name="a2")
        ts.claim_asset(self.db, team, "alice", "agents", a1.id)
        with self.assertRaises(ts.TeamError):
            ts.claim_asset(self.db, team, "alice", "agents", a2.id)

    def test_unknown_kind_and_asset(self):
        team = self._team()
        with self.assertRaises(ts.TeamError):
            ts.claim_asset(self.db, team, "alice", "orchestrations", 1)
        with self.assertRaises(ts.NotFound):
            ts.claim_asset(self.db, team, "alice", "agents", 999)

    def test_list_assets_and_counts(self):
        team = self._team()
        agent = self._agent()
        ts.claim_asset(self.db, team, "alice", "agents", agent.id)
        assets = ts.list_assets(self.db, team)
        self.assertEqual(len(assets["agents"]), 1)
        self.assertEqual(len(assets["tools"]), 0)
        self.assertEqual(ts.asset_counts(self.db, team)["agents"], 1)
        self.assertEqual(set(assets), {"agents", "workflows", "tools", "knowledge_sources", "domains"})


class TestSquad(_Base):
    def test_create_requires_active_leader(self):
        dead = self._agent(name="归档 leader", status="archived")
        with self.assertRaises(ts.TeamConflict):
            ts.create_squad(self.db, slug="sq-dead", name="x", leader_agent_id=dead.id)
        with self.assertRaises(ts.TeamError):
            ts.create_squad(self.db, slug="sq", name="x", leader_agent_id=999)
        squad = self._squad()
        with self.assertRaises(ts.TeamConflict):
            self._squad(slug="code-review")

    def test_member_pool_dedupe_and_kinds(self):
        squad = self._squad()
        agent = self._agent(name="审查 Agent")
        ts.add_squad_member(self.db, squad, "agent", str(agent.id))
        ts.add_squad_member(self.db, squad, "member", "bob")
        with self.assertRaises(ts.TeamError):
            ts.add_squad_member(self.db, squad, "agent", str(agent.id))
        with self.assertRaises(ts.TeamError):
            ts.add_squad_member(self.db, squad, "robot", "x")
        self.assertTrue(ts.remove_squad_member(self.db, squad, "member", "bob"))
        self.assertFalse(ts.remove_squad_member(self.db, squad, "member", "bob"))

    def test_archive_semantics(self):
        squad = self._squad()
        leader = self.db.query(Agent).filter(Agent.id == squad.leader_agent_id).first()
        leader.status = "archived"
        self.db.commit()
        with self.assertRaises(ts.TeamConflict):
            ts.archive_squad(self.db, squad)     # leader_bound
        leader.status = "active"
        self.db.commit()
        squad = ts.archive_squad(self.db, squad)
        self.assertEqual(squad.status, "archived")
        with self.assertRaises(ts.TeamError):
            ts.add_squad_member(self.db, squad, "member", "bob")

    def test_assign_creates_leader_task_and_dedupes(self):
        squad = self._squad()
        task = cs.create_item(self.db, creator="alice", title="修复构建")
        result = ts.assign_task_to_squad(self.db, squad, "alice", task.id)
        self.assertFalse(result["deduped"])
        leader_task = result["leader_task"]
        self.assertTrue(leader_task["is_leader_task"])
        self.assertEqual(leader_task["assignee_kind"], "agent")
        self.assertEqual(leader_task["assignee_id"], str(squad.leader_agent_id))
        self.assertEqual(leader_task["parent_id"], task.id)
        self.db.refresh(task)
        self.assertEqual(task.assignee_kind, "squad")
        self.assertEqual(task.assignee_id, str(squad.id))
        # 重复指派不产生第二条
        again = ts.assign_task_to_squad(self.db, squad, "alice", task.id)
        self.assertTrue(again["deduped"])
        self.assertEqual(again["leader_task"]["id"], leader_task["id"])
        self.assertEqual(self.db.query(WorkItem).filter(
            WorkItem.is_leader_task == 1).count(), 1)

    def test_assign_gates(self):
        squad = self._squad()
        with self.assertRaises(ts.NotFound):
            ts.assign_task_to_squad(self.db, squad, "alice", 999)
        ts.archive_squad(self.db, squad)
        task = cs.create_item(self.db, creator="alice", title="t")
        with self.assertRaises(ts.TeamError):
            ts.assign_task_to_squad(self.db, squad, "alice", task.id)

    def test_squads_own_no_assets(self):
        squad = self._squad()
        self.assertFalse(hasattr(squad, "team_id"))


class TestTeamRoutes(unittest.TestCase):
    """路由层：非成员 404、leader_bound 409（确认 main 已挂载）。"""

    def setUp(self):
        import json
        import tempfile
        from unittest.mock import patch

        import auth
        import config
        import database
        from fastapi.testclient import TestClient
        from passwords import hash_password
        from services import cluster_store, session_service

        self.tmp = tempfile.TemporaryDirectory()
        self.users_file = os.path.join(self.tmp.name, "users.json")
        self.audit_file = os.path.join(self.tmp.name, "audit.jsonl")
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
        )
        Base.metadata.create_all(self.engine)
        self.Session2 = sessionmaker(bind=self.engine, autocommit=False, autoflush=False)
        self._patchers = [
            patch.object(auth, "_users_file", return_value=self.users_file),
            patch.object(auth, "_audit_file", return_value=self.audit_file),
            patch.object(session_service, "SessionLocal", self.Session2),
            patch.object(cluster_store, "SessionLocal", self.Session2),
            patch.object(database, "SessionLocal", self.Session2),
            patch.object(config, "DEPLOY_MODE", "localhost"),
            patch.object(config, "AUTH_DEBUG_HEADER_ENABLED", False),
        ]
        for p in self._patchers:
            p.start()
        from database import get_db
        from main import app as _app

        def _override_db():
            db = self.Session2()
            try:
                yield db
            finally:
                db.close()

        self._app, self._get_db = _app, get_db
        _app.dependency_overrides[get_db] = _override_db
        us = []
        for uid, role in (("alice", "member"), ("bob", "member"), ("root", "admin")):
            us.append({"id": uid, "name": uid, "role": role,
                       "password_hash": hash_password("correct-horse-battery-staple"),
                       "must_change_password": False, "project_ids": [],
                       "custom_permissions": [], "active": True})
        with open(self.users_file, "w", encoding="utf-8") as f:
            json.dump({"users": us}, f)

    def tearDown(self):
        from services import cluster_store

        cluster_store.truncate_rate_limits()
        self._app.dependency_overrides.pop(self._get_db, None)
        for p in reversed(self._patchers):
            p.stop()
        self.engine.dispose()
        self.tmp.cleanup()

    def _client(self, uid):
        from fastapi.testclient import TestClient
        from main import app

        c = TestClient(app, client=("127.0.0.1", 50000))
        r = c.post("/api/auth/login", json={"user_id": uid, "password": "correct-horse-battery-staple"})
        self.assertEqual(r.status_code, 200, r.text)
        return c

    def test_non_member_404_and_member_200(self):
        alice = self._client("alice")
        r = alice.post("/api/teams", json={"slug": "agentflow", "name": "AgentFlow"})
        self.assertEqual(r.status_code, 200, r.text)
        bob = self._client("bob")
        self.assertEqual(bob.get("/api/teams/agentflow").status_code, 404)
        self.assertEqual(alice.get("/api/teams/agentflow").status_code, 200)
        # 管理员可见
        root = self._client("root")
        self.assertEqual(root.get("/api/teams/agentflow").status_code, 200)

    def test_leader_bound_is_409(self):
        alice = self._client("alice")
        db = self.Session2()
        try:
            leader = Agent(name="归档 leader", owner_id="alice", runtime="claude_code",
                           model_provider="deepseek", model_name="deepseek-flash",
                           api_key_encrypted="", status="archived")
            db.add(leader)
            db.commit()
            db.refresh(leader)
            leader_id = leader.id
        finally:
            db.close()
        r = alice.post("/api/squads", json={"slug": "sq-1", "name": "小队", "leader_agent_id": leader_id})
        self.assertEqual(r.status_code, 409, r.text)
