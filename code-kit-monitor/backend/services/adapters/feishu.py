"""飞书 Bot 适配器."""
import hashlib
import hmac
import json
import time
import urllib.request
from services.channel_adapter import ChannelAdapter, UniversalMessage, ChannelMeta
from services.channel_adapter import nonce_cache


class FeishuAdapter(ChannelAdapter):
    """飞书开放平台 Bot 适配器，含签名校验 + 占位消息."""

    def validate_request(self, headers: dict, body: bytes, credentials: dict) -> bool:
        """飞书签名校验."""
        app_secret = credentials.get("app_secret", "")
        timestamp = headers.get("x-lark-request-timestamp", "")
        nonce = headers.get("x-lark-request-nonce", "")
        signature = headers.get("x-lark-signature", "")
        if not app_secret or not timestamp or not nonce or not signature:
            return False
        try:
            ts = int(timestamp)
            if abs(time.time() - ts) > 60:
                return False
        except (ValueError, TypeError):
            return False
        if not nonce_cache.check_and_add(f"feishu:{timestamp}:{nonce}"):
            return False
        body_str = body.decode("utf-8", errors="replace")
        sign_str = f"{timestamp}{nonce}{app_secret}{body_str}"
        computed = hashlib.sha1(sign_str.encode("utf-8")).hexdigest()
        return hmac.compare_digest(computed, signature)

    def parse_message(self, raw: dict) -> UniversalMessage:
        """解析飞书事件 JSON → UniversalMessage."""
        if raw.get("type") == "url_verification":
            return UniversalMessage(content="", sender_id="system", conversation_id="")
        event = raw.get("event", raw)
        msg = event.get("message", event)
        text = ""
        if isinstance(msg, dict):
            text = msg.get("text", "")
            if not text:
                content_block = msg.get("content", "")
                if isinstance(content_block, str):
                    try:
                        parsed = json.loads(content_block)
                        text = parsed.get("text", content_block)
                    except (json.JSONDecodeError, TypeError):
                        text = content_block
        sender = event.get("sender", {})
        sender_id = ""
        if isinstance(sender, dict):
            sid = sender.get("sender_id", {})
            sender_id = sid.get("open_id", "") if isinstance(sid, dict) else str(sid)
        chat_id = ""
        if isinstance(msg, dict):
            chat_id = msg.get("chat_id", "")
        return UniversalMessage(content=text, sender_id=sender_id, conversation_id=chat_id)

    def _get_token(self, credentials: dict) -> str:
        """获取飞书 tenant_access_token."""
        app_id = credentials.get("app_id", "")
        app_secret = credentials.get("app_secret", "")
        body = json.dumps({"app_id": app_id, "app_secret": app_secret}).encode("utf-8")
        req = urllib.request.Request(
            "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
            data=body,
            headers={"Content-Type": "application/json"},
        )
        resp = urllib.request.urlopen(req, timeout=10)
        data = json.loads(resp.read().decode("utf-8"))
        token = data.get("tenant_access_token", "")
        if not token:
            raise RuntimeError(f"飞书获取 token 失败: {data}")
        return token

    def send_message(self, msg: UniversalMessage, credentials: dict, conversation_id: str) -> str:
        """通过飞书 API 发送消息."""
        token = self._get_token(credentials)
        body = json.dumps({
            "receive_id": conversation_id,
            "msg_type": "text",
            "content": json.dumps({"text": msg.content}, ensure_ascii=False),
        }, ensure_ascii=False).encode("utf-8")
        req = urllib.request.Request(
            "https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id",
            data=body,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json; charset=utf-8"},
        )
        resp = urllib.request.urlopen(req, timeout=30)
        data = json.loads(resp.read().decode("utf-8"))
        if data.get("code", -1) != 0:
            raise RuntimeError(f"飞书发送失败: {data.get('msg', '')}")
        return data.get("data", {}).get("message_id", "")

    def update_message(self, channel_message_id: str, new_content: str, credentials: dict) -> bool:
        """飞书修改消息."""
        try:
            token = self._get_token(credentials)
            body = json.dumps({"content": json.dumps({"text": new_content}, ensure_ascii=False)}, ensure_ascii=False).encode("utf-8")
            req = urllib.request.Request(
                f"https://open.feishu.cn/open-apis/im/v1/messages/{channel_message_id}",
                data=body,
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json; charset=utf-8"},
                method="PATCH",
            )
            resp = urllib.request.urlopen(req, timeout=10)
            return json.loads(resp.read().decode("utf-8")).get("code", -1) == 0
        except Exception:
            return False

    def get_channel_info(self) -> ChannelMeta:
        return ChannelMeta(channel_type="feishu", display_name="飞书", icon="🐦")
