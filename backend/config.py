"""AgentFlow 后端配置."""
import os
import json
import secrets
import socket


def _env_list(name: str, default: str = "") -> list[str]:
    """逗号分隔的 env → 去空白列表（空串 = 空列表）。"""
    return [x.strip() for x in os.environ.get(name, default).split(",") if x.strip()]


def _env_bool(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in ("1", "true", "yes", "on")


HOST: str = os.environ.get("HOST", "127.0.0.1")
PORT: int = int(os.environ.get("PORT", "8000"))
SCAN_INTERVAL: int = int(os.environ.get("SCAN_INTERVAL", "5"))
CORS_ORIGIN: str = os.environ.get("CORS_ORIGIN", "http://localhost:5173")
PROJECT_ROOT: str = os.environ.get("PROJECT_ROOT", os.path.dirname(os.path.dirname(__file__)))

# ── 部署模式与可信代理（P0-3）──────────────────────────────
# localhost   = 仅回环地址可访问（旧行为，默认）
# lan         = 回环 + ALLOW_CIDRS 网段
# behind-proxy= 只有 TRUSTED_PROXY_IPS 里的反代可访问，客户端 IP 取 XFF 右起首个非可信地址
DEPLOY_MODE: str = os.environ.get("DEPLOY_MODE", "localhost").strip().lower()
TRUSTED_PROXY_IPS: list[str] = _env_list("TRUSTED_PROXY_IPS")
ALLOW_CIDRS: list[str] = _env_list("ALLOW_CIDRS")
# 反代已终结 TLS 时置 1：启用 Secure cookie / __Host- 前缀
TLS_TERMINATED: bool = _env_bool("TLS_TERMINATED")
# uvicorn 自身的 XFF 信任开关（本项目自行解析 XFF，此值只用于启动校验）
FORWARDED_ALLOW_IPS: str = os.environ.get("FORWARDED_ALLOW_IPS", "")

# ── 认证（P0-1）────────────────────────────────────────────
SESSION_IDLE_MINUTES: int = int(os.environ.get("SESSION_IDLE_MINUTES", "30"))
SESSION_ABSOLUTE_HOURS: int = int(os.environ.get("SESSION_ABSOLUTE_HOURS", "8"))
PAT_DEFAULT_EXPIRES_DAYS: int = int(os.environ.get("PAT_DEFAULT_EXPIRES_DAYS", "90"))
LOGIN_MAX_FAILURES: int = int(os.environ.get("LOGIN_MAX_FAILURES", "5"))
LOGIN_FAILURE_WINDOW_MINUTES: int = int(os.environ.get("LOGIN_FAILURE_WINDOW_MINUTES", "15"))
# X-User-Id 调试通道：三重 opt-in（env ∧ localhost ∧ admit 白名单），缺一即关闭
AUTH_DEBUG_HEADER_ENABLED: bool = _env_bool("AGENTFLOW_AUTH_DEBUG_HEADER")
AUTH_DEBUG_HEADER_ADMIT_USERS: list[str] = _env_list("AGENTFLOW_AUTH_DEBUG_ADMIT")

# ── 副本与单例循环（P1-7）──────────────────────────────────
# 每个副本一个稳定标识：显式 env 优先，否则 host:pid:随机后缀（进程重启即换）
INSTANCE_ID: str = os.environ.get("INSTANCE_ID") or (
    f"{socket.gethostname()}:{os.getpid()}:{secrets.token_hex(2)}"
)
# 单例循环租约 TTL：cron/reconcile 5s 一轮、runtime watcher 30s 一轮，默认 90s 留余量
CLUSTER_LEASE_TTL_SECONDS: int = int(os.environ.get("CLUSTER_LEASE_TTL_SECONDS", "90"))
# 队列任务租约：领取后多久没心跳就认为持有者失联、任务回队
QUEUE_LEASE_SECONDS: int = int(os.environ.get("QUEUE_LEASE_SECONDS", "60"))

# 项目隔离：每个项目有独立的 .specs/ 和配置
CURRENT_PROJECT: str = PROJECT_ROOT
PROJECT_CONFIG_FILE: str = os.path.join(os.path.dirname(__file__), "project_state.json")

# 项目内承载阶段提示词 / 模板 / 参考文档的目录名（相对项目根）
PROMPTS_DIR_NAME: str = os.environ.get("PROMPTS_DIR_NAME", "prompts")


def get_specs_dir() -> str:
    """获取当前项目的 .specs 目录（工作流产物根目录）."""
    return os.path.join(CURRENT_PROJECT, ".specs")


def get_prompts_dir() -> str:
    """获取当前项目的提示词目录（阶段提示词 / 模板 / 参考文档）."""
    return os.path.join(CURRENT_PROJECT, PROMPTS_DIR_NAME)


def set_current_project(root: str):
    global CURRENT_PROJECT
    CURRENT_PROJECT = root
    with open(PROJECT_CONFIG_FILE, "w") as f:
        json.dump({"project_root": root}, f)


def discover_projects(user: dict | None = None) -> list[dict]:
    """扫描父目录下所有包含 .specs/ 或提示词目录的项目.

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
            has_prompts = os.path.isdir(os.path.join(full, PROMPTS_DIR_NAME))
            if has_specs or has_prompts:
                projects.append({
                    "name": entry,
                    "root": full,
                    "has_specs": has_specs,
                    "has_prompts": has_prompts,
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
