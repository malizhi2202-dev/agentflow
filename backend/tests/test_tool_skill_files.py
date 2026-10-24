"""工具库多文件技能包（v23 · multica 迁移）：content_md 与 files_json 的落库、校验与回读。

背景：`tools.type='skill'` 是技能，`content_md` 是主 SKILL.md 正文，`files_json` 是附带文件
`[{path, content}]`。迁移前 create/update **都不落 content_md**（前端提交后被丢），所以这里
既补字段也把校验口径固定下来。
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("ENCRYPTION_KEY", "test-key-for-ci-32bytes!!")

from models.tool import Tool
from services import tool_service
from services.tool_service import ToolPayloadError, normalize_files_json
from tests._auth_harness import AuthHarness

SKILL_FILES = [
    {"path": "SKILL.md", "content": "# 代码审查\n\n正文"},
    {"path": "references/checklist.md", "content": "- 输入校验\n- 鉴权"},
]


class TestNormalizeFiles(unittest.TestCase):
    def test_accepts_normal_shape(self):
        """TF-01：正常形状原样通过，path 去首尾空白。"""
        out = normalize_files_json([{"path": " SKILL.md ", "content": "x"}])
        self.assertEqual(out, [{"path": "SKILL.md", "content": "x"}])

    def test_none_and_empty(self):
        """TF-02：None / [] → []（缺省不是错误）。"""
        self.assertEqual(normalize_files_json(None), [])
        self.assertEqual(normalize_files_json([]), [])

    def test_rejects_non_list(self):
        """TF-03：非数组必须报错（不静默当空）。"""
        for bad in ("{}", 1, {"path": "a"}):
            with self.assertRaises(ToolPayloadError):
                normalize_files_json(bad)

    def test_rejects_missing_or_dup_path(self):
        """TF-04：缺 path / path 重复都要报错，文案点出第几个或哪个 path。"""
        with self.assertRaises(ToolPayloadError) as ctx:
            normalize_files_json([{"content": "x"}])
        self.assertIn("缺 path", str(ctx.exception))
        with self.assertRaises(ToolPayloadError) as ctx2:
            normalize_files_json([{"path": "a", "content": ""}, {"path": "a", "content": ""}])
        self.assertIn("重复", str(ctx2.exception))

    def test_rejects_bad_content_type(self):
        """TF-05：content 非字符串报错（None 也不行，避免把 null 写进库）。"""
        with self.assertRaises(ToolPayloadError):
            normalize_files_json([{"path": "a", "content": None}])

    def test_caps(self):
        """TF-06：数量与总大小有硬上限。"""
        too_many = [{"path": f"f{i}.md", "content": ""} for i in range(tool_service.MAX_SKILL_FILES + 1)]
        with self.assertRaises(ToolPayloadError) as ctx:
            normalize_files_json(too_many)
        self.assertIn("最多", str(ctx.exception))
        with self.assertRaises(ToolPayloadError):
            normalize_files_json([{"path": "big.md", "content": "x" * (tool_service.MAX_SKILL_FILES_BYTES + 1)}])


class TestSkillFilesApi(AuthHarness, unittest.TestCase):
    # 越权用例需要第二个普通成员：默认夹具只有 root(admin) + alice(member)
    users = [("root", "admin"), ("alice", "member"), ("bob", "member")]

    def _create(self, client, **over):
        payload = {"name": "代码审查", "type": "skill", "description": "多轴审查",
                   "content_md": "# 代码审查\n\n正文", "files_json": SKILL_FILES}
        payload.update(over)
        return client.post("/api/tools", json=payload)

    def test_create_persists_content_and_files(self):
        """TF-07：创建时 content_md 与 files_json 都落库，回读一致。"""
        client = self.client("alice")
        r = self._create(client)
        self.assertEqual(r.status_code, 200, r.text)
        body = r.json()
        self.assertEqual(body["content_md"], "# 代码审查\n\n正文")
        self.assertEqual([f["path"] for f in body["files_json"]],
                         ["SKILL.md", "references/checklist.md"])
        got = client.get(f"/api/tools/{body['id']}").json()
        self.assertEqual(len(got["files_json"]), 2)
        self.assertEqual(got["files_json"][1]["content"], "- 输入校验\n- 鉴权")

    def test_create_without_files_yields_empty_list(self):
        """TF-08：不传 files_json → 回读是 []（不是 null）。"""
        r = self._create(self.client("alice"), files_json=None)
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.json()["files_json"], [])

    def test_update_replaces_content_and_files(self):
        """TF-09：更新整体替换正文与文件包（含删掉某个文件）。"""
        client = self.client("alice")
        tool_id = self._create(client).json()["id"]
        r = client.put(f"/api/tools/{tool_id}", json={
            "content_md": "# 新正文",
            "files_json": [{"path": "SKILL.md", "content": "new"}],
        })
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.json()["content_md"], "# 新正文")
        self.assertEqual(r.json()["files_json"], [{"path": "SKILL.md", "content": "new"}])

    def test_update_without_files_keeps_them(self):
        """TF-10：只改名字不清空文件包（未传字段不覆盖）。"""
        client = self.client("alice")
        tool_id = self._create(client).json()["id"]
        r = client.put(f"/api/tools/{tool_id}", json={"name": "改名了"})
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(len(r.json()["files_json"]), 2)
        self.assertEqual(r.json()["content_md"], "# 代码审查\n\n正文")

    def test_bad_files_rejected_with_400(self):
        """TF-11：非法文件包 → 400 且 detail 是具体原因（不是 500、不是通用文案）。"""
        client = self.client("alice")
        r = self._create(client, files_json=[{"path": "a", "content": ""}, {"path": "a", "content": ""}])
        self.assertEqual(r.status_code, 400, r.text)
        self.assertIn("重复", r.json()["detail"])
        r2 = self._create(client, files_json="not-a-list")
        self.assertEqual(r2.status_code, 400)
        self.assertIn("数组", r2.json()["detail"])

    def test_other_user_cannot_edit(self):
        """TF-12：非 owner 编辑他人技能 → 404（越权与不存在同码）。"""
        alice = self.client("alice")
        tool_id = self._create(alice).json()["id"]
        bob = self.client("bob")
        r = bob.put(f"/api/tools/{tool_id}", json={"files_json": []})
        self.assertEqual(r.status_code, 404, r.text)


class TestListPayloadShape(AuthHarness, unittest.TestCase):
    users = [("root", "admin"), ("alice", "member")]

    def test_list_omits_files_but_gives_count(self):
        """TF-14：列表只给 files_count，不带 files_json（避免 30 个技能把响应撑到 MB 级）。"""
        client = self.client("alice")
        created = client.post("/api/tools", json={"name": "技能A", "type": "skill",
                                                 "content_md": "正文", "files_json": SKILL_FILES}).json()
        listed = client.get("/api/tools?type=skill").json()["tools"]
        row = [t for t in listed if t["id"] == created["id"]][0]
        self.assertEqual(row["files_count"], 2)
        self.assertEqual(row["files_json"], [])
        self.assertEqual(row["content_md"], "正文")          # 列表仍带正文预览（老行为）
        detail = client.get(f"/api/tools/{created['id']}").json()
        self.assertEqual(len(detail["files_json"]), 2)        # 详情才有全文


class TestMigration020(unittest.TestCase):
    def test_files_json_column_added_idempotently(self):
        """TF-13：迁移 020 在 SQLite 上幂等加列（二次执行不抛、不重复加）。"""
        from sqlalchemy import create_engine
        from migrations import m020_tool_skill_files, _columns

        engine = create_engine("sqlite://")
        with engine.begin() as conn:
            raw = conn.connection.driver_connection
            raw.execute("CREATE TABLE tools (id INTEGER PRIMARY KEY, name VARCHAR(128))")
            m020_tool_skill_files(raw, "sqlite")
            m020_tool_skill_files(raw, "sqlite")
            cols = _columns(raw, "sqlite", "tools")
        self.assertIn("files_json", cols)
        self.assertEqual(cols.count("files_json"), 1)


if __name__ == "__main__":
    unittest.main()
