"""渠道 API — Webhook 回调入口 + 渠道配置 CRUD."""
import datetime
import json
import uuid
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database import get_db
from models.channel_config import ChannelConfig, CHANNEL_TYPES, CHANNEL_STATUSES
import os
import time
import threading
from services.encryption_service import encrypt, decrypt
from services.chat_service import chat_service
from services.audit_service import log_audit
from services.audit_service import log_audit

router = APIRouter(tags=["channels"])


def _user(request: Request) -> dict:
    return getattr(request.state, "user", {"id": "admin", "name": "admin", "role": "admin"})


def _uid(request: Request) -> str:
    return _user(request).get("id", "admin")


def _get_adapter(channel_type: str):
    """动态加载适配器模块."""
    try:
        if channel_type == "feishu":
            from services.adapters.feishu import FeishuAdapter
            return FeishuAdapter()
        elif channel_type == "dingtalk":
            from services.adapters.dingtalk import DingTalkAdapter
            return DingTalkAdapter()
        elif channel_type == "slack":
            from services.adapters.slack import SlackAdapter
            return SlackAdapter()
        elif channel_type == "telegram":
            from services.adapters.telegram import TelegramAdapter
            return TelegramAdapter()
        elif channel_type == "smtp_email":
            from services.adapters.smtp_email import SMTPAdapter
            return SMTPAdapter()
        else:
            raise ValueError(f"不支持的渠道类型: {channel_type}")
    except ImportError as e:
        raise ValueError(f"渠道适配器加载失败: {channel_type} — {e}")


# ═══════════════════════════════════════════
# Webhook 回调入口
# ═══════════════════════════════════════════

@router.post("/api/channels/{channel_type}/callback/{webhook_uuid}")
async def channel_webhook(
    channel_type: str,
    webhook_uuid: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """渠道 webhook 统一回调入口."""
    # 1. 查 channel_config
    cfg = db.query(ChannelConfig).filter(
        ChannelConfig.webhook_uuid == webhook_uuid,
        ChannelConfig.channel_type == channel_type,
        ChannelConfig.status == "active",
    ).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="渠道配置不存在或未激活")

    # 2. 解密凭证
    try:
        credentials = json.loads(decrypt(cfg.credentials_encrypted))
    except Exception:
        raise HTTPException(status_code=500, detail="凭证解密失败")

    # 3. 获取适配器
    try:
        adapter = _get_adapter(channel_type)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 4. 读取 body
    body = await request.body()
    headers = dict(request.headers)

    # 5. 签名校验
    if not adapter.validate_request(headers, body, credentials):
        log_audit(cfg.owner_id, cfg.owner_id, "channel_webhook_fail", str(cfg.agent_id),
                  "agent", f"channel={channel_type} reason=signature_fail",
                  request.client.host if request.client else "127.0.0.1", "error")
        raise HTTPException(status_code=401, detail="签名校验失败")

    # 6. 解析消息
    try:
        raw = json.loads(body) if body else {}
    except json.JSONDecodeError:
        raw = {"_raw_body": body.decode("utf-8", errors="replace")}
    universal_msg = adapter.parse_message(raw)

    # 7. 路由到 Agent
    try:
        result = chat_service.send_message(
            agent_id=cfg.agent_id,
            content=universal_msg.content,
            owner_id=cfg.owner_id,
            db=db,
            conversation_id=None,
            channel_type=channel_type,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent 处理失败: {e}")

    # 8. 推送回复到渠道
    try:
        channel_msg_id = adapter.send_message(
            universal_msg if result.get("error") else type("UM", (), {
                "content": result.get("agent_message", {}).get("content", ""),
                "attachments": [],
            })(),
            credentials,
            universal_msg.conversation_id,
        )

        # 9. 如果 Agent 响应 > 3s，先回占位再更新（飞书/Telegram 支持）
        if hasattr(adapter, "update_message") and not result.get("error"):
            full_reply = result.get("agent_message", {}).get("content", "")
            if full_reply != universal_msg.content and channel_msg_id:
                adapter.update_message(channel_msg_id, full_reply, credentials)

        return {"ok": True, "channel_message_id": channel_msg_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"渠道推送失败: {e}")


# ═══════════════════════════════════════════
# 渠道配置 CRUD
# ═══════════════════════════════════════════

@router.get("/api/agents/{agent_id}/channels")
def list_channels(agent_id: int, request: Request, db: Session = Depends(get_db)):
    """获取 Agent 的所有渠道配置."""
    owner_id = _uid(request)
    channels = db.query(ChannelConfig).filter(
        ChannelConfig.agent_id == agent_id,
        ChannelConfig.owner_id == owner_id,
    ).order_by(ChannelConfig.created_at.desc()).all()
    return [c.to_dict() for c in channels]


@router.post("/api/agents/{agent_id}/channels")
def create_channel(agent_id: int, payload: dict, request: Request, db: Session = Depends(get_db)):
    """为 Agent 添加渠道配置."""
    owner_id = _uid(request)
    channel_type = payload.get("channel_type", "")
    if channel_type not in CHANNEL_TYPES:
        raise HTTPException(status_code=400, detail=f"不支持的渠道类型: {channel_type}，支持: {CHANNEL_TYPES}")

    credentials = payload.get("credentials", {})
    if not credentials:
        raise HTTPException(status_code=400, detail="渠道凭证不能为空")

    cfg = ChannelConfig(
        agent_id=agent_id,
        owner_id=owner_id,
        channel_type=channel_type,
        credentials_encrypted=encrypt(json.dumps(credentials, ensure_ascii=False)),
        status="draft",
        webhook_uuid=uuid.uuid4().hex,
    )
    db.add(cfg)
    db.commit()
    db.refresh(cfg)
    return {"ok": True, "channel": cfg.to_dict()}


@router.put("/api/agents/{agent_id}/channels/{channel_id}")
def update_channel(agent_id: int, channel_id: int, payload: dict, request: Request, db: Session = Depends(get_db)):
    """更新渠道配置."""
    owner_id = _uid(request)
    cfg = db.query(ChannelConfig).filter(
        ChannelConfig.id == channel_id,
        ChannelConfig.agent_id == agent_id,
        ChannelConfig.owner_id == owner_id,
    ).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="渠道配置不存在")

    if "credentials" in payload:
        cfg.credentials_encrypted = encrypt(json.dumps(payload["credentials"], ensure_ascii=False))
    if "enabled" in payload:
        cfg.enabled = payload["enabled"]
    if "status" in payload and payload["status"] in CHANNEL_STATUSES:
        cfg.status = payload["status"]
    cfg.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(cfg)
    return {"ok": True, "channel": cfg.to_dict()}


@router.delete("/api/agents/{agent_id}/channels/{channel_id}")
def delete_channel(agent_id: int, channel_id: int, request: Request, db: Session = Depends(get_db)):
    """删除渠道配置."""
    owner_id = _uid(request)
    cfg = db.query(ChannelConfig).filter(
        ChannelConfig.id == channel_id,
        ChannelConfig.agent_id == agent_id,
        ChannelConfig.owner_id == owner_id,
    ).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="渠道配置不存在")
    db.delete(cfg)
    db.commit()
    return {"ok": True}


@router.post("/api/agents/{agent_id}/channels/{channel_id}/test")
def test_channel(agent_id: int, channel_id: int, request: Request, db: Session = Depends(get_db)):
    """测试渠道连接."""
    owner_id = _uid(request)
    cfg = db.query(ChannelConfig).filter(
        ChannelConfig.id == channel_id,
        ChannelConfig.agent_id == agent_id,
        ChannelConfig.owner_id == owner_id,
    ).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="渠道配置不存在")

    try:
        adapter = _get_adapter(cfg.channel_type)
        credentials = json.loads(decrypt(cfg.credentials_encrypted))
        # 调用适配器的自我检测能力
        info = adapter.get_channel_info()
        cfg.status = "active"
        cfg.updated_at = datetime.datetime.utcnow()
        db.commit()
        return {"ok": True, "channel_info": {"type": info.channel_type, "name": info.display_name, "icon": info.icon}}
    except Exception as e:
        # 连接失败
        cfg.status = "error"
        cfg.updated_at = datetime.datetime.utcnow()
        db.commit()
        return {"ok": False, "detail": str(e)[:200]}


# ═══════════════════════════════════════════
# OAuth 扫码接入
# ═══════════════════════════════════════════

# 内存 OAuth state 存储 {device_code: {status, credentials?, created_at, channel_type, owner_id, agent_id}}
_oauth_states: dict = {}
_oauth_lock = threading.Lock()
# Rate limiting: {device_code: last_poll_timestamp}
_oauth_rate_limit: dict = {}


def _cleanup_expired_states():
    """清理过期的 OAuth state（超过 10 分钟的条目）."""
    now = time.time()
    with _oauth_lock:
        expired = [k for k, v in _oauth_states.items() if now - v.get("created_at", 0) > 600]
        for k in expired:
            del _oauth_states[k]
            _oauth_rate_limit.pop(k, None)


def _get_oauth_provider(channel_type: str):
    """根据渠道类型获取 OAuthProvider 实例."""
    mock_mode = os.getenv("CHANNEL_OAUTH_MOCK", "").lower() in ("1", "true", "yes")
    if mock_mode:
        from services.oauth_mock import MockOAuthProvider
        return MockOAuthProvider()

    if channel_type == "feishu":
        from services.oauth_feishu import FeishuOAuth
        return FeishuOAuth()
    elif channel_type == "dingtalk":
        from services.oauth_dingtalk import DingTalkOAuth
        return DingTalkOAuth()
    else:
        raise HTTPException(status_code=400, detail=f"扫码接入不支持渠道类型: {channel_type}，仅支持 feishu/dingtalk")


@router.post("/api/channels/{channel_type}/oauth/start")
def oauth_start(channel_type: str, payload: dict = {}, request: Request = None):
    """发起 OAuth 扫码接入 — 返回二维码 URL.

    body 可选: { agent_id: int }
    """
    if channel_type not in ("feishu", "dingtalk"):
        raise HTTPException(status_code=400, detail=f"扫码接入不支持渠道类型: {channel_type}")

    _cleanup_expired_states()

    try:
        provider = _get_oauth_provider(channel_type)
        app_config = payload.get("app_config")
        result = provider.start_oauth(app_config=app_config)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OAuth 启动失败: {str(e)}")

    # 存储 OAuth state
    owner_id = _uid(request)
    with _oauth_lock:
        _oauth_states[result.device_code] = {
            "status": "pending",
            "created_at": time.time(),
            "channel_type": channel_type,
            "owner_id": owner_id,
            "agent_id": payload.get("agent_id"),
            "provider": type(provider).__name__,
        }

    log_audit(
        owner_id, owner_id, "oauth_start", channel_type,
        "agent", f"device_code={result.device_code[:16]}...",
        request.client.host if request.client else "127.0.0.1",
    )

    return {
        "ok": True,
        "qr_url": result.qr_url,
        "device_code": result.device_code,
        "expires_in": result.expires_in,
    }


@router.get("/api/channels/{channel_type}/oauth/poll")
def oauth_poll(channel_type: str, device_code: str, request: Request = None, db: Session = Depends(get_db)):
    """轮询 OAuth 授权状态.

    授权成功后自动创建 channel_config 记录并标记 active。
    """
    if channel_type not in ("feishu", "dingtalk"):
        raise HTTPException(status_code=400, detail=f"不支持渠道类型: {channel_type}")

    # Rate limiting: 同一 device_code 至少间隔 1 秒
    now = time.time()
    last = _oauth_rate_limit.get(device_code, 0)
    if now - last < 1.0:
        raise HTTPException(status_code=429, detail="轮询过于频繁，请 1 秒后重试")
    _oauth_rate_limit[device_code] = now

    with _oauth_lock:
        state = _oauth_states.get(device_code)
        if not state:
            raise HTTPException(status_code=404, detail="device_code 不存在或已过期，请重新发起扫码")

    # 检查是否过期（5 分钟）
    if now - state["created_at"] > 300:
        with _oauth_lock:
            _oauth_states[device_code]["status"] = "expired"
        log_audit(
            state["owner_id"], state["owner_id"], "oauth_expired", channel_type,
            "agent", f"device_code={device_code[:16]}...",
            request.client.host if request.client else "127.0.0.1",
        )
        return {"ok": True, "status": "expired"}

    # 如果路由层已标记为最终状态（Mock 模式直接写入）
    if state["status"] in ("authorized", "rejected", "expired", "error"):
        return {"ok": True, "status": state["status"], "error_detail": state.get("error_detail")}

    # 调真实平台轮询
    try:
        provider = _get_oauth_provider(channel_type)
        result = provider.poll_oauth(device_code)
    except Exception as e:
        with _oauth_lock:
            _oauth_states[device_code]["status"] = "error"
            _oauth_states[device_code]["error_detail"] = str(e)
        return {"ok": True, "status": "error", "error_detail": str(e)[:200]}

    # 更新内存状态
    with _oauth_lock:
        _oauth_states[device_code]["status"] = result.status
        if result.error_detail:
            _oauth_states[device_code]["error_detail"] = result.error_detail

    # 授权成功 → 自动创建渠道配置
    if result.status == "authorized":
        owner_id = state["owner_id"]
        agent_id = state.get("agent_id")

        credentials = result.credentials or {}
        cfg = ChannelConfig(
            agent_id=agent_id or 0,
            owner_id=owner_id,
            channel_type=channel_type,
            credentials_encrypted=encrypt(json.dumps(credentials, ensure_ascii=False)),
            status="active",
            webhook_uuid=uuid.uuid4().hex,
        )
        db.add(cfg)
        db.commit()
        db.refresh(cfg)

        log_audit(
            owner_id, owner_id, "oauth_authorized", channel_type,
            "agent", f"channel_id={cfg.id}",
            request.client.host if request.client else "127.0.0.1",
        )

        return {"ok": True, "status": "authorized", "channel": cfg.to_dict()}

    if result.status == "rejected":
        log_audit(
            state["owner_id"], state["owner_id"], "oauth_rejected", channel_type,
            "agent", f"device_code={device_code[:16]}...",
            request.client.host if request.client else "127.0.0.1",
        )

    if result.status == "error":
        log_audit(
            state["owner_id"], state["owner_id"], "oauth_error", channel_type,
            "agent", f"device_code={device_code[:16]}... detail={result.error_detail}",
            request.client.host if request.client else "127.0.0.1",
            "error",
        )

    return {"ok": True, "status": result.status, "error_detail": result.error_detail}
