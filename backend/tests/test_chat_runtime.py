"""T-02 接线：启用且可用时走 CLI 运行时；未启用走 provider；运行时报错**不降级**。"""
import os
import sys
import unittest
from types import SimpleNamespace
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("ENCRYPTION_KEY", "test-key-for-ci-32bytes!!")

from services import chat_service, runtime_exec

MSG = [{"role": "system", "content": "你是助手"}, {"role": "user", "content": "你好"}]


def _agent(runtime="hermes"):
    return SimpleNamespace(runtime=runtime, model_provider="deepseek",
                           model_name="deepseek-flash")


class TestGenerate(unittest.TestCase):
    def test_runtime_used_when_enabled(self):
        with patch.object(runtime_exec, "enabled", return_value=True), \
             patch.object(runtime_exec, "execute", return_value={"reply": "来自运行时", "usage": {}}) as ex, \
             patch.object(chat_service, "get_provider", side_effect=AssertionError("不该走 provider")):
            reply, usage = chat_service._generate(_agent(), MSG, "k")
        self.assertEqual(reply, "来自运行时")
        self.assertEqual(usage, {})
        self.assertIn("[user] 你好", ex.call_args[0][1])   # prompt 带上角色标记

    def test_provider_used_when_disabled(self):
        fake_provider = SimpleNamespace(chat=lambda m, k, n: ("来自 provider", {"total_tokens": 3}))
        with patch.object(runtime_exec, "enabled", return_value=False), \
             patch.object(chat_service, "get_provider", return_value=fake_provider):
            reply, usage = chat_service._generate(_agent("custom"), MSG, "k")
        self.assertEqual(reply, "来自 provider")
        self.assertEqual(usage["total_tokens"], 3)

    def test_runtime_error_does_not_fall_back(self):
        with patch.object(runtime_exec, "enabled", return_value=True), \
             patch.object(runtime_exec, "execute",
                          side_effect=runtime_exec.RuntimeExecError("运行时 hermes 超时")) as ex, \
             patch.object(chat_service, "get_provider", side_effect=AssertionError("不该降级")):
            with self.assertRaises(runtime_exec.RuntimeExecError):
                chat_service._generate(_agent(), MSG, "k")
        self.assertEqual(ex.call_count, 1)


if __name__ == "__main__":
    unittest.main()
