"""R8-2 剩余面：域级 accountable 策略（无策略=现状；有策略不可解析=fail-closed）。"""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("ENCRYPTION_KEY", "test-key-for-ci-32bytes!!")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from models import Base
from models.attribution import DomainAttributionPolicy
from models.domain import Domain
from models.teams import Team
from services import attribution

from tests._auth_harness import AuthHarness, user_row


class _Base(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False},
                                    poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine, autocommit=False, autoflush=False)
        self.db = self.Session()
        self.domain = Domain(name="默认域", owner_id="alice")
        self.db.add(self.domain)
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()


class TestResolve(_Base):
    def test_no_policy_keeps_current_behaviour(self):
        self.assertEqual(
            attribution.resolve_accountable(self.db, self.domain.id, "alice"), "alice",
        )

    def test_member_policy(self):
        attribution.set_policy(self.db, domain_id=self.domain.id,
                               accountable_kind="member", accountable_ref="finance")
        self.assertEqual(
            attribution.resolve_accountable(self.db, self.domain.id, "alice"), "finance",
        )

    def test_team_owner_policy(self):
        team = Team(slug="t1", name="团队", owner_user_id="carol")
        self.db.add(team)
        self.db.commit()
        self.domain.team_id = team.id
        self.db.commit()
        attribution.set_policy(self.db, domain_id=self.domain.id, accountable_kind="team_owner")
        self.assertEqual(
            attribution.resolve_accountable(self.db, self.domain.id, "alice"), "carol",
        )

    def test_team_owner_on_personal_domain_is_fail_closed(self):
        attribution.set_policy(self.db, domain_id=self.domain.id, accountable_kind="team_owner")
        with self.assertRaises(attribution.AttributionError) as ctx:
            attribution.resolve_accountable(self.db, self.domain.id, "alice")
        self.assertIn("个人域", str(ctx.exception))

    def test_invalid_kind_row_is_fail_closed(self):
        self.db.add(DomainAttributionPolicy(domain_id=self.domain.id, accountable_kind="weird"))
        self.db.commit()
        with self.assertRaises(attribution.AttributionError):
            attribution.resolve_accountable(self.db, self.domain.id, "alice")

    def test_set_policy_validation(self):
        with self.assertRaises(ValueError):
            attribution.set_policy(self.db, domain_id=self.domain.id, accountable_kind="nope")
        with self.assertRaises(ValueError):
            attribution.set_policy(self.db, domain_id=self.domain.id, accountable_kind="member")

    def test_resolve_attribution_uses_domain_policy(self):
        attribution.set_policy(self.db, domain_id=self.domain.id,
                               accountable_kind="member", accountable_ref="finance")
        got = attribution.resolve_attribution(
            self.db, actor_id="alice", task_id=None, domain_id=self.domain.id)
        self.assertEqual(got["originator_id"], "alice")
        self.assertEqual(got["accountable_id"], "finance")


class TestRoutes(AuthHarness, unittest.TestCase):
    def setUp(self):
        AuthHarness.setUp(self)
        d = Domain(name="路由域", owner_id="alice")
        self.db.add(d)
        self.db.commit()
        self.domain_id = d.id

    def test_get_without_policy_returns_null(self):
        r = self.client("alice").get(f"/api/domains/{self.domain_id}/attribution-policy")
        self.assertEqual(r.status_code, 200, r.text)
        self.assertIsNone(r.json()["policy"])

    def test_put_by_owner_then_admin(self):
        c = self.client("alice")
        r = c.put(f"/api/domains/{self.domain_id}/attribution-policy",
                  json={"accountable_kind": "member", "accountable_ref": "finance"})
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.json()["policy"]["accountable_kind"], "member")
        r2 = self.client("root").put(f"/api/domains/{self.domain_id}/attribution-policy",
                                     json={"accountable_kind": "originator"})
        self.assertEqual(r2.status_code, 200, r2.text)

    def test_put_bad_kind_is_400(self):
        r = self.client("alice").put(f"/api/domains/{self.domain_id}/attribution-policy",
                                     json={"accountable_kind": "nope"})
        self.assertEqual(r.status_code, 400)

    def test_other_user_gets_404(self):
        r = self.client("root").get("/api/domains/99999/attribution-policy")
        self.assertEqual(r.status_code, 404)


if __name__ == "__main__":
    unittest.main()
