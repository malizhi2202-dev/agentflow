"""用户管理 API — CRUD + 权限分配 + 登录."""

import os
import json
from datetime import datetime
from fastapi import APIRouter, Request, HTTPException
from auth import (
    load_users, _save_users, get_user, get_current_user,
    has_permission, get_user_permissions, write_audit,
    PERMISSION_DEFS, ROLE_PERMISSIONS,
    hash_password, verify_password,
)
from config import discover_projects

router = APIRouter()


# ── 公开接口（登录页用）──────────────────────────────────

@router.get("/api/auth/list")
async def list_users_public():
    """公开接口：返回活跃用户列表（仅 id + name + role），供登录页使用。"""
    data = load_users()
    users = [
        {"id": u["id"], "name": u["name"], "role": u["role"]}
        for u in data.get("users", [])
        if u.get("active", True)
    ]
    return {"users": users}


@router.get("/api/auth/me")
async def me(request: Request):
    """返回当前登录用户信息（含有效权限=角色基础+显式分配）。"""
    user = get_current_user(request)
    perm_info = get_user_permissions(user)
    return {
        "user": user,
        "permissions": PERMISSION_DEFS,
        "role_permissions": perm_info["effective_permissions"],  # 有效权限=角色+自定义
    }


@router.get("/api/auth/users")
async def list_users(request: Request):
    """用户列表（admin 专属）。"""
    user = get_current_user(request)
    if not has_permission(user, "user:manage"):
        raise HTTPException(status_code=403, detail="需要权限: user:manage")
    data = load_users()
    return {"users": data.get("users", [])}


@router.post("/api/auth/users")
async def create_user(request: Request):
    """创建用户（admin 专属）+ 审计。"""
    current = get_current_user(request)
    if not has_permission(current, "user:manage"):
        raise HTTPException(status_code=403, detail="需要权限: user:manage")

    body = await request.json()
    data = load_users()

    # 检查 ID 唯一性
    new_id = body.get("id", "").strip()
    if not new_id:
        raise HTTPException(status_code=400, detail="用户 ID 不能为空")
    if any(u["id"] == new_id for u in data.get("users", [])):
        raise HTTPException(status_code=400, detail=f"用户 ID '{new_id}' 已存在")

    password = body.get("password", "123456")
    new_user = {
        "id": new_id,
        "name": body.get("name", new_id),
        "role": body.get("role", "user"),
        "password_hash": hash_password(password),
        "project_ids": body.get("project_ids", []),
        "custom_permissions": body.get("custom_permissions", []),
        "created_at": datetime.now().isoformat(),
        "active": body.get("active", True),
    }
    data["users"].append(new_user)
    _save_users(data)

    write_audit(
        current, "user:create", new_id, "user",
        f"创建用户 {new_user['name']}，角色: {new_user['role']}，项目: {new_user['project_ids']}",
        request=request,
    )
    return {"ok": True, "user": new_user}


@router.put("/api/auth/users/{user_id}")
async def update_user(user_id: str, request: Request):
    """更新用户（admin 专属）+ 审计。"""
    current = get_current_user(request)
    if not has_permission(current, "user:manage"):
        raise HTTPException(status_code=403, detail="需要权限: user:manage")

    body = await request.json()
    data = load_users()
    for i, u in enumerate(data.get("users", [])):
        if u["id"] == user_id:
            old_project_ids = u.get("project_ids", [])
            old_role = u.get("role", "user")

            # 更新字段
            for field in ("name", "role", "active", "custom_permissions"):
                if field in body:
                    u[field] = body[field]
            # 密码单独处理
            if body.get("password"):
                u["password_hash"] = hash_password(body["password"])
            if "project_ids" in body:
                u["project_ids"] = body["project_ids"]

            data["users"][i] = u
            _save_users(data)

            # 权限变更审计
            if "project_ids" in body and body["project_ids"] != old_project_ids:
                added = set(body["project_ids"]) - set(old_project_ids)
                removed = set(old_project_ids) - set(body["project_ids"])
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

            if "role" in body and body["role"] != old_role:
                write_audit(
                    current, "user:update", user_id, "user",
                    f"角色变更: {old_role} → {body['role']}",
                    request=request,
                )
            else:
                write_audit(
                    current, "user:update", user_id, "user",
                    f"更新用户 {u.get('name', user_id)}",
                    request=request,
                )

            return {"ok": True, "user": u}

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

    write_audit(
        current, "user:delete", user_id, "user",
        f"删除用户 {deleted.get('name', user_id)}",
        request=request,
    )
    return {"ok": True}


@router.post("/api/auth/login")
async def login(request: Request):
    """用户登录（验证密码）。"""
    body = await request.json()
    user_id = body.get("user_id", "").strip()
    password = body.get("password", "")

    if not user_id:
        raise HTTPException(status_code=400, detail="user_id 不能为空")

    user = get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    if not user.get("active"):
        raise HTTPException(status_code=403, detail="用户已被禁用")

    # 验证密码
    stored_hash = user.get("password_hash", "")
    if not verify_password(password, stored_hash):
        raise HTTPException(status_code=401, detail="密码错误")

    return {"ok": True, "user": {"id": user["id"], "name": user["name"], "role": user["role"]}}


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
