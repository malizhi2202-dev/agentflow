"""GET/PUT /api/roles — 角色管理."""
import os
import json
from fastapi import APIRouter, Request, HTTPException
from config import get_specs_dir
from auth import get_current_user, has_permission, write_audit

router = APIRouter()
ROLES_FILE = os.path.join(os.path.dirname(get_specs_dir()), ".specs", "roles.json")


def _load() -> dict:
    if os.path.exists(ROLES_FILE):
        return json.load(open(ROLES_FILE, encoding="utf-8"))
    return {"roles": []}


def _save(data: dict):
    os.makedirs(os.path.dirname(ROLES_FILE), exist_ok=True)
    if os.path.exists(ROLES_FILE):
        import shutil
        backup_dir = os.path.join(os.path.dirname(ROLES_FILE), "backup")
        os.makedirs(backup_dir, exist_ok=True)
        ts = __import__('time').strftime("%Y%m%d-%H%M%S")
        shutil.copy2(ROLES_FILE, os.path.join(backup_dir, f"roles.json.{ts}"))
        backups = sorted([f for f in os.listdir(backup_dir) if f.startswith("roles.json.")], reverse=True)
        for old in backups[5:]:
            os.remove(os.path.join(backup_dir, old))
    json.dump(data, open(ROLES_FILE, "w", encoding="utf-8"), ensure_ascii=False, indent=2)


@router.get("/api/roles")
async def get_roles():
    return _load()


@router.put("/api/roles/{role_id}")
async def update_role(role_id: str, request: Request):
    user = get_current_user(request)
    if not has_permission(user, "project:write"):
        raise HTTPException(status_code=403, detail="需要权限: project:write")
    body = await request.json()
    data = _load()
    for r in data["roles"]:
        if r["id"] == role_id:
            for k, v in body.items():
                if k in r:
                    r[k] = v
            _save(data)
            write_audit(user, "project:write", role_id, "role",
                        f"更新角色 {r.get('name', role_id)}", request=request)
            return {"ok": True, "role": r}
    return {"ok": False, "error": "not found"}, 404


@router.post("/api/roles")
async def create_role(request: Request):
    user = get_current_user(request)
    if not has_permission(user, "project:write"):
        raise HTTPException(status_code=403, detail="需要权限: project:write")
    body = await request.json()
    data = _load()
    new_role = {
        "id": body.get("id", f"role-{len(data['roles'])+1}"),
        "name": body.get("name", "新角色"),
        "emoji": body.get("emoji", "⚪"),
        "gates": body.get("gates", []),
        "description": body.get("description", ""),
        "style": body.get("style", ""),
        "personality": body.get("personality", ""),
    }
    data["roles"].append(new_role)
    _save(data)
    write_audit(user, "project:write", new_role["id"], "role",
                f"创建角色 {new_role['name']}", request=request)
    return {"ok": True, "role": new_role}


@router.delete("/api/roles/{role_id}")
async def delete_role(role_id: str, request: Request):
    user = get_current_user(request)
    if not has_permission(user, "project:delete"):
        raise HTTPException(status_code=403, detail="需要权限: project:delete")
    data = _load()
    deleted = next((r for r in data["roles"] if r["id"] == role_id), None)
    data["roles"] = [r for r in data["roles"] if r["id"] != role_id]
    _save(data)
    if deleted:
        write_audit(user, "project:delete", role_id, "role",
                    f"删除角色 {deleted.get('name', role_id)}", request=request)
    return {"ok": True}
