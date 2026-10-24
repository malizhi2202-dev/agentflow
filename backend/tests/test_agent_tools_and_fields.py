"""v23 全字段迁移：Agent ↔ 技能绑定、Agent 附加字段、小队成员角色、工具 config。

迁移脚本负责「数据搬过来」，这里负责「搬过来之后 API 能存能读」：
- 绑定：POST/DELETE/GET `/api/agents/{id}/tools`（唯一键幂等、越权 404）；
- Agent 附加字段：`avatar_url` / `custom_env` 等（multica 侧是 emoji 头像 + opaque 配置块）；
- 小队成员 `role`（member / leader / expert-reviewer）；
- 工具 `config_json`（multica `skill.config`）。
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("ENCRYPTION_KEY", "test-key-for-ci-32bytes!!")

from models.agent import Agent
from models.agent_tool import AgentTool
from models.teams import SquadMember
from models.tool import Tool
from services import team_service
from tests._auth_harness import AuthHarness


class TestAgentToolBinding(AuthHarness, unittest.TestCase):
    users = [("root", "admin"), ("alice", "member"), ("bob", "member")]

    def _agent(self, name="审查助手"):
        r = self.client("alice").post("/api/agents", json={"name": name, "runtime": "hermes"})
        self.assertEqual(r.status_code, 200, r.text)
        return r.json()["id"]

    def _tool(self, name="code-review", type_="skill"):
        r = self.client("alice").post("/api/tools", json={"name": name, "type": type_,
                                                         "description": "审查", "content_md": "# 正文"})
        self.assertEqual(r.status_code, 200, r.text)
        return r.json()["id"]

    def test_bind_list_unbind(self):
        """AT-01：绑定 → 列表能查到（带 name/type）→ 解绑后为空。"""
        client = self.client("alice")
        agent_id, tool_id = self._agent(), self._tool()
        r = client.post(f"/api/agents/{agent_id}/tools", json={"tool_id": tool_id})
        self.assertEqual(r.status_code, 200, r.text)
        listed = client.get(f"/api/agents/{agent_id}/tools").json()["tools"]
        self.assertEqual([(t["id"], t["name"], t["type"]) for t in listed], [(tool_id, "code-review", "skill")])
        r2 = client.delete(f"/api/agents/{agent_id}/tools/{tool_id}")
        self.assertEqual(r2.status_code, 200, r2.text)
        self.assertEqual(client.get(f"/api/agents/{agent_id}/tools").json()["tools"], [])

    def test_bind_is_idempotent(self):
        """AT-02：重复绑定不产生重复行（唯一键幂等，104 条 multica 绑定靠这个保证不翻倍）。"""
        client = self.client("alice")
        agent_id, tool_id = self._agent(), self._tool()
        for _ in range(3):
            self.assertEqual(client.post(f"/api/agents/{agent_id}/tools", json={"tool_id": tool_id}).status_code, 200)
        db = self.Session()
        try:
            self.assertEqual(db.query(AgentTool).filter(AgentTool.agent_id == agent_id).count(), 1)
        finally:
            db.close()

    def test_bind_validation(self):
        """AT-03：tool_id 缺失 → 400；工具不存在 → 404。"""
        client = self.client("alice")
        agent_id = self._agent()
        self.assertEqual(client.post(f"/api/agents/{agent_id}/tools", json={}).status_code, 400)
        self.assertEqual(client.post(f"/api/agents/{agent_id}/tools", json={"tool_id": 9999}).status_code, 404)

    def test_other_user_cannot_bind(self):
        """AT-04：别人的 Agent → 404（越权与不存在同码）。"""
        alice_agent = self._agent()
        bob = self.client("bob")
        self.assertEqual(bob.get(f"/api/agents/{alice_agent}/tools").status_code, 404)
        alice_tool = self._tool()
        self.assertEqual(bob.post(f"/api/agents/{alice_agent}/tools", json={"tool_id": alice_tool}).status_code, 404)

    def test_unbind_unknown_returns_404(self):
        """AT-05：解绑未绑定的关系 → 404（不静默成功）。"""
        client = self.client("alice")
        agent_id, tool_id = self._agent(), self._tool()
        self.assertEqual(client.delete(f"/api/agents/{agent_id}/tools/{tool_id}").status_code, 404)


class TestAgentExtraFields(AuthHarness, unittest.TestCase):
    def test_extra_fields_roundtrip(self):
        """AT-06：avatar_url / custom_env / thinking_level 能落库、能读出、能更新。"""
        client = self.client("alice")
        created = client.post("/api/agents", json={
            "name": "带头像的 Agent", "runtime": "hermes",
            "avatar_url": "emoji:🧠", "custom_env": {"K": "V"}, "thinking_level": "high",
        })
        self.assertEqual(created.status_code, 200, created.text)
        body = created.json()
        self.assertEqual(body["avatar_url"], "emoji:🧠")
        self.assertEqual(body["custom_env"], {"K": "V"})
        self.assertEqual(body["thinking_level"], "high")
        r = client.put(f"/api/agents/{body['id']}", json={"avatar_url": "emoji:🚀", "service_tier": "normal"})
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.json()["avatar_url"], "emoji:🚀")
        self.assertEqual(r.json()["service_tier"], "normal")
        self.assertEqual(r.json()["custom_env"], {"K": "V"})   # 未传的字段不被清空


class TestSquadMemberRole(unittest.TestCase):
    """AT-07：小队成员角色落库（member / leader / expert-reviewer）并能读出。"""

    def setUp(self):
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
        from sqlalchemy.pool import StaticPool
        from models import Base

        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine)()
        self.leader = Agent(owner_id="alice", name="队长", runtime="hermes", model_provider="cli",
                            model_name="", model_config_json={}, api_key_encrypted="", status="standby")
        self.db.add(self.leader)
        self.db.commit()
        self.db.refresh(self.leader)

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_role_persisted_and_serialised(self):
        squad = team_service.create_squad(self.db, "s1", "数据小队", self.leader.id, created_by="alice")
        row = team_service.add_squad_member(self.db, squad, "agent", str(self.leader.id), role="expert-reviewer")
        self.assertEqual(row.role, "expert-reviewer")
        self.assertEqual(row.to_dict()["role"], "expert-reviewer")

    def test_role_defaults_to_empty(self):
        squad = team_service.create_squad(self.db, "s2", "另一队", self.leader.id, created_by="alice")
        row = team_service.add_squad_member(self.db, squad, "agent", str(self.leader.id))
        self.assertEqual(row.role, "")
        self.assertEqual(row.to_dict()["role"], "")


class TestToolConfigJson(AuthHarness, unittest.TestCase):
    def test_config_json_roundtrip(self):
        """AT-08：工具 config_json 能落库、能改、默认空对象。"""
        client = self.client("alice")
        created = client.post("/api/tools", json={"name": "带配置的技能", "type": "skill"}).json()
        self.assertEqual(created["config_json"], {})
        r = client.put(f"/api/tools/{created['id']}", json={"config_json": {"entry": ["a.md"]}})
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.json()["config_json"], {"entry": ["a.md"]})


class TestMigrations022To024(unittest.TestCase):
    def test_idempotent_on_sqlite(self):
        """AT-09：022/023/024 在 SQLite 上幂等（二次执行不抛、不重复加）。"""
        from sqlalchemy import create_engine
        from migrations import (m022_tool_config_and_squad_role, m023_agent_extra_fields,
                                m024_agent_tools, _columns, _table_exists)

        engine = create_engine("sqlite://")
        with engine.begin() as conn:
            raw = conn.connection.driver_connection
            raw.execute("CREATE TABLE tools (id INTEGER PRIMARY KEY)")
            raw.execute("CREATE TABLE squad_members (id INTEGER PRIMARY KEY)")
            raw.execute("CREATE TABLE agents (id INTEGER PRIMARY KEY)")
            for fn in (m022_tool_config_and_squad_role, m023_agent_extra_fields, m024_agent_tools):
                fn(raw, "sqlite")
                fn(raw, "sqlite")   # 幂等
            self.assertIn("config_json", _columns(raw, "sqlite", "tools"))
            self.assertIn("role", _columns(raw, "sqlite", "squad_members"))
            agent_cols = _columns(raw, "sqlite", "agents")
            for col in ("avatar_url", "custom_env", "custom_args", "mcp_config",
                        "thinking_level", "service_tier", "composio_toolkit_allowlist"):
                self.assertEqual(agent_cols.count(col), 1, col)
            self.assertTrue(_table_exists(raw, "sqlite", "agent_tools"))


if __name__ == "__main__":
    unittest.main()
