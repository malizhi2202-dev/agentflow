"""本地 CLI 通道（dsh / hermes）：argv 白名单、不经过 shell、超时与错误要响亮。"""
import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("ENCRYPTION_KEY", "test-key-for-ci-32bytes!!")

import config
from services import cli_provider, judge_adapter


class TestArgv(unittest.TestCase):
    def test_dsh_argv_puts_prompt_as_single_arg(self):
        argv = cli_provider.build_argv("hello {world}", "dsh")
        self.assertEqual(argv[:4], [config.RSI_CLI_NODE, config.RSI_CLI_DSH_BIN,
                                    "--profile", config.RSI_CLI_DSH_PROFILE])
        self.assertEqual(argv[-1], "hello {world}")   # 原样作为单个参数，不做 shell 展开
        self.assertEqual(len(argv), 5)

    def test_hermes_argv(self):
        argv = cli_provider.build_argv("hi", "hermes")
        self.assertEqual(argv, [config.RSI_CLI_HERMES_BIN, "-z", "hi"])

    def test_unknown_cli_rejected(self):
        with self.assertRaises(ValueError):
            cli_provider.build_argv("x", "bash")


class TestNormalize(unittest.TestCase):
    def test_ansi_stripped(self):
        self.assertEqual(cli_provider.normalize_reply("\x1b[32m1\x1b[0m\n"), "1")

    def test_last_line_skips_logs(self):
        self.assertEqual(cli_provider.last_line("loading...\nready\n1\n"), "1")


class TestChat(unittest.TestCase):
    def _provider(self, runner, kind="dsh"):
        return cli_provider.CliProvider(kind=kind, runner=runner)

    def test_success_runs_runner_with_timeout(self):
        seen = {}

        def runner(argv, timeout):
            seen["argv"], seen["timeout"] = argv, timeout
            return 0, "ok\n1\n", ""

        reply, usage = self._provider(runner).chat([{"role": "user", "content": "q"}], "", "m")
        self.assertEqual(reply, "ok\n1")
        self.assertEqual(usage["cli"], "dsh")
        self.assertEqual(seen["timeout"], config.RSI_CLI_TIMEOUT_SECONDS)

    def test_nonzero_exit_is_loud(self):
        with self.assertRaises(RuntimeError) as ctx:
            self._provider(lambda a, t: (2, "", "boom")).chat([{"role": "user", "content": "q"}], "", "m")
        self.assertIn("退出码 2", str(ctx.exception))
        self.assertIn("boom", str(ctx.exception))

    def test_timeout_is_loud(self):
        def runner(argv, timeout):
            raise RuntimeError("CLI(dsh) 超时")
        with self.assertRaises(RuntimeError):
            self._provider(runner).chat([{"role": "user", "content": "q"}], "", "m")


class TestJudgeWithCli(unittest.TestCase):
    def test_cli_needs_no_key(self):
        with patch.object(config, "RSI_JUDGE_PROVIDER", "cli"), \
             patch.object(config, "RSI_JUDGE_MODEL", "dsh-headless"), \
             patch.object(config, "RSI_JUDGE_API_KEY", ""), \
             patch.object(config, "RSI_JUDGE_MAX_CALLS", 2):
            self.assertTrue(judge_adapter.configured())

    def test_judge_reads_last_line(self):
        class P:
            def chat(self, *a, **k):
                return "loading...\n1\n", {}
        self.assertEqual(judge_adapter.judge_cases(
            [{"expected": "a", "actual": "a"}], provider=P(), max_calls=2), 1.0)


if __name__ == "__main__":
    unittest.main()
