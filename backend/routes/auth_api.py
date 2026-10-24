"""用户管理 API — CRUD + 权限分配 + 登录/会话/令牌（P0-1 重写）。

身份口径：
- 登录成功 → 服务端签发会话（`secrets.token_urlsafe(32)`），写 `__Host-session`
  （无 TLS 退化 `af_session`）HttpOnly/Lax cookie；库里只存 sha256。
- `/api/auth/*` 是 must_change 的唯一豁免面；其余一律由中间件 403。
- 登录失败泛化为 401（不区分「用户不存在」与「口令错误」），并按 (user, ip) 节流。
- 用户对象返回前一律剥掉 `password_hash`（此前 /me 与用户列表会把它回给前端）。
"""

import json
from datetime import datetime

from fastapi import APIRouter, HTTPException, Request, Response

import config
from auth import (
    load_users, _save_users, get_user, get_current_user,
    has_permission, get_user_permissions, write_audit,
    PERMISSION_DEFS, ROLE_PERMISSIONS,
    hash_password, verify_password,
)
from passwords import needs_rehash, generate_password, is_weak
from config import discover_projects
from services import deploy_guard, session_service

router = APIRouter()

_SECRET_FIELDS = ("password_hash", "legacy_sha256")


def _public_user(user: dict | None) -> dict | None:
    if user is None:
        return None
    return {k: v for k, v in user.items() if k not in _SECRET_FIELDS}


def _client_ip(request: Request) -> str:
    return getattr(request.state, "client_ip", "") or (
        request.client.host if request.client else "unknown"
    )


def _user_agent(request: Request) -> str:
    return request.headers.get("user-agent", "")


def _update_user_fields(user_id: str, **fields) -> dict | None:
    data = load_users()
    for i, u in enumerate(data.get("users", [])):
        if u["id"] == user_id:
            u.update(fields)
            data["users"][i] = u
            _save_users(data)
            return u
    return None


# ── 公开接口（登录页用）──────────────────────────────────

@router.get("/api/auth/list")
async def list_users_public(request: Request):
    """返回活跃用户列表（仅 id + name + role），供登录页使用。

    P0-1 AC-2.5：非 localhost 模式默认关闭——登录页改为手输 user_id，
    避免把一个可枚举的用户目录暴露到网段/反代后面。
    """
    if config.DEPLOY_MODE != "localhost" and not getattr(request.state, "user", None):
        raise HTTPException(status_code=401, detail="用户列表在非本机模式需登录后查看")
    data = load_users()
    users = [
        {"id": u["id"], "name": u["name"], "role": u["role"]}
        for u in data.get("users", [])
        if u.get("active", True)
    ]
    return {"users": users}


@router.get("/api/auth/me")
async def me(request: Request):
    """返回当前登录用户信息（含有效权限 + must_change 标记）。"""
    user = get_current_user(request)
    perm_info = get_user_permissions(user)
    return {
        "user": _public_user(user),
        "permissions": PERMISSION_DEFS,
        "role_permissions": perm_info["effective_permissions"],  # 有效权限=角色+自定义
        "must_change_password": bool(user.get("must_change_password")),
    }


# ── 登录 / 登出 / 会话 ────────────────────────────────────

@router.post("/api/auth/login")
async def login(request: Request, response: Response, payload: dict):
    """口令登录 → 服务端会话（cookie）。"""
    user_id = (payload.get("user_id") or "").strip()
    password = payload.get("password") or ""
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id 不能为空")

    ip = _client_ip(request)
    if session_service.login_throttled(user_id, ip):
        write_audit({"id": user_id, "name": user_id}, "auth:login_throttled", user_id, "login",
                    "失败次数超限", request=request, result="failure")
        raise HTTPException(status_code=429, detail="登录尝试过于频繁，请稍后再试")

    user = get_user(user_id)
    stored_hash = (user or {}).get("password_hash", "")
    # 口令校验放在「存在/禁用」判断之前：失败一律同一个 401，不泄露账号状态
    if not user or not verify_password(password, stored_hash):
        session_service.record_login_failure(user_id, ip)
        write_audit(user or {"id": user_id, "name": user_id}, "auth:login_failed",
                    user_id, "login", "口令错误", request=request, result="failure")
        raise HTTPException(status_code=401, detail="用户名或口令错误")

    if not user.get("active", True):
        write_audit(user, "auth:login_disabled", user_id, "login", "账号已禁用",
                    request=request, result="failure")
        raise HTTPException(status_code=403, detail="用户已被禁用")

    session_service.clear_login_failures(user_id, ip)

    # P0-2：存量哈希（sha256 / 旧 scrypt 参数）登录时静默升级
    if needs_rehash(stored_hash):
        _update_user_fields(user["id"], password_hash=hash_password(password))
        write_audit(user, "auth:password_rehashed", user["id"], "login", "哈希算法升级",
                    request=request)

    issued = session_service.issue_session(user["id"], ip=ip, ua=_user_agent(request))
    session_service.set_session_cookie(response, issued["token"])
    write_audit(user, "auth:login", user["id"], "login", "签发会话", request=request)
    return {
        "ok": True,
        "user": {"id": user["id"], "name": user["name"], "role": user["role"]},
        "must_change_password": bool(user.get("must_change_password")),
    }


@router.post("/api/auth/logout")
async def logout(request: Request, response: Response):
    """吊销当前会话并清 cookie。"""
    user = get_current_user(request)
    session_info = getattr(request.state, "session", None) or {}
    if session_info.get("id"):
        session_service.revoke_session(session_id=session_info["id"])
    session_service.clear_session_cookie(response)
    write_audit(user, "auth:logout", user["id"], "login", "会话已吊销", request=request)
    return {"ok": True}


@router.get("/api/auth/sessions")
async def my_sessions(request: Request):
    """我的活跃会话（可列可撤）。"""
    user = get_current_user(request)
    current = (getattr(request.state, "session", None) or {}).get("id")
    rows = session_service.list_sessions(user["id"])
    for row in rows:
        row["current"] = row["id"] == current
    return {"sessions": rows, "total": len(rows)}


@router.delete("/api/auth/sessions/{session_id}")
async def revoke_my_session(session_id: int, request: Request):
    user = get_current_user(request)
    rows = {r["id"] for r in session_service.list_sessions(user["id"])}
    # 越权与会话不存在统一 404（不能用状态码探测别人的会话 id）
    if session_id not in rows:
        raise HTTPException(status_code=404, detail="会话不存在")
    session_service.revoke_session(session_id=session_id)
    write_audit(user, "auth:session_revoked", str(session_id), "session", "手动吊销会话",
                request=request)
    return {"ok": True}


@router.post("/api/auth/password")
async def change_password(request: Request, response: Response, payload: dict):
    """自助改密（首登强制改密走这里）：改完即旋转会话。"""
    user = get_current_user(request)
    old_password = payload.get("old_password") or ""
    new_password = payload.get("new_password") or ""

    if not verify_password(old_password, user.get("password_hash", "")):
        write_audit(user, "auth:password_change_failed", user["id"], "user",
                    "当前口令不正确", request=request, result="failure")
        raise HTTPException(status_code=400, detail="当前口令不正确")
    if is_weak(new_password):
        raise HTTPException(status_code=400, detail="口令太弱：至少 12 位且不要重复字符")
    if verify_password(new_password, user.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="新口令不能与当前口令相同")

    _update_user_fields(
        user["id"],
        password_hash=hash_password(new_password),
        must_change_password=False,
        password_updated_at=datetime.now().isoformat(),
    )
    # OWASP：改密后吊销全部旧会话并重签当前会话
    session_service.revoke_user_sessions(user["id"])
    issued = session_service.issue_session(user["id"], ip=_client_ip(request),
                                           ua=_user_agent(request))
    session_service.set_session_cookie(response, issued["token"])
    write_audit(user, "auth:password_changed", user["id"], "user", "自助改密并旋转会话",
                request=request)
    return {"ok": True}


# ── PAT 令牌（脚本/Agent 用）──────────────────────────────

@router.get("/api/auth/tokens")
async def list_tokens(request: Request):
    user = get_current_user(request)
    rows = session_service.list_pats(user["id"])
    return {"tokens": rows, "total": len(rows)}


@router.post("/api/auth/tokens")
async def create_token(request: Request, payload: dict):
    user = get_current_user(request)
    name = (payload.get("name") or "").strip()
    scopes = payload.get("scopes") or []
    if not isinstance(scopes, list) or any(s not in PERMISSION_DEFS for s in scopes):
        raise HTTPException(status_code=400, detail="scopes 必须是权限目录里的权限点")
    if not scopes:
        raise HTTPException(status_code=400, detail="scopes 不能为空（最小权限原则）")
    days = payload.get("expires_days")
    try:
        row = session_service.create_pat(
            user["id"], name, scopes,
            expires_days=int(days) if days is not None else None,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    write_audit(user, "auth:token_created", str(row["id"]), "token",
                f"创建令牌 {row['name']}，scopes={scopes}", request=request)
    return {"ok": True, "token": row}  # 明文只在这里出现一次


@router.delete("/api/auth/tokens/{token_id}")
async def revoke_token(token_id: int, request: Request):
    user = get_current_user(request)
    if not session_service.revoke_pat(user["id"], token_id):
        raise HTTPException(status_code=404, detail="令牌不存在")
    write_audit(user, "auth:token_revoked", str(token_id), "token", "吊销令牌", request=request)
    return {"ok": True}


# ── 部署生效值（p16 部署安全卡只读呈现）────────────────────

@router.get("/api/auth/deploy-info")
async def deploy_info(request: Request):
    user = get_current_user(request)
    if not has_permission(user, "user:manage"):
        raise HTTPException(status_code=403, detail="需要权限: user:manage")
    return deploy_guard.deploy_info()


# ── 用户管理 ──────────────────────────────────────────────

@router.get("/api/auth/users")
async def list_users(request: Request):
    """用户列表（admin 专属）。"""
    user = get_current_user(request)
    if not has_permission(user, "user:manage"):
        raise HTTPException(status_code=403, detail="需要权限: user:manage")
    data = load_users()
    return {"users": [_public_user(u) for u in data.get("users", [])]}


@router.post("/api/auth/users")
async def create_user(request: Request, payload: dict):
    """创建用户（admin 专属）+ 审计。"""
    current = get_current_user(request)
    if not has_permission(current, "user:manage"):
        raise HTTPException(status_code=403, detail="需要权限: user:manage")

    data = load_users()

    # 检查 ID 唯一性
    new_id = (payload.get("id") or "").strip()
    if not new_id:
        raise HTTPException(status_code=400, detail="用户 ID 不能为空")
    if any(u["id"] == new_id for u in data.get("users", [])):
        raise HTTPException(status_code=400, detail=f"用户 ID '{new_id}' 已存在")

    # P0-2：出厂口令已废——不传口令则随机生成并只回显一次，且强制首登修改
    generated = None
    password = payload.get("password") or ""
    if not password:
        password = generate_password()
        generated = password
    if is_weak(password):
        raise HTTPException(status_code=400, detail="口令太弱：至少 12 位且不要重复字符")
    new_user = {
        "id": new_id,
        "name": payload.get("name", new_id),
        "role": payload.get("role", "user"),
        "password_hash": hash_password(password),
        "must_change_password": bool(generated),
        "password_updated_at": datetime.now().isoformat(),
        "project_ids": payload.get("project_ids", []),
        "custom_permissions": payload.get("custom_permissions", []),
        "created_at": datetime.now().isoformat(),
        "active": payload.get("active", True),
    }
    data["users"].append(new_user)
    _save_users(data)

    write_audit(
        current, "user:create", new_id, "user",
        f"创建用户 {new_user['name']}，角色: {new_user['role']}，项目: {new_user['project_ids']}",
        request=request,
    )
    resp = {"ok": True, "user": _public_user(new_user)}
    if generated:
        resp["generated_password"] = generated  # 只回显一次
    return resp


@router.put("/api/auth/users/{user_id}")
async def update_user(user_id: str, request: Request, response: Response, payload: dict):
    """更新用户（admin 专属）+ 审计；权限/口令变更必须旋转会话。"""
    current = get_current_user(request)
    if not has_permission(current, "user:manage"):
        raise HTTPException(status_code=403, detail="需要权限: user:manage")

    data = load_users()
    for i, u in enumerate(data.get("users", [])):
        if u["id"] == user_id:
            old_project_ids = u.get("project_ids", [])
            old_role = u.get("role", "user")
            old_active = u.get("active", True)
            old_permissions = u.get("custom_permissions", [])
            password_changed = False

            # 更新字段
            for field in ("name", "role", "active", "custom_permissions"):
                if field in payload:
                    u[field] = payload[field]
            # 密码单独处理：管理员重置 → 强制对方下次登录先改密
            if payload.get("password"):
                if is_weak(payload["password"]):
                    raise HTTPException(status_code=400, detail="口令太弱：至少 12 位且不要重复字符")
                u["password_hash"] = hash_password(payload["password"])
                u["must_change_password"] = user_id != current["id"]
                u["password_updated_at"] = datetime.now().isoformat()
                password_changed = True
            if "project_ids" in payload:
                u["project_ids"] = payload["project_ids"]

            data["users"][i] = u
            _save_users(data)

            # 权限/角色/启停/口令变更 → 吊销全部旧会话（OWASP：必须旋转）
            sensitive = password_changed or (
                ("role" in payload and payload["role"] != old_role)
                or ("active" in payload and payload["active"] != old_active)
                or ("custom_permissions" in payload and payload["custom_permissions"] != old_permissions)
                or ("project_ids" in payload and payload["project_ids"] != old_project_ids)
            )
            if sensitive:
                revoked = session_service.revoke_user_sessions(user_id)
                if revoked:
                    write_audit(current, "auth:sessions_revoked", user_id, "user",
                                f"权限/口令变更，吊销 {revoked} 个会话", request=request)
                # 改的是自己：当前会话也已吊销，补签一个并换 cookie
                if user_id == current["id"] and not password_changed:
                    issued = session_service.issue_session(
                        user_id, ip=_client_ip(request), ua=_user_agent(request))
                    session_service.set_session_cookie(response, issued["token"])

            # 权限变更审计
            if "project_ids" in payload and payload["project_ids"] != old_project_ids:
                added = set(payload["project_ids"]) - set(old_project_ids)
                removed = set(old_project_ids) - set(payload["project_ids"])
                detail_parts = []
                if added:
                    detail_parts.append(f"添加项目: {list(added)}")
                if removed:
                    detail_parts.append(f"移除项目: {list(removed)}")
                write_audit(
                    current, "permission:grant" if added else "permission:revoke",
                    user_id, "user",
                    "; ".join(detail_parts),
                    request=request,
                )

            if "role" in payload and payload["role"] != old_role:
                write_audit(
                    current, "user:update", user_id, "user",
                    f"角色变更: {old_role} → {payload['role']}",
                    request=request,
                )
            else:
                write_audit(
                    current, "user:update", user_id, "user",
                    f"更新用户 {u.get('name', user_id)}",
                    request=request,
                )

            return {"ok": True, "user": _public_user(u)}

    raise HTTPException(status_code=404, detail="用户不存在")


@router.delete("/api/auth/users/{user_id}")
async def delete_user(user_id: str, request: Request):
    """删除用户（admin 专属）+ 审计。"""
    current = get_current_user(request)
    if not has_permission(current, "user:manage"):
        raise HTTPException(status_code=403, detail="需要权限: user:manage")

    if user_id == "admin":
        raise HTTPException(status_code=400, detail="不能删除默认 admin 用户")

    data = load_users()
    deleted = None
    new_users = []
    for u in data.get("users", []):
        if u["id"] == user_id:
            deleted = u
        else:
            new_users.append(u)
    if not deleted:
        raise HTTPException(status_code=404, detail="用户不存在")

    data["users"] = new_users
    _save_users(data)
    session_service.revoke_user_sessions(user_id)

    write_audit(
        current, "user:delete", user_id, "user",
        f"删除用户 {deleted.get('name', user_id)}",
        request=request,
    )
    return {"ok": True}


@router.get("/api/auth/users/{user_id}/projects")
async def get_user_projects(user_id: str, request: Request):
    """获取用户可见的项目列表。"""
    current = get_current_user(request)
    if not has_permission(current, "user:manage"):
        raise HTTPException(status_code=403, detail="需要权限: user:manage")

    user = get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    all_projects = discover_projects()
    if user.get("role") == "admin" and not user.get("project_ids"):
        return {"projects": all_projects, "all": True}
    allowed = set(user.get("project_ids", []))
    return {
        "projects": [p for p in all_projects if p["name"] in allowed],
        "all": False,
    }


@router.get("/api/auth/users/{user_id}/permissions")
async def get_user_permissions_detail(user_id: str, request: Request):
    """获取用户的完整权限信息（admin 专属）。"""
    current = get_current_user(request)
    if not has_permission(current, "user:manage"):
        raise HTTPException(status_code=403, detail="需要权限: user:manage")

    user = get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    return get_user_permissions(user)


# ── 权限定义（公开，前端渲染用）──────────────────────────

@router.get("/api/auth/permissions")
async def list_permission_defs():
    """返回权限定义表（公开）。"""
    return {
        "permissions": PERMISSION_DEFS,
        "role_permissions": ROLE_PERMISSIONS,
    }
