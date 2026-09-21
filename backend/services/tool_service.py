"""工具库业务逻辑 — CRUD + 权限过滤 + 审计."""
from sqlalchemy.orm import Session
from models.tool import Tool
from services.security_service import apply_defaults


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
    for field in ("name", "description", "token_soft_limit", "token_hard_limit", "permissions", "mcp_host_config"):
        if field in data:
            setattr(tool, field, data[field])
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
