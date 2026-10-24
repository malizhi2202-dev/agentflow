"""A2A M0 静态 AgentCard（R4-2）：白名单无凭据 / M2 冻结如实 / 越权 404。"""
import json
import os
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("ENCRYPTION_KEY", "test-key-for-ci-32bytes!!")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import auth
import config
import database
from models import Base
from models.agent import Agent
from passwords import hash_password
from services import agent_card, cluster_store, session_service
from services.encryption_service import encrypt

PW = "correct-horse-battery-staple"
SECRET = "sk-super-secret-should-never-leak"


def _user(uid, role="member"):
    return {"id": uid, "name": uid, "role": role,
            "password_hash": hash_password(PW), "must_change_password": False,
            "project_ids": [], "custom_permissions": [], "active": True}


class _Base(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.users_file = os.path.join(self.tmp.name, "users.json")
        self.audit_file = os.path.join(self.tmp.name, "audit.jsonl")
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
        )
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine, autocommit=False, autoflush=False)
        self._patchers = [
            patch.object(auth, "_users_file", return_value=self.users_file),
            patch.object(auth, "_audit_file", return_value=self.audit_file),
            patch.object(session_service, "SessionLocal", self.Session),
            patch.object(cluster_store, "SessionLocal", self.Session),
            patch.object(database, "SessionLocal", self.Session),
            patch.object(config, "DEPLOY_MODE", "localhost"),
            patch.object(config, "AUTH_DEBUG_HEADER_ENABLED", False),
        ]
        for p in self._patchers:
            p.start()
        from database import get_db
        from main import app as _app

        def _override_db():
            db = self.Session()
            try:
                yield db
            finally:
                db.close()

        self._app = _app
        self._get_db = get_db
        _app.dependency_overrides[get_db] = _override_db
        with open(self.users_file, "w", encoding="utf-8") as f:
            json.dump({"users": [_user("alice", role="admin"), _user("bob")]}, f)
        self.db = self.Session()

    def tearDown(self):
        self.db.close()
        self._app.dependency_overrides.pop(self._get_db, None)
        for p in reversed(self._patchers):
            p.stop()
        self.engine.dispose()
        self.tmp.cleanup()

    def _agent(self, owner="alice", name="写作助手", status="standby"):
        a = Agent(owner_id=owner, name=name, description="帮他写文档",
                  runtime="codex", model_provider="deepseek", model_name="deepseek-flash",
                  model_config_json={"temperature": 0.2},
                  api_key_encrypted=encrypt(SECRET), status=status,
                  gate_pre_check="内部提示词不该外泄")
        self.db.add(a)
        self.db.commit()
        self.db.refresh(a)
        return a

    def _client(self, uid):
        from fastapi.testclient import TestClient
        from main import app as app_

        c = TestClient(app_, client=("127.0.0.1", 50000))
        r = c.post("/api/auth/login", json={"user_id": uid, "password": PW})
        self.assertEqual(r.status_code, 200, r.text)
        return c


class TestCardShape(_Base):
    def test_m0_shape_and_frozen_capabilities(self):
        a = self._agent()
        card = agent_card.build_card(a)
        self.assertEqual(card["apiVersion"], "agentflow/v1")
        self.assertEqual(card["kind"], "AgentCard")
        self.assertEqual(card["maturity"], "M0")
        # M2 能力一律 false（冻结即如实，不冒充）
        self.assertEqual(card["capabilities"],
                         {"streaming": False, "pushNotifications": False,
                          "stateTransitionHistory": False})
        self.assertIn("M2 冻结", card["note"])
        self.assertEqual(card["skills"][0]["id"], f"agent-{a.id}")
        self.assertEqual(card["endpoints"]["invoke"], f"/api/agents/{a.id}/run")

    def test_no_credentials_or_prompts_in_card(self):
        a = self._agent()
        blob = json.dumps(agent_card.build_card(a), ensure_ascii=False)
        self.assertNotIn(SECRET, blob)
        self.assertNotIn("api_key", blob)
        self.assertNotIn("api_key_encrypted", blob)
        self.assertNotIn("内部提示词", blob)          # gate 提示词不外出
        self.assertNotIn("temperature", blob)          # model_config 不在卡片上

    def test_archived_agent_reports_status_truthfully(self):
        a = self._agent(status="offline")
        self.assertEqual(agent_card.build_card(a)["status"], "offline")


class TestCardRoute(_Base):
    def test_requires_identity(self):
        from fastapi.testclient import TestClient
        from main import app as app_

        c = TestClient(app_, client=("127.0.0.1", 50000))
        self.assertEqual(c.get("/api/a2a/agents/1/card").status_code, 401)

    def test_owner_reads_own_card(self):
        a = self._agent(owner="bob")
        r = self._client("bob").get(f"/api/a2a/agents/{a.id}/card")
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.json()["maturity"], "M0")

    def test_other_users_agent_is_404(self):
        a = self._agent(owner="alice")
        r = self._client("bob").get(f"/api/a2a/agents/{a.id}/card")
        # 越权与不存在同响应：不给探测面
        self.assertEqual(r.status_code, 404)
        r2 = self._client("bob").get("/api/a2a/agents/99999/card")
        self.assertEqual(r2.status_code, 404)


if __name__ == "__main__":
    unittest.main()
