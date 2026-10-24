"""环境参谋：本机画像 + 分层部署方案（P4 · 原型 6.25）。

口径（原型页首消歧）：本页 L1/L2/L3 = **部署方案档位**（本机/跨平台/云），
不是数据出域分级 D0-D3，也不是记忆四层 L0-L3。

诚实边界：画像只读本机信息（默认不上传）；平台**零执行**——
给出的命令是「可复制」的指引，不代执行、不代装引擎。
"""
from __future__ import annotations

import os
import platform
import shutil


def _mem_total_gb() -> float:
    try:
        with open("/proc/meminfo", encoding="utf-8") as f:
            for line in f:
                if line.startswith("MemTotal:"):
                    kb = int(line.split()[1])
                    return round(kb / 1024 / 1024, 1)
    except Exception:  # noqa: BLE001 — 读不到就返回 0（画像标不完整，不猜）
        pass
    return 0.0


def probe() -> dict:
    """本机画像（只读）。任何一项读不到就如实标 False/0，不补默认值。"""
    total, used, free = shutil.disk_usage(os.path.expanduser("~"))
    return {
        "platform": f"{platform.system()} {platform.release()}",
        "arch": platform.machine(),
        "cpu_count": os.cpu_count() or 0,
        "mem_total_gb": _mem_total_gb(),
        "disk_free_gb": round(free / 1024 ** 3, 1),
        "accelerator": {
            "cuda": os.path.exists("/usr/local/cuda"),
            "metal": platform.system() == "Darwin",
            "vulkan": shutil.which("vulkaninfo") is not None,
        },
        "note": "画像只读本机信息，默认不上传；平台零执行（命令可复制，不代跑）",
    }


def plans(profile: dict) -> list[dict]:
    """按画像给分层方案。阈值写在代码里并回显，避免「推荐了但说不清为什么」。"""
    mem = profile.get("mem_total_gb") or 0
    disk = profile.get("disk_free_gb") or 0
    acc = profile.get("accelerator") or {}
    local_ok = mem >= 16 and disk >= 20
    gpu_ok = bool(acc.get("cuda") or acc.get("metal"))
    out = []
    if local_ok:
        engine = "MLX" if acc.get("metal") else "llama.cpp（CPU/CUDA 后端）"
        out.append({
            "layer": "L1 · 本机最优", "engine": engine,
            "model": "Qwen3.5-2B · Q4_K_M（1.3GB）",
            "ability": {"inference": True, "finetune": gpu_ok},
            "disk_gb": 1.3, "latency_hint": "~80–120ms/决策（原型量级，本机未实测）",
            "why": f"统一内存 {mem}GB ≥ 16GB 且磁盘余 {disk}GB ≥ 20GB",
            "steps": ["安装引擎（指南 · 不代执行）", "⧉ 复制下载命令（含 sha256）", "⧉ 端点配置片段 + 校验命令"],
        })
    out.append({
        "layer": "L2 · 跨平台稳妥", "engine": "llama.cpp",
        "model": "Qwen3.5-2B · Q8_0（2.1GB）",
        "ability": {"inference": True, "finetune": False},
        "disk_gb": 2.1, "latency_hint": "~110–160ms/决策（原型量级）",
        "why": "CPU 也能跑；微调走 L1/L3",
        "steps": ["安装 llama.cpp", "⧉ 下载 GGUF（sha256）", "⧉ 启动参数模板"],
    })
    out.append({
        "layer": "L3 · 云", "engine": "云 API（或自建远端）",
        "model": "同族云端模型", "ability": {"inference": True, "finetune": False},
        "disk_gb": 0, "latency_hint": "受网络影响",
        "why": "本机 mem/disk 不满足或想省本地资源时", "steps": ["填写端点与凭据（走凭据管理，不写进本页）"],
    })
    return out
