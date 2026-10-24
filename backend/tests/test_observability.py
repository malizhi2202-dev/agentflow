"""P2-4 可观测：trace_spans 产生端 + /metrics 直读现表（A 档）。"""
import datetime
import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("ENCRYPTION_KEY", "test-key-for-ci-32bytes!!")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import config
from models import Base
from models.alert import Alert
from models.collab import WorkItem
from models.metrics import SessionMetric
from models.orchestration import TraceSpan
from routes.prom_metrics import render_metrics
from services import runtime_tracer


class _Base(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
        )
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine, autocommit=False, autoflush=False)
        self._p1 = patch.object(runtime_tracer, "SessionLocal", self.Session)
        self._p2 = patch("services.cluster_store.SessionLocal", self.Session)
        self._p1.start()
        self._p2.start()
        self.db = self.Session()

    def tearDown(self):
        self.db.close()
        self._p1.stop()
        self._p2.stop()
        self.engine.dispose()


class TestSpanProduction(_Base):
    def test_tracer_writes_root_and_child_span(self):
        runtime_tracer.tracer.trace_model_call(
            entity_type="agent", entity_id=7, owner_id="alice",
            model_name="deepseek-flash", prompt_tokens=10, completion_tokens=5,
            duration_ms=120, tool_name="read_file", tool_calls=1, status="success",
        )
        spans = self.db.query(TraceSpan).order_by(TraceSpan.id.asc()).all()
        self.assertEqual(len(spans), 2)
        root, child = spans
        self.assertEqual(root.span_type, "model_call")
        self.assertEqual(root.span_kind, "server")
        self.assertEqual(root.tokens, 15)
        self.assertEqual(root.status, "ok")
        self.assertEqual(root.to_agent_id, 7)
        self.assertIsNone(root.parent_span_id)
        self.assertEqual(child.parent_span_id, root.id)
        self.assertEqual(child.trace_id, root.trace_id)
        self.assertEqual(child.span_type, "tool_call")
        self.assertEqual(child.name, "read_file")

    def test_error_call_marks_span_error(self):
        runtime_tracer.tracer.trace_model_call(
            entity_type="tool", entity_id=0, owner_id="alice",
            model_name="m", prompt_tokens=0, completion_tokens=0,
            duration_ms=5, status="error", error_msg="boom",
        )
        root = self.db.query(TraceSpan).first()
        self.assertEqual(root.status, "error")
        self.assertIsNone(root.to_agent_id)     # 非 agent 实体不写 to_agent_id


class TestMetricsRender(_Base):
    def _seed(self):
        self.db.add(SessionMetric(
            session_id="s1", entity_type="agent", entity_id=1, owner_id="alice",
            model_name="deepseek-flash", total_tokens=15, prompt_tokens=10,
            completion_tokens=5, duration_ms=100, status="success",
            timestamp=datetime.datetime.utcnow(),
        ))
        self.db.add(SessionMetric(
            session_id="s2", entity_type="agent", entity_id=1, owner_id="alice",
            model_name="deepseek-flash", total_tokens=5, prompt_tokens=2,
            completion_tokens=3, duration_ms=50, status="error",
            timestamp=datetime.datetime.utcnow(),
        ))
        self.db.add(Alert(id="a1", alert_type="token_exceeded", severity="warning",
                          title="t", message="m", entity_type="agent", entity_id=1,
                          metadata_json="{}", timestamp=datetime.datetime.utcnow(),
                          acknowledged=0))
        self.db.add(WorkItem(title="t1", creator_id="alice", status="todo"))
        self.db.add(WorkItem(title="t2", creator_id="alice", status="done"))
        self.db.commit()
        runtime_tracer.tracer.trace_model_call(
            entity_type="agent", entity_id=1, owner_id="alice", model_name="m",
            prompt_tokens=1, completion_tokens=1, duration_ms=10, status="success",
        )

    def test_prometheus_text_format_and_values(self):
        self._seed()
        text = render_metrics(self.db)
        self.assertIn("# TYPE agentflow_model_calls_total counter", text)
        self.assertIn('agentflow_model_calls_total{entity_type="agent",status="success"} 2', text)
        self.assertIn('agentflow_model_calls_total{entity_type="agent",status="error"} 1', text)
        self.assertIn('agentflow_tokens_total{entity_type="agent",direction="input"} 13', text)
        self.assertIn('agentflow_tokens_total{entity_type="agent",direction="output"} 9', text)
        self.assertIn("agentflow_queue_depth ", text)
        self.assertIn("agentflow_alerts_unacknowledged 1", text)
        self.assertIn('agentflow_tasks_total{status="todo"} 1', text)
        self.assertIn('agentflow_tasks_total{status="done"} 1', text)
        self.assertIn('agentflow_trace_spans_total{span_type="model_call",status="ok"} 1', text)
        # 每一行都是 name{labels} value 或注释，不含裸 dict
        for line in text.splitlines():
            if line.startswith("#") or not line:
                continue
            self.assertRegex(line, r"^[a-z_]+(\{[^}]*\})? [0-9.]+$")

    def test_labels_are_escaped(self):
        self.db.add(SessionMetric(
            session_id="s1", entity_type='we"ird', entity_id=1, owner_id="alice",
            model_name="m", total_tokens=1, prompt_tokens=1, completion_tokens=0,
            duration_ms=1, status="success", timestamp=datetime.datetime.utcnow(),
        ))
        self.db.commit()
        text = render_metrics(self.db)
        self.assertIn(r'entity_type="we\"ird"', text)


class TestMetricsEndpointGate(unittest.TestCase):
    def test_disabled_returns_404(self):
        from fastapi.testclient import TestClient
        from main import app

        with patch.object(config, "METRICS_ENDPOINT_ENABLED", False):
            c = TestClient(app, client=("127.0.0.1", 50000))
            self.assertEqual(c.get("/metrics").status_code, 404)

    def test_enabled_still_needs_identity(self):
        from fastapi.testclient import TestClient
        from main import app

        with patch.object(config, "METRICS_ENDPOINT_ENABLED", True):
            c = TestClient(app, client=("127.0.0.1", 50000))
            self.assertEqual(c.get("/metrics").status_code, 401)
