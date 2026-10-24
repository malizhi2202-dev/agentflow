"""daemon 的模型目录兜底解析（`scripts/runtime-daemon.py` 的纯函数）。

背景：本机两个 CLI 都**没有** `--list-models`（实测 hermes 报 argparse usage、dsh 报
`--profile <name> is required`），模型目录只能读运行时自己的来源：
  - hermes：它自己 `hermes model --refresh` 落盘的 `~/.hermes/provider_models_cache.json`
            + `hermes config show` 里声明的默认 provider；
  - dsh：`dsh --profile <p> --dump-config` 组合配置里的 `agent-default-model` 段。

这里只测**解析**（纯函数），不测真实 CLI：CI 机器上不一定装了这些 CLI。
真实读法的证据是 `python scripts/runtime-daemon.py --once --dry-run` 的输出（见 TEST.md）。
"""
import importlib.util
import json
import os
import tempfile
import unittest
from unittest.mock import patch

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SCRIPT = os.path.join(ROOT, "scripts", "runtime-daemon.py")

_spec = importlib.util.spec_from_file_location("af_runtime_daemon", SCRIPT)
daemon = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(daemon)   # 顶层只有常量与函数定义，无副作用


HERMES_CACHE = {
    "deepseek": {"fp": "f9", "at": 1, "models": ["deepseek-chat", "deepseek-reasoner", "deepseek-chat"]},
    "minimax": {"fp": "a1", "at": 1, "models": ["minimax-m1"]},
}

HERMES_CONFIG_SHOW = """
◆ Model
  Model:        {'provider': 'deepseek', 'default': 'deepseek-flash', 'base_url': 'https://api.deepseek.com', 'model_name': 'deepseek-v4-pro'}
  Max turns:    150
"""

DSH_DUMP = """# == @deepseek-ai/dsh-base
- id: llm
  name: '@deepseek-ai/dsh-llm'
# == @deepseek-ai/dsh-base, patched by /home/u/.dsh/profiles/headless/cordis.patch.yml
- id: agent-default-model
  name: '@deepseek-ai/dsh-agent-default-model'
  config:
    provider: deepseek-official
    model: deepseek-v4-flash
- id: jobs
  name: '@deepseek-ai/dsh-jobs-local'
"""


class TestHermesCache(unittest.TestCase):
    def test_only_default_provider(self):
        """RD-01：只取默认 provider 的模型，id 统一 `provider/model`，去重保序。"""
        models = daemon._models_from_hermes_cache(HERMES_CACHE, "deepseek")
        self.assertEqual(models, ["deepseek/deepseek-chat", "deepseek/deepseek-reasoner"])

    def test_unknown_provider_falls_back_to_all(self):
        """RD-02：默认 provider 不在缓存里 → 退回全部 provider，不报错也不空。"""
        models = daemon._models_from_hermes_cache(HERMES_CACHE, "openai-api")
        self.assertEqual(models, [
            "deepseek/deepseek-chat", "deepseek/deepseek-reasoner", "minimax/minimax-m1",
        ])

    def test_no_provider_given_uses_all(self):
        """RD-03：没有默认 provider 信息 → 全部 provider。"""
        models = daemon._models_from_hermes_cache(HERMES_CACHE, None)
        self.assertIn("minimax/minimax-m1", models)

    def test_bad_shape_returns_empty(self):
        """RD-04：坏形状（不是 dict / models 不是 list / 元素非字符串）按空处理，不抛。"""
        for bad in (None, [], "x", {"deepseek": {"models": "nope"}}, {"deepseek": {"models": [1, None, ""]}}):
            self.assertEqual(daemon._models_from_hermes_cache(bad, "deepseek"), [])

    def test_cap_at_50(self):
        """RD-05：上限 50（与服务端 `_json_list` 的截断口径一致）。"""
        big = {"p": {"models": [f"m{i}" for i in range(120)]}}
        self.assertEqual(len(daemon._models_from_hermes_cache(big, "p")), 50)


class TestHermesConfigShow(unittest.TestCase):
    def test_parses_default_provider(self):
        """RD-06：`hermes config show` 的 Model 行能取出 provider。"""
        self.assertEqual(daemon.provider_from_hermes_config(HERMES_CONFIG_SHOW), "deepseek")

    def test_unrecognised_shape_returns_none(self):
        """RD-07：格式不认识就返回 None（调用方退回全部 provider），不猜。"""
        self.assertIsNone(daemon.provider_from_hermes_config("◆ Model\n  Model: deepseek-flash\n"))
        self.assertIsNone(daemon.provider_from_hermes_config(""))


class TestDshDump(unittest.TestCase):
    def test_parses_agent_default_model(self):
        """RD-08：从 `agent-default-model` 段取 provider/model，只给一项（dsh 无 --model）。"""
        self.assertEqual(daemon.models_from_dsh_dump(DSH_DUMP), ["deepseek-official/deepseek-v4-flash"])

    def test_missing_section_returns_empty(self):
        """RD-09：没有该段 → 空（不编造），且不会把别的插件的 provider/model 抓进来。"""
        dumped = """- id: other
  config:
    provider: foo
    model: bar
"""
        self.assertEqual(daemon.models_from_dsh_dump(dumped), [])
        self.assertEqual(daemon.models_from_dsh_dump(""), [])

    def test_section_without_model_returns_empty(self):
        """RD-10：段在但没 model → 空。"""
        self.assertEqual(daemon.models_from_dsh_dump("- id: agent-default-model\n  config:\n    provider: p\n"), [])


class TestParseModelsListFlag(unittest.TestCase):
    def test_keeps_ids_and_skips_headers(self):
        """RD-11：`--list-models` 真有输出时的老口径不变（表头行丢掉、id 保留）。"""
        out = "Available:\nprovider/model-a\nprovider/model-b\nprovider/model-a\n"
        self.assertEqual(daemon._parse_models(out), ["provider/model-a", "provider/model-b"])


class TestFallbackWiring(unittest.TestCase):
    def test_hermes_reads_own_cache_not_the_platform(self):
        """RD-12：兜底读的是 hermes **自己的**缓存文件，读到了就不报 models_error。"""
        with tempfile.TemporaryDirectory() as tmp:
            cache_file = os.path.join(tmp, "provider_models_cache.json")
            with open(cache_file, "w", encoding="utf-8") as fh:
                json.dump(HERMES_CACHE, fh)
            with patch.object(daemon, "HERMES_CACHE_FILE", cache_file), \
                 patch.object(daemon, "_run", return_value=(HERMES_CONFIG_SHOW, "")):
                models, error = daemon._fallback_models("hermes", ["hermes"])
        self.assertEqual(error, "")
        self.assertEqual(models, ["deepseek/deepseek-chat", "deepseek/deepseek-reasoner"])

    def test_hermes_without_cache_reports_reason(self):
        """RD-13：连缓存都没有 → 空 + 真实原因（写进 models_error）。"""
        with patch.object(daemon, "HERMES_CACHE_FILE", "/nonexistent/provider_models_cache.json"):
            models, error = daemon._fallback_models("hermes", ["hermes"])
        self.assertEqual(models, [])
        self.assertIn("无模型缓存", error)

    def test_dsh_reads_own_composed_config(self):
        """RD-14：dsh 用**与执行模板同一 profile** 的 dump-config 读模型。"""
        captured = {}

        def fake_run(argv):
            captured["argv"] = argv
            return DSH_DUMP, ""

        with patch.object(daemon, "_run", side_effect=fake_run), \
             patch.object(daemon, "DSH_PROFILE", "headless"):
            models, error = daemon._fallback_models("dsh", ["node", "bin.js"])
        self.assertEqual(error, "")
        self.assertEqual(models, ["deepseek-official/deepseek-v4-flash"])
        self.assertEqual(captured["argv"], ["node", "bin.js", "--profile", "headless", "--dump-config"])

    def test_unknown_cli_reports_not_supported(self):
        """RD-15：没有已知模型来源的 CLI → 明确说「不支持」，不是静默空。"""
        models, error = daemon._fallback_models("claude", ["claude"])
        self.assertEqual(models, [])
        self.assertIn("claude", error)

    def test_fallback_only_used_when_list_models_fails(self):
        """RD-16：`--list-models` 成功时不得再走兜底（省一次子进程，也别覆盖真目录）。"""
        calls = []

        def fake_run(argv):
            calls.append(argv)
            return "provider/from-list-models\n", ""

        state = {}
        with patch.object(daemon, "_run", side_effect=fake_run), \
             patch.object(daemon, "_save_state", lambda _s: None), \
             patch.object(daemon, "resolve", return_value=(["fake-cli"], "path")):
            item = daemon.probe_one("hermes", state, refresh_models=True)
        self.assertEqual(item["models"], ["provider/from-list-models"])
        self.assertNotIn("models_error", item)
        # 只在第一次（--version）与 --list-models 上跑过，没有 config show / dump-config
        self.assertEqual(len(calls), 2, calls)


if __name__ == "__main__":
    unittest.main()
