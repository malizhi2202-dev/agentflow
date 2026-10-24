"""T-05：Agent 人设三件（system_prompt / role_def / sop）必须落库并可更新。"""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("ENCRYPTION_KEY", "test-key-for-ci-32bytes!!")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from models import Base
from models.agent import Agent
from services import chat_service

from tests._auth_harness import AuthHarness


class TestPersist(AuthHarness, unittest.TestCase):
    def _create(self, **over):
        payload = {"name": "写作助手", "runtime": "codex", "model_provider": "deepseek",
                   "model_name": "deepseek-flash", "api_key": "sk-test",
                   "system_prompt": "你是严谨的写作者", "role_def": "写手", "sop": "先列提纲"}
        payload.update(over)
        r = self.client("alice").post("/api/agents", json=payload)
        self.assertEqual(r.status_code, 200, r.text)
        return r.json()

    def test_create_persists_and_get_returns(self):
        created = self._create()
        self.assertEqual(created["system_prompt"], "你是严谨的写作者")
        got = self.client("alice").get(f"/api/agents/{created['id']}").json()
        self.assertEqual(got["system_prompt"], "你是严谨的写作者")
        self.assertEqual(got["role_def"], "写手")
        self.assertEqual(got["sop"], "先列提纲")

    def test_update_changes_prompt(self):
        created = self._create()
        r = self.client("alice").put(f"/api/agents/{created['id']}",
                                     json={"system_prompt": "改成简洁风格", "sop": "先写结论"})
        self.assertEqual(r.status_code, 200, r.text)
        got = self.client("alice").get(f"/api/agents/{created['id']}").json()
        self.assertEqual(got["system_prompt"], "改成简洁风格")
        self.assertEqual(got["sop"], "先写结论")
        self.assertEqual(got["role_def"], "写手")   # 未传的字段不被清空

    def test_chat_uses_persisted_prompt(self):
        created = self._create()
        db = self.Session()
        agent = db.query(Agent).filter(Agent.id == created["id"]).first()
        self.assertEqual(agent.system_prompt, "你是严谨的写作者")
        # chat_service 读的是 agent.system_prompt（落库后才能生效）
        self.assertEqual(chat_service._system_prompt_for(agent), "你是严谨的写作者")
        db.close()

    def test_null_prompt_falls_back_to_description(self):
        created = self._create(system_prompt=None)
        db = self.Session()
        agent = db.query(Agent).filter(Agent.id == created["id"]).first()
        agent.description = "一个写作助手"
        db.commit()
        self.assertEqual(chat_service._system_prompt_for(agent), "一个写作助手")
        db.close()


if __name__ == "__main__":
    unittest.main()
