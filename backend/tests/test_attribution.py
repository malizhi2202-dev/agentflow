"""R8-2：归因双列 originator⟂accountable + 归属瀑布 + fail-closed。"""
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
from models.collab import WorkItem
from passwords import hash_password
from services import attribution, cluster_store, collab_service as cs, session_service

PW = "correct-horse-battery-staple"


def _user(uid, role="member"):
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

    def tearDown(self):
        self.db.close()
        self.engine.dispose()


class TestWaterfall(_Base):
    def test_member_is_own_originator(self):
        got = attribution.resolve_attribution(self.db, actor_id="alice")
        self.assertEqual(got["originator_id"], "alice")
        self.assertEqual(got["accountable_id"], "alice")
        self.assertEqual(got["source"], "actor")

    def test_agent_walks_to_task_creator(self):
        task = cs.create_item(self.db, creator="bob", title="跑一次构建",
                              assignee_kind="agent", assignee_id="7")
        got = attribution.resolve_attribution(self.db, actor_id="agent:7",
                                              actor_kind="agent", task_id=task.id)
        self.assertEqual(got["originator_id"], "bob")
        self.assertEqual(got["source"], "parent_chain")

    def test_agent_walks_up_parent_chain_to_member_assignee(self):
        parent = cs.create_item(self.db, creator="carol", title="父任务",
                                assignee_kind="member", assignee_id="dave")
        child = cs.create_item(self.db, creator="carol", title="子任务",
                               parent_id=parent.id, assignee_kind="agent",
                               assignee_id="7")
        got = attribution.resolve_attribution(self.db, actor_id="agent:7",
                                              actor_kind="agent", task_id=child.id)
        # 子任务 creator 是 carol → 链上人类取 creator（carol），不跨到父任务的 dave
        self.assertEqual(got["originator_id"], "carol")

    def test_missing_task_is_fail_closed(self):
        with self.assertRaises(attribution.AttributionError) as ctx:
            attribution.resolve_attribution(self.db, actor_id="agent:7",
                                            actor_kind="agent", task_id=9999)
        self.assertIn("无法确定", str(ctx.exception))

    def test_agent_without_task_context_is_rejected(self):
        with self.assertRaises(attribution.AttributionError):
            attribution.resolve_attribution(self.db, actor_id="agent:7",
                                            actor_kind="agent")

    def test_empty_actor_is_rejected(self):
        with self.assertRaises(attribution.AttributionError):
            attribution.resolve_attribution(self.db, actor_id="")

    def test_unknown_actor_kind_is_rejected(self):
        with self.assertRaises(attribution.AttributionError):
            attribution.resolve_attribution(self.db, actor_id="x", actor_kind="robot")


class TestTaskColumns(_Base):
    def test_create_item_sets_both_columns(self):
        task = cs.create_item(self.db, creator="alice", title="t")
        self.assertEqual(task.originator_id, "alice")
        self.assertEqual(task.accountable_id, "alice")
        self.assertEqual(task.to_dict()["originator_id"], "alice")

    def test_accountable_can_differ_from_originator(self):
        task = cs.create_item(self.db, creator="alice", title="t",
                              accountable_id="finance-bot")
        self.assertEqual(task.originator_id, "alice")
        self.assertEqual(task.accountable_id, "finance-bot")

    def test_missing_creator_is_refused(self):
        with self.assertRaises(ValueError):
            cs.create_item(self.db, creator="", title="t")

    def test_run_inherits_task_attribution(self):
        task = cs.create_item(self.db, creator="alice", title="t",
                              accountable_id="finance-bot")
        run = cs.record_run(self.db, task, run_id="r-1", status="running")
        self.assertEqual(run.originator_id, "alice")
        self.assertEqual(run.accountable_id, "finance-bot")
        self.assertEqual(run.to_dict()["accountable_id"], "finance-bot")

    def test_legacy_row_has_empty_attribution(self):
        # 存量零回填：直接建的老行两列为空串，不拿 creator 顶替
        row = WorkItem(title="老任务", creator_id="alice")
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        self.assertEqual(row.originator_id or "", "")


class TestTaskRoute(_Base):
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
            json.dump({"users": [_user("root", role="admin"), _user("alice")]}, f)

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

    def test_member_cannot_record_accountability_for_others(self):
        r = self._client("alice").post("/api/tasks", json={
            "title": "t", "accountable_id": "someone-else"})
        self.assertEqual(r.status_code, 403)

    def test_admin_can_and_columns_are_returned(self):
        r = self._client("root").post("/api/tasks", json={
            "title": "t", "accountable_id": "finance-bot"})
        self.assertEqual(r.status_code, 200, r.text)
        task = r.json()["task"]
        self.assertEqual(task["originator_id"], "root")
        self.assertEqual(task["accountable_id"], "finance-bot")

    def test_default_accountable_is_self(self):
        r = self._client("alice").post("/api/tasks", json={"title": "t"})
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.json()["task"]["accountable_id"], "alice")


if __name__ == "__main__":
    unittest.main()
