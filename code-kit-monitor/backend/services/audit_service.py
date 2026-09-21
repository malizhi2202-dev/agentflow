"""审计日志服务 — JSONL 追加写入."""
import json
import os
import time


def _audit_file() -> str:
    from config import PROJECT_ROOT
    return os.path.join(os.path.dirname(PROJECT_ROOT), "audit.jsonl")


def log_audit(user_id: str, user_name: str, action: str, target: str, target_type: str, detail: str, ip: str, result: str = "success"):
    entry = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "user_id": user_id,
        "user_name": user_name,
        "action": action,
        "target": str(target),
        "target_type": target_type,
        "detail": detail,
        "ip": ip,
        "result": result,
    }
    path = _audit_file()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "a") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    # 通知探针系统
    try:
        from services.agent_probe_service import _notify_activity
        _notify_activity(target_type, int(target) if target.isdigit() else 0,
                        user_id, "success" if result == "success" else "failed",
                        action=action)
    except Exception:
        pass
