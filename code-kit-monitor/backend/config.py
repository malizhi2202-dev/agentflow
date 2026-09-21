"""code-kit-monitor 后端配置."""
import os
import json

SPECS_DIR: str = os.environ.get("SPECS_DIR", os.path.join(os.path.dirname(__file__), "..", "..", ".specs"))
HOST: str = os.environ.get("HOST", "127.0.0.1")
PORT: int = int(os.environ.get("PORT", "8000"))
SCAN_INTERVAL: int = int(os.environ.get("SCAN_INTERVAL", "5"))
CORS_ORIGIN: str = os.environ.get("CORS_ORIGIN", "http://localhost:5173")
PROJECT_ROOT: str = os.environ.get("PROJECT_ROOT", os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

# 项目隔离：每个项目有独立的 .specs/ 和配置
CURRENT_PROJECT: str = PROJECT_ROOT
PROJECT_CONFIG_FILE: str = os.path.join(os.path.dirname(__file__), "project_state.json")


def get_specs_dir() -> str:
    """获取当前项目的 .specs 目录."""
    return os.path.join(CURRENT_PROJECT, ".specs")


def get_code_kit_dir() -> str:
    """获取当前项目的 code-kit 目录."""
    return os.path.join(CURRENT_PROJECT, "code-kit")


def set_current_project(root: str):
    global CURRENT_PROJECT
    CURRENT_PROJECT = root
    with open(PROJECT_CONFIG_FILE, "w") as f:
        json.dump({"project_root": root}, f)


def discover_projects(user: dict | None = None) -> list[dict]:
    """扫描父目录下所有包含 .specs/ 或 code-kit/ 的项目.

    Args:
        user: 可选，传入用户字典则按 project_ids 过滤（admin 不过滤）。
    """
    projects = []
    scan_root = os.path.dirname(PROJECT_ROOT)
    try:
        for entry in sorted(os.listdir(scan_root)):
            full = os.path.join(scan_root, entry)
            if not os.path.isdir(full) or entry.startswith('.'):
                continue
            has_specs = os.path.isdir(os.path.join(full, ".specs"))
            has_codekit = os.path.isdir(os.path.join(full, "code-kit"))
            if has_specs or has_codekit:
                projects.append({
                    "name": entry,
                    "root": full,
                    "has_specs": has_specs,
                    "has_codekit": has_codekit,
                    "is_current": full == CURRENT_PROJECT,
                })
    except Exception:
        pass

    # 按用户权限过滤
    if user and user.get("role") != "admin":
        allowed = set(user.get("project_ids", []))
        if allowed:
            projects = [p for p in projects if p["name"] in allowed]
        else:
            projects = []  # 普通用户未分配任何项目 = 无可见项目

    return projects


# 恢复上次项目
if os.path.exists(PROJECT_CONFIG_FILE):
    try:
        data = json.load(open(PROJECT_CONFIG_FILE))
        if os.path.isdir(data.get("project_root", "")):
            CURRENT_PROJECT = data["project_root"]
    except Exception:
        pass
