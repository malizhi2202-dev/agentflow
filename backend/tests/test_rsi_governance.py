"""R6-4 / R7-4 / R7-5：类目开关 · 因果前缀 · 晋升评审账 · 防污染双扫。"""
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
from models.rsi import Memory, PromotionReview, RsiSwitch
from passwords import hash_password
from services import cluster_store, rsi_service as rsi, session_service

PW = "correct-horse-battery-staple"
STRONG = [{"ref": "log-1", "note": "两次复现"}]


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

    def _mem(self, **kw):
        args = dict(layer="L1", cue="构建失败时先看 tsc 输出",
                    lesson="先定位第一个类型错误", evidence=STRONG)
        args.update(kw)
        return rsi.propose_memory(self.db, **args)


class TestCausalPrefix(_Base):
    def test_reference_to_future_task_is_rejected(self):
        with self.assertRaises(rsi.GateError) as ctx:
            self._mem(source_seq=5, cites_seq=5)
        self.assertIn("因果前缀", str(ctx.exception))
        self.assertEqual(self.db.query(Memory).count(), 0)

    def test_reference_to_earlier_task_passes(self):
        result = self._mem(source_seq=5, cites_seq=4)
        self.assertTrue(result["stored"])
        self.assertEqual(result["memory"]["cites_seq"], 4)

    def test_zero_seq_means_no_check(self):
        result = self._mem(source_seq=0, cites_seq=0)
        self.assertTrue(result["stored"])


class TestPromotionReview(_Base):
    def test_no_entry_still_writes_review(self):
        result = self._mem(cue="", lesson="", evidence=[])
        self.assertFalse(result["stored"])
        self.assertEqual(result["status"], "no_entry")
        review = self.db.query(PromotionReview).one()
        self.assertEqual(review.verdict, "no_entry")
        self.assertFalse(bool(review.fields_complete))
        self.assertIn("缺字段", review.note)

    def test_promoted_writes_helped_review_with_reviewer(self):
        result = self._mem(confounded=False, evidence_is_strong=True,
                           reviewer="alice")
        self.assertTrue(result["stored"])
        self.assertEqual(result["status"], "promoted")
        review = self.db.query(PromotionReview).one()
        self.assertEqual(review.verdict, "helped")
        self.assertTrue(bool(review.fields_complete))
        self.assertEqual(review.reviewer, "alice")

    def test_reviews_listed_by_memory(self):
        result = self._mem()
        rows = rsi.list_reviews(self.db, memory_id=result["memory"]["id"])
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["memory_id"], result["memory"]["id"])


class TestPollutionScan(_Base):
    def test_golden_marker_forces_confounded_and_flags(self):
        result = self._mem(confounded=False, evidence_is_strong=True,
                           evidence=[{"ref": "golden_set/v3"}])
        self.assertEqual(result["status"], "confounded")
        self.assertTrue(result["memory"]["confounded"])
        self.assertTrue(result["memory"]["pollution_flagged"])
        # 第二扫：入库后再扫一次
        self.assertTrue(result["memory"]["post_ingest_scan"])
        review = self.db.query(PromotionReview).one()
        self.assertTrue(bool(review.pollution_scan))
        self.assertIn("金标", review.note)

    def test_clean_evidence_not_flagged(self):
        result = self._mem(confounded=False, evidence_is_strong=True)
        self.assertFalse(result["memory"]["pollution_flagged"])


class TestCategorySwitches(_Base):
    def test_missing_row_means_running(self):
        items = rsi.switches(self.db)
        # v25 R25-7：总闸行领衔（缺行也按「开」呈现），后接四类
        self.assertEqual([s["category"] for s in items],
                         [rsi.SWITCH_GLOBAL, *rsi.RSI_CATEGORIES])
        self.assertTrue(all(s["enabled"] for s in items))

    def test_paused_memory_blocks_propose(self):
        rsi.set_switch(self.db, "memory", False, "root", reason="治理演练暂停")
        with self.assertRaises(rsi.GateError) as ctx:
            self._mem()
        self.assertIn("自动体已暂停", str(ctx.exception))

    def test_paused_orchestration_blocks_proposal_and_publish(self):
        rsi.create_surface(self.db, "agent-config", ["prompts/"], "root")
        proposal = rsi.create_proposal(
            self.db, title="t", dimension="invariant", surface_name="agent-config",
            target="prompts/persona.md")
        rsi.record_shadow(self.db, proposal, judge_model="other-vendor",
                          golden_set_frozen=True, cross_vendor=True,
                          pass_rate=0.9, baseline=0.5)
        self.assertEqual(proposal.status, "awaiting_approval")
        rsi.set_switch(self.db, "orchestration", False, "root", reason="治理演练暂停")
        with self.assertRaises(rsi.GateError):
            rsi.create_proposal(self.db, title="t2", dimension="invariant",
                                surface_name="agent-config", target="prompts/p2.md")
        with self.assertRaises(rsi.GateError):
            rsi.publish(self.db, proposal, "root", is_admin=True)

    def test_resume_allows_again(self):
        rsi.set_switch(self.db, "memory", False, "root", reason="治理演练暂停")
        rsi.set_switch(self.db, "memory", True, "root")
        self.assertTrue(self._mem()["stored"])

    def test_non_whitelisted_category_has_no_switch(self):
        with self.assertRaises(rsi.GateError):
            rsi.set_switch(self.db, "code", False, "root")
        # 代码层没有开关可开 = 禁改面本身的实现
        with self.assertRaises(rsi.GateError):
            rsi.assert_category_running(self.db, "code")


class TestSwitchRoute(_Base):
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
            json.dump({"users": [_user("root", role="admin"), _user("bob")]}, f)

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

    def test_only_admin_can_pause(self):
        r = self._client("bob").post("/api/rsi/switches/memory", json={"enabled": False})
        self.assertEqual(r.status_code, 403)

    def test_admin_pause_writes_audit_with_phrase(self):
        r = self._client("root").post("/api/rsi/switches/memory", json={"enabled": False, "reason": "演练暂停"})
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.json()["switch"]["label"], "自动体已暂停")
        with open(self.audit_file, encoding="utf-8") as f:
            lines = [json.loads(x) for x in f if x.strip()]
        entry = [x for x in lines if x["action"] == "rsi:switch"][-1]
        # D11：短语必须出现（审计落可见态）；原因追加在短语之后（人批动作留痕）
        self.assertTrue(entry["detail"].startswith("自动体已暂停"), entry["detail"])
        self.assertIn("演练暂停", entry["detail"])
        self.assertEqual(entry["target"], "memory")

    def test_switch_list_exposes_four_categories(self):
        r = self._client("root").get("/api/rsi/switches")
        self.assertEqual(r.status_code, 200, r.text)
        # v25 R25-7：路由侧同样含总闸行领衔（缺行按开呈现）
        self.assertEqual([s["category"] for s in r.json()["switches"]],
                         [rsi.SWITCH_GLOBAL, *rsi.RSI_CATEGORIES])


if __name__ == "__main__":
    unittest.main()
