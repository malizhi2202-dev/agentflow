"""P2-5 声明式 API 四件组：ETag/If-Match→412 · apiVersion/kind · generation/conditions · 账本+SSE。"""
import json
import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("ENCRYPTION_KEY", "test-key-for-ci-32bytes!!")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from fastapi import FastAPI, Request
from fastapi.testclient import TestClient

from models import Base
from models.declarative import ChangeLog, ResourceCondition
from services import declarative as d


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


class TestEtag(_Base):
    def test_canonical_hash_is_key_order_independent(self):
        self.assertEqual(d.canonical_hash({"a": 1, "b": [2, 3]}),
                         d.canonical_hash({"b": [2, 3], "a": 1}))
        self.assertNotEqual(d.canonical_hash({"a": 1}), d.canonical_hash({"a": 2}))
        self.assertTrue(d.etag_for({"a": 1}).startswith('"'))

    def _req(self, if_match=None):
        headers = {}
        if if_match is not None:
            headers["if-match"] = if_match
        return Request({"type": "http", "headers": [
            (k.encode(), v.encode()) for k, v in headers.items()
        ], "method": "PUT", "path": "/x"})

    def test_match_and_mismatch(self):
        payload = {"a": 1}
        d.check_if_match(self._req(d.etag_for(payload)), payload)      # 匹配：放行
        d.check_if_match(self._req("*"), {"any": True})                # 通配：放行
        d.check_if_match(self._req(None), payload)                     # 未带：不拦
        with self.assertRaises(d.PreconditionFailed) as ctx:
            d.check_if_match(self._req('"deadbeef"'), payload)
        self.assertEqual(ctx.exception.status_code, 412)


class TestDocumentMeta(_Base):
    def test_defaults_and_kind_validation(self):
        meta = d.validate_document({}, expected_kind="WorkflowConfig")
        self.assertEqual(meta["apiVersion"], "agentflow/v1")
        self.assertEqual(meta["kind"], "WorkflowConfig")
        meta = d.validate_document({"apiVersion": "agentflow/v1", "kind": "Workflow"})
        self.assertFalse(meta["deprecated"])
        with self.assertRaises(Exception):
            d.validate_document({"kind": "Nope"})
        with self.assertRaises(Exception):
            d.validate_document({"kind": "Workflow"}, expected_kind="WorkflowConfig")
        with self.assertRaises(Exception):
            d.validate_document({"apiVersion": "v9"})


class TestChangeLog(_Base):
    def test_generation_increments_and_events(self):
        first = d.append_change(self.db, "workflow", "1", "alice", "update",
                                before_hash="a", after_hash="b", payload={"x": 1})
        self.db.commit()
        second = d.append_change(self.db, "workflow", "1", "alice", "update")
        self.db.commit()
        self.assertEqual((first.generation, second.generation), (1, 2))
        events, resync = d.list_changes(self.db, since=0)
        self.assertEqual(len(events), 2)
        self.assertFalse(resync)
        self.assertEqual(events[0]["payload"], {"x": 1})
        # 增量游标
        events, _ = d.list_changes(self.db, since=events[0]["id"])
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0]["id"], second.id)

    def test_cursor_expired_requests_resync(self):
        for _ in range(3):
            d.append_change(self.db, "workflow", "1", "alice", "update")
        self.db.commit()
        _, resync = d.list_changes(self.db, since=0)
        self.assertFalse(resync)                      # 0 = 从头，不算过期
        rows = self.db.query(ChangeLog).order_by(ChangeLog.id.asc()).all()
        self.assertTrue(d.list_changes(self.db, since=10 ** 6)[1] is False)
        # 模拟账本被裁剪：最早一行 id=5，游标 2 → resync
        self.db.query(ChangeLog).filter(ChangeLog.id == rows[0].id).delete()
        self.db.query(ChangeLog).filter(ChangeLog.id == rows[1].id).delete()
        self.db.commit()
        _, resync = d.list_changes(self.db, since=1)
        self.assertTrue(resync)

    def test_conditions_observed_generation(self):
        change = d.append_change(self.db, "workflow", "9", "alice", "update")
        d.set_condition(self.db, "workflow", "9", "True", reason="Applied",
                        message="ok", observed_generation=change.generation)
        self.db.commit()
        conds = d.conditions(self.db, "workflow", "9")
        self.assertEqual(conds[0]["status"], "True")
        self.assertEqual(conds[0]["observedGeneration"], 1)
        self.assertEqual(conds[0]["type"], "Ready")
        # 再次 set 覆盖而不是新增
        d.set_condition(self.db, "workflow", "9", "False", reason="Drift",
                        observed_generation=0)
        self.db.commit()
        conds = d.conditions(self.db, "workflow", "9")
        self.assertEqual(len(conds), 1)
        self.assertEqual(conds[0]["status"], "False")
        self.assertEqual(self.db.query(ResourceCondition).count(), 1)

    def test_envelope_reports_generations(self):
        d.append_change(self.db, "workflow", "5", "alice", "update")
        d.set_condition(self.db, "workflow", "5", "True", observed_generation=1)
        self.db.commit()
        env = d.envelope({"name": "wf"}, "workflow", "5", self.db)
        self.assertEqual(env["kind"], "Workflow")
        self.assertEqual(env["spec"], {"name": "wf"})
        self.assertEqual(env["status"]["generation"], 1)
        self.assertEqual(env["status"]["observedGeneration"], 1)
        self.assertEqual(env["status"]["conditions"][0]["status"], "True")


class TestWatchSse(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
        )
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine, autocommit=False, autoflush=False)
        self._p = patch("routes.watch_api.SessionLocal", self.Session)
        self._p.start()
        db = self.Session()
        d.append_change(db, "workflow", "1", "alice", "update", payload={"k": "v"})
        db.commit()
        db.close()
        # 独立 app，只挂 watch 路由，避免整套认证中间件
        from routes.watch_api import router
        from database import get_db

        app = FastAPI()
        app.include_router(router)
        app.dependency_overrides[get_db] = self._override
        self.client = TestClient(app)

    def _override(self):
        db = self.Session()
        try:
            yield db
        finally:
            db.close()

    def tearDown(self):
        self._p.stop()
        self.engine.dispose()

    def test_streams_history_then_stops(self):
        r = self.client.get("/api/watch?since=0&max_polls=0")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.headers["content-type"].split(";")[0], "text/event-stream")
        body = r.text
        self.assertIn("event: change", body)
        self.assertIn('"resource_type": "workflow"', body)
        self.assertIn("id: 1", body)

    def test_expired_cursor_emits_resync(self):
        # 账本被裁剪：最早剩余行 id=10，而客户端游标停在 1 → 中间事件已不存在，必须 resync
        db = self.Session()
        db.query(ChangeLog).delete()          # 清掉 setUp 里的 id=1，模拟历史被裁掉
        db.add(ChangeLog(id=10, resource_type="workflow", resource_id="9",
                         generation=1, actor="alice", action="update"))
        db.commit()
        db.close()
        r = self.client.get("/api/watch?since=1&max_polls=0")
        self.assertEqual(r.status_code, 200)
        self.assertIn("event: resync", r.text)
        self.assertIn('"reason": "cursor_expired"', r.text)


