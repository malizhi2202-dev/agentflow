"""回归：7-integration UAT 发现的两处 undefined name（T-FIX-01 / T-FIX-02）。

都不是本波新写代码，而是历史重构漏改的**已上线路径**：
- `scanner._phase_order` 写裸 `STAGES`（wave0 收口到 `stage_config.STAGES` 时漏了这一行）
  → `/api/health` 直接 500（每个 change 都会走 `_next_action`）。
- `routes/metrics_api._owner_filter` 引用未导入的 `SessionMetric`（且该函数已是死代码）。
"""
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("ENCRYPTION_KEY", "test-key-for-ci-32bytes!!")

from unittest.mock import patch

import config
import scanner
import stage_config


class TestPhaseOrderSingleSource(unittest.TestCase):
    def test_phase_order_uses_stage_config(self):
        first = stage_config.STAGES[0]
        self.assertEqual(scanner._phase_order(first), 0)
        self.assertEqual(scanner._phase_order("no-such-stage"), -1)

    def test_next_action_does_not_crash(self):
        info = scanner.ChangeInfo(id="demo", phase=stage_config.STAGES[0])
        action = scanner._next_action(info)
        self.assertIsInstance(action, str)
        self.assertTrue(action)


class TestHealthEndpoint(unittest.TestCase):
    """health 端点是探活面：一旦 500，部署侧无从判断服务是否活着。"""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        specs = os.path.join(self.tmp.name, "specs")
        change = os.path.join(specs, "demo-change")
        os.makedirs(change)
        with open(os.path.join(change, "CHANGE.md"), "w", encoding="utf-8") as f:
            f.write("# CHANGE · demo\n\n## 一句话\n\n演示。\n")
        with open(os.path.join(change, "TASK.md"), "w", encoding="utf-8") as f:
            f.write("# TASK\n\n## T-01 / 演示（完成）\n\n- **verify**：ok\n")
        self._patchers = [
            patch.object(scanner, "get_specs_dir", return_value=specs),
            patch.object(config, "get_specs_dir", return_value=specs),
        ]
        for p in self._patchers:
            p.start()
        # 让扫描器丢掉可能存在的跨用例缓存
        sc = scanner.get_file_scanner()
        sc._cache_valid = False
        sc._cache = []

    def tearDown(self):
        sc = scanner.get_file_scanner()
        sc._cache_valid = False
        sc._cache = []
        for p in reversed(self._patchers):
            p.stop()
        self.tmp.cleanup()

    def test_health_returns_200(self):
        from fastapi.testclient import TestClient
        from main import app

        c = TestClient(app, client=("127.0.0.1", 50000))
        r = c.get("/api/health")
        self.assertEqual(r.status_code, 200, r.text)
        self.assertIn("issues", r.json())


if __name__ == "__main__":
    unittest.main()
