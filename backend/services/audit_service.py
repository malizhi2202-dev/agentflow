"""审计日志服务 — JSONL 追加写入."""
import json
import os
import time


def _audit_file() -> str:
    """审计落盘路径**单一来源**在 auth（轮转/写入也在那边）；这里不再自己算一遍。"""
    import auth
    return auth._audit_file()


def _write_db(entry: dict) -> bool:
    """写 `audit_log` 表；表不可用返回 False（文件仍是有效地兜底，不阻断业务）。"""
    try:
        from database import SessionLocal
        from models.user import AuditLog
        s = SessionLocal()
        try:
            s.add(AuditLog(
                timestamp=entry.get("timestamp", ""),
                user_id=entry.get("user_id", ""),
                user_name=entry.get("user_name", ""),
                action=entry.get("action", ""),
                target=str(entry.get("target", "")),
                target_type=entry.get("target_type", ""),
                detail=str(entry.get("detail", "")),
                ip=entry.get("ip", ""),
                result=entry.get("result", "success"),
            ))
            s.commit()
            return True
        finally:
            s.close()
    except Exception:  # noqa: BLE001 — 审计落表失败不阻断业务（文件仍有记录）
        return False


def read_rows(limit: int = 200, user_id: str | None = None, action: str | None = None,
              days: int | None = None) -> list[dict] | None:
    """从表读审计（最新在前）；表不可用返回 None。"""
    try:
        import datetime as _dt
        from database import SessionLocal
        from models.user import AuditLog
        s = SessionLocal()
        try:
            q = s.query(AuditLog)
            if user_id:
                q = q.filter(AuditLog.user_id == user_id)
            if action:
                q = q.filter(AuditLog.action == action)
            if days:
                cutoff = (_dt.datetime.now() - _dt.timedelta(days=days)).isoformat()
                q = q.filter(AuditLog.timestamp >= cutoff)
            rows = q.order_by(AuditLog.id.desc()).limit(limit).all()
            return [r.to_dict() for r in rows]
        finally:
            s.close()
    except Exception:  # noqa: BLE001
        return None


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
    _write_db(entry)          # 表化后以表为查询权威（T-07）
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
