#!/usr/bin/env python3
"""AgentFlow 运行时 daemon（v22 · PRODUCT-DESIGN §6.28）。

每台要接入的机器跑一个：扫本机 PATH / 已知位置探测外部 AI 编码 CLI，
把「机器 × CLI × 协议族」上报给平台注册表，15s 一次心跳。

用法：
    python scripts/runtime-daemon.py --once --dry-run     # 只看探到什么，不上报
    python scripts/runtime-daemon.py --once               # 上报一次
    python scripts/runtime-daemon.py                      # 常驻（15s 心跳）
    python scripts/runtime-daemon.py --api http://192.168.36.129:8000 --token xxx

环境变量：
    AF_DAEMON_TOKEN      daemon 机器级 token（必需；平台侧 AF_DAEMON_TOKEN 必须同值）
    AF_DAEMON_API        平台地址，默认 http://127.0.0.1:8000
    AF_RUNTIME_CLI_<CLI>_BIN   覆盖某个 CLI 的可执行体（例如 AF_RUNTIME_CLI_DSH_BIN=/usr/local/bin/dsh）

**边界（与平台契约一致）**：
- 只读 `--version` / `--list-models` 的 stdout；**不上报任何凭据**（账号/OAuth/Key 留本机）；
- 探测不到 / 解析不出 → 显式记录原因，不猜、不假装空目录 = 没模型；
- machine_id 落 `~/.agentflow/daemon.json` 复用，daemon 重启只更新既有记录、不新建。
"""
from __future__ import annotations

import argparse
import json
import os
import platform
import re
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request

HOME = os.path.expanduser("~")
STATE_DIR = os.path.join(HOME, ".agentflow")
STATE_FILE = os.path.join(STATE_DIR, "daemon.json")
PROBE_TIMEOUT = 8
MODEL_CACHE_SECONDS = 600
DEFAULT_INTERVAL = 15

# 探测名单：cli → (协议族, 已知安装位置候选)
PROBES: dict[str, tuple[str, list[list[str]]]] = {
    "hermes": ("stdio", [[os.path.join(HOME, ".hermes/hermes-agent/venv/bin/hermes")]]),
    "dsh": ("stdio", [["node", os.path.join(HOME, "ai/deepseek-harness/apps/cli/lib/bin.js")]]),
    "codex": ("exec", []),
    "claude": ("exec", []),
    "cursor-agent": ("jsonrpc", []),
    "qwen": ("exec", []),
    "mcode": ("exec", []),
    "copilot": ("jsonrpc", []),
}


def _log(msg: str) -> None:
    print(f"[daemon] {msg}", flush=True)


def _state() -> dict:
    try:
        with open(STATE_FILE, encoding="utf-8") as fh:
            return json.load(fh)
    except Exception:  # noqa: BLE001 — 无状态文件/坏文件一律重建
        return {}


def _save_state(state: dict) -> None:
    os.makedirs(STATE_DIR, exist_ok=True)
    tmp = STATE_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(state, fh, ensure_ascii=False, indent=2)
    os.replace(tmp, STATE_FILE)  # 原子替换：写坏了不留半截文件


def machine_identity(state: dict) -> dict:
    """稳定 machine_id：hostname#<8hex>，落盘复用（重启不新建记录 → AC-1）。"""
    if not state.get("machine_id"):
        state["machine_id"] = f"{socket.gethostname()}#{os.urandom(4).hex()}"
        state["machine_name"] = socket.gethostname()
        _save_state(state)
    return {"id": state["machine_id"], "name": state.get("machine_name") or socket.gethostname()}


def _run(argv: list[str]) -> tuple[str, str]:
    """跑一次探测命令：返回 (stdout, error)。非零退出/超时/不可执行都落 error。"""
    env = dict(os.environ, NO_COLOR="1", TERM="dumb")
    try:
        proc = subprocess.run(argv, capture_output=True, text=True, timeout=PROBE_TIMEOUT, env=env)
    except FileNotFoundError:
        return "", "命令不存在"
    except subprocess.TimeoutExpired:
        return "", f"超时（>{PROBE_TIMEOUT}s）"
    except Exception as exc:  # noqa: BLE001
        return "", f"探测失败：{type(exc).__name__}"
    if proc.returncode != 0:
        err = (proc.stderr or proc.stdout or "").strip().splitlines()
        return "", (err[0][:120] if err else f"退出码 {proc.returncode}")
    return proc.stdout, ""


def resolve(cli: str, known: list[list[str]]) -> tuple[list[str] | None, str]:
    """三处来源（DESIGN D4）：env 覆盖 → PATH → 已知安装位置。返回 (argv, source)。"""
    env_key = f"AF_RUNTIME_CLI_{cli.upper().replace('-', '_')}_BIN"
    override = os.environ.get(env_key, "").strip()
    if override:
        return (override.split() if " " in override else [override]), "env"
    from shutil import which

    found = which(cli)
    if found:
        return [found], "path"
    for argv in known:
        if os.path.exists(argv[-1]):
            return argv, "known"
    return None, ""


def _parse_models(stdout: str) -> list[str]:
    """把 `--list-models` 输出解析成模型名数组：只收「看起来是 id」的行，去重保序。"""
    out: list[str] = []
    for line in stdout.splitlines():
        s = line.strip().strip("-*•").strip()
        if not s or " " in s and "/" not in s:
            continue
        token = s.split()[0]
        if not token or token[0].isupper() and token.isalpha():
            continue                                            # 跳过 Available / Models 这类表头
        if token.endswith(":"):
            continue                                            # 跳过 "Available:" 这类带冒号的表头
        if token not in out:
            out.append(token[:120])
    return out[:50]


# ── 模型目录：`--list-models` 不成立时的兜底 ────────────────────────────
# 本机实测两个 CLI 都**没有** `--list-models`（hermes 报 argparse usage、dsh 报
# `--profile <name> is required`），所以模型目录只能读运行时**自己**的来源：
#   hermes → 它自己 `hermes model --refresh` 落盘的 provider 模型缓存
#   dsh    → 它自己的组合配置里 `agent-default-model` 段（与平台执行模板同一 profile）
# 解析函数都是纯函数（便于单测），IO 只在 `_fallback_models` 里做。
HERMES_CACHE_FILE = os.path.join(HOME, ".hermes", "provider_models_cache.json")
# 与 backend/config.py 的 RUNTIME_CMD_DSH 模板保持同一 profile：探的必须是**真跑时**用的那份配置
DSH_PROFILE = (os.environ.get("AF_RUNTIME_DSH_PROFILE") or "headless").strip() or "headless"
PROVIDER_RE = re.compile(r"'provider'\s*:\s*'([^']+)'")
DSH_PROVIDER_RE = re.compile(r"^\s*provider:\s*(\S+)\s*$")
DSH_MODEL_RE = re.compile(r"^\s*model:\s*(\S+)\s*$")


def _models_from_hermes_cache(cache, provider: str | None) -> list[str]:
    """从 hermes 的 provider 模型缓存里拼 `provider/model`。

    只取默认 provider（`hermes config show` 里那一个）；默认值不认识时退回全部 provider。
    非字符串/空项跳过，去重保序，上限 50（与注册表服务端的规范化口径一致）。
    """
    if not isinstance(cache, dict):
        return []
    names = [k for k, v in cache.items() if isinstance(v, dict)]
    if provider and provider in names:
        names = [provider]
    out: list[str] = []
    for name in names:
        models = (cache.get(name) or {}).get("models")
        if not isinstance(models, list):
            continue
        for m in models:
            if not isinstance(m, str) or not m.strip():
                continue
            item = f"{name}/{m.strip()}"[:120]
            if item not in out:
                out.append(item)
    return out[:50]


def provider_from_hermes_config(text: str) -> str | None:
    """从 `hermes config show` 的 Model 行取默认 provider（Python dict 字面量，只认这一个键）。

    格式不认识就返回 None（由调用方退回全部 provider），不猜。
    """
    for line in (text or "").splitlines():
        if "'provider'" not in line:
            continue
        m = PROVIDER_RE.search(line)
        if m:
            return m.group(1).strip() or None
    return None


def models_from_dsh_dump(text: str) -> list[str]:
    """从 `dsh --profile <p> --dump-config` 的 `agent-default-model` 段取 `provider/model`。

    dsh headless 没有 `--model` 参数（实测 `dsh --profile headless --help` 只有 -h），
    所以**一个**默认模型就是它当下可作用的全部模型——不编造更多。
    """
    lines = (text or "").splitlines()
    start = None
    for i, line in enumerate(lines):
        if line.strip() == "- id: agent-default-model":
            start = i
            break
    if start is None:
        return []
    provider = model = None
    for line in lines[start + 1:start + 12]:
        stripped = line.strip()
        if stripped.startswith("- id:") and provider is None and model is None:
            break                      # 已经走完这一段（下一行插件块开始）
        if provider is None:
            m = DSH_PROVIDER_RE.match(line)
            if m:
                provider = m.group(1).strip("'\"")
                continue
        if model is None:
            m = DSH_MODEL_RE.match(line)
            if m:
                model = m.group(1).strip("'\"")
    if not model:
        return []
    return [f"{provider or 'runtime'}/{model}"][:1]


def _fallback_models(cli: str, argv: list[str]) -> tuple[list[str], str]:
    """`--list-models` 不可用时的兜底：返回 (models, error)。

    读到了 → error 为空（这是「读到了」，不该写 models_error）；读不到 → error 写真实原因。
    """
    if cli == "hermes":
        try:
            with open(HERMES_CACHE_FILE, encoding="utf-8") as fh:
                cache = json.load(fh)
        except FileNotFoundError:
            return [], f"无模型缓存（{HERMES_CACHE_FILE}），且 hermes 不支持 --list-models"
        except Exception as exc:  # noqa: BLE001 — 坏缓存按读不到处理，不抛
            return [], f"hermes 模型缓存读取失败：{type(exc).__name__}"
        cfg_out, cfg_err = _run(argv + ["config", "show"])
        models = _models_from_hermes_cache(cache, provider_from_hermes_config(cfg_out))
        if models:
            return models, ""
        return [], (f"hermes 模型缓存里没有默认 provider 的模型（config show: {cfg_err or 'ok'}）"[:200])
    if cli == "dsh":
        out, err = _run(argv + ["--profile", DSH_PROFILE, "--dump-config"])
        if err:
            return [], f"dsh --dump-config 失败：{err}"
        models = models_from_dsh_dump(out)
        if models:
            return models, ""
        return [], f"dsh 组合配置（profile={DSH_PROFILE}）里没有 agent-default-model 段"
    return [], f"{cli} 不支持 --list-models，且没有已知的模型来源"


def probe_one(cli: str, state: dict, refresh_models: bool) -> dict | None:
    protocol, known = PROBES[cli]
    argv, source = resolve(cli, known)
    if not argv:
        return None
    version_out, version_err = _run(argv + ["--version"])
    version = (version_out.strip().splitlines() or [""])[0][:64] if version_out else ""

    cache = state.setdefault("models_cache", {}).get(cli) or {}
    fresh = (time.time() - float(cache.get("at") or 0)) < MODEL_CACHE_SECONDS
    if cache and fresh and not refresh_models:
        models, models_error, capabilities = cache.get("models") or [], cache.get("error", ""), cache.get("caps") or []
    else:
        out, err = _run(argv + ["--list-models"])
        models = _parse_models(out) if not err else []
        models_error = err
        if not models:
            # 兜底读运行时自己的模型来源；读到了就不该再报「不可读」
            fb_models, fb_error = _fallback_models(cli, argv)
            if fb_models:
                models, models_error = fb_models, ""
            elif fb_error:
                models_error = fb_error
        capabilities = ["model_list"] if models else []
        state["models_cache"][cli] = {"at": time.time(), "models": models,
                                      "error": models_error, "caps": capabilities}

    _save_state(state)   # 每轮都落：machine_id / 模型缓存都要在重启后复用
    item = {
        "cli": cli,
        "protocol_family": protocol,
        "binary_path": " ".join(argv)[:512],
        "source_file": source,
        "version": version or (version_err[:64] if version_err else ""),
        "models": models,
        "capabilities": capabilities,
    }
    if models_error:
        item["models_error"] = models_error[:200]
    return item


def collect(state: dict, refresh_models: bool = False) -> list[dict]:
    found = []
    for cli in PROBES:
        item = probe_one(cli, state, refresh_models)
        if item:
            found.append(item)
    return found


def report(api: str, token: str, machine: dict, runtimes: list[dict], dry_run: bool) -> int:
    body = {"machine": machine, "runtimes": runtimes}
    if dry_run:
        _log("dry-run，不上报：" + json.dumps(body, ensure_ascii=False))
        return 0
    req = urllib.request.Request(
        api.rstrip("/") + "/api/daemon/report",
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json", "X-Daemon-Token": token},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            _log(f"上报成功：registered={data.get('registered')} machine={data.get('machine_id')}")
            return 0
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")[:200]
        _log(f"上报被拒 HTTP {exc.code}：{detail}")
        return 2
    except Exception as exc:  # noqa: BLE001 — 网络问题不退出常驻循环
        _log(f"上报失败：{type(exc).__name__}: {exc}")
        return 1


def main() -> int:
    ap = argparse.ArgumentParser(description="AgentFlow 运行时 daemon")
    ap.add_argument("--api", default=os.environ.get("AF_DAEMON_API", "http://127.0.0.1:8000"))
    ap.add_argument("--token", default=os.environ.get("AF_DAEMON_TOKEN", ""))
    ap.add_argument("--interval", type=int, default=DEFAULT_INTERVAL)
    ap.add_argument("--once", action="store_true", help="只上报一次就退出")
    ap.add_argument("--dry-run", action="store_true", help="只打印探测结果，不上报")
    ap.add_argument("--refresh-models", action="store_true", help="忽略 10min 模型缓存，重新探测")
    args = ap.parse_args()

    state = _state()
    machine = machine_identity(state)
    if not args.dry_run and not args.token:
        print("✖ 缺 daemon token：设 AF_DAEMON_TOKEN 或 --token（平台侧必须同值）", file=sys.stderr)
        return 3

    runtimes = collect(state, args.refresh_models)
    _log(f"探测到 {len(runtimes)} 个运行时：" + ", ".join(
        f"{r['cli']}({r['version'] or '版本未知'})" for r in runtimes) or "（无）")
    if args.once or args.dry_run:
        return report(args.api, args.token, machine, runtimes, args.dry_run)

    backoff = 1
    while True:
        rc = report(args.api, args.token, machine, runtimes, False)
        if rc == 0:
            backoff = 1
            runtimes = collect(state)          # 每轮重探（模型目录走 10min 缓存）
        else:
            backoff = min(backoff * 2, args.interval)
            _log(f"{backoff}s 后重试")
        time.sleep(backoff if rc else args.interval)


if __name__ == "__main__":
    raise SystemExit(main())
