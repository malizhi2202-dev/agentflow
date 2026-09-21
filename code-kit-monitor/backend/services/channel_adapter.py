"""ChannelAdapter Protocol — 渠道接入的标准接口契约."""
from dataclasses import dataclass, field
from collections import OrderedDict
import time


@dataclass
class UniversalMessage:
    """通用消息格式 — 所有渠道消息归一化为该结构."""
    content: str
    attachments: list[str] = field(default_factory=list)
    sender_id: str = ""
    conversation_id: str = ""


@dataclass
class ChannelMeta:
    """渠道元数据."""
    channel_type: str
    display_name: str
    icon: str = ""


class ChannelAdapter:
    """渠道适配器 Protocol 基类 — 所有渠道适配器需实现以下方法.

    使用鸭子类型：不强制继承，只需实现 4+1 个方法即可注册为新渠道.
    """

    def validate_request(self, headers: dict, body: bytes, credentials: dict) -> bool:
        """校验 webhook 请求签名. 无 webhook 的渠道（如 SMTP）返回 True."""
        raise NotImplementedError

    def parse_message(self, raw: dict) -> UniversalMessage:
        """将渠道原始消息解析为 UniversalMessage."""
        raise NotImplementedError

    def send_message(self, msg: UniversalMessage, credentials: dict, conversation_id: str) -> str:
        """将 UniversalMessage 推送到渠道，返回 channel_message_id."""
        raise NotImplementedError

    def update_message(self, channel_message_id: str, new_content: str, credentials: dict) -> bool:
        """修改已发送的消息（可选）. 不支持返回 False."""
        return False

    def get_channel_info(self) -> ChannelMeta:
        """返回渠道元数据."""
        raise NotImplementedError


# ═══════════════════════════════════════════
# Nonce LRU 缓存（Webhook 防重放）
# ═══════════════════════════════════════════

class NonceCache:
    """内存 LRU 缓存，容量 10000，TTL 5 分钟."""

    def __init__(self, capacity: int = 10000, ttl_seconds: int = 300):
        self._cache: OrderedDict[str, float] = OrderedDict()
        self._capacity = capacity
        self._ttl = ttl_seconds

    def check_and_add(self, nonce: str) -> bool:
        """返回 True 表示 nonce 新（允许通过），False 表示重复或已过期."""
        now = time.time()
        # 清理过期条目
        expired = [k for k, ts in self._cache.items() if now - ts > self._ttl]
        for k in expired:
            del self._cache[k]
        # 检查是否重复
        if nonce in self._cache:
            return False
        # 添加
        self._cache[nonce] = now
        # LRU 淘汰
        while len(self._cache) > self._capacity:
            self._cache.popitem(last=False)
        return True


# 全局实例
nonce_cache = NonceCache()
