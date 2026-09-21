"""飞书 Device Code OAuth 实现."""
import os
import httpx
from services.oauth_provider import OAuthProvider, OAuthStartResult, OAuthPollResult

FEISHU_BASE = "https://open.feishu.cn/open-apis"


class FeishuOAuth:
    """飞书设备授权码 (Device Code) OAuth 流程."""

    def __init__(self, app_id: str = "", app_secret: str = ""):
        self.app_id = app_id or os.getenv("FEISHU_APP_ID", "")
        self.app_secret = app_secret or os.getenv("FEISHU_APP_SECRET", "")

    def _get_app_access_token(self) -> str:
        """获取飞书 app_access_token."""
        resp = httpx.post(
            f"{FEISHU_BASE}/auth/v3/app_access_token/internal",
            json={"app_id": self.app_id, "app_secret": self.app_secret},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        if data.get("code") != 0:
            raise RuntimeError(f"飞书 app_access_token 获取失败: {data.get('msg', 'unknown')}")
        return data["app_access_token"]

    def start_oauth(self, app_config: dict | None = None) -> OAuthStartResult:
        """发起飞书设备授权码流程."""
        if app_config:
            self.app_id = app_config.get("app_id", self.app_id)
            self.app_secret = app_config.get("app_secret", self.app_secret)

        if not self.app_id or not self.app_secret:
            raise RuntimeError("飞书 App ID / App Secret 未配置（设置环境变量 FEISHU_APP_ID / FEISHU_APP_SECRET）")

        token = self._get_app_access_token()
        resp = httpx.post(
            f"{FEISHU_BASE}/auth/v3/device/code",
            json={"app_access_token": token},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        if data.get("code") != 0:
            raise RuntimeError(f"飞书 device code 获取失败: {data.get('msg', 'unknown')}")

        return OAuthStartResult(
            qr_url=data.get("qr_code_url", ""),
            device_code=data["device_code"],
            expires_in=data.get("expires_in", 300),
        )

    def poll_oauth(self, device_code: str) -> OAuthPollResult:
        """轮询飞书授权结果."""
        token = self._get_app_access_token()
        resp = httpx.post(
            f"{FEISHU_BASE}/auth/v3/device/token",
            json={"app_access_token": token, "device_code": device_code},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        code = data.get("code", -1)

        if code == 0:
            return OAuthPollResult(
                status="authorized",
                credentials={
                    "app_id": self.app_id,
                    "app_secret": self.app_secret,
                    "access_token": data.get("access_token", ""),
                    "refresh_token": data.get("refresh_token", ""),
                    "expires_in": data.get("expires_in", 7200),
                },
            )
        elif code == 99991664:  # 用户还未扫码
            return OAuthPollResult(status="pending")
        elif code == 99991665:  # 用户已扫码但未确认
            return OAuthPollResult(status="pending")
        elif code == 99991666:  # 用户拒绝
            return OAuthPollResult(status="rejected", error_detail="用户拒绝了授权")
        elif code == 99991667:  # device_code 过期
            return OAuthPollResult(status="expired", error_detail="device_code 已过期")
        elif code == 99991668:  # 已被使用
            return OAuthPollResult(status="expired", error_detail="device_code 已被使用")
        else:
            return OAuthPollResult(status="error", error_detail=f"飞书 API 错误 (code={code}): {data.get('msg', 'unknown')}")
