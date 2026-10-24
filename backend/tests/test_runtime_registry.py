"""v22 · §6.28 运行时发现：服务层 + 端点（AC-1…AC-8、AC-10）。

口径：
- AC-1 幂等 upsert（同 machine×cli×protocol 永远只有 1 行）
- AC-2 daemon token fail-closed（未配置 503 / 不符 401）
- AC-3 online/offline 读侧现算（>180s = offline，记录不删）
- AC-4 private 仅 owner 可见；可见性只有 owner 能改，非 owner 拿 404（不泄露存在性）
- AC-5 模型目录不可读要显式（models=[] 且 models_error 非空）
- AC-6 bound_agents = agents.runtime == cli 计数
- AC-7 凭据类键被忽略（不落库）
- AC-8 capabilities 缺失记空数组（按最老客户端处理）
- AC-10 不触碰调度：本模块不 import scheduler/engine
"""
import datetime
import json
import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("ENCRYPTION_KEY", "test-key-for-ci-32bytes!!")

import config
import database
from models.agent import Agent
from models.runtime_registry import RuntimeRegistry
from services import runtime_registry as rr

from tests._auth_harness import AuthHarness, PW  # noqa: E402

TOKEN = "daemon-test-token"


def report_payload(machine="ws-1", clis=None, **over):
    clis = clis or [{
        "cli": "hermes", "protocol_family": "stdio",
        "binary_path": "/home/u/.hermes/venv/bin/hermes", "source_file": "known",
        "version": "v0.18.0", "models": ["deepseek-chat", "deepseek-reasoner"],
        "capabilities": ["session_resume", "model_list"],
    }]
    body = {"machine": {"id": machine, "name": "workstation"}, "runtimes": clis}
    body.update(over)
    return body


class TestServiceLayer(unittest.TestCase):
    def setUp(self):
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
        from sqlalchemy.pool import StaticPool
        from models import Base

        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False},
                                    poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine, autocommit=False, autoflush=False)
        self.db = self.Session()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    # AC-1
    def test_report_is_idempotent(self):
        rr.report(self.db, "alice", report_payload())
        rr.report(self.db, "alice", report_payload(clis=[{
            "cli": "hermes", "protocol_family": "stdio", "version": "v0.19.0",
            "models": ["deepseek-chat"],
        }]))
        rows = self.db.query(RuntimeRegistry).all()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].version, "v0.19.0")      # 更新为最后一次
        self.assertEqual(json.loads(rows[0].models_json), ["deepseek-chat"])

    # AC-3
    def test_offline_after_threshold_keeps_row(self):
        rr.report(self.db, "alice", report_payload())
        row = self.db.query(RuntimeRegistry).first()
        self.assertEqual(rr.list_runtimes(self.db, "alice")[0]["status"], "online")

        row.last_seen = datetime.datetime.utcnow() - datetime.timedelta(
            seconds=config.RUNTIME_OFFLINE_AFTER_SECONDS + 20)
        self.db.commit()
        listed = rr.list_runtimes(self.db, "alice")
        self.assertEqual(listed[0]["status"], "offline")
        self.assertEqual(len(listed), 1, "离线不能删记录")

    # AC-4
    def test_private_hidden_from_others_public_visible(self):
        rr.report(self.db, "alice", report_payload())
        self.assertEqual(rr.list_runtimes(self.db, "bob"), [])          # 默认 private
        rid = self.db.query(RuntimeRegistry).first().id
        rr.set_visibility(self.db, rid, "alice", True)
        self.assertEqual(len(rr.list_runtimes(self.db, "bob")), 1)       # 公开可见
        self.assertFalse(rr.list_runtimes(self.db, "bob")[0]["mine"])
        self.assertTrue(rr.list_runtimes(self.db, "alice")[0]["mine"])

    def test_visibility_non_owner_is_not_found(self):
        rr.report(self.db, "alice", report_payload())
        rid = self.db.query(RuntimeRegistry).first().id
        with self.assertRaises(rr.NotFound):
            rr.set_visibility(self.db, rid, "bob", True)
        with self.assertRaises(rr.NotFound):
            rr.set_visibility(self.db, 999999, "alice", True)
        # 失败不改数据
        self.assertEqual(self.db.query(RuntimeRegistry).first().visibility, "private")

    def test_admin_does_not_bypass_ownership(self):
        rr.report(self.db, "alice", report_payload())
        rid = self.db.query(RuntimeRegistry).first().id
        with self.assertRaises(rr.NotFound):
            rr.set_visibility(self.db, rid, "root", True)

    # AC-5
    def test_models_error_is_explicit(self):
        rr.report(self.db, "alice", report_payload(clis=[{
            "cli": "codex", "protocol_family": "exec", "models": [],
            "models_error": "--list-models 不支持",
        }]))
        listed = rr.list_runtimes(self.db, "alice")
        self.assertEqual(listed[0]["models"], [])
        self.assertEqual(listed[0]["models_error"], "--list-models 不支持")

    # AC-6
    def test_bound_agents_counts_by_cli(self):
        self.db.add_all([
            Agent(owner_id="alice", name="A1", model_provider="deepseek",
                  model_name="deepseek-flash", api_key_encrypted="x", runtime="hermes"),
            Agent(owner_id="alice", name="A2", model_provider="deepseek",
                  model_name="deepseek-flash", api_key_encrypted="x", runtime="hermes"),
            Agent(owner_id="alice", name="A3", model_provider="deepseek",
                  model_name="deepseek-flash", api_key_encrypted="x", runtime="dsh"),
        ])
        self.db.commit()
        rr.report(self.db, "alice", report_payload())
        listed = rr.list_runtimes(self.db, "alice")
        self.assertEqual(listed[0]["bound_agents"], 2)

    # AC-8
    def test_capabilities_missing_is_empty(self):
        rr.report(self.db, "alice", report_payload(clis=[
            {"cli": "dsh", "protocol_family": "exec", "version": "0.1.3"}   # 没声明 capability
        ]))
        listed = rr.list_runtimes(self.db, "alice")
        self.assertEqual(listed[0]["capabilities"], [])

    # AC-10
    def test_does_not_touch_scheduling(self):
        with open(rr.__file__, encoding="utf-8") as fh:
            src = fh.read()
        for forbidden in ("scheduler_service", "reconcile", "engine."):
            self.assertNotIn(forbidden, src,
                             f"运行时发现不该依赖调度（{forbidden}）")

    # 入参校验
    def test_bad_payload_rejected(self):
        for bad in ({"runtimes": []}, {"machine": {}, "runtimes": [{"cli": "x"}]},
                    {"machine": {"id": "m"}, "runtimes": []}):
            with self.assertRaises(rr.RegistryError):
                rr.report(self.db, "alice", bad)


class TestRoutes(AuthHarness, unittest.TestCase):
    users = [("root", "admin"), ("alice", "member"), ("bob", "member")]

    def setUp(self):  # noqa: N802
        AuthHarness.setUp(self)
        import routes.daemon_api as daemon_api
        import routes.runtimes_api as runtimes_api

        self._extra = [
            patch.object(daemon_api, "SessionLocal", self.Session),
            patch.object(runtimes_api, "SessionLocal", self.Session),
            patch.object(config, "AF_DAEMON_TOKEN", TOKEN),
            patch.object(config, "AF_DAEMON_OWNER", "alice"),
        ]
        for p in self._extra:
            p.start()

    def tearDown(self):  # noqa: N802
        for p in reversed(self._extra):
            p.stop()
        AuthHarness.tearDown(self)

    def _report(self, token=TOKEN, **kw):
        from fastapi.testclient import TestClient
        from main import app

        c = TestClient(app, client=("127.0.0.1", 50000))
        headers = {"X-Daemon-Token": token} if token is not None else {}
        return c.post("/api/daemon/report", json=report_payload(**kw), headers=headers)

    # AC-2
    def test_report_without_configured_token_is_503(self):
        with patch.object(config, "AF_DAEMON_TOKEN", ""):
            self.assertEqual(self._report().status_code, 503)

    def test_report_with_wrong_token_is_401(self):
        self.assertEqual(self._report(token="nope").status_code, 401)
        self.assertEqual(self._report(token=None).status_code, 401)

    def test_report_succeeds_with_token(self):
        r = self._report()
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.json()["registered"], 1)

    # AC-7
    def test_credentials_are_ignored(self):
        r = self._report(clis=[{
            "cli": "hermes", "protocol_family": "stdio", "version": "v1",
            "token": "sk-should-not-be-stored", "api_key": "AKIA-secret",
            "password": "hunter2", "account": "me@example.com",
        }])
        self.assertEqual(r.status_code, 200, r.text)
        row = self.db.query(RuntimeRegistry).first()
        self.db.refresh(row)
        values = []
        for col in RuntimeRegistry.__table__.columns:
            attr = {"models": "models_json", "capabilities": "capabilities_json"}.get(col.name, col.name)
            if hasattr(row, attr):
                values.append(getattr(row, attr))
        dumped = json.dumps(values, default=str, ensure_ascii=False)
        for secret in ("sk-should-not-be-stored", "AKIA-secret", "hunter2", "me@example.com"):
            self.assertNotIn(secret, dumped)
        self.assertNotIn("api_key", RuntimeRegistry.__table__.columns)

    # AC-4 端点级
    def test_registry_visibility_over_http(self):
        self._report()
        alice = self.client("alice")
        bob = self.client("bob")
        self.assertEqual(len(alice.get("/api/runtimes").json()["runtimes"]), 1)
        self.assertEqual(bob.get("/api/runtimes").json()["runtimes"], [])

        rid = alice.get("/api/runtimes").json()["runtimes"][0]["id"]
        self.assertEqual(bob.put(f"/api/runtimes/{rid}/visibility",
                                 json={"public": True}).status_code, 404)
        self.assertEqual(alice.put(f"/api/runtimes/{rid}/visibility",
                                   json={"public": True}).status_code, 200)
        self.assertEqual(len(bob.get("/api/runtimes").json()["runtimes"]), 1)

    def test_registry_requires_identity(self):
        from fastapi.testclient import TestClient
        from main import app

        c = TestClient(app, client=("127.0.0.1", 50000))
        self.assertEqual(c.get("/api/runtimes").status_code, 401)

    def test_visibility_requires_public_field(self):
        self._report()
        alice = self.client("alice")
        rid = alice.get("/api/runtimes").json()["runtimes"][0]["id"]
        self.assertEqual(alice.put(f"/api/runtimes/{rid}/visibility", json={}).status_code, 400)


if __name__ == "__main__":
    unittest.main()
