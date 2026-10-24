"""工具库业务逻辑 — CRUD + 权限过滤 + 审计 + 技能文件包校验."""
from sqlalchemy.orm import Session
from models.tool import Tool
from services.security_service import apply_defaults

# 多文件技能包上限：防把平台库当网盘（multica 现网实测：单技能最多 17 个文件、正文最大 27KB）
MAX_SKILL_FILES = 200
MAX_SKILL_FILE_PATH = 512
MAX_SKILL_FILES_BYTES = 2 * 1024 * 1024


class ToolPayloadError(ValueError):
    """工具请求体非法（路由映射 400，文案原样给用户）。"""


def normalize_files_json(raw) -> list[dict]:
    """校验并规范化技能文件包 `[{path, content}]`。

    口径（不猜、不静默丢）：
    - 非列表 → 报错；元素不是对象 → 报错；
    - `path` 必须是非空字符串、≤512、**同一技能内唯一**；
    - `content` 必须是字符串（空串合法 = 占位文件）；
    - 数量 ≤200，总字节 ≤2MB。
    """
    if raw is None:
        return []
    if not isinstance(raw, list):
        raise ToolPayloadError("files_json 必须是数组")
    if len(raw) > MAX_SKILL_FILES:
        raise ToolPayloadError(f"技能文件最多 {MAX_SKILL_FILES} 个（收到 {len(raw)} 个）")
    out: list[dict] = []
    seen: set[str] = set()
    total = 0
    for idx, item in enumerate(raw, start=1):
        if not isinstance(item, dict):
            raise ToolPayloadError(f"第 {idx} 个技能文件必须是对象")
        path = item.get("path")
        content = item.get("content", "")
        if not isinstance(path, str) or not path.strip():
            raise ToolPayloadError(f"第 {idx} 个技能文件缺 path")
        path = path.strip()
        if len(path) > MAX_SKILL_FILE_PATH:
            raise ToolPayloadError(f"第 {idx} 个技能文件 path 过长（>{MAX_SKILL_FILE_PATH}）")
        if path in seen:
            raise ToolPayloadError(f"技能文件 path 重复：{path}")
        if not isinstance(content, str):
            raise ToolPayloadError(f"技能文件 {path} 的 content 必须是字符串")
        seen.add(path)
        total += len(content.encode("utf-8"))
        if total > MAX_SKILL_FILES_BYTES:
            raise ToolPayloadError(f"技能文件总大小超过 {MAX_SKILL_FILES_BYTES // 1024 // 1024}MB")
        out.append({"path": path, "content": content})
    return out


def create_tool(db: Session, user: dict, data: dict) -> Tool:
    apply_defaults(data)
    tool = Tool(
        owner_id=user["id"],
        type=data["type"],
        name=data["name"],
        description=data.get("description", ""),
        token_soft_limit=data.get("token_soft_limit", 80000),
        token_hard_limit=data.get("token_hard_limit", 100000),
        permissions=data.get("permissions", []),
        mcp_host_config=data.get("mcp_host_config"),
        # v23：技能正文与多文件包此前「只收不存」（前端提交的 content_md 被丢弃），这里补上
        content_md=data.get("content_md") or "",
        files_json=normalize_files_json(data.get("files_json")),
        config_json=data.get("config_json") or {},
    )
    db.add(tool)
    db.commit()
    db.refresh(tool)
    return tool


def get_tool(db: Session, tool_id: int, user: dict) -> Tool | None:
    q = db.query(Tool).filter(Tool.id == tool_id)
    if user.get("role") != "admin":
        q = q.filter(Tool.owner_id == user["id"])
    return q.first()


def list_tools(db: Session, user: dict, tool_type: str | None = None, status: str | None = None) -> list[Tool]:
    q = db.query(Tool)
    if user.get("role") != "admin":
        q = q.filter(Tool.owner_id == user["id"])
    if tool_type:
        q = q.filter(Tool.type == tool_type)
    if status:
        q = q.filter(Tool.status == status)
    return q.order_by(Tool.updated_at.desc()).all()


def update_tool(db: Session, tool_id: int, user: dict, data: dict) -> Tool | None:
    tool = get_tool(db, tool_id, user)
    if not tool:
        return None
    for field in ("name", "description", "token_soft_limit", "token_hard_limit",
                  "permissions", "mcp_host_config", "content_md", "config_json"):
        if field in data:
            setattr(tool, field, data[field])
    if "files_json" in data:
        tool.files_json = normalize_files_json(data["files_json"])
    db.commit()
    db.refresh(tool)
    return tool


def delete_tool(db: Session, tool_id: int, user: dict) -> bool:
    tool = get_tool(db, tool_id, user)
    if not tool:
        return False
    db.delete(tool)
    db.commit()
    return True


def disable_tool(db: Session, tool_id: int) -> Tool | None:
    tool = db.query(Tool).filter(Tool.id == tool_id).first()
    if not tool:
        return None
    tool.status = "disabled"
    db.commit()
    db.refresh(tool)
    return tool
