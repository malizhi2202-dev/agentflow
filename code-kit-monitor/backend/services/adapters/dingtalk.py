"""钉钉 Bot 适配器（Stream 模式）."""
import json
import time
import urllib.request
from services.channel_adapter import ChannelAdapter, UniversalMessage, ChannelMeta
from services.channel_adapter import nonce_cache


class DingTalkAdapter(ChannelAdapter):
    """钉钉 Stream 模式适配器."""

    def validate_request(self, headers: dict, body: bytes, credentials: dict) -> bool:
        """钉钉 Stream 模式签名由 SDK 内部处理，此处做 timestamp 基本校验."""
        timestamp = headers.get("timestamp", headers.get("x-dingtalk-request-timestamp", ""))
        if timestamp:
            try:
                ts = int(timestamp)
                if abs(time.time() - ts) > 60:
                    return False
            except (ValueError, TypeError):
                pass
        return True

    def parse_message(self, raw: dict) -> UniversalMessage:
        """解析钉钉消息 JSON → UniversalMessage."""
        text = raw.get("text", {}).get("content", "") if isinstance(raw.get("text"), dict) else raw.get("text", "")
        sender_id = raw.get("senderStaffId", raw.get("senderId", ""))
        conversation_id = raw.get("sessionWebhook", raw.get("conversationId", ""))
        return UniversalMessage(content=text, sender_id=str(sender_id), conversation_id=str(conversation_id))

    def send_message(self, msg: UniversalMessage, credentials: dict, conversation_id: str) -> str:
        """通过钉钉 webhook 发送消息."""
        webhook_url = credentials.get("webhook_url", "")
        if not webhook_url:
            raise ValueError("钉钉 webhook_url 未配置")
        body = json.dumps({"msgtype": "text", "text": {"content": msg.content}}, ensure_ascii=False).encode("utf-8")
        req = urllib.request.Request(
            webhook_url,
            data=body,
            headers={"Content-Type": "application/json; charset=utf-8"},
        )
        resp = urllib.request.urlopen(req, timeout=30)
        data = json.loads(resp.read().decode("utf-8"))
        if data.get("errcode", -1) != 0:
            raise RuntimeError(f"钉钉发送失败: {data.get('errmsg', '')}")
        return str(int(time.time() * 1000))

    def update_message(self, channel_message_id: str, new_content: str, credentials: dict) -> bool:
        """钉钉不支持修改已发送消息."""
        return False

    def get_channel_info(self) -> ChannelMeta:
        return ChannelMeta(channel_type="dingtalk", display_name="钉钉", icon="📌")
