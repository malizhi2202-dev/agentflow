"""口令哈希（P0-2）：Argon2id 优先，缺库时 scrypt 兜底；支持存量 sha256 渐进迁移。

**为什么单独一个模块**：`auth.py` 依赖 FastAPI，而口令算法是纯逻辑——抽出来才能在本机
无第三方依赖时跑单测（本仓当前就装不上后端依赖）。

**存储格式（自描述，便于渐进迁移）**
- `argon2id$...`            —— argon2-cffi 可用时的首选（64MiB / t=3 / p=4，高于 OWASP 最低档）
- `scrypt$n$r$p$<salt>$<dk>`—— 无 argon2 时的兜底（stdlib `hashlib.scrypt`，OWASP 可接受）
- `<64 位 hex>`             —— **历史格式**（无盐 sha256），只读兼容；校验通过后由调用方升级

**纪律**
- 校验用 `hmac.compare_digest` / argon2 自身比较，**不做字符串 `==`**。
- 旧格式不是"能登就行"：`needs_rehash()` 返回 True，登录时静默升级（见 routes/auth_api.py）。
- 不提供"重置为固定口令"这种分支——P0-2 明确删掉它（改为 must_change_password + 拒登录）。
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import os
import secrets

# scrypt 参数：N=2^15（32 MiB）、r=8、p=1 —— OWASP 建议档，单次 ~40-80ms
SCRYPT_N = 2 ** 15
SCRYPT_R = 8
SCRYPT_P = 1

try:  # argon2-cffi 为可选依赖：装上即优先使用
    from argon2 import PasswordHasher
    from argon2.exceptions import InvalidHash, VerificationError, VerifyMismatchError
    _ph = PasswordHasher()
    ARGON2_AVAILABLE = True
except Exception:  # pragma: no cover - 取决于是否安装 argon2-cffi
    _ph = None
    ARGON2_AVAILABLE = False
    InvalidHash = VerificationError = VerifyMismatchError = Exception  # type: ignore


def _b64(raw: bytes) -> str:
    return base64.b64encode(raw).decode()


def _unb64(s: str) -> bytes:
    return base64.b64decode(s.encode())


def hash_password(password: str) -> str:
    """生成新口令哈希（argon2id 优先，否则 scrypt）。"""
    if ARGON2_AVAILABLE:
        return _ph.hash(password)
    salt = secrets.token_bytes(16)
    # maxmem 必须显式给：OpenSSL 默认上限 32 MiB，而 128*N*r 恰好顶在上限 → 报 memory limit exceeded
    dk = hashlib.scrypt(password.encode(), salt=salt, n=SCRYPT_N, r=SCRYPT_R, p=SCRYPT_P,
                        dklen=32, maxmem=128 * SCRYPT_N * SCRYPT_R * 2)
    return f"scrypt${SCRYPT_N}${SCRYPT_R}${SCRYPT_P}${_b64(salt)}${_b64(dk)}"


def _verify_legacy_sha256(password: str, stored: str) -> bool:
    return hmac.compare_digest(hashlib.sha256(password.encode()).hexdigest(), stored)


def verify_password(password: str, stored: str) -> bool:
    """校验口令。空/未知格式一律 False（不抛异常，不猜）。"""
    if not password or not stored:
        return False
    if stored.startswith("$argon2"):
        if not ARGON2_AVAILABLE:
            return False
        try:
            return _ph.verify(stored, password)
        except (VerifyMismatchError, VerificationError, InvalidHash):
            return False
    if stored.startswith("scrypt$"):
        try:
            _, n, r, p, salt_b64, dk_b64 = stored.split("$")
            nn, rr, pp = int(n), int(r), int(p)
            dk = hashlib.scrypt(password.encode(), salt=_unb64(salt_b64),
                                n=nn, r=rr, p=pp, dklen=len(_unb64(dk_b64)),
                                maxmem=128 * nn * rr * 2)
            return hmac.compare_digest(dk, _unb64(dk_b64))
        except Exception:
            return False
    # 历史无盐 sha256（只读兼容，登录成功即升级）
    if len(stored) == 64 and all(c in "0123456789abcdef" for c in stored.lower()):
        return _verify_legacy_sha256(password, stored)
    return False


def needs_rehash(stored: str) -> bool:
    """是否需要把存量哈希升级到当前算法/参数。"""
    if not stored:
        return True
    if stored.startswith("$argon2"):
        return ARGON2_AVAILABLE and _ph.check_needs_rehash(stored)
    if stored.startswith("scrypt$"):
        try:
            _, n, r, p, _salt, _dk = stored.split("$")
            return (int(n), int(r), int(p)) != (SCRYPT_N, SCRYPT_R, SCRYPT_P)
        except Exception:
            return True
    return True  # 无格式标识（含历史 sha256）→ 需要升级


def generate_password(length: int = 20) -> str:
    """首启引导用随机口令（打印到启动日志，GitHub/Gitea 式）。"""
    alphabet = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#%^&*-_=+"
    return "".join(secrets.choice(alphabet) for _ in range(length))


def is_weak(password: str, min_len: int = 12) -> bool:
    """最基本的弱口令判定：长度 + 不是纯数字/纯字母重复。"""
    if len(password or "") < min_len:
        return True
    return len(set(password)) < 6
