"""Slack Bot 适配器."""
import hashlib
import hmac
import json
import time
import urllib.request
from services.channel_adapter import ChannelAdapter, UniversalMessage, ChannelMeta
from services.channel_adapter import nonce_cache


class SlackAdapter(ChannelAdapter):
    """Slack Bolt API 适配器，含签名校验."""

    def validate_request(self, headers: dict, body: bytes, credentials: dict) -> bool:
        """Slack signing secret 校验."""
        signing_secret = credentials.get("signing_secret", "")
        if not signing_secret:
            return False
        timestamp = headers.get("x-slack-request-timestamp", "")
        signature = headers.get("x-slack-signature", "")
        try:
            ts = int(timestamp)
            if abs(time.time() - ts) > 60:
                return False
        except (ValueError, TypeError):
            return False
        nonce = f"slack:{timestamp}"
        if not nonce_cache.check_and_add(nonce):
            return False
        sig_basestring = f"v0:{timestamp}:{body.decode('utf-8', errors='replace')}"
        computed = "v0=" + hmac.new(
            signing_secret.encode("utf-8"),
            sig_basestring.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(computed, signature)

    def parse_message(self, raw: dict) -> UniversalMessage:
        """解析 Slack Event JSON → UniversalMessage."""
        event = raw.get("event", raw)
        text = event.get("text", "")
        user = event.get("user", "")
        channel = event.get("channel", "")
        if event.get("bot_id") or event.get("subtype") == "bot_message":
            text = ""
        return UniversalMessage(content=text, sender_id=user, conversation_id=channel)

    def send_message(self, msg: UniversalMessage, credentials: dict, conversation_id: str) -> str:
        """通过 Slack chat.postMessage API 发送消息."""
        bot_token = credentials.get("bot_token", "")
        if not bot_token:
            raise ValueError("Slack bot_token 未配置")
        body = json.dumps({"channel": conversation_id, "text": msg.content}).encode("utf-8")
        req = urllib.request.Request(
            "https://slack.com/api/chat.postMessage",
            data=body,
            headers={"Authorization": f"Bearer {bot_token}", "Content-Type": "application/json"},
        )
        resp = urllib.request.urlopen(req, timeout=30)
        data = json.loads(resp.read().decode("utf-8"))
        if not data.get("ok"):
            raise RuntimeError(f"Slack API error: {data.get('error', '')}")
        return data.get("ts", "")

    def update_message(self, channel_message_id: str, new_content: str, credentials: dict) -> bool:
        """更新 Slack 消息."""
        bot_token = credentials.get("bot_token", "")
        channel = credentials.get("_last_channel", "")
        if not bot_token or not channel_message_id:
            return False
        try:
            body = json.dumps({"channel": channel, "ts": channel_message_id, "text": new_content}).encode("utf-8")
            req = urllib.request.Request(
                "https://slack.com/api/chat.update",
                data=body,
                headers={"Authorization": f"Bearer {bot_token}", "Content-Type": "application/json"},
            )
            resp = urllib.request.urlopen(req, timeout=10)
            return json.loads(resp.read().decode("utf-8")).get("ok", False)
        except Exception:
            return False

    def get_channel_info(self) -> ChannelMeta:
        return ChannelMeta(channel_type="slack", display_name="Slack", icon="💬")
