"""认证+鉴权模块 — 用户加载、权限检查、审计日志写入.

数据存储位置：PROJECT_ROOT 的父目录（项目扫描根目录），跨项目共享。
users.json 和 audit.jsonl 独立于项目切换。
"""

import os
import json
import time
import fcntl
import tempfile
from datetime import datetime
from fastapi import Request, HTTPException


# ── 密码工具 ─────────────────────────────────────────────

# 口令算法统一走 passwords（argon2id 优先 / scrypt 兜底 / 兼容历史 sha256）
from passwords import hash_password, verify_password, needs_rehash, generate_password  # noqa: E402,F401


def _bootstrap_admin_password() -> str:
    """首启口令：优先 env；否则随机生成并在启动日志打印一次（Jupyter/Gitea 式）。"""
    env_pw = os.environ.get("AGENTFLOW_ADMIN_PASSWORD", "")
    if env_pw:
        return env_pw
    pw = generate_password()
    print("\n" + "=" * 64)
    print("[首次启动] 已生成管理员初始口令（只显示这一次，请立即修改）：")
    print(f"    admin / {pw}")
    print("    （可用 env AGENTFLOW_ADMIN_PASSWORD 指定，避免随机口令只出现在日志里）")
    print("=" * 64 + "\n")
    return pw

# ── 数据根目录（跨项目共享，独立于 CURRENT_PROJECT）─────────

def _data_dir() -> str:
    """返回跨项目数据目录（扫描根目录）。"""
    from config import PROJECT_ROOT
    return os.path.dirname(PROJECT_ROOT)


def _users_file() -> str:
    return os.path.join(_data_dir(), "users.json")


def _audit_file() -> str:
    return os.path.join(_data_dir(), "audit.jsonl")


# ── 文件锁工具 ─────────────────────────────────────────────

def _locked_write(path: str, write_fn):
    """原子写入：先写临时文件，确保数据完整后再 rename，防止 truncate 丢数据。"""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    dir_name = os.path.dirname(path)
    # 使用临时文件写入，写完后原子 rename
    tmp_fd, tmp_path = tempfile.mkstemp(dir=dir_name, suffix=".tmp")
    try:
        with os.fdopen(tmp_fd, "w", encoding="utf-8") as f:
            write_fn(f)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp_path, path)  # 原子 rename（同分区内）
    except Exception:
        # 写入失败则清理临时文件
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise


def _locked_read(path: str, mode: str = "r"):
    """带共享锁的安全读取。"""
    if not os.path.exists(path):
        return None
    with open(path, mode, encoding="utf-8") as f:
        try:
            fcntl.flock(f.fileno(), fcntl.LOCK_SH)
            content = f.read()
            fcntl.flock(f.fileno(), fcntl.LOCK_UN)
            return content
        except Exception:
            return f.read()


# ── 权限定义（静态） ──────────────────────────────────────

PERMISSION_DEFS = {
    "project:read":   {"name": "查看项目", "description": "查看项目、变更、文档内容", "dangerous": False},
    "project:write":  {"name": "编辑项目", "description": "修改配置、文件、门禁", "dangerous": False},
    "project:delete": {"name": "删除项目", "description": "删除变更/产物/角色", "dangerous": True},
    "workflow:stop":  {"name": "停止流程", "description": "中断正在执行的流程", "dangerous": True},
    "user:manage":    {"name": "用户管理", "description": "创建、编辑、删除用户及分配权限", "dangerous": True},
    "audit:view":     {"name": "查看审计", "description": "查看审计日志", "dangerous": False},
}

ROLE_PERMISSIONS = {
    "admin": ["project:read", "project:write", "project:delete", "workflow:stop", "user:manage", "audit:view"],
    # user 角色无任何默认权限 — 全部由 admin 通过 custom_permissions 显式分配
    "user":  [],
}

# 审计日志轮转阈值（行数）
AUDIT_MAX_LINES = 10000
AUDIT_ARCHIVE_KEEP = 5  # 保留最近 N 个归档


# ── 默认 admin 用户 ───────────────────────────────────────

def _default_admin() -> dict:
    return {
        "id": "admin",
        "name": "管理员",
        "role": "admin",
        "password_hash": hash_password(_bootstrap_admin_password()),  # P0-2：不再有出厂口令
        "must_change_password": True,  # 首启/重置后必须先改口令
        "project_ids": [],
        "custom_permissions": [],
        "created_at": datetime.now().isoformat(),
        "active": True,
    }


# ── 用户加载/保存 ─────────────────────────────────────────

def load_users() -> dict:
    """加载用户档案：表非空以**表**为权威（裁定⑦），否则读 users.json（迁移期/未导入）。

    表化切换由 `scripts/import_users_to_db.py --apply` 完成；导入后表恒非空，路径稳定。
    """
    from services import user_store
    try:
        rows = user_store.load_all()
    except Exception:  # noqa: BLE001 — 表不可用（未迁移/裸库）→ 文件语料
        rows = None
    if rows is not None:
        return {"users": rows}

    path = _users_file()
    if os.path.exists(path):
        try:
            content = _locked_read(path)
            if content:
                data = json.loads(content)
                # P0-2：**不再**把缺失口令修成 123456——置 must_change_password，
                # 该账号口令登录一律被拒（由管理员重置或 env 引导）。
                repaired = False
                for u in data.get("users", []):
                    if not u.get("password_hash"):
                        u["password_hash"] = ""
                        u["must_change_password"] = True
                        repaired = True
                    if "custom_permissions" not in u:
                        u["custom_permissions"] = []
                        repaired = True
                if repaired:
                    _save_users(data)
                return data
        except Exception:
            pass
    # 初始化
    data = {"users": [_default_admin()]}
    _save_users(data)
    return data


def _save_users(data: dict):
    """保存用户档案：表已启用（非空）时写**表**；否则写 users.json（自动备份 + 文件锁）。"""
    from services import user_store
    try:
        if user_store.available():
            user_store.replace_all(data.get("users", []))
            return
    except Exception as e:  # noqa: BLE001 — 表写失败不许静默丢用户
        raise RuntimeError(f"用户表写入失败：{e}") from e

    path = _users_file()
    os.makedirs(os.path.dirname(path), exist_ok=True)

    # 备份旧文件
    if os.path.exists(path):
        import shutil
        backup_dir = os.path.join(os.path.dirname(path), "backup")
        os.makedirs(backup_dir, exist_ok=True)
        ts = time.strftime("%Y%m%d-%H%M%S")
        shutil.copy2(path, os.path.join(backup_dir, f"users.json.{ts}"))
        # 清理旧备份
        backups = sorted(
            [f for f in os.listdir(backup_dir) if f.startswith("users.json.")],
            reverse=True,
        )
        for old in backups[5:]:
            os.remove(os.path.join(backup_dir, old))

    # 带锁写入
    def _write(f):
        f.write(json.dumps(data, ensure_ascii=False, indent=2))
    _locked_write(path, _write)


def get_user(user_id: str) -> dict | None:
    """按 ID 查找用户。"""
    data = load_users()
    for u in data.get("users", []):
        if u["id"] == user_id:
            return u
    return None


def get_current_user(request: Request) -> dict:
    """从 request.state 获取当前用户（由中间件注入）。

    P0-1：**不再回退 admin**。中间件是唯一身份入口（cookie > Bearer PAT >
    三重 opt-in 的 debug header），缺失即 401。这里再兜一层是为了防止
    未来有人绕过中间件直接单测路由——缺身份一律 401，不做任何降级。
    """
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="未认证")
    return user


# ── 权限检查 ──────────────────────────────────────────────

def has_permission(user: dict, permission: str) -> bool:
    """检查用户是否有指定权限。
    admin 角色直接放行全部权限；普通用户只看 custom_permissions 显式分配。
    """
    if not user or not user.get("active"):
        return False
    # admin 豁免：始终拥有全部权限
    if user.get("role") == "admin":
        return True
    # 普通用户：只看显式分配的权限
    return permission in user.get("custom_permissions", [])


def get_user_permissions(user: dict) -> dict:
    """返回用户完整权限信息，用于前端展示。
    admin: 全权限（标记 all=true）；普通用户: 仅 custom_permissions。
    """
    role = user.get("role", "user")
    if role == "admin":
        return {
            "role": "admin",
            "all": True,
            "base_permissions": sorted(ROLE_PERMISSIONS["admin"]),
            "custom_permissions": [],
            "effective_permissions": sorted(ROLE_PERMISSIONS["admin"]),
            "available_permissions": PERMISSION_DEFS,
        }
    custom = sorted(user.get("custom_permissions", []))
    return {
        "role": role,
        "all": False,
        "base_permissions": [],
        "custom_permissions": custom,
        "effective_permissions": custom,
        "available_permissions": PERMISSION_DEFS,
    }


def require_permission(permission: str):
    """返回 FastAPI 依赖项：检查当前用户权限。"""
    async def checker(request: Request):
        user = get_current_user(request)
        if not has_permission(user, permission):
            raise HTTPException(status_code=403, detail=f"需要权限: {permission}")
        return user
    return checker


def user_projects(user: dict) -> list[str]:
    """返回用户可见的项目名称列表。admin 返回空列表表示「全部可见」。"""
    if not user:
        return []
    if user.get("role") == "admin" and not user.get("project_ids"):
        return []  # 空 = 全部
    return user.get("project_ids", [])


def is_admin(user: dict) -> bool:
    return user.get("role") == "admin" if user else False


# ── 审计日志（含轮转归档）─────────────────────────────────

def _rotate_audit_if_needed():
    """审计日志超过阈值时自动归档。"""
    path = _audit_file()
    if not os.path.exists(path):
        return
    try:
        line_count = 0
        with open(path, encoding="utf-8") as f:
            for _ in f:
                line_count += 1
        if line_count >= AUDIT_MAX_LINES:
            # 归档当前文件
            archive_dir = os.path.join(os.path.dirname(path), "audit_archive")
            os.makedirs(archive_dir, exist_ok=True)
            ts = time.strftime("%Y%m%d-%H%M%S")
            archive_path = os.path.join(archive_dir, f"audit-{ts}.jsonl")
            os.rename(path, archive_path)
            # 清理旧归档
            archives = sorted(
                [f for f in os.listdir(archive_dir) if f.startswith("audit-")],
                reverse=True,
            )
            for old in archives[AUDIT_ARCHIVE_KEEP:]:
                os.remove(os.path.join(archive_dir, old))
    except Exception:
        pass


def write_audit(
    user: dict,
    action: str,
    target: str,
    target_type: str,
    detail: str = "",
    result: str = "success",
    request: Request | None = None,
):
    """追加一条审计：表化后以 `audit_log` 表为查询权威，本地 jsonl 仍留一份（离线排查/导出）。"""
    from services.audit_service import log_audit as _log
    _log(user.get("id", "unknown"), user.get("name", "unknown"), action, target, target_type,
         detail, _get_client_ip(request) if request else "unknown", result)


def _read_file_audit(limit: int, user_id: str | None, action: str | None,
                     days: int | None) -> list[dict]:
    """读 audit.jsonl（含归档目录）；筛选与旧实现一致。"""
    entries: list[dict] = []
    cutoff = datetime.now().timestamp() - days * 86400 if days else None

    def _read_file(filepath: str):
        if not os.path.exists(filepath):
            return
        content = _locked_read(filepath)
        if not content:
            return
        for line in content.split("\n"):
            line = line.strip()
            if not line:
                continue
            try:
                e = json.loads(line)
            except Exception:
                continue
            if user_id and e.get("user_id") != user_id:
                continue
            if action and e.get("action") != action:
                continue
            if cutoff and e.get("timestamp"):
                try:
                    if datetime.fromisoformat(e["timestamp"]).timestamp() < cutoff:
                        continue
                except Exception:
                    pass
            entries.append(e)

    _read_file(_audit_file())
    archive_dir = os.path.join(os.path.dirname(_audit_file()), "audit_archive")
    if days and os.path.isdir(archive_dir):
        for fname in sorted(os.listdir(archive_dir), reverse=True):
            _read_file(os.path.join(archive_dir, fname))
            if len(entries) >= limit * 2:
                break
    entries.reverse()
    return entries


def read_audit(
    limit: int = 200,
    user_id: str | None = None,
    action: str | None = None,
    days: int | None = None,
) -> list[dict]:
    """读审计：表优先，文件里的历史行（表化之前）补进来并按时间倒序去重。

    表不可用（未迁移/裸库）时退化为只读文件——与旧行为一致。
    """
    from services import audit_service

    merged: list[dict] = []
    seen: set[tuple] = set()

    def _take(rows):
        for e in rows:
            key = (e.get("timestamp"), e.get("user_id"), e.get("action"), str(e.get("target")))
            if key in seen:
                continue
            seen.add(key)
            merged.append(e)
            if len(merged) >= limit:
                return True
        return False

    db_rows = audit_service.read_rows(limit=limit, user_id=user_id, action=action, days=days)
    if db_rows is not None and _take(db_rows):
        return merged
    if _take(_read_file_audit(limit, user_id, action, days)):
        return merged
    return merged


def audit_stats(days: int = 7) -> dict:
    """审计日志统计摘要。"""
    entries = read_audit(limit=10000, days=days)
    total = len(entries)
    by_action = {}
    by_user = {}
    today = datetime.now().strftime("%Y-%m-%d")
    today_count = 0
    for e in entries:
        a = e.get("action", "unknown")
        by_action[a] = by_action.get(a, 0) + 1
        u = e.get("user_name", "unknown")
        by_user[u] = by_user.get(u, 0) + 1
        if e.get("timestamp", "")[:10] == today:
            today_count += 1
    return {
        "total": total,
        "today": today_count,
        "by_action": [{"action": k, "count": v} for k, v in sorted(by_action.items(), key=lambda x: -x[1])],
        "by_user": [{"user": k, "count": v} for k, v in sorted(by_user.items(), key=lambda x: -x[1])],
    }


def _get_client_ip(request: Request) -> str:
    """从 Request 获取客户端 IP。

    P0-3：优先用中间件算好的 `state.client_ip`（behind-proxy 下是 XFF 右起首个
    非可信地址）；没有中间件时退回传输层 peer，不直接信 XFF。
    """
    ip = getattr(request.state, "client_ip", None)
    if ip:
        return ip
    if request.client:
        return request.client.host
    return "unknown"
