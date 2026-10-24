"""judge 适配器：未配置即拒绝；预算帽；假 provider 可注入（不真调外部）。"""
import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("ENCRYPTION_KEY", "test-key-for-ci-32bytes!!")

import config
from services import judge_adapter


class _FakeProvider:
    def __init__(self, replies):
        self.replies = list(replies)
        self.calls = 0

    def chat(self, messages, api_key, model_name):
        self.calls += 1
        return self.replies.pop(0), {"total_tokens": 1}


CASES = [{"expected": "a", "actual": "a"}, {"expected": "b", "actual": "x"}]


class TestJudge(unittest.TestCase):
    def test_unconfigured_is_fail_closed(self):
        with patch.object(config, "RSI_JUDGE_PROVIDER", ""), \
             patch.object(config, "RSI_JUDGE_MODEL", ""), \
             patch.object(config, "RSI_JUDGE_API_KEY", ""), \
             patch.object(config, "RSI_JUDGE_MAX_CALLS", 0):
            self.assertFalse(judge_adapter.configured())
            with self.assertRaises(judge_adapter.JudgeError) as ctx:
                judge_adapter.judge_cases(CASES)
            self.assertIn("judge 未配置", str(ctx.exception))

    def test_ollama_needs_no_api_key(self):
        with patch.object(config, "RSI_JUDGE_PROVIDER", "ollama"), \
             patch.object(config, "RSI_JUDGE_MODEL", "qwen2.5:3b"), \
             patch.object(config, "RSI_JUDGE_API_KEY", ""), \
             patch.object(config, "RSI_JUDGE_MAX_CALLS", 3):
            self.assertTrue(judge_adapter.configured())

    def test_remote_provider_still_requires_key(self):
        with patch.object(config, "RSI_JUDGE_PROVIDER", "deepseek"), \
             patch.object(config, "RSI_JUDGE_MODEL", "x"), \
             patch.object(config, "RSI_JUDGE_API_KEY", ""), \
             patch.object(config, "RSI_JUDGE_MAX_CALLS", 3):
            self.assertFalse(judge_adapter.configured())

    def test_fake_provider_scoring_and_call_count(self):
        provider = _FakeProvider(["1", "0"])
        rate = judge_adapter.judge_cases(CASES, provider=provider, max_calls=5)
        self.assertEqual(rate, 0.5)
        self.assertEqual(provider.calls, 2)

    def test_budget_exceeded_raises(self):
        provider = _FakeProvider(["1", "1"])
        with self.assertRaises(judge_adapter.BudgetExceeded):
            judge_adapter.judge_cases(CASES, provider=provider, max_calls=1)
        self.assertEqual(provider.calls, 1)   # 超限即停，不继续调用

    def test_provider_failure_is_loud(self):
        class Boom:
            def chat(self, *a, **k):
                raise RuntimeError("network")
        with self.assertRaises(judge_adapter.JudgeError):
            judge_adapter.judge_cases(CASES, provider=Boom(), max_calls=5)


if __name__ == "__main__":
    unittest.main()
