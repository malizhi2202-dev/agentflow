"""AES-256-GCM 加密服务 — API Key 安全存储."""
import os
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def _get_key() -> bytes:
    key = os.environ.get("ENCRYPTION_KEY", "")
    if not key:
        raise RuntimeError("ENCRYPTION_KEY 环境变量未设置")
    if len(key) < 32:
        key = key.ljust(32, "0")[:32]
    return key.encode("utf-8")[:32]


def encrypt(plaintext: str) -> str:
    key = _get_key()
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    ct = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
    return base64.b64encode(nonce + ct).decode("utf-8")


def decrypt(ciphertext: str) -> str:
    key = _get_key()
    raw = base64.b64decode(ciphertext)
    nonce, ct = raw[:12], raw[12:]
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(nonce, ct, None).decode("utf-8")


def mask_key(encrypted: str) -> str:
    """脱敏展示：仅显示前 3 和后 4 字符。"""
    if len(encrypted) <= 8:
        return "***"
    return encrypted[:3] + "***" + encrypted[-4:]
