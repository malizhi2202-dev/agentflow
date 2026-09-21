"""告警 API — GET /api/alerts + 确认."""
from fastapi import APIRouter, Query, Request

from services.alert_service import alert_service

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("")
async def list_alerts(
    alert_type: str | None = Query(default=None, description="过滤告警类型: token_exceeded, agent_dead, execution_failed"),
    severity: str | None = Query(default=None, description="过滤严重级别: critical, warning, info"),
    acknowledged: bool | None = Query(default=None, description="是否已确认"),
    limit: int = Query(default=50, le=200),
):
    """获取告警列表."""
    return {
        "alerts": alert_service.get_alerts(
            alert_type=alert_type,
            severity=severity,
            acknowledged=acknowledged,
            limit=limit,
        ),
        "unacknowledged_count": alert_service.get_unacknowledged_count(),
    }


@router.post("/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str):
    """确认单个告警."""
    success = alert_service.acknowledge(alert_id)
    if not success:
        return {"error": "alert not found", "alert_id": alert_id}
    return {"status": "acknowledged", "alert_id": alert_id}


@router.post("/acknowledge-all")
async def acknowledge_all():
    """确认所有告警."""
    count = alert_service.acknowledge_all()
    return {"status": "ok", "acknowledged_count": count}


@router.get("/count")
async def alert_count():
    """获取未确认告警数量（用于 badge）."""
    return {"unacknowledged": alert_service.get_unacknowledged_count()}
