"""第 6 轮 — 后端 API 异常 + 集成异常 20 个."""
import os
import sys
import json
import unittest
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("ENCRYPTION_KEY", "test-key-for-ci-32bytes!!")

from services.chat_service import ChatService
from services.channel_adapter import UniversalMessage
from services.encryption_service import encrypt, decrypt


# ═══════════════════════════════════════════
# R6-01~05: chat_service 更深异常
# ═══════════════════════════════════════════

class TestRound6ChatService(unittest.TestCase):
    def setUp(self):
        self.cs = ChatService()

    def _mock_all(self, agent_extra=None):
        db = MagicMock()
        agent = MagicMock()
        agent.id = 15; agent.name = "T"; agent.description = "d"
        agent.system_prompt = None; agent.model_provider = "openai"
        agent.model_name = "gpt-3.5"; agent.api_key_encrypted = "enc"
        if agent_extra:
            for k, v in agent_extra.items():
                setattr(agent, k, v)
        q = MagicMock()
        q.filter.return_value = q
        q.first.side_effect = lambda: agent
        db.query.return_value = q
        return db, agent

    # R6-01: LLM 返回 choices[0] 无 message
    def test_llm_missing_message_key(self):
        db, agent = self._mock_all()
        with patch("services.chat_service.urllib.request.urlopen") as m:
            r = MagicMock(); r.status = 200
            r.read.return_value = json.dumps({"choices": [{}]}).encode()
            m.return_value = r
            with patch("services.chat_service.decrypt", return_value="k"):
                with patch("services.chat_service.log_audit"):
                    result = self.cs.send_message(15, "hi", "admin", db)
        self.assertEqual(result["agent_message"]["status"], "error")

    # R6-02: LLM 返回 choices[0].message 无 content
    def test_llm_missing_content_key(self):
        db, agent = self._mock_all()
        with patch("services.chat_service.urllib.request.urlopen") as m:
            r = MagicMock(); r.status = 200
            r.read.return_value = json.dumps({"choices": [{"message": {}}]}).encode()
            m.return_value = r
            with patch("services.chat_service.decrypt", return_value="k"):
                with patch("services.chat_service.log_audit"):
                    result = self.cs.send_message(15, "hi", "admin", db)
        self.assertEqual(result["agent_message"]["status"], "error")

    # R6-03: LLM 超长回复内容
    def test_llm_very_long_response(self):
        db, agent = self._mock_all()
        long_reply = "x" * 50000
        with patch("services.chat_service.urllib.request.urlopen") as m:
            r = MagicMock(); r.status = 200
            r.read.return_value = json.dumps({"choices": [{"message": {"content": long_reply}}]}).encode()
            m.return_value = r
            with patch("services.chat_service.decrypt", return_value="k"):
                with patch("services.chat_service.log_audit"):
                    result = self.cs.send_message(15, "hi", "admin", db)
        self.assertEqual(result["agent_message"]["status"], "done")
        self.assertEqual(len(result["agent_message"]["content"]), 50000)

    # R6-04: get_messages 不存在的会话
    def test_get_messages_nonexistent_conv(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        result = self.cs.get_messages(99999, "admin", db)
        self.assertEqual(result, [])

    # R6-05: list_conversations 空数据库
    def test_list_conversations_empty(self):
        db = MagicMock()
        q = MagicMock()
        q.order_by.return_value = q
        q.limit.return_value = q
        q.all.return_value = []
        db.query.return_value.filter.return_value = q
        result = self.cs.list_conversations("admin", db)
        self.assertEqual(result, [])


# ═══════════════════════════════════════════
# R6-06~12: 加密 + 凭证异常
# ═══════════════════════════════════════════

class TestRound6Encryption(unittest.TestCase):

    # R6-06: 解密无效 base64
    def test_decrypt_invalid_base64(self):
        with self.assertRaises(Exception):
            decrypt("not-valid-base64!!!")

    # R6-07: 加密空字符串
    def test_encrypt_empty_string(self):
        result = encrypt("")
        self.assertIsInstance(result, str)
        self.assertGreater(len(result), 0)

    # R6-08: 加密特殊字符
    def test_encrypt_special_chars(self):
        special = "!@#$%^&*()_+-=[]{}|;':\",./<>?`~"
        enc = encrypt(special)
        dec = decrypt(enc)
        self.assertEqual(dec, special)

    # R6-09: 加密 Unicode
    def test_encrypt_unicode(self):
        text = "你好世界🌍🎉日本語한국어"
        enc = encrypt(text)
        dec = decrypt(enc)
        self.assertEqual(dec, text)

    # R6-10: 加密大文本（10KB）
    def test_encrypt_large_text(self):
        large = "A" * 10240
        enc = encrypt(large)
        dec = decrypt(enc)
        self.assertEqual(dec, large)

    # R6-11: 加密 JSON 凭证结构
    def test_encrypt_credentials_json(self):
        creds = json.dumps({
            "app_id": "cli_xxx",
            "app_secret": "very-long-secret-key-12345",
            "bot_token": "xoxb-123-456-789",
        })
        enc = encrypt(creds)
        dec = decrypt(enc)
        parsed = json.loads(dec)
        self.assertEqual(parsed["app_id"], "cli_xxx")
        self.assertEqual(parsed["bot_token"], "xoxb-123-456-789")

    # R6-12: 两次加密同一文本产生不同密文（nonce 随机）
    def test_encrypt_nonce_randomness(self):
        e1 = encrypt("same-text")
        e2 = encrypt("same-text")
        self.assertNotEqual(e1, e2)
        self.assertEqual(decrypt(e1), decrypt(e2))


# ═══════════════════════════════════════════
# R6-13~17: ORM to_dict 边界
# ═══════════════════════════════════════════

class TestRound6OrmToDict(unittest.TestCase):

    # R6-13: ChannelConfig 含枚举值的 to_dict
    def test_channel_config_all_statuses(self):
        from models.channel_config import ChannelConfig, CHANNEL_STATUSES
        for status in CHANNEL_STATUSES:
            cfg = ChannelConfig(agent_id=1, owner_id="u", channel_type="slack",
                              credentials_encrypted="enc", webhook_uuid="uuid", status=status)
            d = cfg.to_dict()
            self.assertEqual(d["status"], status)

    # R6-14: Message 含 channel_message_id 的 to_dict
    def test_message_with_channel_id(self):
        from models.message import Message
        msg = Message(conversation_id=1, role="agent", content="replied",
                      status="done", channel_message_id="tel_12345")
        d = msg.to_dict()
        self.assertEqual(d["channel_message_id"], "tel_12345")

    # R6-15: Conversation 含 channel_conversation_id
    def test_conversation_with_external_id(self):
        from models.conversation import Conversation
        conv = Conversation(agent_id=1, owner_id="u", channel_type="telegram",
                           channel_conversation_id="chat_67890", title="外部会话")
        d = conv.to_dict()
        self.assertEqual(d["channel_conversation_id"], "chat_67890")

    # R6-16: ChannelConfig JSON 凭证格式校验
    def test_credentials_json_structure(self):
        creds = json.dumps({"bot_token": "123:abc", "extra_field": True, "nested": {"key": "val"}})
        enc = encrypt(creds)
        dec = decrypt(enc)
        parsed = json.loads(dec)
        self.assertTrue(parsed["extra_field"])
        self.assertEqual(parsed["nested"]["key"], "val")

    # R6-17: 所有 Message status 枚举的 to_dict
    def test_message_all_statuses(self):
        from models.message import Message, MSG_STATUSES
        for status in MSG_STATUSES:
            msg = Message(conversation_id=1, role="user", content="test", status=status)
            d = msg.to_dict()
            self.assertEqual(d["status"], status)


# ═══════════════════════════════════════════
# R6-18~20: 适配器 send_message 超时 + 网络异常
# ═══════════════════════════════════════════

class TestRound6AdapterNetwork(unittest.TestCase):

    # R6-18: Telegram send_message 网络超时
    def test_telegram_send_timeout(self):
        from services.adapters.telegram import TelegramAdapter
        a = TelegramAdapter()
        with patch("services.adapters.telegram.urllib.request.urlopen", side_effect=TimeoutError("timeout")):
            with self.assertRaises((TimeoutError, Exception)):
                a.send_message(UniversalMessage(content="hi"), {"bot_token": "test"}, "123")

    # R6-19: 飞书 get_token 网络超时
    def test_feishu_token_timeout(self):
        from services.adapters.feishu import FeishuAdapter
        a = FeishuAdapter()
        with patch("services.adapters.feishu.urllib.request.urlopen", side_effect=TimeoutError("timeout")):
            with self.assertRaises((TimeoutError, Exception)):
                a.send_message(UniversalMessage(content="hi"),
                              {"app_id": "id", "app_secret": "sec"}, "oc_xxx")

    # R6-20: Slack send_message HTTP 429 rate limit
    def test_slack_rate_limit(self):
        from services.adapters.slack import SlackAdapter
        a = SlackAdapter()
        with patch("services.adapters.slack.urllib.request.urlopen") as m:
            r = MagicMock()
            r.read.return_value = json.dumps({"ok": False, "error": "rate_limited"}).encode()
            m.return_value = r
            with self.assertRaises(RuntimeError):
                a.send_message(UniversalMessage(content="hi"), {"bot_token": "xoxb-test"}, "C123")


if __name__ == "__main__":
    unittest.main(verbosity=2)
