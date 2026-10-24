"""P2-3 执行隔离契约：tier 阶梯 / ttl / retain / egress 默认拒 / fail-closed。"""
import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("ENCRYPTION_KEY", "test-key-for-ci-32bytes!!")

import config
from services import execution_contract as ec


class TestTiers(unittest.TestCase):
    def test_inproc_is_available_and_honest_about_egress(self):
        spec = ec.validate(ec.ExecutionSpec(tier="inproc"))
        self.assertEqual(spec.tier, "inproc")
        self.assertFalse(spec.to_dict()["egress_enforced"])   # 进程内没有围栏
        self.assertTrue(ec.egress_enforced("container"))

    def test_declared_but_unimplemented_tiers_fail_closed(self):
        for tier in ("process", "container", "microvm", "remote"):
            with self.assertRaises(ec.ExecutionContractError) as ctx:
                ec.validate(ec.ExecutionSpec(tier=tier))
            self.assertIn("未实现", str(ctx.exception))

    def test_unknown_tier_rejected(self):
        with self.assertRaises(ec.ExecutionContractError):
            ec.validate(ec.ExecutionSpec(tier="docker"))


class TestTtlAndEgress(unittest.TestCase):
    def test_ttl_bounds(self):
        with self.assertRaises(ec.ExecutionContractError):
            ec.validate(ec.ExecutionSpec(ttl_seconds=0))
        with self.assertRaises(ec.ExecutionContractError):
            ec.validate(ec.ExecutionSpec(ttl_seconds=ec.MAX_TTL_SECONDS + 1))
        self.assertEqual(ec.validate(ec.ExecutionSpec(ttl_seconds=60)).ttl_seconds, 60)

    def test_egress_default_deny_and_wildcard_rejected(self):
        self.assertEqual(ec.validate(ec.ExecutionSpec()).egress_allowlist, [])
        with self.assertRaises(ec.ExecutionContractError):
            ec.validate(ec.ExecutionSpec(egress_allowlist=["*"]))
        with self.assertRaises(ec.ExecutionContractError):
            ec.validate(ec.ExecutionSpec(egress_allowlist=["not a host!"]))
        ok = ec.validate(ec.ExecutionSpec(
            egress_allowlist=["api.example.com", "10.0.0.0/8"]))
        self.assertEqual(len(ok.egress_allowlist), 2)

    def test_retain_requires_ttl(self):
        self.assertTrue(ec.validate(ec.ExecutionSpec(retain=True, ttl_seconds=10)).retain)
        with self.assertRaises(ec.ExecutionContractError):
            ec.validate(ec.ExecutionSpec(retain=True, ttl_seconds=0))


class TestStartupAndGate(unittest.TestCase):
    def test_startup_checks_env(self):
        with patch.object(config, "EXECUTION_TIER", "container"):
            with self.assertRaises(ec.ExecutionContractError):
                ec.validate_startup()
        with patch.object(config, "EXECUTION_TIER", "inproc"), \
             patch.object(config, "EXECUTION_EGRESS_ALLOW", ["*"]):
            with self.assertRaises(ec.ExecutionContractError):
                ec.validate_startup()
        with patch.object(config, "EXECUTION_TIER", "inproc"), \
             patch.object(config, "EXECUTION_EGRESS_ALLOW", ["api.example.com"]):
            spec = ec.validate_startup()
            self.assertEqual(spec.egress_allowlist, ["api.example.com"])

    def test_execution_gate_refuses_when_tier_unsupported(self):
        with patch.object(config, "EXECUTION_TIER", "microvm"):
            with self.assertRaises(ec.ExecutionContractError):
                ec.assert_can_execute()
            # 明确拒绝，而不是降级成 inproc
            with self.assertRaises(ec.ExecutionContractError):
                ec.assert_can_execute(ec.ExecutionSpec(tier="microvm"))

    def test_describe_exposes_contract(self):
        info = ec.describe()
        self.assertEqual(info["available"], ["inproc"])
        self.assertIn("container", info["egress_enforced_tiers"])
        self.assertIn("fail-closed", " ".join(info["notes"]))


if __name__ == "__main__":
    unittest.main()
