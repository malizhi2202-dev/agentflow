"""T-02：Agent 真实运行时执行（默认关闭 / fail-closed / 不经 shell / 错误不降级）。"""
import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("ENCRYPTION_KEY", "test-key-for-ci-32bytes!!")

import config
from services import runtime_exec


class TestCommand(unittest.TestCase):
    def test_unknown_runtime_rejected(self):
        with self.assertRaises(runtime_exec.RuntimeExecError):
            runtime_exec.command_for("langgraph")

    def test_missing_template_is_fail_closed(self):
        with patch.dict(config.RUNTIME_CMD_TEMPLATES, {"codex": ""}, clear=False):
            with self.assertRaises(runtime_exec.RuntimeExecError) as ctx:
                runtime_exec.command_for("codex")
            self.assertIn("未配置命令模板", str(ctx.exception))

    def test_template_without_placeholder_rejected(self):
        with patch.dict(config.RUNTIME_CMD_TEMPLATES, {"hermes": "hermes run"}, clear=False):
            with self.assertRaises(runtime_exec.RuntimeExecError):
                runtime_exec.command_for("hermes")

    def test_argv_shape_prompt_is_single_arg(self):
        with patch.dict(config.RUNTIME_CMD_TEMPLATES,
                        {"hermes": "hermes -z {prompt}"}, clear=False):
            argv = runtime_exec.command_for("hermes")
        self.assertEqual(argv, ["hermes", "-z", "{prompt}"])

    def test_enabled_requires_switch(self):
        with patch.object(config, "RUNTIME_EXEC_ENABLED", False):
            self.assertFalse(runtime_exec.enabled("hermes"))
        with patch.object(config, "RUNTIME_EXEC_ENABLED", True), \
             patch.dict(config.RUNTIME_CMD_TEMPLATES,
                        {"hermes": "hermes -z {prompt}"}, clear=False):
            self.assertTrue(runtime_exec.enabled("hermes"))


class TestExecute(unittest.TestCase):
    def test_disabled_does_not_silently_fallback(self):
        with patch.object(config, "RUNTIME_EXEC_ENABLED", False):
            with self.assertRaises(runtime_exec.RuntimeExecError):
                runtime_exec.execute("hermes", "hi")

    def _run(self, runner, runtime="hermes"):
        with patch.object(config, "RUNTIME_EXEC_ENABLED", True), \
             patch.dict(config.RUNTIME_CMD_TEMPLATES,
                        {runtime: "hermes -z {prompt}"}, clear=False):
            return runtime_exec.execute(runtime, "只回 1", runner=runner)

    def test_success_strips_ansi_and_returns_runtime(self):
        seen = {}
        def runner(argv, timeout):
            seen["argv"] = argv
            return 0, "\x1b[32m1\x1b[0m\n", ""
        out = self._run(runner)
        self.assertEqual(out["reply"], "1")
        self.assertEqual(out["runtime"], "hermes")
        self.assertEqual(seen["argv"], ["hermes", "-z", "只回 1"])   # prompt 单参数

    def test_nonzero_exit_is_fail_closed(self):
        with self.assertRaises(runtime_exec.RuntimeExecError) as ctx:
            self._run(lambda a, t: (2, "", "boom"))
        self.assertIn("退出码 2", str(ctx.exception))
        self.assertNotIn("provider", str(ctx.exception).lower())

    def test_missing_binary_is_fail_closed(self):
        with patch.object(config, "RUNTIME_EXEC_ENABLED", True), \
             patch.dict(config.RUNTIME_CMD_TEMPLATES,
                        {"hermes": "definitely-not-a-binary {prompt}"}, clear=False):
            with self.assertRaises(runtime_exec.RuntimeExecError) as ctx:
                runtime_exec.execute("hermes", "hi")
            self.assertIn("命令不存在", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
