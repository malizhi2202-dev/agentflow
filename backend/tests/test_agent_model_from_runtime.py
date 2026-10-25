"""创建 Agent 不再选「模型 Provider / API Key」（RULINGS 2026-10-15 裁撤项的代码落地）。

口径：
- 可作用的模型来自运行时（`GET /api/runtimes` 的 `models`），表单只选运行时 + 模型；
- 平台不再收 Agent 级凭据：创建/更新都不落 api_key；
- provider 由运行时推导（CLI 运行时 → `cli`），显式传入仍校验；
- `cli` 通道必须落到**这个** Agent 的运行时上，落不到就报错（不静默换 CLI 代跑）。
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("ENCRYPTION_KEY", "test-key-for-ci-32bytes!!")

from models.agent import Agent
from services.cli_provider import CLI_KINDS, CliProvider
from services.llm_providers import get_provider
from tests._auth_harness import AuthHarness


class TestAgentModelFromRuntime(AuthHarness, unittest.TestCase):
    def _create(self, **over):
        payload = {"name": "审查助手"}
        payload.update(over)
        return self.client("alice").post("/api/agents", json=payload)

    def _row(self, agent_id):
        db = self.Session()
        try:
            return db.query(Agent).filter(Agent.id == agent_id).first()
        finally:
            db.close()

    # ── 创建：不需要 provider / api_key ───────────────────────────────
    def test_create_cli_runtime_derives_cli_provider(self):
        """MF-01：runtime=dsh + 只选模型 → 落库 provider=cli、无凭据。"""
        r = self._create(runtime="dsh", model_name="local-anthropic/deepseek-flash")
        self.assertEqual(r.status_code, 200, r.text)
        body = r.json()
        self.assertEqual(body["model_provider"], "cli")
        self.assertEqual(body["model_name"], "local-anthropic/deepseek-flash")
        self.assertIsNone(body["api_key"])          # 没落任何凭据
        self.assertEqual(self._row(body["id"]).api_key_encrypted, "")

    def test_create_without_any_model_fields(self):
        """MF-02：整条模型字段都不传也能创建（模型留空 = 用运行时自身默认）。"""
        r = self._create(runtime="hermes")
        self.assertEqual(r.status_code, 200, r.text)
        body = r.json()
        self.assertEqual(body["model_provider"], "cli")
        self.assertEqual(body["model_name"], "")

    def test_create_legacy_runtime_rejected(self):
        """MF-03（D8 订正）：langgraph 不再是运行时（§6.28），创建被拒。"""
        r = self._create(runtime="langgraph")
        self.assertEqual(r.status_code, 400, r.text)
        self.assertIn("不支持的 runtime", r.json()["detail"])

    def test_create_without_runtime_rejected(self):
        """D8：runtime 必填（不再默认 langgraph）。"""
        r = self.client("alice").post("/api/agents", json={"name": "no-rt"})
        self.assertEqual(r.status_code, 400, r.text)

    def test_create_custom_runtime_keeps_openai_default(self):
        """MF-03 原意的替身：非 CLI 白名单运行时（custom）维持旧默认 provider。"""
        r = self._create(runtime="custom")
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.json()["model_provider"], "openai")

    def test_explicit_provider_still_validated(self):
        """MF-04：显式传的 provider 仍校验（旧客户端/模板不会被放宽）。"""
        bad = self._create(runtime="dsh", model_provider="unknown_provider")
        self.assertEqual(bad.status_code, 400, bad.text)
        self.assertIn("model_provider", bad.json()["detail"])
        ok = self._create(runtime="dsh", model_provider="cli")
        self.assertEqual(ok.status_code, 200, ok.text)
        self.assertEqual(ok.json()["model_provider"], "cli")

    def test_create_ignores_api_key_field(self):
        """MF-05：请求体里带 api_key 也不再落库（凭据留在运行时机器）。"""
        r = self._create(runtime="dsh", api_key="sk-should-not-be-stored")
        self.assertEqual(r.status_code, 200, r.text)
        self.assertIsNone(r.json()["api_key"])
        self.assertEqual(self._row(r.json()["id"]).api_key_encrypted, "")

    # ── 更新：provider 跟随运行时，但不无条件改写存量行 ──────────────
    def test_update_runtime_switches_provider(self):
        """MF-06：改运行时 → provider 跟着推导成 cli。"""
        created = self._create(runtime="custom").json()
        self.assertEqual(created["model_provider"], "openai")
        r = self.client("alice").put(f"/api/agents/{created['id']}", json={"runtime": "dsh"})
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.json()["model_provider"], "cli")

    def test_unrelated_update_keeps_existing_provider(self):
        """MF-07：只改名字不动运行时 → 存量 provider 原样保留（不静默换通道）。"""
        created = self._create(runtime="codex", model_provider="deepseek").json()
        self.assertEqual(created["model_provider"], "deepseek")
        r = self.client("alice").put(f"/api/agents/{created['id']}", json={"name": "改个名字"})
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.json()["model_provider"], "deepseek")

    def test_update_ignores_api_key_field(self):
        """MF-08：更新也不收凭据。"""
        created = self._create(runtime="dsh").json()
        r = self.client("alice").put(f"/api/agents/{created['id']}", json={"api_key": "sk-late"})
        self.assertEqual(r.status_code, 200, r.text)
        self.assertIsNone(r.json()["api_key"])
        self.assertEqual(self._row(created["id"]).api_key_encrypted, "")

    # ── cli 通道必须落到该 Agent 的运行时上 ──────────────────────────
    def test_cli_provider_follows_runtime(self):
        """MF-09：get_provider('cli', runtime) 用该运行时自己的 CLI。"""
        for kind in CLI_KINDS:
            provider = get_provider("cli", kind)
            self.assertIsInstance(provider, CliProvider)
            self.assertEqual(provider.kind, kind)

    def test_cli_provider_falls_back_to_global_without_runtime(self):
        """MF-10：未指定运行时保持旧行为（全局 RSI_CLI_PROVIDER）。"""
        provider = get_provider("cli")
        self.assertIsInstance(provider, CliProvider)

    def test_cli_provider_rejects_unrunnable_runtime(self):
        """MF-11：cli 通道落不到该运行时 → 报错，不静默换另一个 CLI。"""
        with self.assertRaises(ValueError) as ctx:
            get_provider("cli", "codex")
        self.assertIn("codex", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
