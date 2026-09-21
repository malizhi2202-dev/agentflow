"""告警服务 — 检测 Token 超限 / Agent 宕机 / 执行失败."""
import datetime
import threading
import time
from typing import Optional

from database import SessionLocal
from models.metrics import SessionMetric
from models.agent import Agent


class Alert:
    """告警实体."""
    def __init__(self, alert_type: str, severity: str, title: str, message: str,
                 entity_type: str = "", entity_id: int = 0, metadata: dict | None = None):
        self.id = f"alert_{int(time.time() * 1000)}_{hash(title) & 0xFFFF:04x}"
        self.alert_type = alert_type  # token_exceeded, agent_dead, execution_failed
        self.severity = severity      # critical, warning, info
        self.title = title
        self.message = message
        self.entity_type = entity_type
        self.entity_id = entity_id
        self.metadata = metadata or {}
        self.timestamp = datetime.datetime.utcnow()
        self.acknowledged = False

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
            "acknowledged": self.acknowledged,
        }


class AlertService:
    """告警服务单例 — 周期性检测 + 内存环形存储."""

    _instance: Optional["AlertService"] = None
    _lock = threading.Lock()

    def __init__(self):
        self.alerts: list[Alert] = []
        self._max_alerts = 500  # 最多保留 500 条
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
        print("[alert_service] 告警服务已启动（每30s检测）")

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

    def _check_token_exceeded(self):
        """检测 Token 超限告警."""
        db = SessionLocal()
        try:
            agents = db.query(Agent).all()
            for ag in agents:
                if ag.token_hard_limit > 0:
                    usage_pct = ag.total_tokens_used / ag.token_hard_limit * 100
                    if usage_pct >= 90:
                        # 检查是否已有未确认的同类告警（去重）
                        existing = any(
                            a.alert_type == "token_exceeded" and
                            a.entity_type == "agent" and
                            a.entity_id == ag.id and
                            not a.acknowledged
                            for a in self.alerts
                        )
                        if not existing:
                            self.add_alert(Alert(
                                alert_type="token_exceeded",
                                severity="critical" if usage_pct >= 95 else "warning",
                                title=f"Agent {ag.name} Token 用量告警",
                                message=f"Agent「{ag.name}」Token 用量已达 {usage_pct:.1f}%（{ag.total_tokens_used}/{ag.token_hard_limit}），请及时关注。",
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
            from models.agent import Agent
            db = SessionLocal()
            try:
                # 获取所有 Agent 的最新探针记录
                agents = db.query(Agent).all()
                for ag in agents:
                    latest_probe = db.query(AgentProbe).filter(
                        AgentProbe.agent_id == ag.id,
                    ).order_by(AgentProbe.created_at.desc()).first()
                    if latest_probe and latest_probe.status in ("dead", "unhealthy"):
                        existing = any(
                            a.alert_type == "agent_dead" and
                            a.entity_type == "agent" and
                            a.entity_id == ag.id and
                            not a.acknowledged
                            for a in self.alerts
                        )
                        if not existing:
                            last_hb = latest_probe.created_at.isoformat() if latest_probe.created_at else ""
                            self.add_alert(Alert(
                                alert_type="agent_dead",
                                severity="critical",
                                title=f"Agent {ag.name} 宕机告警",
                                message=f"Agent「{ag.name}」探针状态异常：{latest_probe.status}，最后心跳：{last_hb}",
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
            error_rate = failed / total * 100 if total > 0 else 0
            if error_rate >= 30 and total >= 5:
                # 按 entity_type 去重
                entity_types = set(s.entity_type for s in recent if s.status == "error")
                for et in entity_types:
                    et_failed = sum(1 for s in recent if s.entity_type == et and s.status == "error")
                    et_total = sum(1 for s in recent if s.entity_type == et)
                    if et_total >= 3 and et_failed / et_total >= 0.3:
                        existing = any(
                            a.alert_type == "execution_failed" and
                            a.entity_type == et and
                            not a.acknowledged
                            for a in self.alerts
                        )
                        if not existing:
                            self.add_alert(Alert(
                                alert_type="execution_failed",
                                severity="warning",
                                title=f"{et} 类型执行失败率过高",
                                message=f"最近 5 分钟内 {et} 类型执行失败率 {et_failed/et_total*100:.1f}%（{et_failed}/{et_total}），请检查。",
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

    def add_alert(self, alert: Alert):
        """添加告警（自动去重 + 环形裁剪）."""
        # 去重：相同 type + title 的未确认告警不重复添加
        for existing in self.alerts:
            if (existing.alert_type == alert.alert_type and
                existing.title == alert.title and
                not existing.acknowledged):
                return  # 跳过重复
        self.alerts.insert(0, alert)
        # 环形裁剪
        if len(self.alerts) > self._max_alerts:
            self.alerts = self.alerts[:self._max_alerts]

    def get_alerts(self, alert_type: str | None = None,
                   severity: str | None = None,
                   acknowledged: bool | None = None,
                   limit: int = 50) -> list[dict]:
        """查询告警列表."""
        result = self.alerts
        if alert_type:
            result = [a for a in result if a.alert_type == alert_type]
        if severity:
            result = [a for a in result if a.severity == severity]
        if acknowledged is not None:
            result = [a for a in result if a.acknowledged == acknowledged]
        return [a.to_dict() for a in result[:limit]]

    def acknowledge(self, alert_id: str) -> bool:
        """确认告警."""
        for a in self.alerts:
            if a.id == alert_id:
                a.acknowledged = True
                return True
        return False

    def acknowledge_all(self) -> int:
        """确认所有告警."""
        count = 0
        for a in self.alerts:
            if not a.acknowledged:
                a.acknowledged = True
                count += 1
        return count

    def get_unacknowledged_count(self) -> int:
        """获取未确认告警数量."""
        return sum(1 for a in self.alerts if not a.acknowledged)


# 全局单例
alert_service = AlertService.get_instance()
