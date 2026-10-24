"""Prometheus 文本格式指标（P2-4 A 档）— 直读现表，不建第二套存储。

设计口径（§1.6.3 P2-4）：
- **前置是修产生端**：`trace_spans` 此前零写入，现在由 `runtime_tracer` 写父子 span；
- A 档 = `/metrics` 只读直读现表（`session_metrics` / `trace_spans` / `alerts` /
  `work_items` / 队列），带 env 门（`METRICS_ENDPOINT_ENABLED`），默认关闭；
- B 档 OTLP 导出为可选、C 档语义版本化延后——本文件不做，避免提前冻结契约。

安全：`/metrics` 与其它接口一样要过身份中间件（cookie 或 Bearer PAT），
并且只有开启开关时才存在；未开启一律 404（不给探测面）。
"""
import config
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models.alert import Alert
from models.collab import WorkItem
from models.metrics import SessionMetric
from models.orchestration import TraceSpan
from services import cluster_store

router = APIRouter(tags=["metrics"])

CONTENT_TYPE = "text/plain; version=0.0.4; charset=utf-8"


def _esc(value: str) -> str:
    return str(value).replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")


def render_metrics(db: Session) -> str:
    """把现表聚合成 Prometheus 文本（无缓存、无副作用）。"""
    lines: list[str] = []

    def metric(name: str, mtype: str, help_text: str, samples: list[tuple[str, float]]):
        lines.append(f"# HELP {name} {help_text}")
        lines.append(f"# TYPE {name} {mtype}")
        for labels, value in samples:
            lines.append(f"{name}{labels} {value}")

    # 模型调用次数（按实体类型 × 状态）
    rows = db.query(
        SessionMetric.entity_type, SessionMetric.status, func.count(SessionMetric.id),
    ).group_by(SessionMetric.entity_type, SessionMetric.status).all()
    metric(
        "agentflow_model_calls_total", "counter", "模型调用次数（按实体类型与状态）",
        [(f'{{entity_type="{_esc(et)}",status="{_esc(st or "unknown")}"}}', n)
         for et, st, n in rows],
    )

    # token 用量（拆分 input/output，与 session_metrics 列一致）
    rows = db.query(
        SessionMetric.entity_type,
        func.coalesce(func.sum(SessionMetric.prompt_tokens), 0),
        func.coalesce(func.sum(SessionMetric.completion_tokens), 0),
    ).group_by(SessionMetric.entity_type).all()
    metric(
        "agentflow_tokens_total", "counter", "token 用量（按实体类型与方向）",
        [(f'{{entity_type="{_esc(et)}",direction="{d}"}}', v)
         for et, p, c in rows for d, v in (("input", p), ("output", c))],
    )

    # span 产生量（证明产生端真的在写）
    rows = db.query(
        TraceSpan.span_type, TraceSpan.status, func.count(TraceSpan.id),
    ).group_by(TraceSpan.span_type, TraceSpan.status).all()
    metric(
        "agentflow_trace_spans_total", "counter", "trace span 条数（按类型与状态）",
        [(f'{{span_type="{_esc(st or "unknown")}",status="{_esc(s or "unknown")}"}}', n)
         for st, s, n in rows],
    )

    # 队列与告警
    stats = cluster_store.queue_stats(db=db)
    metric("agentflow_queue_depth", "gauge", "调度队列深度（queued+leased）",
           [("", stats["total"])])
    metric("agentflow_queue_leased", "gauge", "已租约（执行中）任务数",
           [("", stats["leased"])])
    unacked = db.query(func.count(Alert.id)).filter(Alert.acknowledged == 0).scalar() or 0
    metric("agentflow_alerts_unacknowledged", "gauge", "未确认告警数", [("", unacked)])

    # 任务状态分布
    rows = db.query(WorkItem.status, func.count(WorkItem.id)).group_by(WorkItem.status).all()
    metric(
        "agentflow_tasks_total", "gauge", "任务数（按状态）",
        [(f'{{status="{_esc(st)}"}}', n) for st, n in rows],
    )
    return "\n".join(lines) + "\n"


@router.get("/metrics", include_in_schema=False)
def prometheus_metrics(db: Session = Depends(get_db)):
    """Prometheus 抓取端点（需开启 METRICS_ENDPOINT_ENABLED，且必须带身份）。"""
    if not config.METRICS_ENDPOINT_ENABLED:
        raise HTTPException(status_code=404, detail="metrics endpoint disabled")
    from fastapi import Response

    return Response(content=render_metrics(db), media_type=CONTENT_TYPE)
