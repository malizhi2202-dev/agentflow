"""监控聚合服务 — MySQL 明细 + Redis 5min bucket."""
import json
import time
from sqlalchemy.orm import Session
from models.metrics import MetricRaw


def record_metric(db: Session, entity_type: str, entity_id: int, owner_id: str, model_name: str = "", token_count: int = 0, tool_hit_count: int = 0, execution_time_ms: int = 0, status: str = "success"):
    m = MetricRaw(entity_type=entity_type, entity_id=entity_id, owner_id=owner_id, model_name=model_name, token_count=token_count, tool_hit_count=tool_hit_count, execution_time_ms=execution_time_ms, status=status)
    db.add(m)
    db.commit()
    # Redis 聚合（如可用）
    try:
        import redis
        r = redis.Redis(host='127.0.0.1', port=6379, db=0, socket_connect_timeout=1)
        bucket_ts = int(time.time()) // 300 * 300
        key = f"metrics:{entity_type}:{entity_id}:{bucket_ts}"
        r.zincrby(key, token_count, f"token:{model_name}")
        r.zincrby(key, tool_hit_count, f"hits:{model_name}")
        r.expire(key, 3600)
    except Exception:
        pass


def get_metrics(db: Session, entity_type: str, entity_id: int, minutes: int = 60) -> dict:
    from datetime import datetime, timedelta
    since = datetime.utcnow() - timedelta(minutes=minutes)
    rows = db.query(MetricRaw).filter(MetricRaw.entity_type == entity_type, MetricRaw.entity_id == entity_id, MetricRaw.timestamp >= since).order_by(MetricRaw.timestamp.asc()).all()
    buckets = {}
    model_totals: dict[str, int] = {}
    for r in rows:
        ts = int(r.timestamp.timestamp()) // 300 * 300
        k = str(ts)
        if k not in buckets:
            buckets[k] = {"token_count": 0, "tool_hit_count": 0, "execution_time_ms": 0, "count": 0}
        buckets[k]["token_count"] += r.token_count
        buckets[k]["tool_hit_count"] += r.tool_hit_count
        buckets[k]["execution_time_ms"] += r.execution_time_ms
        buckets[k]["count"] += 1
        if r.model_name:
            model_totals[r.model_name] = model_totals.get(r.model_name, 0) + r.token_count
    return {"buckets": [{"ts": int(k), **v} for k, v in sorted(buckets.items())], "model_totals": model_totals, "total_tokens": sum(m.token_count for m in rows), "total_hits": sum(m.tool_hit_count for m in rows), "total_time_ms": sum(m.execution_time_ms for m in rows)}


def get_global_metrics(db: Session, minutes: int = 60) -> dict:
    from datetime import datetime, timedelta
    since = datetime.utcnow() - timedelta(minutes=minutes)
    rows = db.query(MetricRaw).filter(MetricRaw.timestamp >= since).all()
    by_user: dict[str, int] = {}
    by_entity: dict[str, int] = {}
    by_model: dict[str, int] = {}
    for r in rows:
        by_user[r.owner_id] = by_user.get(r.owner_id, 0) + r.token_count
        by_entity[r.entity_type] = by_entity.get(r.entity_type, 0) + r.token_count
        if r.model_name:
            by_model[r.model_name] = by_model.get(r.model_name, 0) + r.token_count
    return {"by_user": by_user, "by_entity": by_entity, "by_model": by_model, "total_tokens": sum(r.token_count for r in rows)}
