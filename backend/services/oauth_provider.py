"""OAuthProvider Protocol — 渠道 OAuth 扫码接入抽象接口."""
from typing import Protocol, runtime_checkable
from dataclasses import dataclass


@dataclass
class OAuthStartResult:
    qr_url: str
    device_code: str
    expires_in: int  # seconds


@dataclass
class OAuthPollResult:
    status: str  # "pending" | "authorized" | "rejected" | "expired" | "error"
    credentials: dict | None = None  # authorized 时返回
    error_detail: str | None = None


@runtime_checkable
class OAuthProvider(Protocol):
    """渠道 OAuth 扫码接入抽象接口.

    每个渠道（飞书/钉钉/Slack...）实现这两个方法。
    设计原则：与 ChannelAdapter Protocol 一致，用 Protocol 而非 ABC 继承。
    """

    def start_oauth(self, app_config: dict | None = None) -> OAuthStartResult:
        """发起 OAuth 授权流程，返回二维码 URL + 设备码.

        Args:
            app_config: 渠道平台应用配置（app_id, app_secret 等），
                        None 时使用环境变量或默认值。
        """
        ...

    def poll_oauth(self, device_code: str) -> OAuthPollResult:
        """轮询 OAuth 授权状态.

        Args:
            device_code: start_oauth 返回的设备码。
        """
        ...
