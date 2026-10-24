"""P4：决策模型登记/绑定/可见性 + 微调三指标门禁 + 环境参谋画像（真 app + 真登录）。"""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("ENCRYPTION_KEY", "test-key-for-ci-32bytes!!")

from tests._auth_harness import AuthHarness


class TestDecisionModels(AuthHarness, unittest.TestCase):
    users = [("root", "admin"), ("alice", "member"), ("bob", "member")]

    def _register(self, uid, name="Jev-Style-Qwen3.5-2B", track="local"):
        r = self.client(uid).post("/api/decision-models",
                                  json={"name": name, "track": track, "kind": "Q4_K_M"})
        self.assertEqual(r.status_code, 200, r.text)
        return r.json()["model"]

    def test_register_defaults_to_unbound_and_unprobed(self):
        m = self._register("alice")
        self.assertEqual(m["health"], "unprobed")          # 没探测过不假装健康
        self.assertEqual(m["bindings"], [])                # 未绑定 ⇒ 直通
        self.assertTrue(m["enabled"])

    def test_duplicate_name_rejected(self):
        self._register("alice")
        r = self.client("alice").post("/api/decision-models", json={"name": "Jev-Style-Qwen3.5-2B"})
        self.assertEqual(r.status_code, 400, r.text)

    def test_bad_track_rejected(self):
        r = self.client("alice").post("/api/decision-models", json={"name": "x", "track": "quantum"})
        self.assertEqual(r.status_code, 400)

    def test_binding_toggle_persists_and_validates(self):
        m = self._register("alice")
        c = self.client("alice")
        on = c.post(f"/api/decision-models/{m['id']}/bindings", json={"binding": "route", "enabled": True})
        self.assertEqual(on.json()["model"]["bindings"], ["route"])
        off = c.post(f"/api/decision-models/{m['id']}/bindings", json={"binding": "route", "enabled": False})
        self.assertEqual(off.json()["model"]["bindings"], [])
        bad = c.post(f"/api/decision-models/{m['id']}/bindings", json={"binding": "nope", "enabled": True})
        self.assertEqual(bad.status_code, 400)

    def test_owner_scoping_and_admin_visibility(self):
        mine = self._register("alice")
        other = self._register("bob", name="intent-cls-mini", track="cloud")
        self.assertEqual([m["name"] for m in self.client("alice").get("/api/decision-models").json()["models"]],
                         ["Jev-Style-Qwen3.5-2B"])
        self.assertEqual(len(self.client("root").get("/api/decision-models").json()["models"]), 2)
        # 他人模型：404 而不是 403（不探测存在性）
        r = self.client("alice").post(f"/api/decision-models/{other['id']}/bindings",
                                      json={"binding": "route", "enabled": True})
        self.assertEqual(r.status_code, 404, r.text)
        self.assertEqual(mine["id"], mine["id"])

    def test_reprobe_is_fail_closed_without_adapter(self):
        m = self._register("alice")
        out = self.client("alice").post(f"/api/decision-models/{m['id']}/reprobe").json()
        self.assertEqual(out["health"], "unprobed")
        self.assertIn("未配置探测适配器", out["detail"])


class TestFinetuneGate(AuthHarness, unittest.TestCase):
    users = [("root", "admin"), ("alice", "member")]

    def _create(self, **over):
        payload = {"task_name": "dept-router-v3-ft", "base_model": "Qwen3.5-2B · LoRA r16",
                   "data_sessions": 412, "data_memories": 88, "engine": "llama-factory",
                   "hw_ok": True, "acc": 79.4, "ece": 0.061}
        payload.update(over)
        r = self.client("alice").post("/api/decision-models/finetune/batches", json=payload)
        self.assertEqual(r.status_code, 200, r.text)
        return r.json()["batch"]

    def test_ece_above_threshold_blocks_production(self):
        b = self._create()                                  # ECE 0.061 > 0.05
        self.assertEqual(b["gate_verdict"], "blocked")
        self.assertIn("ECE 0.061 > 门槛 0.050", b["gate_reason"])

    def test_passing_batch_is_promotable(self):
        b = self._create(acc=83.1, ece=0.023)
        self.assertEqual(b["gate_verdict"], "promote")
        self.assertIn("过门槛", b["gate_reason"])

    def test_hw_failure_blocks_before_metrics(self):
        b = self._create(hw_ok=False, acc=None, ece=None)
        self.assertEqual(b["gate_verdict"], "blocked")
        self.assertIn("硬件预检", b["gate_reason"])

    def test_missing_metrics_blocks(self):
        b = self._create(acc=None, ece=None)
        self.assertEqual(b["gate_verdict"], "blocked")
        self.assertIn("缺三指标自测", b["gate_reason"])

    def test_batches_are_owner_scoped_and_listed_desc(self):
        self._create()
        self._create(acc=83.1, ece=0.023)
        rows = self.client("alice").get("/api/decision-models/finetune/batches").json()["batches"]
        self.assertEqual(len(rows), 2)
        self.assertGreater(rows[0]["id"], rows[1]["id"])


class TestEnvAdvisor(AuthHarness, unittest.TestCase):
    users = [("root", "admin"), ("alice", "member")]

    def test_profile_and_plans_shape(self):
        data = self.client("alice").get("/api/decision-models/advisor").json()
        p = data["profile"]
        for k in ("platform", "arch", "cpu_count", "mem_total_gb", "disk_free_gb", "accelerator"):
            self.assertIn(k, p)
        self.assertIn("默认不上传", p["note"])
        self.assertGreaterEqual(len(data["plans"]), 2)
        for plan in data["plans"]:
            self.assertIn(plan["layer"], ("L1 · 本机最优", "L2 · 跨平台稳妥", "L3 · 云"))
            self.assertIn("why", plan)      # 推荐要说清为什么
            self.assertIn("steps", plan)    # 平台零执行：只给可复制指引
