"""用户档案的表化读写（v21 T-07，裁定⑦）。

双语文料口径（**不静默回退**）：
- 表里有行 → 表是权威源，`auth.load_users()` 读表；
- 表空（新库 / 尚未导入）→ 继续读 `users.json`，此时仍会写文件，行为与旧版一致；
- 表化切换用 `scripts/import_users_to_db.py`（默认 dry-run，`--apply` 才写），导入后表非空即切换。

为什么「表空时退回文件」不是静默降级：这是**迁移期**的一次性语义，且两条路径的判定只看
「表里有没有行」，不猜、不逐字段合并；导入脚本跑完后表恒非空，路径稳定。
"""
from __future__ import annotations

import json

from models.user import AppUser
from database import SessionLocal


def _session(db=None):
    if db is not None:
        return db, False
    return SessionLocal(), True


def available(db=None) -> bool:
    """表存在且有行 → 表是权威源。任何异常都按「不可用」处理（迁移未跑的新库/裸库）。"""
    s, own = _session(db)
    try:
        return s.query(AppUser).count() > 0
    except Exception:  # noqa: BLE001 — 表没建/连接不可用：退回文件语料
        return False
    finally:
        if own:
            s.close()


def load_all(db=None) -> list[dict] | None:
    """返回全部用户；表不可用返回 None（调用方走文件）。"""
    s, own = _session(db)
    try:
        rows = s.query(AppUser).order_by(AppUser.id.asc()).all()
        if not rows:
            return None
        return [r.to_dict() for r in rows]
    except Exception:  # noqa: BLE001
        return None
    finally:
        if own:
            s.close()


def get(user_id: str, db=None) -> dict | None:
    for u in load_all(db) or []:
        if u["id"] == user_id:
            return u
    return None


def upsert(user: dict, db=None) -> None:
    """按 id 插入或更新；`project_ids/custom_permissions` 存 JSON 文本。"""
    s, own = _session(db)
    try:
        row = s.query(AppUser).filter(AppUser.id == user["id"]).first()
        if row is None:
            row = AppUser(id=user["id"])
            s.add(row)
        row.name = user.get("name", "")
        row.role = user.get("role", "member")
        row.password_hash = user.get("password_hash", "")
        row.must_change_password = bool(user.get("must_change_password", False))
        row.project_ids = list(user.get("project_ids") or [])
        row.custom_permissions = list(user.get("custom_permissions") or [])
        row.active = bool(user.get("active", True))
        row.created_at = user.get("created_at", "") or row.created_at or ""
        s.commit()
    finally:
        if own:
            s.close()


def replace_all(users: list[dict], db=None) -> dict:
    """整表对齐（用于 `auth._save_users` 的「全量保存」语义）。返回 {upserted, deleted}。"""
    s, own = _session(db)
    try:
        wanted = {u["id"] for u in users}
        existing = {r.id for r in s.query(AppUser).all()}
        for u in users:
            row = s.query(AppUser).filter(AppUser.id == u["id"]).first()
            if row is None:
                row = AppUser(id=u["id"])
                s.add(row)
            row.name = u.get("name", "")
            row.role = u.get("role", "member")
            row.password_hash = u.get("password_hash", "")
            row.must_change_password = bool(u.get("must_change_password", False))
            row.project_ids = list(u.get("project_ids") or [])
            row.custom_permissions = list(u.get("custom_permissions") or [])
            row.active = bool(u.get("active", True))
            row.created_at = u.get("created_at", "") or row.created_at or ""
        deleted = 0
        for gone in existing - wanted:
            s.query(AppUser).filter(AppUser.id == gone).delete()
            deleted += 1
        s.commit()
        return {"upserted": len(users), "deleted": deleted}
    finally:
        if own:
            s.close()


def import_from_json(path: str, db=None, apply: bool = False) -> dict:
    """把 users.json 导入表（默认 dry-run 只算数）。口令哈希原样搬运，不重算、不改写。"""
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    users = data.get("users", []) if isinstance(data, dict) else []
    out = {"source": path, "found": len(users), "applied": False, "upserted": 0, "deleted": 0}
    if not apply:
        return out
    result = replace_all(users, db=db)
    out.update(applied=True, **result)
    return out
