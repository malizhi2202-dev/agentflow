"""Telegram Bot 适配器 — 第一个样板实现."""
import json
import urllib.request
from services.channel_adapter import ChannelAdapter, UniversalMessage, ChannelMeta
from services.channel_adapter import nonce_cache


class TelegramAdapter(ChannelAdapter):
    """Telegram Bot API 适配器. Bot API 无签名机制，直接校验 token 有效性."""

    def validate_request(self, headers: dict, body: bytes, credentials: dict) -> bool:
        """Telegram 无签名机制，直接返回 True."""
        return True

    def parse_message(self, raw: dict) -> UniversalMessage:
        """解析 Telegram Update JSON → UniversalMessage."""
        msg = raw.get("message", {})
        chat = msg.get("chat", {})
        text = msg.get("text", "")
        sender = msg.get("from", {})

        return UniversalMessage(
            content=text,
            sender_id=str(sender.get("id", "")),
            conversation_id=str(chat.get("id", "")),
        )

    def send_message(self, msg: UniversalMessage, credentials: dict, conversation_id: str) -> str:
        """通过 Telegram Bot API 发送消息."""
        token = credentials.get("bot_token", "")
        if not token:
            raise ValueError("Telegram bot_token 未配置")

        body = json.dumps({"chat_id": conversation_id, "text": msg.content, "parse_mode": "HTML"}).encode("utf-8")
        req = urllib.request.Request(
            f"https://api.telegram.org/bot{token}/sendMessage",
            data=body,
            headers={"Content-Type": "application/json"},
        )
        resp = urllib.request.urlopen(req, timeout=30)
        data = json.loads(resp.read().decode("utf-8"))
        if not data.get("ok"):
            raise RuntimeError(f"Telegram API error: {data.get('description', '')}")
        return str(data["result"]["message_id"])

    def update_message(self, channel_message_id: str, new_content: str, credentials: dict) -> bool:
        """编辑已发送的消息."""
        token = credentials.get("bot_token", "")
        chat_id = credentials.get("_last_chat_id", "")
        if not token or not channel_message_id:
            return False
        try:
            body = json.dumps({"chat_id": chat_id or "0", "message_id": int(channel_message_id), "text": new_content, "parse_mode": "HTML"}).encode("utf-8")
            req = urllib.request.Request(
                f"https://api.telegram.org/bot{token}/editMessageText",
                data=body,
                headers={"Content-Type": "application/json"},
            )
            resp = urllib.request.urlopen(req, timeout=10)
            return json.loads(resp.read().decode("utf-8")).get("ok", False)
        except Exception:
            return False

    def get_channel_info(self) -> ChannelMeta:
        return ChannelMeta(channel_type="telegram", display_name="Telegram", icon="📱")
