"""钉钉扫码 OAuth 实现."""
import os
import time
import httpx
from services.oauth_provider import OAuthProvider, OAuthStartResult, OAuthPollResult

DINGTALK_BASE = "https://api.dingtalk.com"


class DingTalkOAuth:
    """钉钉扫码登录 OAuth 流程."""

    def __init__(self, app_key: str = "", app_secret: str = ""):
        self.app_key = app_key or os.getenv("DINGTALK_APP_KEY", "")
        self.app_secret = app_secret or os.getenv("DINGTALK_APP_SECRET", "")

    def _get_access_token(self) -> str:
        """获取钉钉 access_token."""
        resp = httpx.get(
            f"{DINGTALK_BASE}/v1.0/oauth2/accessToken",
            params={"appKey": self.app_key, "appSecret": self.app_secret},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        if data.get("code") != 0 and data.get("errcode") != 0:
            raise RuntimeError(f"钉钉 access_token 获取失败: {data.get('message', data.get('errmsg', 'unknown'))}")
        return data.get("accessToken", "")

    def start_oauth(self, app_config: dict | None = None) -> OAuthStartResult:
        """发起钉钉扫码登录流程.

        钉钉不直接返回二维码图片 URL，而是返回一个登录 URL。
        前端需要用 qrcode 库将 URL 渲染为二维码图片。
        """
        if app_config:
            self.app_key = app_config.get("app_key", self.app_key)
            self.app_secret = app_config.get("app_secret", self.app_secret)

        if not self.app_key or not self.app_secret:
            raise RuntimeError("钉钉 AppKey / AppSecret 未配置（设置环境变量 DINGTALK_APP_KEY / DINGTALK_APP_SECRET）")

        # 钉钉扫码登录：生成带唯一 state 的登录 URL
        device_code = f"dingtalk_{int(time.time() * 1000)}_{os.urandom(8).hex()}"

        qr_url = (
            f"https://login.dingtalk.com/oauth2/auth?"
            f"redirect_uri={httpx.URL('http://localhost:8000/api/channels/dingtalk/callback').encoded}&"
            f"response_type=code&"
            f"client_id={self.app_key}&"
            f"scope=openid&"
            f"state={device_code}&"
            f"prompt=consent"
        )

        return OAuthStartResult(
            qr_url=qr_url,
            device_code=device_code,
            expires_in=300,
        )

    def poll_oauth(self, device_code: str) -> OAuthPollResult:
        """钉钉扫码结果轮询.

        钉钉 OAuth 流程中，扫码后钉钉会 redirect 到 callback URL。
        这里用内存 state 字典（在 channel_api 路由层维护）来判断用户是否已完成扫码。
        如果 state 字典中没有对应状态，返回 pending。
        """
        # 实际的轮询逻辑在路由层的 oauth_states dict 中处理
        # 这里返回 pending 让路由层接管
        return OAuthPollResult(status="pending")
