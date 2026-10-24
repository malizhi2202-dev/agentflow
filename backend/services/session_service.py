"""服务端会话与个人访问令牌（P0-1）。

- 会话 token = `secrets.token_urlsafe(32)`，**明文只在登录响应里出现一次**
  （落在 HttpOnly cookie 上）；库里只存 `sha256` 哈希。
- 双到期：空闲 `SESSION_IDLE_MINUTES`（随活动前移）+ 绝对 `SESSION_ABSOLUTE_HOURS`
  （固定，不因活动延长）。
- 权限/角色/口令变更必须旋转会话（OWASP）——由调用方 revoke 后重签。
- PAT：`af_pat_` 前缀 + 同样的哈希存储；scopes 复用平台权限点字符串，不造第二套词；
  过期默认 90 天且**禁止永不过期**。
- 登录节流（5 败/15min）已按 P1-7 落库（`rate_limit_windows` 固定窗口），
  多副本共享同一份计数，不会各算各的。

shortcut: `last_seen` 每 60 秒最多回写一次（同进程内节流），只是少写库，不影响正确性。
"""
from __future__ import annotations

import datetime
import hashlib
import json
import secrets

from sqlalchemy.orm import Session

import config
from database import SessionLocal
from models.session import PatToken, SessionToken
from services import cluster_store

PAT_PREFIX = "af_pat_"

_now = datetime.datetime.utcnow


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


# ── 会话生命周期 ──────────────────────────────────────────

def issue_session(user_id: str, ip: str = "", ua: str = "",
                  db: Session | None = None) -> dict:
    """签发会话；返回明文 token（仅此一次）。"""
    own = db is None
    db = db or SessionLocal()
    try:
        now = _now()
        token = secrets.token_urlsafe(32)
        row = SessionToken(
            token_hash=hash_token(token),
            user_id=user_id,
            created_at=now,
            last_seen=now,
            expires_at=now + datetime.timedelta(minutes=config.SESSION_IDLE_MINUTES),
            absolute_expires_at=now + datetime.timedelta(hours=config.SESSION_ABSOLUTE_HOURS),
            ip=(ip or "")[:64],
            ua=(ua or "")[:255],
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return {
            "id": row.id,
            "token": token,
            "expires_at": row.expires_at,
            "absolute_expires_at": row.absolute_expires_at,
        }
    finally:
        if own:
            db.close()


def _live(row: SessionToken, now: datetime.datetime | None = None) -> bool:
    now = now or _now()
    return (
        row.revoked_at is None
        and row.expires_at is not None and now < row.expires_at
        and row.absolute_expires_at is not None and now < row.absolute_expires_at
    )


def resolve_session(token: str, db: Session | None = None) -> dict | None:
    """校验会话 token；有效则顺带前移空闲到期（写节流 60s）。"""
    if not token:
        return None
    own = db is None
    db = db or SessionLocal()
    try:
        row = db.query(SessionToken).filter(
            SessionToken.token_hash == hash_token(token)
        ).first()
        if not row or not _live(row):
            return None
        now = _now()
        if row.last_seen is None or (now - row.last_seen).total_seconds() >= 60:
            row.last_seen = now
            idle_deadline = now + datetime.timedelta(minutes=config.SESSION_IDLE_MINUTES)
            if idle_deadline > row.expires_at:
                row.expires_at = idle_deadline
            db.commit()
        return {
            "id": row.id,
            "user_id": row.user_id,
            "token_hash": row.token_hash,
            "created_at": row.created_at,
            "absolute_expires_at": row.absolute_expires_at,
        }
    finally:
        if own:
            db.close()


def revoke_session(session_id: int | None = None, token: str | None = None,
                   db: Session | None = None) -> bool:
    own = db is None
    db = db or SessionLocal()
    try:
        q = db.query(SessionToken)
        if session_id is not None:
            q = q.filter(SessionToken.id == session_id)
        elif token is not None:
            q = q.filter(SessionToken.token_hash == hash_token(token))
        else:
            return False
        row = q.first()
        if not row or row.revoked_at is not None:
            return False
        row.revoked_at = _now()
        db.commit()
        return True
    finally:
        if own:
            db.close()


def revoke_user_sessions(user_id: str, except_id: int | None = None,
                         db: Session | None = None) -> int:
    """吊销用户全部活跃会话（权限/口令变更必调）。"""
    own = db is None
    db = db or SessionLocal()
    try:
        q = db.query(SessionToken).filter(
            SessionToken.user_id == user_id,
            SessionToken.revoked_at.is_(None),
        )
        if except_id is not None:
            q = q.filter(SessionToken.id != except_id)
        now = _now()
        count = 0
        for row in q.all():
            row.revoked_at = now
            count += 1
        if count:
            db.commit()
        return count
    finally:
        if own:
            db.close()


def rotate_session(old_session_id: int, user_id: str, ip: str = "", ua: str = "",
                   db: Session | None = None) -> dict:
    """改密/提权后旋转：吊销旧会话再签发新会话。"""
    revoke_session(session_id=old_session_id, db=db)
    return issue_session(user_id, ip=ip, ua=ua, db=db)


def list_sessions(user_id: str, db: Session | None = None) -> list[dict]:
    own = db is None
    db = db or SessionLocal()
    try:
        now = _now()
        rows = db.query(SessionToken).filter(
            SessionToken.user_id == user_id,
            SessionToken.revoked_at.is_(None),
        ).order_by(SessionToken.last_seen.desc()).all()
        return [r.to_public() for r in rows if _live(r, now)]
    finally:
        if own:
            db.close()


def cleanup_expired(days: int = 7, db: Session | None = None) -> int:
    """清理过期/已吊销超过 N 天的会话行（启动时跑一次）。"""
    own = db is None
    db = db or SessionLocal()
    try:
        cutoff = _now() - datetime.timedelta(days=days)
        rows = db.query(SessionToken).filter(
            (SessionToken.expires_at < cutoff)
            | (SessionToken.absolute_expires_at < cutoff)
            | (SessionToken.revoked_at < cutoff)
        ).all()
        for row in rows:
            db.delete(row)
        if rows:
            db.commit()
        return len(rows)
    finally:
        if own:
            db.close()


# ── PAT ───────────────────────────────────────────────────

def create_pat(user_id: str, name: str, scopes: list[str],
               expires_days: int | None = None, db: Session | None = None) -> dict:
    """创建 PAT；明文 token 只在返回值里出现一次。"""
    days = config.PAT_DEFAULT_EXPIRES_DAYS if expires_days is None else int(expires_days)
    if days <= 0 or days > 3650:
        raise ValueError("expires_days 必须在 1..3650 之间（不允许永不过期）")
    if not name.strip():
        raise ValueError("令牌名称不能为空")
    own = db is None
    db = db or SessionLocal()
    try:
        token = PAT_PREFIX + secrets.token_urlsafe(32)
        now = _now()
        row = PatToken(
            name=name.strip(),
            user_id=user_id,
            token_hash=hash_token(token),
            scopes_json=json.dumps(sorted(set(scopes or []))),
            created_at=now,
            expires_at=now + datetime.timedelta(days=days),
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        data = row.to_public()
        data["token"] = token  # 仅此一次
        return data
    finally:
        if own:
            db.close()


def resolve_pat(token: str, db: Session | None = None) -> dict | None:
    if not token or not token.startswith(PAT_PREFIX):
        return None
    own = db is None
    db = db or SessionLocal()
    try:
        row = db.query(PatToken).filter(
            PatToken.token_hash == hash_token(token)
        ).first()
        if not row or row.revoked_at is not None or row.expires_at is None:
            return None
        now = _now()
        if now >= row.expires_at:
            return None
        if row.last_used_at is None or (now - row.last_used_at).total_seconds() >= 60:
            row.last_used_at = now
            db.commit()
        return {
            "id": row.id,
            "user_id": row.user_id,
            "name": row.name,
            "scopes": json.loads(row.scopes_json or "[]"),
            "expires_at": row.expires_at,
        }
    finally:
        if own:
            db.close()


def list_pats(user_id: str, db: Session | None = None) -> list[dict]:
    own = db is None
    db = db or SessionLocal()
    try:
        now = _now()
        rows = db.query(PatToken).filter(
            PatToken.user_id == user_id,
            PatToken.revoked_at.is_(None),
        ).order_by(PatToken.created_at.desc()).all()
        return [r.to_public() for r in rows if r.expires_at and now < r.expires_at]
    finally:
        if own:
            db.close()


def revoke_pat(user_id: str, pat_id: int, db: Session | None = None) -> bool:
    own = db is None
    db = db or SessionLocal()
    try:
        row = db.query(PatToken).filter(
            PatToken.id == pat_id, PatToken.user_id == user_id
        ).first()
        if not row or row.revoked_at is not None:
            return False
        row.revoked_at = _now()
        db.commit()
        return True
    finally:
        if own:
            db.close()


# ── 登录节流（落库 · P1-7）──────────────────────────────────

def _throttle_scope(user_id: str, ip: str) -> str:
    return f"login:{user_id}:{ip or 'unknown'}"


def _throttle_window() -> int:
    return max(1, config.LOGIN_FAILURE_WINDOW_MINUTES) * 60


def login_throttled(user_id: str, ip: str) -> bool:
    """窗口内失败次数达到阈值即限流（只读，不消耗配额）。"""
    return cluster_store.hits(
        _throttle_scope(user_id, ip), _throttle_window()
    ) >= config.LOGIN_MAX_FAILURES


def record_login_failure(user_id: str, ip: str) -> None:
    cluster_store.consume(
        _throttle_scope(user_id, ip), _throttle_window(), config.LOGIN_MAX_FAILURES,
    )


def clear_login_failures(user_id: str, ip: str) -> None:
    cluster_store.reset(_throttle_scope(user_id, ip))


# ── cookie 写入 ───────────────────────────────────────────

def set_session_cookie(response, token: str) -> None:
    from services import deploy_guard

    response.set_cookie(
        key=deploy_guard.session_cookie_name(),
        value=token,
        max_age=deploy_guard.session_cookie_max_age(),
        httponly=True,
        samesite="lax",
        secure=deploy_guard.cookie_secure(),
        path="/",
    )


def clear_session_cookie(response) -> None:
    # 两种命名都清：TLS 开关切换后旧 cookie 不能留在浏览器里
    for name in ("__Host-session", "af_session"):
        response.delete_cookie(name, path="/")
