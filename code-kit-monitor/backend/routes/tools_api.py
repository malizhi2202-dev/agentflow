"""工具库 API 路由 — CRUD + demo 下载 + MCP 生成 + admin 管控."""
import json
import io
import zipfile
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database import get_db
from services.tool_service import create_tool, get_tool, list_tools, update_tool, delete_tool, disable_tool
from services.audit_service import log_audit

router = APIRouter(prefix="/api/tools", tags=["tools"])


def _user(request: Request) -> dict:
    return request.state.user


def _require_owner_or_admin(tool, user: dict):
    if user.get("role") != "admin" and tool.owner_id != user["id"]:
        raise HTTPException(status_code=403, detail="无权操作此工具")


@router.get("")
def api_list_tools(type: str | None = None, status: str | None = None, request: Request = None, db: Session = Depends(get_db)):
    tools = list_tools(db, _user(request), type, status)
    return {"tools": [t.to_dict() for t in tools], "total": len(tools)}


@router.post("")
def api_create_tool(payload: dict, request: Request = None, db: Session = Depends(get_db)):
    user = _user(request)
    if not payload.get("name", "").strip():
        raise HTTPException(status_code=400, detail="工具名称不能为空")
    if not payload.get("type") or payload["type"] not in ("plugin", "skill", "mcp"):
        raise HTTPException(status_code=400, detail="工具类型必须为 plugin/skill/mcp 之一")
    tool = create_tool(db, user, payload)
    log_audit(user["id"], user.get("name", user["id"]), "tool.create", tool.name, "tool", "created", request.client.host if request.client else "127.0.0.1")
    return tool.to_dict()


@router.get("/{tool_id}")
def api_get_tool(tool_id: int, request: Request = None, db: Session = Depends(get_db)):
    tool = get_tool(db, tool_id, _user(request))
    if not tool:
        raise HTTPException(status_code=404, detail="工具不存在")
    return tool.to_dict()


@router.put("/{tool_id}")
def api_update_tool(tool_id: int, payload: dict, request: Request = None, db: Session = Depends(get_db)):
    user = _user(request)
    tool = update_tool(db, tool_id, user, payload)
    if not tool:
        raise HTTPException(status_code=404, detail="工具不存在")
    log_audit(user["id"], user.get("name", user["id"]), "tool.update", tool.name, "tool", "updated", request.client.host if request.client else "127.0.0.1")
    return tool.to_dict()


@router.delete("/{tool_id}")
def api_delete_tool(tool_id: int, request: Request = None, db: Session = Depends(get_db)):
    user = _user(request)
    ok = delete_tool(db, tool_id, user)
    if not ok:
        raise HTTPException(status_code=404, detail="工具不存在")
    log_audit(user["id"], user.get("name", user["id"]), "tool.delete", str(tool_id), "tool", "deleted", request.client.host if request.client else "127.0.0.1")
    return {"status": "deleted"}


@router.post("/{tool_id}/disable")
def api_disable_tool(tool_id: int, request: Request = None, db: Session = Depends(get_db)):
    user = _user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="仅 admin 可禁用工具")
    tool = disable_tool(db, tool_id)
    if not tool:
        raise HTTPException(status_code=404, detail="工具不存在")
    log_audit(user["id"], user.get("name", user["id"]), "tool.disable", tool.name, "tool", "disabled", request.client.host if request.client else "127.0.0.1")
    return tool.to_dict()


@router.get("/{tool_id}/demo")
def api_download_demo(tool_id: int, request: Request = None, db: Session = Depends(get_db)):
    tool = get_tool(db, tool_id, _user(request))
    if not tool:
        raise HTTPException(status_code=404, detail="工具不存在")
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(f"{tool.name}/README.md", f"# {tool.name}\n\nType: {tool.type}\nToken Soft Limit: {tool.token_soft_limit}\nToken Hard Limit: {tool.token_hard_limit}\n")
        if tool.type == "mcp":
            zf.writestr(f"{tool.name}/server.py", '"""MCP Server 骨架."""\nfrom mcp.server import Server\n\nserver = Server("${NAME}")\n\n@server.tool()\ndef hello(name: str) -> str:\n    return f"Hello, {name}!"\n\nif __name__ == "__main__":\n    server.run()\n')
            zf.writestr(f"{tool.name}/requirements.txt", "mcp>=1.0.0\n")
        elif tool.type == "plugin":
            zf.writestr(f"{tool.name}/plugin.json", json.dumps({"name": tool.name, "type": "plugin", "permissions": tool.permissions}, indent=2))
    buf.seek(0)
    from fastapi.responses import StreamingResponse
    import urllib.parse
    safe_name = urllib.parse.quote(f"{tool.name}-demo.zip")
    return StreamingResponse(buf, media_type="application/zip", headers={"Content-Disposition": f"attachment; filename*=UTF-8''{safe_name}"})


@router.put("/{tool_id}/content")
def api_save_content(tool_id: int, payload: dict, request: Request = None, db: Session = Depends(get_db)):
    """保存工具的 markdown 内容."""
    tool = get_tool(db, tool_id, _user(request))
    if not tool:
        raise HTTPException(status_code=404, detail="工具不存在")
    tool.content_md = payload.get("content_md", "")
    db.commit()
    return {"status": "saved", "size": len(tool.content_md)}


