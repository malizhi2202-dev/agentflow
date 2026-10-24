"""P1-16：告警落表 + 双队列并表。

告警用例跑内存 SQLite；并表用例直接拿旧形状的库跑迁移，验证「行搬过去、状态映射对、
旧表删干净、重跑幂等」。
"""
import datetime
import os
import sqlite3
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("ENCRYPTION_KEY", "test-key-for-ci-32bytes!!")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import migrations
from models import Base
from services import alert_service as alert_mod
from services.alert_service import Alert, AlertService


class _DbBase(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
        )
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine, autocommit=False, autoflush=False)
        self._p = patch.object(alert_mod, "SessionLocal", self.Session)
        self._p.start()
        self.svc = AlertService()

    def tearDown(self):
        self._p.stop()
        self.engine.dispose()


class TestAlertsPersisted(_DbBase):
    def _alert(self, title="Agent a Token 用量告警", atype="token_exceeded", eid=1):
        return Alert(atype, "warning", title, "msg", entity_type="agent", entity_id=eid,
                     metadata={"usage_percent": 91.5})

    def test_add_and_list(self):
        self.assertTrue(self.svc.add_alert(self._alert()))
        rows = self.svc.get_alerts()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["title"], "Agent a Token 用量告警")
        self.assertEqual(rows[0]["metadata"], {"usage_percent": 91.5})
        self.assertFalse(rows[0]["acknowledged"])

    def test_dedupe_open_alerts(self):
        self.assertTrue(self.svc.add_alert(self._alert()))
        self.assertFalse(self.svc.add_alert(self._alert()))
        self.assertEqual(len(self.svc.get_alerts()), 1)
        # 确认后允许再写（同一问题的下一轮）
        self.svc.acknowledge_all()
        self.assertTrue(self.svc.add_alert(self._alert()))
        self.assertEqual(len(self.svc.get_alerts()), 2)

    def test_ack_single_and_all(self):
        self.svc.add_alert(self._alert(title="A"))
        self.svc.add_alert(self._alert(title="B", atype="agent_dead", eid=2))
        self.assertEqual(self.svc.get_unacknowledged_count(), 2)
        target = self.svc.get_alerts()[0]
        self.assertTrue(self.svc.acknowledge(target["id"], by="admin"))
        self.assertEqual(self.svc.get_unacknowledged_count(), 1)
        self.assertFalse(self.svc.acknowledge("alert_missing", by="admin"))
        self.assertEqual(self.svc.acknowledge_all(by="admin"), 1)
        self.assertEqual(self.svc.get_unacknowledged_count(), 0)
        acked = self.svc.get_alerts(acknowledged=True)
        self.assertEqual(len(acked), 2)
        self.assertEqual(acked[0]["acknowledged_by"], "admin")

    def test_filters(self):
        self.svc.add_alert(self._alert(title="A"))
        self.svc.add_alert(self._alert(title="B", atype="agent_dead", eid=2))
        self.assertEqual(len(self.svc.get_alerts(alert_type="agent_dead")), 1)
        self.assertEqual(len(self.svc.get_alerts(severity="warning")), 2)
        self.assertEqual(len(self.svc.get_alerts(severity="critical")), 0)

    def test_detection_dedupes_against_db(self):
        from models.agent import Agent
        db = self.Session()
        try:
            db.add(Agent(name="a1", owner_id="admin", runtime="claude_code",
                         model_provider="deepseek", model_name="deepseek-flash",
                         api_key_encrypted="", total_tokens_used=95,
                         token_soft_limit=80, token_hard_limit=100))
            db.commit()
        finally:
            db.close()
        self.svc._check_token_exceeded()
        self.svc._check_token_exceeded()  # 第二轮不应重复写
        rows = self.svc.get_alerts(alert_type="token_exceeded")
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["metadata"]["usage_percent"], 95.0)


class TestQueueMergeMigration(unittest.TestCase):
    def _legacy_db(self):
        tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        conn = sqlite3.connect(tmp.name)
        conn.execute(
            "CREATE TABLE scheduling_queue (id INTEGER PRIMARY KEY AUTOINCREMENT, "
            "instance_id INTEGER NOT NULL, priority INTEGER, status VARCHAR(16), "
            "enqueued_at DATETIME, scheduled_at DATETIME, max_wait_until DATETIME)"
        )
        now = datetime.datetime(2026, 10, 24, 9, 0, 0)
        for status in ("queued", "scheduled", "executing", "completed", "evicted", "failed"):
            conn.execute(
                "INSERT INTO scheduling_queue (instance_id, priority, status, enqueued_at) "
                "VALUES (?, ?, ?, ?)",
                (7, 60, status, now),
            )
        conn.commit()
        return tmp.name, conn

    def test_rows_moved_and_table_dropped(self):
        path, conn = self._legacy_db()
        try:
            applied = migrations.apply_migrations(conn, "sqlite")
            self.assertIn("008_alerts_and_queue_merge", applied)
            self.assertFalse(migrations._table_exists(conn, "sqlite", "scheduling_queue"))
            self.assertTrue(migrations._table_exists(conn, "sqlite", "alerts"))
            rows = conn.execute(
                "SELECT kind, status, instance_id, priority FROM scheduler_queue ORDER BY id"
            ).fetchall()
            self.assertEqual(len(rows), 6)
            self.assertEqual({r[0] for r in rows}, {"orchestration_instance"})
            self.assertEqual([r[1] for r in rows],
                             ["queued", "queued", "leased", "done", "failed", "failed"])
            self.assertTrue(all(r[2] == 7 and r[3] == 60 for r in rows))
            # 幂等
            self.assertEqual(migrations.apply_migrations(conn, "sqlite"), [])
        finally:
            conn.close()
            os.unlink(path)


if __name__ == "__main__":
    unittest.main()
