"""告警服务 — 检测 Token 超限 / Agent 宕机 / 执行失败（P1-16：告警落表）。

原状：`AlertService.alerts` 是进程内 list（最多 500 条），重启即丢、多副本各存各的、
历史不可查。现在告警写 `alerts` 表：
- 去重查库（同 type + entity 的未确认告警不重复写），副本之间同一份去重口径；
- 确认（ack）落库并记 `acknowledged_at / acknowledged_by`；
- 不再做环形裁剪 —— 保留全部历史（按需由运维清理，别让「重启即丢」再来一次）。
"""
import datetime
import json
import threading
import time
import uuid
from typing import Optional

from database import SessionLocal
from models.agent import Agent
from models.alert import Alert as AlertRow
from models.metrics import SessionMetric


class Alert:
    """待写入的告警值对象（不落库、不共享状态）."""

    def __init__(self, alert_type: str, severity: str, title: str, message: str,
                 entity_type: str = "", entity_id: int = 0, metadata: dict | None = None):
        self.id = f"alert_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}"
        self.alert_type = alert_type  # token_exceeded, agent_dead, execution_failed
        self.severity = severity      # critical, warning, info
        self.title = title
        self.message = message
        self.entity_type = entity_type
        self.entity_id = entity_id
        self.metadata = metadata or {}
        self.timestamp = datetime.datetime.utcnow()

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "alert_type": self.alert_type,
            "severity": self.severity,
            "title": self.title,
            "message": self.message,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "metadata": self.metadata,
            "timestamp": self.timestamp.isoformat(),
            "acknowledged": False,
        }


class AlertService:
    """告警服务单例 — 周期性检测 + 告警落表."""

    _instance: Optional["AlertService"] = None
    _lock = threading.Lock()

    def __init__(self):
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._check_interval = 30  # 每 30 秒检测一次

    @classmethod
    def get_instance(cls) -> "AlertService":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    def start(self):
        """启动后台告警检测线程."""
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()
        print("[alert_service] 告警服务已启动（每30s检测，告警落表）")

    def stop(self):
        """停止后台告警检测."""
        self._running = False
        if self._thread:
            self._thread.join(timeout=5)

    def _run(self):
        """后台循环检测."""
        while self._running:
            try:
                self._check_all()
            except Exception as e:
                print(f"[alert_service] 检测异常: {e}")
            time.sleep(self._check_interval)

    def _check_all(self):
        """执行三种告警检测."""
        self._check_token_exceeded()
        self._check_agent_dead()
        self._check_execution_failed()

    # ── 检测 ────────────────────────────────────────────────

    def _has_open_alert(self, db, alert_type: str, entity_type: str, entity_id: int) -> bool:
        """同类型 + 同实体的未确认告警是否已存在（查库，副本共享口径）."""
        return db.query(AlertRow).filter(
            AlertRow.alert_type == alert_type,
            AlertRow.entity_type == entity_type,
            AlertRow.entity_id == entity_id,
            AlertRow.acknowledged == 0,
        ).first() is not None

    def _check_token_exceeded(self):
        """检测 Token 超限告警."""
        db = SessionLocal()
        try:
            for ag in db.query(Agent).all():
                if ag.token_hard_limit <= 0:
                    continue
                usage_pct = ag.total_tokens_used / ag.token_hard_limit * 100
                if usage_pct < 90:
                    continue
                if self._has_open_alert(db, "token_exceeded", "agent", ag.id):
                    continue
                self.add_alert(Alert(
                    alert_type="token_exceeded",
                    severity="critical" if usage_pct >= 95 else "warning",
                    title=f"Agent {ag.name} Token 用量告警",
                    message=(
                        f"Agent「{ag.name}」Token 用量已达 {usage_pct:.1f}%"
                        f"（{ag.total_tokens_used}/{ag.token_hard_limit}），请及时关注。"
                    ),
                    entity_type="agent",
                    entity_id=ag.id,
                    metadata={
                        "agent_name": ag.name,
                        "token_hard_limit": ag.token_hard_limit,
                        "total_tokens_used": ag.total_tokens_used,
                        "usage_percent": round(usage_pct, 1),
                    },
                ))
        finally:
            db.close()

    def _check_agent_dead(self):
        """检测 Agent 宕机告警（查询探针数据表）."""
        try:
            from models.agent_probe import AgentProbe

            db = SessionLocal()
            try:
                for ag in db.query(Agent).all():
                    latest_probe = db.query(AgentProbe).filter(
                        AgentProbe.agent_id == ag.id,
                    ).order_by(AgentProbe.created_at.desc()).first()
                    if not latest_probe or latest_probe.status not in ("dead", "unhealthy"):
                        continue
                    if self._has_open_alert(db, "agent_dead", "agent", ag.id):
                        continue
                    last_hb = latest_probe.created_at.isoformat() if latest_probe.created_at else ""
                    self.add_alert(Alert(
                        alert_type="agent_dead",
                        severity="critical",
                        title=f"Agent {ag.name} 宕机告警",
                        message=(
                            f"Agent「{ag.name}」探针状态异常：{latest_probe.status}，"
                            f"最后心跳：{last_hb}"
                        ),
                        entity_type="agent",
                        entity_id=ag.id,
                        metadata={
                            "agent_name": ag.name,
                            "probe_status": latest_probe.status,
                            "last_heartbeat": last_hb,
                        },
                    ))
            finally:
                db.close()
        except Exception:
            pass  # 探针表不可用时静默跳过

    def _check_execution_failed(self):
        """检测执行失败告警（最近 5 分钟错误率）."""
        db = SessionLocal()
        try:
            since = datetime.datetime.utcnow() - datetime.timedelta(minutes=5)
            recent = db.query(SessionMetric).filter(
                SessionMetric.timestamp >= since,
            ).all()
            if not recent:
                return
            total = len(recent)
            failed = sum(1 for s in recent if s.status == "error")
            if total < 5 or failed / total * 100 < 30:
                return
            for et in set(s.entity_type for s in recent if s.status == "error"):
                et_failed = sum(1 for s in recent if s.entity_type == et and s.status == "error")
                et_total = sum(1 for s in recent if s.entity_type == et)
                if et_total < 3 or et_failed / et_total < 0.3:
                    continue
                if self._has_open_alert(db, "execution_failed", et, 0):
                    continue
                self.add_alert(Alert(
                    alert_type="execution_failed",
                    severity="warning",
                    title=f"{et} 类型执行失败率过高",
                    message=(
                        f"最近 5 分钟内 {et} 类型执行失败率 "
                        f"{et_failed / et_total * 100:.1f}%（{et_failed}/{et_total}），请检查。"
                    ),
                    entity_type=et,
                    entity_id=0,
                    metadata={
                        "failed_count": et_failed,
                        "total_count": et_total,
                        "error_rate": round(et_failed / et_total * 100, 1),
                        "window_minutes": 5,
                    },
                ))
        finally:
            db.close()

    # ── 读写 ────────────────────────────────────────────────

    def add_alert(self, alert: Alert) -> bool:
        """写一条告警（同 type + title 的未确认告警去重）。返回是否真的写入."""
        db = SessionLocal()
        try:
            exists = db.query(AlertRow).filter(
                AlertRow.alert_type == alert.alert_type,
                AlertRow.title == alert.title,
                AlertRow.acknowledged == 0,
            ).first()
            if exists is not None:
                return False
            db.add(AlertRow(
                id=alert.id,
                alert_type=alert.alert_type,
                severity=alert.severity,
                title=alert.title,
                message=alert.message,
                entity_type=alert.entity_type,
                entity_id=alert.entity_id,
                metadata_json=json.dumps(alert.metadata, ensure_ascii=False),
                timestamp=alert.timestamp,
                acknowledged=0,
            ))
            db.commit()
            return True
        finally:
            db.close()

    def get_alerts(self, alert_type: str | None = None,
                   severity: str | None = None,
                   acknowledged: bool | None = None,
                   limit: int = 50) -> list[dict]:
        """查询告警列表（表里读，重启不丢）."""
        db = SessionLocal()
        try:
            q = db.query(AlertRow)
            if alert_type:
                q = q.filter(AlertRow.alert_type == alert_type)
            if severity:
                q = q.filter(AlertRow.severity == severity)
            if acknowledged is not None:
                q = q.filter(AlertRow.acknowledged == (1 if acknowledged else 0))
            rows = q.order_by(AlertRow.timestamp.desc()).limit(limit).all()
            return [r.to_dict() for r in rows]
        finally:
            db.close()

    def acknowledge(self, alert_id: str, by: str | None = None) -> bool:
        """确认单个告警."""
        db = SessionLocal()
        try:
            row = db.query(AlertRow).filter(AlertRow.id == alert_id).first()
            if row is None:
                return False
            if not row.acknowledged:
                row.acknowledged = 1
                row.acknowledged_at = datetime.datetime.utcnow()
                row.acknowledged_by = by
                db.commit()
            return True
        finally:
            db.close()

    def acknowledge_all(self, by: str | None = None) -> int:
        """确认所有未确认告警，返回本次确认条数."""
        db = SessionLocal()
        try:
            now = datetime.datetime.utcnow()
            count = db.query(AlertRow).filter(AlertRow.acknowledged == 0).update(
                {
                    "acknowledged": 1,
                    "acknowledged_at": now,
                    "acknowledged_by": by,
                },
                synchronize_session=False,
            )
            db.commit()
            return int(count or 0)
        finally:
            db.close()

    def get_unacknowledged_count(self) -> int:
        """未确认告警数量."""
        db = SessionLocal()
        try:
            return db.query(AlertRow).filter(AlertRow.acknowledged == 0).count()
        finally:
            db.close()


# 全局单例
alert_service = AlertService.get_instance()
