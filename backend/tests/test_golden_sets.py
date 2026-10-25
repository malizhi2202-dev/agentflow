"""v24-doc-refresh D10：金标集实体 + 影子门从「调用方自报布尔」升级为平台校验。"""
import os
import sqlite3
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("ENCRYPTION_KEY", "test-key-for-ci-32bytes!!")

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import migrations
from models import Base
from models.rsi import ExecLedger, GoldenSet, Proposal
from services import rsi_service as rsi
from services import shadow_runner


class _Base(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
        )
        @event.listens_for(self.engine, "connect")
        def _fk_on(dbapi_connection, connection_record):
            dbapi_connection.cursor().execute("PRAGMA foreign_keys=ON")
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine, autocommit=False, autoflush=False)
        self.db = self.Session()
        rsi.create_surface(self.db, "orchestration", ["prompts/", "config/"])

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def _proposal(self):
        return rsi.create_proposal(self.db, title="改提示词", dimension="invariant",
                                   surface_name="orchestration", target="prompts/system.md")

    def _probed(self):
        p = self._proposal()
        return rsi.record_probe(self.db, p, {"steps": 1, "tokens": 10})

    def _golden(self, produced_by="openai", frozen=True):
        g = rsi.create_golden_set(self.db, name=f"gs-{produced_by or 'none'}-{frozen}",
                                  cases=[{"expected": "a", "actual": "a"}],
                                  produced_by=produced_by, owner_id="admin")
        if frozen:
            rsi.freeze_golden_set(self.db, g.id, actor="admin")
        return g


class TestMigration030(_Base):
    def test_golden_sets_table_created(self):
        conn = sqlite3.connect(tempfile.mktemp(suffix=".db"))
        applied = migrations.apply_migrations(conn, "sqlite")
        self.assertIn("030_golden_sets", applied)
        tables = {r[0] for r in conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table'")}
        self.assertIn("golden_sets", tables)
        cols = {r[1] for r in conn.execute("PRAGMA table_info(golden_sets)")}
        for c in ("frozen", "frozen_at", "frozen_by", "produced_by", "eval_mark"):
            self.assertIn(c, cols)
        conn.close()


class TestGoldenSetLifecycle(_Base):
    def test_create_requires_cases(self):
        with self.assertRaises(rsi.RsiError):
            rsi.create_golden_set(self.db, name="empty", cases=[])

    def test_create_sets_content_fingerprint(self):
        g = rsi.create_golden_set(self.db, name="fp", cases=[{"a": 1}], owner_id="admin")
        self.assertTrue(g.eval_mark)
        self.assertFalse(g.frozen)

    def test_freeze_is_idempotent_and_records_actor(self):
        g = rsi.create_golden_set(self.db, name="f1", cases=[{"a": 1}])
        rsi.freeze_golden_set(self.db, g.id, actor="admin")
        rsi.freeze_golden_set(self.db, g.id, actor="admin")
        self.db.refresh(g)
        self.assertTrue(g.frozen)
        self.assertEqual(g.frozen_by, "admin")
        self.assertIsNotNone(g.frozen_at)


class TestVendorIdentification(_Base):
    def test_known_prefixes(self):
        self.assertEqual(rsi._vendor_of("gpt-5-codex"), "openai")
        self.assertEqual(rsi._vendor_of("claude-sonnet-4.5"), "anthropic")
        self.assertEqual(rsi._vendor_of("deepseek-chat"), "deepseek")
        self.assertEqual(rsi._vendor_of("qwen2.5:3b"), "alibaba")

    def test_unknown_model_is_unverified(self):
        self.assertEqual(rsi._vendor_of("my-custom-router"), "unknown")


class TestShadowGatePlatformValidated(_Base):
    """D10 核心：布尔自报 → 平台按账上金标集校验。"""

    def test_platform_validated_passes_with_cross_vendor_judge(self):
        p = self._probed()
        g = self._golden(produced_by="openai", frozen=True)
        out = shadow_runner.run_shadow(
            self.db, p, cases=[{"expected": "a", "actual": "a"}],
            judge_model="claude-sonnet-4.5",
            golden_set_frozen=False, cross_vendor=False,   # 布尔被平台校验取代
            golden_set_id=g.id,
        )
        self.assertEqual(out["gate_evidence"], "platform_validated")
        self.assertEqual(p.status, "awaiting_approval")
        import json
        shadow = json.loads(p.shadow_json)
        self.assertEqual(shadow["golden_set"]["id"], g.id)
        self.assertEqual(shadow["judge_vendor"], "anthropic")

    def test_unfrozen_golden_set_rejected(self):
        """账上没冻结 → 布尔报什么都没用（自报绕不过平台账）。"""
        p = self._probed()
        g = self._golden(frozen=False)
        with self.assertRaises(rsi.GateError):
            rsi.record_shadow(self.db, p, judge_model="claude-sonnet-4.5",
                              golden_set_frozen=True, cross_vendor=True,
                              pass_rate=1.0, golden_set_id=g.id)

    def test_same_vendor_judge_rejected(self):
        p = self._probed()
        g = self._golden(produced_by="openai", frozen=True)
        with self.assertRaises(rsi.GateError):
            rsi.record_shadow(self.db, p, judge_model="gpt-5-codex",
                              golden_set_frozen=True, cross_vendor=True,
                              pass_rate=1.0, golden_set_id=g.id)

    def test_unknown_vendor_judge_rejected_fail_closed(self):
        p = self._probed()
        g = self._golden(produced_by="openai", frozen=True)
        with self.assertRaises(rsi.GateError):
            rsi.record_shadow(self.db, p, judge_model="mystery-router",
                              golden_set_frozen=True, cross_vendor=True,
                              pass_rate=1.0, golden_set_id=g.id)

    def test_nonexistent_golden_set_rejected(self):
        p = self._probed()
        with self.assertRaises(rsi.GateError):
            rsi.record_shadow(self.db, p, judge_model="claude-sonnet-4.5",
                              golden_set_frozen=True, cross_vendor=True,
                              pass_rate=1.0, golden_set_id=999999)

    def test_legacy_boolean_gate_still_works_but_declared_self(self):
        """兼容旧路径（不炸既有测试/E2E），但如实标 self_declared——自报门≠平台门。"""
        p = self._probed()
        rsi.record_shadow(self.db, p, judge_model="whatever",
                          golden_set_frozen=True, cross_vendor=True, pass_rate=1.0)
        import json
        self.assertEqual(json.loads(p.shadow_json)["gate_evidence"], "self_declared")


if __name__ == "__main__":
    unittest.main()
