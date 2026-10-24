"""部署模式闸门与可信代理解析（P0-3）。

设计口径（PRODUCT-DESIGN v20 §1.6.1 P0-3）：
- `DEPLOY_MODE=localhost|lan|behind-proxy`，默认 localhost（旧行为：仅回环）。
- **未配可信代理即忽略 XFF**：XFF 只在 peer ∈ TRUSTED_PROXY_IPS 时解析，
  取「从右往左第一个非可信地址」；且客户端 IP 只喂审计/节流维度。
- behind-proxy 强制 `TRUSTED_PROXY_IPS`；空 = 拒绝启动（响亮失败，不静默开门）。
- `FORWARDED_ALLOW_IPS="*"` 且无 TLS = 拒绝启动。
- 配置非法一律 `RuntimeError`（启动即挂），不降级、不猜。

本模块只做纯判定，不碰 DB、不读 request（便于单测）。
"""
from __future__ import annotations

import ipaddress

import config

VALID_MODES = ("localhost", "lan", "behind-proxy")
LOOPBACK_HOSTS = ("127.0.0.1", "::1", "localhost")


class DeployConfigError(RuntimeError):
    """部署配置非法（启动即失败）。"""


# ── 配置校验（启动时调用）─────────────────────────────────

def _networks(entries: list[str], label: str) -> list[ipaddress._BaseNetwork]:
    nets = []
    for raw in entries:
        try:
            nets.append(ipaddress.ip_network(raw, strict=False))
        except ValueError as exc:
            raise DeployConfigError(f"{label} 含非法地址 '{raw}'：{exc}") from exc
    return nets


def validate_deploy_config() -> None:
    """校验部署配置；非法即抛 DeployConfigError（启动失败）。"""
    mode = config.DEPLOY_MODE
    if mode not in VALID_MODES:
        raise DeployConfigError(
            f"DEPLOY_MODE='{mode}' 非法，合法值：{' | '.join(VALID_MODES)}"
        )

    if "*" in config.TRUSTED_PROXY_IPS:
        raise DeployConfigError("TRUSTED_PROXY_IPS 不允许 '*'（等于信任任何来源）")
    if config.FORWARDED_ALLOW_IPS.strip() == "*" and not config.TLS_TERMINATED:
        raise DeployConfigError(
            "FORWARDED_ALLOW_IPS='*' 且未声明 TLS_TERMINATED=1：拒绝启动"
            "（伪造 XFF 可直接绕过来源闸门）"
        )

    if mode == "lan":
        if not config.ALLOW_CIDRS:
            raise DeployConfigError("DEPLOY_MODE=lan 必须给出 ALLOW_CIDRS（网段白名单）")
        _networks(config.ALLOW_CIDRS, "ALLOW_CIDRS")

    if mode == "behind-proxy":
        if not config.TRUSTED_PROXY_IPS:
            raise DeployConfigError(
                "DEPLOY_MODE=behind-proxy 必须给出 TRUSTED_PROXY_IPS（可信反代地址）"
            )
        _networks(config.TRUSTED_PROXY_IPS, "TRUSTED_PROXY_IPS")


# ── 来源判定 ──────────────────────────────────────────────

def _ip(host: str | None) -> ipaddress._BaseAddress | None:
    if not host:
        return None
    try:
        return ipaddress.ip_address(host)
    except ValueError:
        return None


def _in_entries(host: str | None, entries: list[str]) -> bool:
    addr = _ip(host)
    if addr is None:
        return False
    for net in _networks(entries, "地址白名单"):
        if addr in net:
            return True
    return False


def is_loopback(host: str | None) -> bool:
    if host in LOOPBACK_HOSTS:
        return True
    addr = _ip(host)
    return bool(addr and addr.is_loopback)


def peer_allowed(host: str | None) -> bool:
    """传输层 peer 是否允许访问（不解析 XFF）。"""
    mode = config.DEPLOY_MODE
    if mode == "localhost":
        return is_loopback(host)
    if mode == "lan":
        return is_loopback(host) or _in_entries(host, config.ALLOW_CIDRS)
    if mode == "behind-proxy":
        # 直连的客户端一律拒绝：只接受可信反代（否则无从判断真实来源）
        return _in_entries(host, config.TRUSTED_PROXY_IPS)
    return False


def effective_client_ip(peer: str | None, forwarded_for: str | None) -> str:
    """返回用于审计/节流的客户端 IP。

    XFF 只在 peer ∈ TRUSTED_PROXY_IPS 时被采纳；取右起第一个非可信地址
    （最右侧是最近一跳，左侧可被客户端伪造）。未配可信代理 → 忽略 XFF。
    """
    if not forwarded_for or not _in_entries(peer, config.TRUSTED_PROXY_IPS):
        return peer or "unknown"
    hops = [h.strip() for h in forwarded_for.split(",") if h.strip()]
    for hop in reversed(hops):
        if not _in_entries(hop, config.TRUSTED_PROXY_IPS):
            return hop
    return hops[0] if hops else (peer or "unknown")


# ── 会话 cookie / 调试通道 ────────────────────────────────

def cookie_secure() -> bool:
    return bool(config.TLS_TERMINATED)


def session_cookie_name() -> str:
    """有 TLS 用 `__Host-` 前缀（强制 Secure + Path=/ + 无 Domain）；
    内网 http 退化为 af_session（浏览器会拒收 __Host- 的非 Secure cookie）。"""
    return "__Host-session" if cookie_secure() else "af_session"


def session_cookie_max_age() -> int:
    return int(config.SESSION_ABSOLUTE_HOURS * 3600)


def debug_header_enabled() -> bool:
    """X-User-Id 调试通道：三重 opt-in 缺一即关。"""
    return bool(
        config.AUTH_DEBUG_HEADER_ENABLED
        and config.DEPLOY_MODE == "localhost"
        and config.AUTH_DEBUG_HEADER_ADMIT_USERS
    )


def debug_header_allows(user_id: str) -> bool:
    return debug_header_enabled() and user_id in config.AUTH_DEBUG_HEADER_ADMIT_USERS


def deploy_info() -> dict:
    """p16 部署安全卡要的「生效值」（只读呈现，不含密钥）。"""
    return {
        "deploy_mode": config.DEPLOY_MODE,
        "trusted_proxy_ips": list(config.TRUSTED_PROXY_IPS),
        "allow_cidrs": list(config.ALLOW_CIDRS),
        "tls_terminated": config.TLS_TERMINATED,
        "session_cookie": session_cookie_name(),
        "cookie_degraded": not cookie_secure(),
        "debug_header_enabled": debug_header_enabled(),
        "debug_header_admit_users": list(config.AUTH_DEBUG_HEADER_ADMIT_USERS),
        "session_idle_minutes": config.SESSION_IDLE_MINUTES,
        "session_absolute_hours": config.SESSION_ABSOLUTE_HOURS,
    }
