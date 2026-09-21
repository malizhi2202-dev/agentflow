"""Mock OAuthProvider — 本地开发/测试用."""
import os
import time
import uuid
from services.oauth_provider import OAuthStartResult, OAuthPollResult

# Mock 场景: device_code → 预定义结果
# device_code 前缀控制场景:
#   mock_ 开头 → 默认 2s 后 authorized
#   mock_expired_ → 立即 expired
#   mock_rejected_ → 立即 rejected
#   mock_error_ → 立即 error

MOCK_QR_SVG = """<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
  <rect width="200" height="200" fill="#fff" rx="8"/>
  <rect x="40" y="40" width="40" height="40" fill="#000" rx="2"/>
  <rect x="120" y="40" width="40" height="40" fill="#000" rx="2"/>
  <rect x="40" y="120" width="40" height="40" fill="#000" rx="2"/>
  <rect x="80" y="80" width="40" height="40" fill="#000" rx="2"/>
  <rect x="120" y="120" width="40" height="40" fill="#000" rx="2"/>
  <text x="100" y="180" text-anchor="middle" font-size="10" fill="#999" font-family="monospace">MOCK QR</text>
</svg>"""

_mock_results: dict = {}  # device_code → {status, credentials?, created_at, delay_s}


class MockOAuthProvider:
    """Mock OAuth Provider — 开发/测试用."""

    def start_oauth(self, app_config: dict | None = None) -> OAuthStartResult:
        """生成假的 device_code + SVG 二维码."""
        scenario = (app_config or {}).get("mock_scenario", "success")
        prefix = f"mock_{scenario}_"
        device_code = prefix + uuid.uuid4().hex[:16]
        expires_in = 300
        delay_s = 2  # 默认 2 秒后「授权成功」

        if scenario == "expired":
            delay_s = 0
        elif scenario == "rejected":
            delay_s = 2

        _mock_results[device_code] = {
            "status": "pending",
            "scenario": scenario,
            "created_at": time.time(),
            "delay_s": delay_s,
            "credentials": {
                "app_id": "mock_app_id",
                "app_secret": "mock_app_secret",
                "access_token": "mock_access_token_" + uuid.uuid4().hex[:8],
                "refresh_token": "mock_refresh_token_" + uuid.uuid4().hex[:8],
            } if scenario not in ("expired",) else None,
        }

        return OAuthStartResult(
            qr_url="data:image/svg+xml;base64," + os.urandom(8).hex(),  # 假 QR URL
            device_code=device_code,
            expires_in=expires_in,
        )

    def poll_oauth(self, device_code: str) -> OAuthPollResult:
        """根据预定义场景返回结果."""
        state = _mock_results.get(device_code)
        if not state:
            return OAuthPollResult(status="expired", error_detail="unknown device_code")

        scenario = state["scenario"]
        elapsed = time.time() - state["created_at"]
        delay_s = state["delay_s"]

        if scenario == "expired":
            return OAuthPollResult(status="expired", error_detail="mock: 二维码已过期")

        if scenario == "rejected":
            if elapsed >= delay_s:
                return OAuthPollResult(status="rejected", error_detail="mock: 用户拒绝了授权")
            return OAuthPollResult(status="pending")

        if scenario == "network_error":
            return OAuthPollResult(status="error", error_detail="mock: 网络连接超时")

        if scenario == "platform_error":
            return OAuthPollResult(status="error", error_detail="mock: 平台服务异常 (5xx)")

        # 默认: success — delay_s 秒后授权成功
        if elapsed >= delay_s:
            return OAuthPollResult(
                status="authorized",
                credentials=state.get("credentials"),
            )
        return OAuthPollResult(status="pending")
