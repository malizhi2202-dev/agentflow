"""GET/PUT /api/changes/<id>/<artifact> — 产物查看与编辑."""
import os
from fastapi import APIRouter, HTTPException, Request
from config import get_specs_dir
from auth import get_current_user, has_permission, write_audit

router = APIRouter()
SAFE_NAMES = {'CHANGE', 'REQUIREMENT', 'DESIGN', 'UI-DESIGN', 'TASK', 'TEST', 'REVIEW'}
SAFE_PATTERNS = ['-SUMMARY']  # 允许 SUMMARY 文件


@router.get("/api/changes/{change_id}/{artifact}")
async def get_artifact(change_id: str, artifact: str):
    allowed = artifact.upper() in SAFE_NAMES or any(p in artifact.upper() for p in SAFE_PATTERNS)
    if not allowed:
        raise HTTPException(400, f"unknown artifact: {artifact}")
    if '..' in change_id or '/' in change_id:
        raise HTTPException(400, "invalid change_id")
    change_dir = os.path.join(get_specs_dir(), change_id)
    if not os.path.isdir(change_dir):
        raise HTTPException(404, f"change '{change_id}' not found")
    for fname in os.listdir(change_dir):
        if artifact.upper() in fname.upper() and fname.endswith('.md'):
            path = os.path.join(change_dir, fname)
            content = open(path, encoding='utf-8').read()
            return {"artifact": fname, "content": content, "size": len(content)}
    raise HTTPException(404, f"artifact '{artifact}' not found in change '{change_id}'")


@router.put("/api/changes/{change_id}/{artifact}")
async def update_artifact(change_id: str, artifact: str, request: Request):
    """编辑产物文件（需要 project:write 权限）。"""
    user = get_current_user(request)
    if not has_permission(user, "project:write"):
        raise HTTPException(status_code=403, detail="需要权限: project:write")

    allowed = artifact.upper() in SAFE_NAMES or any(p in artifact.upper() for p in SAFE_PATTERNS)
    if not allowed:
        raise HTTPException(400, f"unknown artifact: {artifact}")
    if '..' in change_id or '/' in change_id:
        raise HTTPException(400, "invalid change_id")
    change_dir = os.path.join(get_specs_dir(), change_id)
    if not os.path.isdir(change_dir):
        raise HTTPException(404, f"change '{change_id}' not found")
    body = await request.json()
    new_content = body.get("content", "")
    for fname in os.listdir(change_dir):
        if artifact.upper() in fname.upper() and fname.endswith('.md'):
            path = os.path.join(change_dir, fname)
            # 自动备份
            backup_dir = os.path.join(os.path.dirname(get_specs_dir()), "backup")
            os.makedirs(backup_dir, exist_ok=True)
            import shutil, time
            ts = time.strftime("%Y%m%d-%H%M%S")
            shutil.copy2(path, os.path.join(backup_dir, f"{fname}.{ts}"))
            # 写入
            with open(path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            write_audit(user, "project:write", f"{change_id}/{artifact}", "artifact",
                        f"编辑产物 {artifact}", request=request)
            return {"ok": True, "artifact": fname, "size": len(new_content)}
    raise HTTPException(404, f"artifact '{artifact}' not found in change '{change_id}'")
