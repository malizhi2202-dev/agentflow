"""管理 API — 工作流配置 + 提示词文件读写 + 角色门禁管理 + 项目切换."""
import os
import json
from fastapi import APIRouter, Depends, Request, HTTPException, Response
from sqlalchemy.orm import Session
from config import get_specs_dir, get_prompts_dir, set_current_project, discover_projects, CURRENT_PROJECT
from auth import get_current_user, has_permission, write_audit, is_admin
from database import get_db
from services import declarative

router = APIRouter()


def _specs_parent() -> str:
    return os.path.dirname(get_specs_dir())


def _prompts_dir() -> str:
    return get_prompts_dir()


def _workflow_file() -> str:
    return os.path.join(_specs_parent(), "workflow.json")


def _roles_file() -> str:
    return os.path.join(_specs_parent(), "roles.json")


# ═══════════════════════════════════════════
# 工作流配置
# ═══════════════════════════════════════════

import stage_config
from stage_config import DEFAULT_WORKFLOW  # 单一事实源（原副本已删）


def _backup_file(filepath: str):
    """保存前自动备份，保留最近 5 个版本."""
    if not os.path.exists(filepath): return
    backup_dir = os.path.join(os.path.dirname(filepath), "backup")
    os.makedirs(backup_dir, exist_ok=True)
    import time as _time
    ts = _time.strftime("%Y%m%d-%H%M%S")
    fname = os.path.basename(filepath)
    backup_path = os.path.join(backup_dir, f"{fname}.{ts}")
    import shutil as _shutil
    _shutil.copy2(filepath, backup_path)
    # 清理旧备份 (保留最近 5 个)
    backups = sorted([f for f in os.listdir(backup_dir) if f.startswith(fname)], reverse=True)
    for old in backups[5:]:
        os.remove(os.path.join(backup_dir, old))


def _save_workflow(data: dict):
    os.makedirs(os.path.dirname(_workflow_file()), exist_ok=True)
    if os.path.exists(_workflow_file()):
        _backup_file(_workflow_file())
    json.dump(data, open(_workflow_file(), "w", encoding="utf-8"), ensure_ascii=False, indent=2)


@router.get("/api/admin/workflow")
async def get_workflow(response: Response, db: Session = Depends(get_db)):
    try:
        wf = stage_config.load_workflow()
        stage_config.validate(wf)
    except (ValueError, OSError):
        wf = stage_config.DEFAULT_WORKFLOW  # 配置坏了：回退默认表，不把 500 丢给前端
    # merge roles into each gate
    roles_data = {}
    if os.path.exists(_roles_file()):
        roles_data = json.load(open(_roles_file(), encoding="utf-8"))
    # P2-5 ①：ETag 是「这一次读到的内容」，PUT 带 If-Match 不匹配即 412
    etag = declarative.etag_for(wf)
    response.headers["ETag"] = etag
    return {
        "apiVersion": declarative.DEFAULT_API_VERSION,
        "kind": "WorkflowConfig",
        "workflow": wf,
        "all_roles": [r["name"] for r in roles_data.get("roles", [])],
        "status": {
            "generation": _resource_generation(db, "workflow_config", "0"),
            "conditions": declarative.conditions(db, "workflow_config", "0"),
        },
    }


@router.put("/api/admin/workflow")
async def update_workflow(request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request)
    if not has_permission(user, "project:write"):
        raise HTTPException(status_code=403, detail="需要权限: project:write")
    body = await request.json()
    # P2-5 ②：文档体可带 apiVersion/kind；不认识的 kind 拒绝，弃用版本只告警
    meta = declarative.validate_document(body, expected_kind="WorkflowConfig")
    spec = body.get("spec") if isinstance(body.get("spec"), dict) else body
    # 先校验后落盘：残缺/重复阶段的配置直接 400，不写坏文件（S7-C4 响亮失败）
    try:
        stage_config.validate(spec)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"workflow 配置非法: {e}")

    # P2-5 ①：If-Match 与当前磁盘内容不一致 → 412，不做盲覆盖
    current = stage_config.DEFAULT_WORKFLOW
    try:
        current = stage_config.load_workflow()
    except (ValueError, OSError):
        pass
    declarative.check_if_match(request, current)

    before_hash = declarative.canonical_hash(current)
    _save_workflow(spec)
    stage_config.apply(spec)          # 进程内快照同步，scanner/前端立即看到新阶段
    after_hash = declarative.canonical_hash(spec)

    # P2-5 ④：账本与变更同事务（change_log），不是另写一份审计文件
    change = declarative.append_change(
        db, "workflow_config", "0", user["id"], "update",
        before_hash=before_hash, after_hash=after_hash,
        payload={"stages": [s["id"] for s in stage_config.validate(spec)]},
    )
    declarative.set_condition(
        db, "workflow_config", "0", "True", reason="Applied",
        message=f"generation {change.generation} 已应用",
        observed_generation=change.generation,
    )
    db.commit()
    write_audit(user, "project:write", "workflow.json", "config",
                "更新工作流配置", request=request)
    result = {"ok": True, "stages": [s["id"] for s in stage_config.validate(spec)],
              "generation": change.generation, "etag": declarative.etag_for(spec)}
    if meta["deprecated"]:
        result["warning"] = f"apiVersion {meta['apiVersion']} 已弃用：{meta['deprecation_message']}"
    return result


def _resource_generation(db: Session, resource_type: str, resource_id: str) -> int:
    from sqlalchemy import func
    from models.declarative import ChangeLog

    value = db.query(func.max(ChangeLog.generation)).filter(
        ChangeLog.resource_type == resource_type,
        ChangeLog.resource_id == resource_id,
    ).scalar()
    return int(value or 1)


# ═══════════════════════════════════════════
# 提示词 / 模板 / 规则文件读写
# ═══════════════════════════════════════════

@router.get("/api/admin/files")
async def list_files():
    """列出当前项目提示词目录下所有可编辑文件."""
    files = []
    for root, dirs, fnames in os.walk(_prompts_dir()):
        dirs[:] = [d for d in dirs if d not in ('.git', 'node_modules', 'regression-demos', '.specs')]
        for fname in fnames:
            if fname.endswith(('.md', '.json')):
                path = os.path.relpath(os.path.join(root, fname), _prompts_dir())
                size = os.path.getsize(os.path.join(root, fname))
                files.append({"path": path, "size": size, "type": "markdown" if fname.endswith('.md') else "json"})
    return {"files": sorted(files, key=lambda f: f["path"])}


@router.get("/api/admin/files/{path:path}")
async def read_file(path: str):
    """读取提示词文件内容."""
    full = os.path.join(_prompts_dir(), path)
    if not os.path.exists(full) or '..' in path:
        raise HTTPException(404)
    with open(full, encoding="utf-8") as f:
        return {"path": path, "content": f.read()}


@router.put("/api/admin/files/{path:path}")
async def write_file(path: str, request: Request):
    """写入提示词文件."""
    user = get_current_user(request)
    if not has_permission(user, "project:write"):
        raise HTTPException(status_code=403, detail="需要权限: project:write")
    full = os.path.join(_prompts_dir(), path)
    if '..' in path or not full.startswith(_prompts_dir()):
        raise HTTPException(400, "invalid path")
    body = await request.json()
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w", encoding="utf-8") as f:
        f.write(body["content"])
    write_audit(user, "project:write", path, "file",
                f"编辑文件 {path}，大小: {len(body['content'])} 字节", request=request)
    return {"ok": True, "path": path, "size": len(body["content"])}


# ═══════════════════════════════════════════
# 项目隔离
# ═══════════════════════════════════════════

@router.get("/api/admin/file-names")
async def get_file_names():
    """获取文件中文名映射."""
    mapping_file = os.path.join(get_specs_dir(), "file-names.json")
    if os.path.exists(mapping_file):
        return json.load(open(mapping_file, encoding="utf-8"))
    return {}


@router.put("/api/admin/file-names")
async def update_file_names(request: Request):
    """保存文件中文名映射."""
    user = get_current_user(request)
    if not has_permission(user, "project:write"):
        raise HTTPException(status_code=403, detail="需要权限: project:write")
    mapping_file = os.path.join(get_specs_dir(), "file-names.json")
    body = await request.json()
    json.dump(body, open(mapping_file, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    write_audit(user, "project:write", "file-names.json", "config",
                "更新文件中文名映射", request=request)
    return {"ok": True}


@router.get("/api/admin/projects")
async def list_projects(request: Request):
    user = get_current_user(request)
    projects = discover_projects(user)
    return {"projects": projects, "current": CURRENT_PROJECT, "is_admin": is_admin(user)}


@router.post("/api/admin/projects/switch")
async def switch_project(request: Request):
    user = get_current_user(request)
    body = await request.json()
    root = body.get("root", "")
    if not os.path.isdir(root):
        raise HTTPException(400, "invalid project root")

    # 检查用户是否有权访问该项目
    if not is_admin(user):
        allowed = set(user.get("project_ids", []))
        project_name = os.path.basename(root)
        if allowed and project_name not in allowed:
            raise HTTPException(status_code=403, detail="无权访问该项目")

    set_current_project(root)
    write_audit(user, "project:read", os.path.basename(root), "project",
                f"切换到项目 {root}", request=request)
    return {"ok": True, "current": CURRENT_PROJECT}


# ── 全局安全配置 ──
from services.security_service import DEFAULT_SECURITY
_security_config = dict(DEFAULT_SECURITY)


@router.get("/api/admin/security-config")
def api_get_security_config(request: Request = None):
    return {"config": _security_config}


@router.put("/api/admin/security-config")
def api_update_security_config(payload: dict, request: Request = None):
    global _security_config
    for k, v in payload.items():
        if k in _security_config:
            _security_config[k] = v
    return {"config": _security_config, "status": "saved"}
