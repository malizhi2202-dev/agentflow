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

# ── 执行隔离契约（P2-3）──────────────────────────────────
# 本版只实现 inproc；选未实现档位 = 启动失败（fail-closed，不静默降级）
EXECUTION_TIER: str = os.environ.get("EXECUTION_TIER", "inproc").strip().lower()
EXECUTION_TTL_SECONDS: int = int(os.environ.get("EXECUTION_TTL_SECONDS", "300"))
EXECUTION_RETAIN: bool = _env_bool("EXECUTION_RETAIN")
EXECUTION_EGRESS_ALLOW: list[str] = _env_list("EXECUTION_EGRESS_ALLOW")

# ── 可观测（P2-4 A 档）────────────────────────────────────
# /metrics 直读现表（不做第二套存储）；默认关闭，显式开启才暴露
METRICS_ENDPOINT_ENABLED: bool = _env_bool("METRICS_ENDPOINT_ENABLED")

# ── RSI 适配器（波 8 收口）─────────────────────────────────
# 影子重放的**真实** judge：默认全空 = 未配置 → 端点拒绝（fail-closed），不偷偷花钱。
RSI_JUDGE_PROVIDER: str = os.environ.get("RSI_JUDGE_PROVIDER", "").strip()
RSI_JUDGE_MODEL: str = os.environ.get("RSI_JUDGE_MODEL", "").strip()
RSI_JUDGE_API_KEY: str = os.environ.get("RSI_JUDGE_API_KEY", "").strip()
# 每次作业最多调用次数（预算帽）；0 = 禁用
RSI_JUDGE_MAX_CALLS: int = int(os.environ.get("RSI_JUDGE_MAX_CALLS", "0") or 0)
# ── 运行时执行（v21 T-02）：把 Agent 的 LLM 调用委托给本机 CLI 运行时 ──────
# 默认关闭（fail-closed）：不配置就仍走进程内 provider，绝不静默换执行体。
RUNTIME_EXEC_ENABLED: bool = _env_bool("RUNTIME_EXEC_ENABLED")
RUNTIME_EXEC_TIMEOUT_SECONDS: int = int(os.environ.get("RUNTIME_EXEC_TIMEOUT_SECONDS", "180") or 180)
# 每个运行时一条命令模板（{prompt} 由平台替换成单个参数，不经 shell）
RUNTIME_CMD_TEMPLATES: dict[str, str] = {
    "hermes": os.environ.get(
        "RUNTIME_CMD_HERMES",
        "/home/malizhi/.hermes/hermes-agent/venv/bin/hermes -z {prompt}",
    ).strip(),
    "dsh": os.environ.get(
        "RUNTIME_CMD_DSH",
        f"node {os.environ.get('RSI_CLI_DSH_BIN', '/home/malizhi/ai/deepseek-harness/apps/cli/lib/bin.js')}"
        " --profile headless {prompt}",
    ).strip(),
    # codex CLI 本机未安装 → 默认空模板 = fail-closed（挂上 CLI 后配 RUNTIME_CMD_CODEX 即启用）
    "codex": os.environ.get("RUNTIME_CMD_CODEX", "").strip(),
}

# ── CLI 模型通道（用本地已部署的 hermes / dsh CLI 当 provider）──────────
# 用途：试运行/本地无 API key 时，直接把 CLI 当模型（judge / L0 抽取都能用）。
# 安全：**不经过 shell**（argv 列表 + shlex 解析），prompt 作为单个参数传入；超时可配。
RSI_CLI_PROVIDER: str = os.environ.get("RSI_CLI_PROVIDER", "dsh").strip().lower()  # dsh | hermes
RSI_CLI_TIMEOUT_SECONDS: int = int(os.environ.get("RSI_CLI_TIMEOUT_SECONDS", "180") or 180)
RSI_CLI_NODE: str = os.environ.get("RSI_CLI_NODE", "node").strip()
RSI_CLI_DSH_BIN: str = os.environ.get(
    "RSI_CLI_DSH_BIN", "/home/malizhi/ai/deepseek-harness/apps/cli/lib/bin.js"
).strip()
RSI_CLI_DSH_PROFILE: str = os.environ.get("RSI_CLI_DSH_PROFILE", "headless").strip()
RSI_CLI_HERMES_BIN: str = os.environ.get(
    "RSI_CLI_HERMES_BIN", "/home/malizhi/.hermes/hermes-agent/venv/bin/hermes"
).strip()

# L0 抽取器用的本地/远端模型（默认空 = 不抽取，只 dry-run 统计）
RSI_EXTRACTOR_PROVIDER: str = os.environ.get("RSI_EXTRACTOR_PROVIDER", "").strip()
RSI_EXTRACTOR_MODEL: str = os.environ.get("RSI_EXTRACTOR_MODEL", "").strip()
RSI_EXTRACTOR_API_KEY: str = os.environ.get("RSI_EXTRACTOR_API_KEY", "").strip()
# L0 → L1 定时抽取：0 = 关闭（默认）；>0 时单例循环按该间隔跑
L0_EXTRACT_INTERVAL_SECONDS: int = int(os.environ.get("L0_EXTRACT_INTERVAL_SECONDS", "0") or 0)
L0_EXTRACT_MAX_CONVERSATIONS: int = int(os.environ.get("L0_EXTRACT_MAX_CONVERSATIONS", "5") or 5)

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
