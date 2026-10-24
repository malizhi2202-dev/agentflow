"""P0-6/P0-7 单测：阶段模型单一事实源（纯标准库，无需第三方依赖）。

跑法：cd backend && python3 -m unittest tests.test_stage_config -v
"""
import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import config  # noqa: E402
import stage_config as sc  # noqa: E402

ID9 = ["0-change", "1-requirement", "2-design", "2a-ui-design", "3-task",
       "4-dev", "5-test", "6-review", "7-integration"]


class TestDefaults(unittest.TestCase):
    def setUp(self):
        sc.apply(sc.DEFAULT_WORKFLOW)

    def test_default_stages(self):
        self.assertEqual(sc.STAGES, ID9)
        self.assertEqual(sc.STAGE_NAMES["2a-ui-design"], "UI 设计")
        self.assertEqual(sc.STAGE_NAMES["7-integration"], "集成归档")

    def test_stage_files_and_artifacts(self):
        # 4-dev / 7-integration 无固定产物文件（与原实现一致）
        self.assertEqual(sorted(sc.STAGE_FILES),
                         sorted(["0-change", "1-requirement", "2-design", "2a-ui-design", "3-task", "5-test", "6-review"]))
        self.assertEqual(sc.ARTIFACTS, ["CHANGE.md", "REQUIREMENT.md", "DESIGN.md", "UI-DESIGN.md", "TASK.md", "TEST.md", "REVIEW.md"])


class TestValidation(unittest.TestCase):
    def _bad(self, body):
        with self.assertRaises(ValueError):
            sc.validate(body)

    def test_rejects_missing_or_bad(self):
        self._bad({})
        self._bad({"stages": "nope"})
        self._bad({"stages": []})
        self._bad({"stages": [{"name": "无 id"}]})
        self._bad({"stages": [{"id": "a"}, {"id": "a"}]})
        self._bad({"stages": ["不是对象"]})

    def test_custom_order_is_respected(self):
        wf = {"stages": [
            {"id": "2-design", "name": "设计", "order": 2},
            {"id": "0-change", "name": "变更", "order": 0},
            {"id": "9-extra", "name": "自定义阶段", "order": 9},
        ]}
        sc.apply(wf)
        self.assertEqual(sc.STAGES, ["0-change", "2-design", "9-extra"])
        # 自定义阶段没有固定产物文件 → 不产出 ARTIFACTS 项
        self.assertNotIn("9-extra", sc.STAGE_FILES)
        sc.apply(sc.DEFAULT_WORKFLOW)

    def test_invalid_apply_keeps_old_snapshot(self):
        sc.apply(sc.DEFAULT_WORKFLOW)
        before = list(sc.STAGES)
        with self.assertRaises(ValueError):
            sc.apply({"stages": []})
        self.assertEqual(sc.STAGES, before, "校验失败不得改动既有快照")


class TestDiskLoading(unittest.TestCase):
    def setUp(self):
        self._old_project = config.CURRENT_PROJECT
        self.tmp = tempfile.mkdtemp()
        os.makedirs(os.path.join(self.tmp, ".specs"), exist_ok=True)
        config.CURRENT_PROJECT = self.tmp

    def tearDown(self):
        config.CURRENT_PROJECT = self._old_project
        sc.apply(sc.DEFAULT_WORKFLOW)

    def test_workflow_file_location(self):
        self.assertEqual(sc.workflow_file(), os.path.join(self.tmp, "workflow.json"))

    def test_reload_reads_project_file(self):
        wf = {"stages": [{"id": "0-change", "name": "变更提案", "order": 0},
                         {"id": "1-requirement", "name": "需求分析", "order": 1}]}
        with open(sc.workflow_file(), "w", encoding="utf-8") as f:
            json.dump(wf, f)
        sc.reload()
        self.assertEqual(sc.STAGES, ["0-change", "1-requirement"])

    def test_missing_file_falls_back_to_default(self):
        sc.reload()  # 无 workflow.json
        self.assertEqual(sc.STAGES, ID9)


class TestSingleSource(unittest.TestCase):
    def test_scanners_share_the_same_module(self):
        """P0-7：两份扫描器不得再各自维护一套阶段表。"""
        import scanner
        self.assertIs(scanner.stage_config, sc)
        self.assertFalse(hasattr(scanner, "STAGE_NAMES"), "scanner 不应再持有本地 STAGE_NAMES")

    def test_runtime_scanner_has_no_local_tables(self):
        import runtime.scanner as rs
        self.assertFalse(hasattr(rs, "STAGE_FILES"), "runtime.scanner 不应再持有本地 STAGE_FILES")
        self.assertFalse(hasattr(rs, "STAGE_NAMES"), "runtime.scanner 不应再持有本地 STAGE_NAMES")


if __name__ == "__main__":
    unittest.main(verbosity=2)
