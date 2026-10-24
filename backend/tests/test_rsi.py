"""R6/R7 RSI 治理：记忆晋升门 / 三权分离 / 可改面 / 四熔断 + NOISE FLOOR。"""
import json
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("ENCRYPTION_KEY", "test-key-for-ci-32bytes!!")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from models import Base
from models.rsi import Memory, Proposal
from services import rsi_service as rsi

EV = [{"ref": "TEST.md", "note": "复现"}]


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

    def _surface(self, allow=("prompts/", "config/"), name="orchestration"):
        return rsi.create_surface(self.db, name, list(allow))


class TestMemoryPromotion(_Base):
    def test_three_fields_required_else_no_entry(self):
        result = rsi.propose_memory(self.db, layer="L1", cue="遇到 X", lesson="",
                                    evidence=EV)
        self.assertFalse(result["stored"])
        self.assertEqual(result["status"], "no_entry")
        self.assertEqual(result["missing"], ["lesson"])
        # no_entry 是合法结论：行仍在，但不在正式层
        row = self.db.query(Memory).first()
        self.assertEqual(row.status, "no_entry")

    def test_uncertain_defaults_to_confounded(self):
        result = rsi.propose_memory(self.db, layer="L2", cue="c", lesson="l",
                                    evidence=EV)
        self.assertEqual(result["status"], "confounded")
        self.assertTrue(result["memory"]["confounded"])
        # 明确「有把握 + 强证据」才 promoted
        ok = rsi.propose_memory(self.db, layer="L2", cue="c2", lesson="l2",
                                evidence=EV, confounded=False)
        self.assertEqual(ok["status"], "promoted")

    def test_weak_evidence_forces_confounded(self):
        result = rsi.propose_memory(self.db, layer="L1", cue="c", lesson="l",
                                    evidence=EV, confounded=False,
                                    evidence_is_strong=False)
        self.assertEqual(result["status"], "confounded")

    def test_layer_and_kind_validation(self):
        with self.assertRaises(rsi.RsiError):
            rsi.propose_memory(self.db, layer="L0", cue="c", lesson="l", evidence=EV)
        with self.assertRaises(rsi.RsiError):
            rsi.propose_memory(self.db, layer="L1", cue="c", lesson="l", evidence=EV,
                               kind="weird")

    def test_negative_knowledge_is_allowed(self):
        result = rsi.propose_memory(self.db, layer="L1", cue="c", lesson="别这么做",
                                    evidence=EV, kind="negative")
        self.assertEqual(result["status"], "confounded")
        self.assertEqual(result["memory"]["kind"], "negative")

    def test_quarantine_and_decay(self):
        for i in range(3):
            rsi.propose_memory(self.db, layer="L1", cue=f"c{i}", lesson=f"l{i}",
                               evidence=EV, confounded=False, source_ref="src-1")
        self.assertEqual(rsi.quarantine_source(self.db, "src-1"), 3)
        self.assertEqual(len(rsi.list_memories(self.db, status="quarantined")), 3)
        self.assertEqual(rsi.decay_candidates(self.db), [])   # 检疫的不进衰减队列
        rsi.propose_memory(self.db, layer="L3", cue="c9", lesson="l9", evidence=EV,
                           confounded=False)
        self.assertEqual(len(rsi.decay_candidates(self.db)), 1)


class TestSurfaceGate(_Base):
    def test_immutable_prefixes_always_denied(self):
        self._surface(allow=("scripts/",))
        for target in ("scripts/deploy.sh", "plugins/x.py", "hooks/pre.sh"):
            with self.assertRaises(rsi.GateError) as ctx:
                rsi.assert_editable(self.db, "orchestration", target)
            self.assertIn("永久禁改", str(ctx.exception))

    def test_code_self_modification_denied(self):
        self._surface(allow=("backend/", "frontend/src/"))
        for target in ("backend/services/chat_service.py", "frontend/src/App.tsx"):
            with self.assertRaises(rsi.GateError) as ctx:
                rsi.assert_editable(self.db, "orchestration", target)
            self.assertIn("代码层 RSI 禁止", str(ctx.exception))

    def test_whitelist_and_unknown_surface(self):
        self._surface(allow=("prompts/",))
        rsi.assert_editable(self.db, "orchestration", "prompts/system.md")
        with self.assertRaises(rsi.GateError):
            rsi.assert_editable(self.db, "orchestration", "prompts/../../etc/passwd")
        with self.assertRaises(rsi.GateError):
            rsi.assert_editable(self.db, "nope", "prompts/system.md")


class TestProposalThreeWay(_Base):
    def setUp(self):
        super().setUp()
        self._surface()

    def _proposal(self, **kw):
        return rsi.create_proposal(self.db, title="改提示词", dimension="invariant",
                                   surface_name="orchestration",
                                   target="prompts/system.md", **kw)

    def test_budget_limits(self):
        with self.assertRaises(rsi.RsiError):
            self._proposal(budget_steps=0)
        with self.assertRaises(rsi.RsiError):
            self._proposal(budget_tokens=rsi.MAX_TOKENS + 1)
        p = self._proposal(budget_steps=3, budget_tokens=100)
        self.assertEqual(p.status, "generated")

    def test_probe_is_weak_evidence_and_never_publishes(self):
        p = self._proposal()
        p = rsi.record_probe(self.db, p, {"steps": 1, "tokens": 100, "delta": 5})
        self.assertEqual(p.status, "probed")
        with self.assertRaises(rsi.GateError) as ctx:
            rsi.publish(self.db, p, "root", is_admin=True)
        self.assertIn("影子重放", str(ctx.exception))

    def test_probe_budget_trips_steps_and_blocks(self):
        p = self._proposal(budget_steps=2)
        p = rsi.record_probe(self.db, p, {"steps": 5, "tokens": 1})
        self.assertEqual(p.status, "blocked")
        self.assertEqual([b for b in rsi.breakers(self.db) if b["name"] == "steps"][0]["status"], "open")
        with self.assertRaises(rsi.GateError):
            rsi.create_proposal(self.db, title="x", dimension="invariant",
                                surface_name="orchestration", target="config/a.yaml")

    def test_shadow_requires_frozen_golden_and_cross_vendor(self):
        p = self._proposal()
        rsi.record_probe(self.db, p, {"steps": 1, "tokens": 1})
        with self.assertRaises(rsi.GateError):
            rsi.record_shadow(self.db, p, judge_model="same", golden_set_frozen=False,
                              cross_vendor=True, pass_rate=0.9, baseline=0.5)
        with self.assertRaises(rsi.GateError):
            rsi.record_shadow(self.db, p, judge_model="same", golden_set_frozen=True,
                              cross_vendor=False, pass_rate=0.9, baseline=0.5)

    def test_below_noise_floor_collapses(self):
        p = self._proposal()
        rsi.record_probe(self.db, p, {"steps": 1, "tokens": 1})
        p = rsi.record_shadow(self.db, p, judge_model="other-vendor",
                              golden_set_frozen=True, cross_vendor=True,
                              pass_rate=0.501, baseline=0.5)
        self.assertEqual(p.status, "collapsed")
        self.assertEqual([b for b in rsi.breakers(self.db)
                          if b["name"] == "collapse"][0]["status"], "open")

    def test_human_approval_required_and_flow(self):
        p = self._proposal()
        rsi.record_probe(self.db, p, {"steps": 1, "tokens": 1})
        p = rsi.record_shadow(self.db, p, judge_model="other-vendor",
                              golden_set_frozen=True, cross_vendor=True,
                              pass_rate=0.8, baseline=0.5)
        self.assertEqual(p.status, "awaiting_approval")
        with self.assertRaises(rsi.GateError):
            rsi.publish(self.db, p, "root", is_admin=False)      # 非管理员
        p = rsi.publish(self.db, p, "root", is_admin=True)
        self.assertEqual(p.status, "published")
        self.assertEqual(p.approved_by, "root")
        self.assertIsNotNone(p.approved_at)

    def test_domain_dimension_needs_signoff(self):
        p = rsi.create_proposal(self.db, title="域类", dimension="domain",
                                surface_name="orchestration", target="config/x.yaml")
        rsi.record_probe(self.db, p, {"steps": 1, "tokens": 1})
        p = rsi.record_shadow(self.db, p, judge_model="other-vendor",
                              golden_set_frozen=True, cross_vendor=True,
                              pass_rate=0.8, baseline=0.5)
        with self.assertRaises(rsi.GateError):
            rsi.publish(self.db, p, "root", is_admin=True)       # 缺会签
        p = rsi.domain_signoff(self.db, p, "reviewer-1")
        p = rsi.publish(self.db, p, "root", is_admin=True)
        self.assertEqual(p.status, "published")
        self.assertEqual(json.loads(p.domain_signoff_json), ["reviewer-1"])

    def test_dimension_validation(self):
        with self.assertRaises(rsi.RsiError):
            rsi.create_proposal(self.db, title="x", dimension="both",
                                surface_name="orchestration", target="prompts/a.md")

    def test_breakers_reset_to_half_open(self):
        row = rsi.trip(self.db, "error_rate", "manual")
        self.assertEqual(row.status, "open")
        row = rsi.reset_breaker(self.db, "error_rate")
        self.assertEqual(row.status, "half_open")
        with self.assertRaises(rsi.RsiError):
            rsi.trip(self.db, "nope", "x")
        self.assertEqual({b["name"] for b in rsi.breakers(self.db)},
                         {"budget", "steps", "collapse", "error_rate"})
