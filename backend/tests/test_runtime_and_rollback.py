"""v24-doc-refresh D8/D9：运行时旧宇宙清除 + 迁移回滚机制。"""
import os
import sqlite3
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("ENCRYPTION_KEY", "test-key-for-ci-32bytes!!")

import migrations
from models.agent import SUPPORTED_RUNTIMES


class TestD8RuntimeWhitelist(unittest.TestCase):
    def test_legacy_runtimes_removed(self):
        for legacy in ("langchain", "langgraph", "autogen", "crewai"):
            self.assertNotIn(legacy, SUPPORTED_RUNTIMES,
                             f"§6.28：{legacy} 不再作为运行时表述")

    def test_cli_runtimes_and_custom_remain(self):
        self.assertEqual(set(SUPPORTED_RUNTIMES),
                         {"hermes", "dsh", "codex", "custom"})

    def test_snapshot_migration_output_has_no_old_universe(self):
        y = migrations  # noqa — 引用防止未用
        from services.snapshot_service import migrate_spec_json_to_yaml
        out = migrate_spec_json_to_yaml({"nodes": [{"label": "a"}], "edges": []})
        self.assertNotIn("langgraph", out)
        self.assertNotIn("gpt-4o", out)
        self.assertIn("runtime: custom", out)


class TestD8CreationApi(unittest.TestCase):
    """POST /api/agents：runtime 必填、langgraph 被拒（在 test_agent_model_from_runtime 断言，
    此处做 API 级双保险）。"""

    def setUp(self):
        from fastapi import FastAPI
        from fastapi.testclient import TestClient
        import auth
        import database
        from routes import agents_api
        self.app = FastAPI()
        self.app.include_router(agents_api.router)

        @self.app.middleware("http")
        async def fake_user(request, call_next):
            request.state.user = {"id": "admin", "role": "admin", "name": "admin"}
            return await call_next(request)

        self.client = TestClient(self.app)

    def test_missing_runtime_400(self):
        r = self.client.post("/api/agents", json={"name": "x"})
        self.assertEqual(r.status_code, 400)
        self.assertIn("runtime", r.json()["detail"])

    def test_langgraph_400(self):
        r = self.client.post("/api/agents",
                             json={"name": "x", "runtime": "langgraph"})
        self.assertEqual(r.status_code, 400)


class TestD9Rollback(unittest.TestCase):
    """回滚机制：账本逐版逆序回滚 + 未登记显式拒绝（fail-closed，不半截）。"""

    def _conn(self):
        conn = sqlite3.connect(tempfile.mktemp(suffix=".db"))
        migrations.apply_migrations(conn, "sqlite")
        return conn

    def test_down_registered_for_new_migrations(self):
        # 026 起逐版登记（波 0 判据兑现）；032–037 属 v25 批，同样必须登记
        for v in ("026_memory_dimensions_and_manifests",
                  "027_improvement_proposals_rename",
                  "028_governance_ledgers",
                  "029_automation_kind_and_keys",
                  "030_golden_sets",
                  "031_rsi_switch_reason",
                  "032_rsi_global_switch",
                  "033_squad_shape",
                  "034_queue_shape",
                  "035_automation_shape",
                  "036_collab_receipts",
                  "037_im_bindings"):
            self.assertIn(v, migrations.DOWN, f"{v} 应登记 down（波 0 判据兑现）")

    def _v24_versions(self):
        """v24/v25 批次（026 起）版本号，按账本动态取——不许硬编码数错。"""
        return [v for v, _d, _f in migrations.MIGRATIONS if int(v[:3]) >= 26]

    def test_rollback_roundtrip_top_two(self):
        """回滚「账上最高两版」（版本号随批次漂移，断言必须动态取）。"""
        conn = self._conn()
        versions = self._v24_versions()
        top_two = versions[::-1][:2]
        target = versions[-3]
        rolled = migrations.rollback_to(conn, "sqlite", target)
        self.assertEqual(rolled, top_two)  # 最新两版逆序
        tables = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        self.assertNotIn("im_bindings", tables)
        self.assertNotIn("mention_targets", tables)
        # 账行已删 → 幂等重放
        done = migrations.applied_versions(conn, "sqlite")
        self.assertEqual([v for v in top_two if v in done], [])
        applied = migrations.apply_migrations(conn, "sqlite")
        self.assertEqual(sorted(applied), sorted(top_two))
        tables2 = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        self.assertIn("im_bindings", tables2)
        conn.close()

    def test_rollback_roundtrip_026(self):
        conn = self._conn()
        rolled = migrations.rollback_to(conn, "sqlite", "025_automations_center")
        # v24 批次全回滚（逆序；数量以账本为准，不硬编码）
        self.assertEqual(rolled, self._v24_versions()[::-1])
        self.assertGreaterEqual(len(rolled), 5)
        cols = {r[1] for r in conn.execute("PRAGMA table_info(memories)")}
        self.assertNotIn("domain", cols)
        self.assertNotIn("life_status", cols)
        tables = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        self.assertNotIn("rule_versions", tables)
        self.assertNotIn("golden_sets", tables)
        # 提案表回到旧名
        self.assertIn("orchestration_proposals", tables)
        # 再前滚：全部幂等重放回去
        applied = migrations.apply_migrations(conn, "sqlite")
        self.assertEqual(len(applied), len(self._v24_versions()))
        cols2 = {r[1] for r in conn.execute("PRAGMA table_info(memories)")}
        self.assertIn("domain", cols2)
        conn.close()

    def test_rollback_refuses_unregistered_older_version(self):
        """回滚穿过 001–025（未登记 down）→ 显式拒绝且**一版都不动**。"""
        conn = self._conn()
        with self.assertRaises(migrations.RollbackNotSupported) as ctx:
            migrations.rollback_to(conn, "sqlite", "024_agent_tools")
        self.assertIn("未登记 down", str(ctx.exception))
        # 026–030 仍在账上（无半截回滚）
        done = migrations.applied_versions(conn, "sqlite")
        self.assertIn("030_golden_sets", done)
        cols = {r[1] for r in conn.execute("PRAGMA table_info(memories)")}
        self.assertIn("domain", cols)
        conn.close()

    def test_rollback_to_unknown_version_rejected(self):
        conn = self._conn()
        with self.assertRaises(migrations.RollbackNotSupported):
            migrations.rollback_to(conn, "sqlite", "099_does_not_exist")
        conn.close()

    def test_rollback_is_noop_when_already_at_target(self):
        conn = self._conn()
        top = self._v24_versions()[-1]  # 账上最高版
        self.assertEqual(migrations.rollback_to(conn, "sqlite", top), [])
        conn.close()


if __name__ == "__main__":
    unittest.main()
