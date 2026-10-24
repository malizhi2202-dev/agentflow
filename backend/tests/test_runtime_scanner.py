"""runtime 扫描器：产物目录不存在是**空态**，不是异常。

回归背景（线上实测）：隔离部署把 `PROJECT_ROOT` 指向空运行根
（`serve_lan.sh` → `$DATA_DIR/runtime`），`get_specs_dir()` 指向尚未创建的 `.specs`，
`_read_instrumented` 直接 `os.listdir` 抛 `FileNotFoundError`，导致
`/api/runtime/summary|stats|sessions` 全部 500（前端「运行时」页整页报错）。

口径：目录缺失 → 按「没有埋点数据」返回空；目录存在时行为不变（不能被守卫吃掉真实数据）。
"""
import json
import os
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("ENCRYPTION_KEY", "test-key-for-ci-32bytes!!")

from runtime import scanner as rt_scanner


class _Base(unittest.TestCase):
    """把 specs 目录指到临时目录，并屏蔽真实适配器日志（本机可能有别的仓库的日志）。"""

    specs_sub = ".specs"

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.specs = os.path.join(self.tmp.name, self.specs_sub)
        if self.specs_sub_created:
            os.makedirs(self.specs, exist_ok=True)
        self._patches = [
            patch.object(rt_scanner, "get_specs_dir", return_value=self.specs),
            patch.object(rt_scanner, "_read_adapter_events", return_value=[]),
        ]
        for p in self._patches:
            p.start()
        self.scanner = rt_scanner.RuntimeScanner()

    def tearDown(self):
        for p in self._patches:
            p.stop()
        self.tmp.cleanup()


class TestMissingSpecsDir(_Base):
    """隔离部署的常态：运行根下还没有产物目录。"""

    specs_sub_created = False

    def test_dir_really_missing(self):
        # 前提自证：本用例测的确实是「目录不存在」这一条，而不是建了空目录
        self.assertFalse(os.path.exists(self.specs))

    def test_summary_does_not_raise(self):
        s = self.scanner.summary()
        self.assertEqual(s["sessions"], 0)
        self.assertEqual(s["total_output_tokens"], 0)
        self.assertFalse(s["has_instrumented"])
        self.assertFalse(s["has_adapter"])

    def test_sessions_returns_empty_list(self):
        self.assertEqual(self.scanner.sessions(), [])

    def test_stats_returns_zeroed_buckets(self):
        st = self.scanner.stats()
        self.assertEqual(st["summary"], {"today": 0, "week": 0, "total": 0})
        self.assertEqual(st["by_stage"], [])   # 空态返回空列表（键存在但无数据）
        self.assertEqual(st["by_model"], [])
        self.assertFalse(st["has_instrumented"])

    def test_scan_caches_empty_result(self):
        self.assertEqual(self.scanner.scan(), [])
        self.assertEqual(self.scanner.scan(), [])


class TestExistingSpecsDir(_Base):
    """守卫不能吃掉真实数据：目录存在时照旧解析 runtime.jsonl。"""

    specs_sub_created = True

    def _write_event(self, change="v20-demo", **kw):
        change_dir = os.path.join(self.specs, change)
        os.makedirs(change_dir, exist_ok=True)
        evt = {
            "timestamp": "2026-10-24T12:00:00Z",
            "agent": "architect",
            "model": "deepseek-flash",
            "stage": "2-design",
            "change_id": change,
            "skills": ["code-kit"],
            "mcps": [],
            "summary": "设计阶段会话",
            "tokens_input": 100,
            "tokens_output": 40,
        }
        evt.update(kw)
        with open(os.path.join(change_dir, "runtime.jsonl"), "w", encoding="utf-8") as f:
            f.write(json.dumps(evt, ensure_ascii=False) + "\n")

    def test_instrumented_event_is_parsed(self):
        self._write_event()
        events = self.scanner.scan(force=True)
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0]["_source"], "instrumented")
        self.assertEqual(events[0]["agent"], "architect")

    def test_summary_counts_tokens(self):
        self._write_event()
        s = self.scanner.summary()
        self.assertEqual(s["total_output_tokens"], 140)
        self.assertIn("deepseek-flash", s["models"])
        self.assertTrue(s["has_instrumented"])

    def test_sessions_grouped_by_change(self):
        self._write_event(change="v20-a")
        self._write_event(change="v20-b")
        sessions = self.scanner.sessions()
        self.assertEqual(sorted(s["session_id"] for s in sessions), ["v20-a", "v20-b"])

    def test_non_change_files_are_skipped(self):
        # 顶层文件、隐藏目录都不算 change（与旧行为一致）
        with open(os.path.join(self.specs, "README.md"), "w", encoding="utf-8") as f:
            f.write("# not a change")
        os.makedirs(os.path.join(self.specs, ".hidden"), exist_ok=True)
        self.assertEqual(self.scanner.scan(force=True), [])


if __name__ == "__main__":
    unittest.main()
