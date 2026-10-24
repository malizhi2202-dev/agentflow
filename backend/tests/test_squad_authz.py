"""R5-4 补漏：小队写操作授权（creator 或平台管理员）。

背景（v20-ui-teams REVIEW 遗留 #4）：小队写路由此前只校验"已登录"，
而模型注释写的是 `created_by` = 写操作授权来源 —— 契约写了、代码没落实。
"""
import json
import os
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("ENCRYPTION_KEY", "test-key-for-ci-32bytes!!")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import auth
import config
import database
from models import Base
from models.agent import Agent
from models.collab import WorkItem
from passwords import hash_password
from services import cluster_store, session_service, team_service as ts

PW = "correct-horse-battery-staple"
ADMIN = {"id": "root", "role": "admin"}
ALICE = {"id": "alice", "role": "member"}
BOB = {"id": "bob", "role": "member"}


def _user_row(uid, role="member"):
    return {"id": uid, "name": uid, "role": role,
            "password_hash": hash_password(PW), "must_change_password": False,
            "project_ids": [], "custom_permissions": [], "active": True}


class _Base(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
        )
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine, autocommit=False, autoflush=False)
        self.db = self.Session()
        leader = Agent(owner_id="alice", name="审查助手", model_provider="deepseek",
                       model_name="deepseek-flash", api_key_encrypted="x", status="standby")
        self.db.add(leader)
        self.db.commit()
        self.leader_id = leader.id
        self.squad = ts.create_squad(self.db, slug="code-review", name="代码审查小队",
                                     leader_agent_id=self.leader_id, created_by="alice")

    def tearDown(self):
        self.db.close()
        self.engine.dispose()


class TestServiceGate(_Base):
    def test_creator_can_manage(self):
        ts.assert_can_manage_squad(self.db, self.squad, ALICE)  # 不抛即通过

    def test_platform_admin_can_manage(self):
        ts.assert_can_manage_squad(self.db, self.squad, ADMIN)

    def test_other_member_is_rejected(self):
        with self.assertRaises(ts.SquadForbidden) as ctx:
            ts.assert_can_manage_squad(self.db, self.squad, BOB)
        self.assertIn("创建者或平台管理员", str(ctx.exception))

    def test_create_records_creator(self):
        # created_by 必须由创建路径落下，否则授权来源永远是空的
        self.assertEqual(ts._squad(self.db, "code-review").created_by, "alice")

    def test_empty_creator_only_admin(self):
        row = ts._squad(self.db, "code-review")
        row.created_by = ""
        self.db.commit()
        with self.assertRaises(ts.SquadForbidden):
            ts.assert_can_manage_squad(self.db, row, ALICE)
        ts.assert_can_manage_squad(self.db, row, ADMIN)   # 管理员仍然可以

    def test_read_paths_are_not_gated(self):
        # 读不做授权：任何登录用户都能列表/详情（列表本就是组织公开信息）
        self.assertTrue(ts.list_squads(self.db))
        self.assertIsNotNone(ts._squad(self.db, "code-review"))


class TestRouteGate(_Base):
    def setUp(self):
        super().setUp()
        self.tmp = tempfile.TemporaryDirectory()
        self.users_file = os.path.join(self.tmp.name, "users.json")
        self.audit_file = os.path.join(self.tmp.name, "audit.jsonl")
        self._patchers = [
            patch.object(auth, "_users_file", return_value=self.users_file),
            patch.object(auth, "_audit_file", return_value=self.audit_file),
            patch.object(session_service, "SessionLocal", self.Session),
            patch.object(cluster_store, "SessionLocal", self.Session),
            patch.object(database, "SessionLocal", self.Session),
            patch.object(config, "DEPLOY_MODE", "localhost"),
            patch.object(config, "AUTH_DEBUG_HEADER_ENABLED", False),
        ]
        for p in self._patchers:
            p.start()
        from database import get_db
        from main import app as _app

        def _override_db():
            db = self.Session()
            try:
                yield db
            finally:
                db.close()

        self._app = _app
        self._get_db = get_db
        _app.dependency_overrides[get_db] = _override_db
        with open(self.users_file, "w", encoding="utf-8") as f:
            json.dump({"users": [_user_row("root", "admin"), _user_row("carol"),
                                 _user_row("bob")]}, f)

    def tearDown(self):
        self._app.dependency_overrides.pop(self._get_db, None)
        for p in reversed(self._patchers):
            p.stop()
        self.tmp.cleanup()
        super().tearDown()

    def _client(self, uid):
        from fastapi.testclient import TestClient
        from main import app as app_

        c = TestClient(app_, client=("127.0.0.1", 50000))
        r = c.post("/api/auth/login", json={"user_id": uid, "password": PW})
        self.assertEqual(r.status_code, 200, r.text)
        return c

    def _carol_squad(self):
        """carol（普通成员）通过 API 建队 → created_by=carol。"""
        r = self._client("carol").post("/api/squads", json={
            "slug": "carol-squad", "name": "carol 的队", "leader_agent_id": self.leader_id,
        })
        self.assertEqual(r.status_code, 200, r.text)
        return r.json()["squad"]

    def test_non_creator_gets_403_with_detail(self):
        self._carol_squad()
        r = self._client("bob").post("/api/squads/carol-squad/members",
                                     json={"member_kind": "agent", "member_id": "9"})
        self.assertEqual(r.status_code, 403, r.text)
        self.assertIn("创建者或平台管理员", r.json()["detail"])

    def test_creator_can_add_member(self):
        self._carol_squad()
        r = self._client("carol").post("/api/squads/carol-squad/members",
                                       json={"member_kind": "agent", "member_id": "9"})
        self.assertEqual(r.status_code, 200, r.text)

    def test_admin_can_manage_someone_elses_squad(self):
        self._carol_squad()
        r = self._client("root").post("/api/squads/carol-squad/members",
                                      json={"member_kind": "agent", "member_id": "9"})
        self.assertEqual(r.status_code, 200, r.text)

    def test_read_still_public(self):
        self._carol_squad()
        c = self._client("bob")
        self.assertEqual(c.get("/api/squads").status_code, 200)
        self.assertEqual(c.get("/api/squads/carol-squad").status_code, 200)

    def test_archive_and_assign_are_gated(self):
        self._carol_squad()
        c = self._client("bob")
        self.assertEqual(c.post("/api/squads/carol-squad/archive").status_code, 403)
        self.assertEqual(
            c.post("/api/squads/carol-squad/assign", json={"task_id": 1}).status_code, 403,
        )


if __name__ == "__main__":
    unittest.main()
