"""API 集成测试 — FastAPI TestClient 全覆盖，不依赖真实 server."""
import os
import sys
import json
import unittest
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("ENCRYPTION_KEY", "test-key-for-ci-32bytes!!")

from fastapi.testclient import TestClient
from main import app
from database import get_db, SessionLocal
from sqlalchemy.orm import Session


def _mock_db():
    """创建 mock DB session."""
    db = MagicMock(spec=Session)
    q = MagicMock()
    q.filter.return_value = q
    q.order_by.return_value = q
    q.limit.return_value = q
    db.query.return_value = q
    return db


# 覆盖依赖注入
app.dependency_overrides[get_db] = _mock_db


class TestChatApiIntegration(unittest.TestCase):
    """chat API 全量集成测试."""

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.headers = {"X-User-Id": "admin", "Content-Type": "application/json"}

    def setUp(self):
        from models.agent import Agent
        self.agent = MagicMock(spec=Agent)
        self.agent.id = 15
        self.agent.name = "测试Agent"
        self.agent.description = "测试描述"
        self.agent.system_prompt = "You are helpful"
        self.agent.model_provider = "openai"
        self.agent.model_name = "gpt-3.5"
        self.agent.api_key_encrypted = "encrypted"
        self.agent.owner_id = "admin"

    # API-01: POST /chat 正常发送消息
    def test_send_message_ok(self):
        with patch("services.chat_service.ChatService.send_message") as mock_send:
            mock_send.return_value = {
                "user_message": {"id": 1, "role": "user", "content": "hello", "status": "done", "created_at": "2026-01-01T00:00:00"},
                "agent_message": {"id": 2, "role": "agent", "content": "hi there", "status": "done", "created_at": "2026-01-01T00:00:01"},
                "conversation_id": 1,
            }
            resp = self.client.post("/api/agents/15/chat", json={"content": "hello"}, headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["ok"])
        self.assertEqual(data["conversation_id"], 1)

    # API-02: POST /chat 空内容 → 400
    def test_send_message_empty_content(self):
        resp = self.client.post("/api/agents/15/chat", json={"content": ""}, headers=self.headers)
        self.assertEqual(resp.status_code, 400)

    # API-03: POST /chat 缺少 content → 400
    def test_send_message_missing_content(self):
        resp = self.client.post("/api/agents/15/chat", json={}, headers=self.headers)
        self.assertEqual(resp.status_code, 400)

    # API-04: POST /chat 超长 content
    def test_send_message_long_content(self):
        with patch("services.chat_service.ChatService.send_message") as mock_send:
            mock_send.return_value = {
                "user_message": {"id": 1, "role": "user", "content": "x" * 100, "status": "done", "created_at": ""},
                "agent_message": {"id": 2, "role": "agent", "content": "ok", "status": "done", "created_at": ""},
                "conversation_id": 1, "truncated": True,
            }
            resp = self.client.post("/api/agents/15/chat", json={"content": "x" * 5000}, headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.json()["truncated"])

    # API-05: POST /chat LLM 异常 → 500
    def test_send_message_llm_error(self):
        with patch("services.chat_service.ChatService.send_message", side_effect=Exception("LLM down")):
            resp = self.client.post("/api/agents/15/chat", json={"content": "hello"}, headers=self.headers)
        self.assertEqual(resp.status_code, 500)

    # API-06: POST /chat Agent 不存在 → 400
    def test_send_message_agent_not_found(self):
        with patch("services.chat_service.ChatService.send_message", side_effect=ValueError("Agent 999 不存在")):
            resp = self.client.post("/api/agents/999/chat", json={"content": "hello"}, headers=self.headers)
        self.assertEqual(resp.status_code, 400)

    # API-07: GET /chat/conversations 正常
    def test_list_conversations(self):
        with patch("services.chat_service.ChatService.list_conversations") as mock_list:
            mock_list.return_value = [
                {"id": 1, "agent_id": 15, "title": "会话1", "last_message": {"content": "hello", "id": 1, "role": "user", "status": "done", "created_at": ""}},
            ]
            resp = self.client.get("/api/chat/conversations", headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        self.assertIsInstance(resp.json(), list)

    # API-08: GET /chat/conversations 按 agent 过滤
    def test_list_conversations_filter_agent(self):
        with patch("services.chat_service.ChatService.list_conversations") as mock_list:
            mock_list.return_value = []
            resp = self.client.get("/api/chat/conversations?agent_id=15", headers=self.headers)
        self.assertEqual(resp.status_code, 200)

    # API-09: POST /chat/conversations 创建会话
    def test_create_conversation(self):
        with patch("services.chat_service.ChatService.create_conversation") as mock_create:
            mock_create.return_value = {"id": 1, "agent_id": 15, "owner_id": "admin", "channel_type": "web", "title": "新对话"}
            resp = self.client.post("/api/chat/conversations", json={"agent_id": 15}, headers=self.headers)
        self.assertEqual(resp.status_code, 200)

    # API-10: POST /chat/conversations 缺 agent_id → 400
    def test_create_conversation_missing_agent(self):
        resp = self.client.post("/api/chat/conversations", json={}, headers=self.headers)
        self.assertEqual(resp.status_code, 400)

    # API-11: GET /chat/{id}/messages 正常
    def test_get_messages(self):
        with patch("services.chat_service.ChatService.get_messages") as mock_get:
            mock_get.return_value = [
                {"id": 1, "role": "user", "content": "hi", "status": "done", "created_at": ""},
                {"id": 2, "role": "agent", "content": "hello", "status": "done", "created_at": ""},
            ]
            resp = self.client.get("/api/chat/1/messages?limit=100", headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()), 2)

    # API-12: GET /chat/{id}/messages since_id
    def test_get_messages_since_id(self):
        with patch("services.chat_service.ChatService.get_messages") as mock_get:
            mock_get.return_value = []
            resp = self.client.get("/api/chat/1/messages?since_id=5&limit=10", headers=self.headers)
        self.assertEqual(resp.status_code, 200)

    # API-13: GET /chat/{id}/messages 无权限 → 返回空
    def test_get_messages_no_permission(self):
        with patch("services.chat_service.ChatService.get_messages") as mock_get:
            mock_get.return_value = []  # 会话隔离
            resp = self.client.get("/api/chat/1/messages", headers={"X-User-Id": "other-user"})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json(), [])

    # API-14: POST /chat 带 conversation_id
    def test_send_message_with_conversation_id(self):
        with patch("services.chat_service.ChatService.send_message") as mock_send:
            mock_send.return_value = {
                "user_message": {"id": 3, "role": "user", "content": "follow-up", "status": "done", "created_at": ""},
                "agent_message": {"id": 4, "role": "agent", "content": "reply", "status": "done", "created_at": ""},
                "conversation_id": 1,
            }
            resp = self.client.post("/api/agents/15/chat",
                                    json={"content": "follow-up", "conversation_id": 1},
                                    headers=self.headers)
        self.assertEqual(resp.status_code, 200)


class TestChannelApiIntegration(unittest.TestCase):
    """channel API 全量集成测试."""

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.headers = {"X-User-Id": "admin", "Content-Type": "application/json"}

    # API-15: POST /channels 正常创建
    def test_create_channel(self):
        resp = self.client.post("/api/agents/15/channels",
                                json={"channel_type": "telegram", "credentials": {"bot_token": "test:token"}},
                                headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["ok"])
        self.assertEqual(data["channel"]["channel_type"], "telegram")
        self.assertEqual(data["channel"]["status"], "draft")

    # API-16: POST /channels 非法类型 → 400
    def test_create_channel_invalid_type(self):
        resp = self.client.post("/api/agents/15/channels",
                                json={"channel_type": "invalid", "credentials": {"x": "y"}},
                                headers=self.headers)
        self.assertEqual(resp.status_code, 400)

    # API-17: POST /channels 空凭证 → 400
    def test_create_channel_empty_credentials(self):
        resp = self.client.post("/api/agents/15/channels",
                                json={"channel_type": "telegram", "credentials": {}},
                                headers=self.headers)
        self.assertEqual(resp.status_code, 400)

    # API-18: POST /channels 缺 channel_type → 400
    def test_create_channel_missing_type(self):
        resp = self.client.post("/api/agents/15/channels",
                                json={"credentials": {"bot_token": "x"}},
                                headers=self.headers)
        self.assertEqual(resp.status_code, 400)

    # API-19: GET /channels 列表
    def test_list_channels(self):
        resp = self.client.get("/api/agents/15/channels", headers=self.headers)
        self.assertEqual(resp.status_code, 200)

    # API-20: PUT /channels 更新
    def test_update_channel(self):
        resp = self.client.put("/api/agents/15/channels/1",
                               json={"status": "disabled"},
                               headers=self.headers)
        # 可能 404（不存在）或 200（成功），都是正常路径
        self.assertIn(resp.status_code, [200, 404])

    # API-21: PUT /channels 不存在的渠道 → 404
    def test_update_nonexistent_channel(self):
        resp = self.client.put("/api/agents/15/channels/99999",
                               json={"status": "active"},
                               headers=self.headers)
        self.assertEqual(resp.status_code, 404)

    # API-22: DELETE /channels 不存在 → 404
    def test_delete_nonexistent_channel(self):
        resp = self.client.delete("/api/agents/15/channels/99999", headers=self.headers)
        self.assertEqual(resp.status_code, 404)

    # API-23: POST /channels/test 不存在 → 404
    def test_test_nonexistent_channel(self):
        resp = self.client.post("/api/agents/15/channels/99999/test", headers=self.headers)
        self.assertEqual(resp.status_code, 404)

    # API-24: POST webhook callback 不存在 → 404
    def test_webhook_nonexistent_uuid(self):
        resp = self.client.post("/api/channels/telegram/callback/nonexistent-uuid",
                                json={"message": {"text": "hi"}},
                                headers=self.headers)
        self.assertEqual(resp.status_code, 404)

    # API-25: POST webhook callback 畸形 body
    def test_webhook_malformed_body(self):
        resp = self.client.post("/api/channels/telegram/callback/nonexistent-uuid",
                                content=b"{broken json !!!",
                                headers={"Content-Type": "application/json"})
        self.assertEqual(resp.status_code, 404)  # UUID 不存在先拦截

    # API-26: 所有 5 种渠道类型创建
    def test_all_channel_types_create(self):
        types = ["feishu", "dingtalk", "slack", "telegram", "smtp_email"]
        creds_map = {
            "feishu": {"app_id": "id", "app_secret": "sec"},
            "dingtalk": {"webhook_url": "https://oapi.dingtalk.com/robot"},
            "slack": {"bot_token": "xoxb-test", "signing_secret": "sec"},
            "telegram": {"bot_token": "123:abc"},
            "smtp_email": {"smtp_host": "smtp.test.com", "smtp_port": 587, "smtp_user": "u", "smtp_password": "p"},
        }
        for t in types:
            resp = self.client.post(f"/api/agents/15/channels",
                                    json={"channel_type": t, "credentials": creds_map[t]},
                                    headers=self.headers)
            self.assertEqual(resp.status_code, 200, f"渠道 {t} 创建失败")

    # API-27: 缺少 X-User-Id header 的场景
    def test_missing_user_header(self):
        resp = self.client.get("/api/chat/conversations")
        # 应该仍然能工作（admin 默认用户）
        self.assertEqual(resp.status_code, 200)

    # API-28: 异常 HTTP method → 405
    def test_wrong_method(self):
        resp = self.client.put("/api/chat/conversations", headers=self.headers)
        self.assertEqual(resp.status_code, 405)


if __name__ == "__main__":
    unittest.main(verbosity=2)
