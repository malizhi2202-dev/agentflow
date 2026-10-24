"""multica → agentflow 迁移脚本的映射纯函数（`scripts/import_multica.py`）。

只测映射，不连任何库：真迁移的证据是 `scripts/import_multica.py --apply` 的实跑输出 +
目标库逐字节回读（见 `.specs/v23-multica-import/TEST.md`）。
"""
import importlib.util
import os
import re
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SCRIPT = os.path.join(ROOT, "scripts", "import_multica.py")

_spec = importlib.util.spec_from_file_location("import_multica", SCRIPT)
importer = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(importer)   # 顶层只定义常量/函数，无副作用

SLUG_RE = re.compile(r"^[a-z][a-z0-9-]{1,31}$")


class TestModelNormalize(unittest.TestCase):
    def test_colon_becomes_slash(self):
        """IM-01：multica 的 `provider:id` 规范成 agentflow / 运行时注册表的 `provider/id`。"""
        self.assertEqual(importer.normalize_model("minimax:MiniMax-M3"), "minimax/MiniMax-M3")
        self.assertEqual(importer.normalize_model("  deepseek : deepseek-v4-flash  "),
                         "deepseek/deepseek-v4-flash")

    def test_empty_and_slash_kept(self):
        """IM-02：空值保持空串（= 运行时自身默认）；已经是 `provider/model` 的原样不动。"""
        self.assertEqual(importer.normalize_model(""), "")
        self.assertEqual(importer.normalize_model(None), "")
        self.assertEqual(importer.normalize_model("deepseek-official/deepseek-v4-flash"),
                         "deepseek-official/deepseek-v4-flash")

    def test_degenerate_colon_left_as_is(self):
        """IM-03：`provider:` 这种缺一半的脏值原样保留（不猜模型名）。"""
        self.assertEqual(importer.normalize_model("minimax:"), "minimax:")


class TestRuntimeMap(unittest.TestCase):
    def test_known_cli_providers(self):
        """IM-04：dsh / hermes / codex 直通（agentflow 能真执行它们）。"""
        self.assertEqual(importer.map_runtime("dsh"), "dsh")
        self.assertEqual(importer.map_runtime("Hermes"), "hermes")
        self.assertEqual(importer.map_runtime("codex"), "codex")

    def test_unknown_falls_back_to_custom(self):
        """IM-05：claude / 空 / 未知 → custom（不假装 agentflow 支持）。"""
        self.assertEqual(importer.map_runtime("claude"), "custom")
        self.assertEqual(importer.map_runtime(""), "custom")
        self.assertEqual(importer.map_runtime(None), "custom")


class TestSquadSlug(unittest.TestCase):
    def test_ascii_name_used(self):
        """IM-06：ASCII 名字直接派生合法 slug。"""
        self.assertEqual(importer.slug_for_squad("code review", 1, set()), "code-review")

    def test_chinese_name_falls_back(self):
        """IM-07：中文名派生不出 ASCII → `multica-squad-N`（仍合法且唯一）。"""
        slug = importer.slug_for_squad("数据小队", 1, set())
        self.assertEqual(slug, "multica-squad-1")
        self.assertRegex(slug, SLUG_RE)

    def test_collision_skips(self):
        """IM-08：撞名时换下一个可用 slug（不抛、不覆盖别人）。"""
        taken = {"multica-squad-1", "multica-squad-2"}
        self.assertEqual(importer.slug_for_squad("数据小队", 1, taken), "multica-squad-3")

    def test_all_slugs_match_agentflow_regex(self):
        """IM-09：任何输入产出都必须过 agentflow 的 slug 规则（否则建队 400）。"""
        for name in ("数据小队", "研发交付小队", "A", "", "x" * 80, "squad-中文-1"):
            slug = importer.slug_for_squad(name, 7, set())
            self.assertRegex(slug, SLUG_RE, f"name={name!r} slug={slug!r}")


class TestPayloads(unittest.TestCase):
    SKILL = {"id": "s1", "name": " code-review ", "description": "审查",
             "content": "# 代码审查\n正文"}
    FILES = [{"path": "SKILL.md", "content": "x"}, {"path": "references/a.md", "content": "y"}]

    def test_skill_payload(self):
        """IM-10：skill → tools 请求体：正文进 content_md，文件原样进 files_json。"""
        payload = importer.skill_payload(self.SKILL, self.FILES)
        self.assertEqual(payload["type"], "skill")
        self.assertEqual(payload["name"], "code-review")
        self.assertEqual(payload["content_md"], "# 代码审查\n正文")
        self.assertEqual(payload["files_json"], self.FILES)

    def test_skill_name_truncated(self):
        """IM-11：name 截到 128（tools.name 列宽），不因长名字整条失败。"""
        payload = importer.skill_payload(dict(self.SKILL, name="n" * 200), [])
        self.assertEqual(len(payload["name"]), 128)

    def test_agent_payload(self):
        """IM-12：agent → agents 行：instructions → system_prompt、provider → runtime、模型规范化。"""
        payload = importer.agent_payload({
            "id": "a1", "name": "交付总调度", "description": "调度", "instructions": "你是调度者",
            "model": "minimax:MiniMax-M3", "provider": "hermes",
        })
        self.assertEqual(payload["name"], "交付总调度")
        self.assertEqual(payload["runtime"], "hermes")
        self.assertEqual(payload["model_name"], "minimax/MiniMax-M3")
        self.assertEqual(payload["system_prompt"], "你是调度者")

    def test_agent_without_instructions_hits_none_not_empty(self):
        """IM-13：空 instructions → system_prompt=None（回落 description，与既有口径一致）。"""
        payload = importer.agent_payload({
            "id": "a2", "name": "Mika", "description": "Chief of Staff", "instructions": "",
            "model": "", "provider": "",
        })
        self.assertIsNone(payload["system_prompt"])
        self.assertEqual(payload["runtime"], "custom")
        self.assertEqual(payload["model_name"], "")


class TestFullFieldMapping(unittest.TestCase):
    def test_parse_json_field(self):
        """IM-14：psql --csv 的 JSON 文本能解析回来；空/坏值按 default（不炸整批）。"""
        self.assertEqual(importer.parse_json_field('{}', {}), {})
        self.assertEqual(importer.parse_json_field('[]', []), [])
        self.assertEqual(importer.parse_json_field('{"K": "V"}'), {"K": "V"})
        self.assertEqual(importer.parse_json_field('["a","b"]'), ["a", "b"])
        self.assertIsNone(importer.parse_json_field('', None))
        self.assertIsNone(importer.parse_json_field('null', None))
        self.assertIsNone(importer.parse_json_field('not-json', None))   # 坏值不抛

    def test_agent_extra_fields(self):
        """IM-15：emoji 头像原样搬、长头像截到 512、空配置块落 None。"""
        row = {"avatar_url": "emoji:" + "🧠" * 400, "custom_env": "{}", "custom_args": "[]",
               "mcp_config": None, "thinking_level": "", "service_tier": None,
               "composio_toolkit_allowlist": None}
        out = importer.agent_extra_fields(row)
        self.assertTrue(out["avatar_url"].startswith("emoji:"))
        self.assertLessEqual(len(out["avatar_url"]), 512)
        self.assertEqual(out["custom_env"], {})
        self.assertEqual(out["custom_args"], [])
        self.assertIsNone(out["mcp_config"])
        self.assertIsNone(out["thinking_level"])     # 空串 → None，不落 ''
        self.assertIsNone(out["service_tier"])

    def test_skill_payload_carries_config(self):
        """IM-16：skill.config → tools.config_json（空对象也要显式给 {}）。"""
        payload = importer.skill_payload({"id": "s", "name": "code-review", "description": "",
                                          "content": "x", "config": "{}"}, [])
        self.assertEqual(payload["config_json"], {})
        payload2 = importer.skill_payload({"id": "s2", "name": "n", "description": "",
                                           "content": "y", "config": '{"entry": ["a.md"]}'}, [])
        self.assertEqual(payload2["config_json"], {"entry": ["a.md"]})

    def test_agent_payload_has_extra_fields(self):
        """IM-17：agent 载荷带上头像等附加字段（不再只有人设三件）。"""
        payload = importer.agent_payload({
            "id": "a", "name": "带队", "description": "", "instructions": "x", "model": "",
            "provider": "hermes", "avatar_url": "emoji:🐙", "custom_env": "{}", "custom_args": "[]",
            "mcp_config": None, "thinking_level": None, "service_tier": None,
            "composio_toolkit_allowlist": None,
        })
        self.assertEqual(payload["avatar_url"], "emoji:🐙")
        self.assertEqual(payload["custom_env"], {})


if __name__ == "__main__":
    unittest.main()
