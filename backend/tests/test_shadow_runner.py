"""影子重放 runner：确定性打分 + 沿用既有影子门（不新开门禁、不冒充异厂 judge）。"""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("ENCRYPTION_KEY", "test-key-for-ci-32bytes!!")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from models import Base
from services import rsi_service as rsi, shadow_runner as runner


class _Base(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False},
                                    poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine, autocommit=False, autoflush=False)
        self.db = self.Session()
        rsi.create_surface(self.db, "agent-config", ["prompts/"], "root")
        self.proposal = rsi.create_proposal(
            self.db, title="收紧 persona", dimension="invariant",
            surface_name="agent-config", target="prompts/persona.md",
        )

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def _run(self, **kw):
        args = dict(cases=[{"expected": "a", "actual": "a"}, {"expected": "b", "actual": "b"}],
                    judge_model="other-vendor", golden_set_frozen=True, cross_vendor=True,
                    baseline=0.5)
        args.update(kw)
        return runner.run_shadow(self.db, self.proposal, **args)


class TestScoring(_Base):
    def test_exact_match_rounding(self):
        self.assertEqual(runner.score_cases([{"expected": "a", "actual": " a "}]), 1.0)
        self.assertEqual(runner.score_cases([
            {"expected": "a", "actual": "a"}, {"expected": "b", "actual": "x"},
        ]), 0.5)

    def test_empty_cases_rejected(self):
        with self.assertRaises(runner.RunnerError):
            runner.score_cases([])

    def test_missing_fields_rejected(self):
        with self.assertRaises(runner.RunnerError):
            runner.score_cases([{"expected": "a"}])


class TestRun(_Base):
    def test_pass_goes_to_awaiting_approval(self):
        out = self._run()
        self.assertEqual(out["pass_rate"], 1.0)
        self.assertEqual(out["judge_kind"], "exact_match")
        self.assertTrue(out["dry_run"])
        self.assertEqual(out["proposal"]["status"], "awaiting_approval")

    def test_below_noise_floor_collapses(self):
        self._run(cases=[{"expected": "a", "actual": "a"}, {"expected": "b", "actual": "x"}],
                  baseline=0.5)  # pass_rate 0.5 - baseline 0.5 = 0 < NOISE_FLOOR
        self.assertEqual(self.proposal.status, "collapsed")
        self.assertEqual(rsi.breakers(self.db)[2]["status"], "open")  # collapse

    def test_missing_golden_is_gate_error(self):
        with self.assertRaises(rsi.GateError):
            self._run(golden_set_frozen=False)

    def test_missing_cross_vendor_is_gate_error(self):
        with self.assertRaises(rsi.GateError):
            self._run(cross_vendor=False)

    def test_judge_model_required(self):
        with self.assertRaises(runner.RunnerError):
            self._run(judge_model="  ")


class TestRoute(AuthHarnessMixin := __import__("tests._auth_harness", fromlist=["AuthHarness"]).AuthHarness,
                unittest.TestCase):
    def setUp(self):
        AuthHarnessMixin.setUp(self)
        rsi.create_surface(self.db, "agent-config", ["prompts/"], "root")
        p = rsi.create_proposal(self.db, title="t", dimension="invariant",
                                surface_name="agent-config", target="prompts/p.md")
        self.pid = p.id

    def test_run_endpoint_marks_exact_match(self):
        r = self.client("root").post(f"/api/rsi/proposals/{self.pid}/shadow/run", json={
            "cases": [{"expected": "a", "actual": "a"}],
            "judge_model": "other-vendor", "golden_set_frozen": True,
            "cross_vendor": True, "baseline": 0.0,
        })
        self.assertEqual(r.status_code, 200, r.text)
        body = r.json()
        self.assertEqual(body["judge_kind"], "exact_match")
        self.assertTrue(body["dry_run"])

    def test_unknown_judge_mode_is_400(self):
        r = self.client("root").post(f"/api/rsi/proposals/{self.pid}/shadow/run", json={
            "cases": [{"expected": "a", "actual": "a"}], "judge_model": "x",
            "golden_set_frozen": True, "cross_vendor": True, "judge": "bogus",
        })
        self.assertEqual(r.status_code, 400, r.text)

    def test_llm_judge_without_config_is_400(self):
        r = self.client("root").post(f"/api/rsi/proposals/{self.pid}/shadow/run", json={
            "cases": [{"expected": "a", "actual": "a"}], "judge_model": "x",
            "golden_set_frozen": True, "cross_vendor": True, "judge": "llm",
        })
        # 默认未配置 judge → 400（不偷偷调外部模型）
        self.assertEqual(r.status_code, 400, r.text)
        self.assertIn("judge 未配置", r.json()["detail"])

    def test_missing_golden_via_route_is_409(self):
        r = self.client("root").post(f"/api/rsi/proposals/{self.pid}/shadow/run", json={
            "cases": [{"expected": "a", "actual": "a"}], "judge_model": "x",
            "golden_set_frozen": False, "cross_vendor": True,
        })
        self.assertEqual(r.status_code, 409, r.text)


if __name__ == "__main__":
    unittest.main()
