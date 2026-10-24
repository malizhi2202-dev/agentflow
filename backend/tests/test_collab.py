"""P1-4 协作层：任务状态机 / 三轨负责人 / 运行连接 / 订阅 / 收件箱三规则。"""
import datetime
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("ENCRYPTION_KEY", "test-key-for-ci-32bytes!!")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from models import Base
from models.collab import InboxItem, WorkItem
from services import collab_service as cs


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

    def _task(self, creator="alice", **kw):
        return cs.create_item(self.db, creator=creator, title="修复构建", **kw)


class TestWorkItem(_Base):
    def test_defaults_and_creator_subscription(self):
        item = self._task()
        self.assertEqual(item.status, "backlog")
        self.assertEqual(item.status_category, "unstarted")
        self.assertEqual(item.triage_state, "needs_triage")
        self.assertEqual(item.evidence, []) if hasattr(item, "evidence") else None
        subs = cs.inbox_for(self.db, "alice")
        self.assertEqual(subs["total"], 0)  # 自己的动作不进箱

    def test_validation(self):
        with self.assertRaises(ValueError):
            cs.create_item(self.db, creator="alice", title="  ")
        with self.assertRaises(ValueError):
            cs.create_item(self.db, creator="alice", title="t", assignee_kind="robot")
        with self.assertRaises(ValueError):
            cs.create_item(self.db, creator="alice", title="t", assignee_id="u1")

    def test_status_machine_allows_happy_path(self):
        item = self._task()
        for target in ("todo", "in_progress", "in_review", "done"):
            cs.change_status(self.db, item, "alice", target)
            self.assertEqual(item.status, target)
        self.assertEqual(item.status_category, "done")

    def test_status_machine_rejects_illegal(self):
        item = self._task()
        with self.assertRaises(cs.TransitionError):
            cs.change_status(self.db, item, "alice", "done")  # backlog → done 越级
        cs.change_status(self.db, item, "alice", "cancelled")
        with self.assertRaises(cs.TransitionError):
            cs.change_status(self.db, item, "alice", "todo")  # 终态不可复活

    def test_done_without_evidence_is_advisory(self):
        item = self._task()
        for target in ("todo", "in_progress", "in_review"):
            cs.change_status(self.db, item, "alice", target)
        result = cs.change_status(self.db, item, "alice", "done")
        self.assertEqual(item.status, "done")
        self.assertIn("done_without_evidence", result["warnings"])
        self.assertTrue(item.evidence_warned)

    def test_done_with_evidence_no_warning(self):
        item = self._task()
        for target in ("todo", "in_progress", "in_review"):
            cs.change_status(self.db, item, "alice", target)
        result = cs.change_status(
            self.db, item, "alice", "done",
            evidence=[{"label": "测试", "ref": "TEST.md"}],
        )
        self.assertEqual(result["warnings"], [])
        self.assertEqual(item.to_dict()["evidence"][0]["ref"], "TEST.md")

    def test_triage_is_orthogonal(self):
        item = self._task()
        item.triage_state = "triaged"
        self.db.commit()
        cs.change_status(self.db, item, "alice", "todo")
        self.assertEqual(item.triage_state, "triaged")  # 状态变化不动 triage
        self.assertEqual(item.status, "todo")


class TestAssignAndSubscription(_Base):
    def test_assign_member_notifies_assignee(self):
        item = self._task()
        cs.assign(self.db, item, "alice", kind="member", assignee_id="bob")
        inbox = cs.inbox_for(self.db, "bob")
        self.assertEqual(inbox["total"], 1)
        entry = inbox["action_required"][0]
        self.assertEqual(entry["event_type"], "assigned")
        self.assertEqual(entry["relation"], "responsible")
        # 创建者自己不会被自己的动作打扰
        self.assertEqual(cs.inbox_for(self.db, "alice")["total"], 0)

    def test_assign_agent_does_not_target_member_inbox(self):
        item = self._task()
        cs.assign(self.db, item, "alice", kind="agent", assignee_id="42")
        self.assertEqual(cs.inbox_for(self.db, "bob")["total"], 0)

    def test_mention_penetrates_unsubscribe(self):
        item = self._task()
        cs.assign(self.db, item, "alice", kind="member", assignee_id="bob")
        cs.mark_all_read(self.db, "bob")
        self.assertTrue(cs.unsubscribe(self.db, item, "bob"))
        # 退订后普通评论不进箱
        cs.add_comment(self.db, item, "alice", "随手记一句")
        bob = cs.inbox_for(self.db, "bob")
        self.assertEqual(bob["total"], 1)  # 只有之前的 assigned 那条，评论没新增
        # 但 @ 穿透
        cs.add_comment(self.db, item, "alice", "@bob 看一下", mentions=["bob"])
        bob = cs.inbox_for(self.db, "bob")
        merged = [r for r in bob["action_required"] + bob["muted"]]
        self.assertTrue(any("看一下" in r["body"] for r in merged))

    def test_unsubscribe_unknown_user(self):
        item = self._task()
        self.assertFalse(cs.unsubscribe(self.db, item, "nobody"))


class TestInboxRules(_Base):
    def test_merge_key_is_task(self):
        item = self._task()
        cs.assign(self.db, item, "alice", kind="member", assignee_id="bob")
        for target in ("todo", "in_progress"):
            cs.change_status(self.db, item, "alice", target)
        rows = self.db.query(InboxItem).filter(InboxItem.user_id == "bob").all()
        self.assertEqual(len(rows), 1)          # 同一任务只有一条
        self.assertGreaterEqual(rows[0].merged_count, 3)

    def test_action_required_revives_read_item(self):
        item = self._task()
        cs.assign(self.db, item, "alice", kind="member", assignee_id="bob")
        row = self.db.query(InboxItem).filter(InboxItem.user_id == "bob").first()
        cs.mark_read(self.db, "bob", row.id)
        cs.assign(self.db, item, "alice", kind="member", assignee_id="bob")
        self.db.refresh(row)
        self.assertIsNone(row.read_at)          # 新的需决策事件重新浮出

    def test_rule3_failures_auto_archive_on_handback(self):
        item = self._task()
        cs.assign(self.db, item, "alice", kind="member", assignee_id="bob")
        cs.record_run(self.db, item, "run-1", status="failed", summary="编译失败")
        bob = cs.inbox_for(self.db, "bob")
        failed = [r for r in bob["action_required"] if r["event_type"] == "task_failed"]
        self.assertEqual(len(failed), 1)
        # in_review 是「交还给人」→ 失败通知归档（同时 review_requested 把该条目
        # 作为「待人验收」重新浮出——合并键=任务，条目只有一个，复活是正确行为）
        cs.change_status(self.db, item, "alice", "todo")
        cs.change_status(self.db, item, "alice", "in_progress")
        result = cs.change_status(self.db, item, "alice", "in_review")
        self.assertGreaterEqual(result["archived_notifications"], 1)
        rows = self.db.query(InboxItem).filter(
            InboxItem.user_id == "bob", InboxItem.has_failure == 1
        ).all()
        self.assertEqual(len(rows), 1)
        self.assertIsNone(rows[0].archived_at)   # 已被「待验收」复活

    def test_rule3_blocked_is_exception(self):
        item = self._task()
        cs.assign(self.db, item, "alice", kind="member", assignee_id="bob")
        cs.record_run(self.db, item, "run-1", status="failed", summary="失败")
        cs.change_status(self.db, item, "alice", "todo")
        cs.change_status(self.db, item, "alice", "in_progress")
        cs.change_status(self.db, item, "alice", "blocked")
        rows = self.db.query(InboxItem).filter(
            InboxItem.user_id == "bob", InboxItem.has_failure == 1
        ).all()
        self.assertEqual(len(rows), 1)
        self.assertIsNone(rows[0].archived_at)  # blocked 不归档

    def test_rule3_done_archives_and_stays_archived(self):
        item = self._task()
        cs.assign(self.db, item, "alice", kind="member", assignee_id="bob")
        cs.record_run(self.db, item, "run-1", status="failed", summary="失败")
        for target in ("todo", "in_progress", "in_review"):
            cs.change_status(self.db, item, "alice", target)
        # in_review 已把失败条目复活成 review_requested；再走 done
        cs.change_status(self.db, item, "alice", "done",
                         evidence=[{"label": "测试", "ref": "TEST.md"}])
        archived = self.db.query(InboxItem).filter(InboxItem.user_id == "bob").first()
        self.assertIsNotNone(archived.archived_at)

    def test_rule2_read_failure_is_not_swallowed(self):
        class BrokenSession:
            def query(self, *a, **kw):
                raise RuntimeError("db down")

        with self.assertRaises(RuntimeError):
            cs.inbox_for(BrokenSession(), "alice")

    def test_ownership_and_batch_ops(self):
        item = self._task()
        cs.assign(self.db, item, "alice", kind="member", assignee_id="bob")
        bob_row = self.db.query(InboxItem).filter(InboxItem.user_id == "bob").first()
        with self.assertRaises(cs.InboxError):
            cs.mark_read(self.db, "alice", bob_row.id)  # 别人的条目 = 不存在
        self.assertEqual(cs.inbox_count(self.db, "bob")["action_required"], 1)
        self.assertEqual(cs.mark_all_read(self.db, "bob"), 1)
        self.assertEqual(cs.inbox_count(self.db, "bob")["unread"], 0)
        self.assertEqual(cs.archive_read(self.db, "bob"), 1)
        self.assertEqual(cs.inbox_for(self.db, "bob")["total"], 0)
        self.assertEqual(cs.inbox_for(self.db, "bob", include_archived=True)["total"], 1)

    def test_runs_registry_and_failure_notification(self):
        item = self._task()
        run = cs.record_run(self.db, item, "run-9", status="running", agent_id=3)
        self.assertEqual(run.status, "running")
        self.assertIsNotNone(run.started_at)
        failed = cs.record_run(self.db, item, "run-10", status="failed",
                               agent_id=3, summary="超时")
        self.assertIsNotNone(failed.finished_at)
        self.assertEqual(cs.inbox_count(self.db, "alice")["action_required"], 1)

    def test_visibility_helper_used_by_routes(self):
        item = self._task()
        self.assertEqual(item.creator_id, "alice")
        self.assertIsNone(item.assignee_id)


if __name__ == "__main__":
    unittest.main()


# ── 路由层（确认 main 真的挂上了，且边界是 404 不是 403）────────────

import json
import tempfile
from unittest.mock import patch

from fastapi.testclient import TestClient

import auth
import config
import database
from passwords import hash_password
from services import cluster_store, session_service

PW = "correct-horse-battery-staple"


class TestTaskRoutes(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.users_file = os.path.join(self.tmp.name, "users.json")
        self.audit_file = os.path.join(self.tmp.name, "audit.jsonl")
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
        )
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine, autocommit=False, autoflush=False)
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
        # 其他集成测试会全局覆盖 get_db（不还），这里显式覆盖成本用例的库
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
            json.dump({"users": [
                self._user("alice", role="admin"),
                self._user("bob", role="member"),
            ]}, f)

    def tearDown(self):
        cluster_store.truncate_rate_limits()
        self._app.dependency_overrides.pop(self._get_db, None)
        for p in reversed(self._patchers):
            p.stop()
        self.engine.dispose()
        self.tmp.cleanup()

    def _user(self, uid, role="member"):
        return {"id": uid, "name": uid, "role": role,
                "password_hash": hash_password(PW), "must_change_password": False,
                "project_ids": [], "custom_permissions": [], "active": True}

    def _client(self, uid):
        from main import app

        c = TestClient(app, client=("127.0.0.1", 50000))
        r = c.post("/api/auth/login", json={"user_id": uid, "password": PW})
        self.assertEqual(r.status_code, 200, r.text)
        return c

    def test_requires_identity(self):
        from main import app

        c = TestClient(app, client=("127.0.0.1", 50000))
        self.assertEqual(c.get("/api/tasks").status_code, 401)

    def test_create_list_and_status(self):
        c = self._client("alice")
        r = c.post("/api/tasks", json={"title": "修复构建", "assignee_kind": "member",
                                       "assignee_id": "bob"})
        self.assertEqual(r.status_code, 200, r.text)
        task_id = r.json()["task"]["id"]
        self.assertEqual(r.json()["task"]["status"], "backlog")

        self.assertEqual(len(c.get("/api/tasks?mine=true").json()["tasks"]), 1)
        r = c.post(f"/api/tasks/{task_id}/status", json={"status": "todo"})
        self.assertEqual(r.status_code, 200, r.text)
        r = c.post(f"/api/tasks/{task_id}/status", json={"status": "done"})
        self.assertEqual(r.status_code, 400)  # 越级转移被状态机拒绝

        # 收件箱：bob 被指派 → 1 条需决策
        bob = self._client("bob")
        inbox = bob.get("/api/inbox").json()
        self.assertEqual(len(inbox["action_required"]), 1)
        self.assertEqual(bob.get("/api/inbox/count").json()["action_required"], 1)

    def test_foreign_task_is_404(self):
        c = self._client("alice")
        task_id = c.post("/api/tasks", json={"title": "私事"}).json()["task"]["id"]
        bob = self._client("bob")
        self.assertEqual(bob.get(f"/api/tasks/{task_id}").status_code, 404)
        self.assertEqual(bob.post(f"/api/tasks/{task_id}/status",
                                  json={"status": "todo"}).status_code, 404)
        # 管理员可见
        self.assertEqual(c.get(f"/api/tasks/{task_id}").status_code, 200)
