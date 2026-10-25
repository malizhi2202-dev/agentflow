"""v25 批 C 组（R25-11 列形态族 + R25-7 全局总闸行）的功能断言。

迁移纪律（幂等/up 区禁词/DOWN 登记）由 test_migrations_discipline 与
test_runtime_and_rollback 自动覆盖新 032–037；本文件守的是**形状与语义**：
列在不在、行插没插、约束生不生效、to_dict 透不透。
"""
import os
import sqlite3
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("ENCRYPTION_KEY", "test-key-for-ci-32bytes!!")

import migrations
from models import Base
from models.automation import Automation, AutomationTrigger
from models.collab import MentionTarget, WorkItemSubscription
from models.im_binding import ImBinding
from models.scheduler_queue import SchedulerQueue
from models.teams import Squad, SquadMember


def _migrated():
    """空库跑全账本（与 database.init_db 后同形）。"""
    conn = sqlite3.connect(tempfile.mktemp(suffix=".db"))
    migrations.apply_migrations(conn, "sqlite")
    return conn


class TestM032GlobalSwitch(unittest.TestCase):
    def test_global_row_inserted_once(self):
        conn = _migrated()
        rows = conn.execute("SELECT category, enabled FROM rsi_switches "
                            "WHERE category='global'").fetchall()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0][1], 1, "总闸初值开 = 现状零行为变化")
        # 重复执行仍一行（幂等已由纪律测试管，这里行数语义再钉一次）
        migrations.m032_rsi_global_switch(conn, "sqlite")
        self.assertEqual(conn.execute(
            "SELECT COUNT(*) FROM rsi_switches WHERE category='global'").fetchone()[0], 1)
        conn.close()

    def test_skips_when_table_missing(self):
        conn = sqlite3.connect(":memory:")
        migrations.m032_rsi_global_switch(conn, "sqlite")  # 不抛即过
        conn.close()


class TestM033SquadShape(unittest.TestCase):
    def test_new_columns_present(self):
        conn = _migrated()
        squad_cols = {r[1] for r in conn.execute("PRAGMA table_info(squads)")}
        self.assertIn("avatar_url", squad_cols)
        member_cols = {r[1] for r in conn.execute("PRAGMA table_info(squad_members)")}
        self.assertIn("created_by", member_cols)
        conn.close()

    def test_orm_declares_leader_fk_restrict(self):
        """新建库（create_all）必须由 ORM 声明建出 leader 真外键（RESTRICT）。"""
        from sqlalchemy import create_engine, inspect
        eng = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(eng)
        fks = inspect(eng).get_foreign_keys("squads")
        leader = [f for f in fks if "leader_agent_id" in f["constrained_columns"]]
        self.assertTrue(leader, "squads.leader_agent_id 应有外键（R25-11）")
        self.assertEqual(leader[0].get("options", {}).get("ondelete"), "RESTRICT")


class TestM034QueueShape(unittest.TestCase):
    def test_seven_columns(self):
        conn = _migrated()
        cols = {r[1] for r in conn.execute("PRAGMA table_info(scheduler_queue)")}
        for want in ("trigger_comment_id", "coalesced_comment_ids", "handoff_note",
                     "fire_at", "is_leader_task", "squad_id", "workflow_id"):
            self.assertIn(want, cols, f"主档 html:1307 队列设计注列缺失: {want}")
        conn.close()

    def test_to_dict_passes_through(self):
        q = SchedulerQueue(task_id="t1", is_leader_task=1, squad_id=7,
                           coalesced_comment_ids="[3,4]", handoff_note="交接")
        d = q.to_dict()
        self.assertTrue(d["is_leader_task"])
        self.assertEqual(d["squad_id"], 7)
        self.assertEqual(d["coalesced_comment_ids"], [3, 4])
        self.assertEqual(d["handoff_note"], "交接")
        self.assertIsNone(d["fire_at"])
        # 空收据 ≠ 空列表：不伪造
        q2 = SchedulerQueue(task_id="t2")
        self.assertIsNone(q2.to_dict()["coalesced_comment_ids"])


class TestM035AutomationShape(unittest.TestCase):
    def test_columns_and_db_defaults(self):
        conn = _migrated()
        acols = {r[1]: r for r in conn.execute("PRAGMA table_info(automations)")}
        for want in ("concurrency_policy", "issue_title_template", "created_by"):
            self.assertIn(want, acols)
        tcols = {r[1] for r in conn.execute("PRAGMA table_info(automation_triggers)")}
        self.assertIn("signing_secret", tcols)
        # 库级默认语义：queue = 现状行为，不擅改。
        # 注意 `default=`（客户端默认）与迁移 DDL 的 DEFAULT（库级）是两回事——
        # 瞬态 ORM 实例取不到客户端默认，此处按 PRAGMA 断言库级形状（L-014 同款区分）。
        self.assertEqual(acols["concurrency_policy"][4], "'queue'")
        self.assertEqual(acols["issue_title_template"][4], "''")
        conn.close()


class TestM036CollabReceipts(unittest.TestCase):
    def test_table_and_columns(self):
        conn = _migrated()
        tables = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        self.assertIn("mention_targets", tables)
        cols = {r[1] for r in conn.execute("PRAGMA table_info(work_item_subscriptions)")}
        self.assertIn("subject_type", cols)
        self.assertIn("subscriber_type", cols)
        conn.close()

    def test_receipt_to_dict(self):
        m = MentionTarget(mentioned_type="agent", mentioned_id="12",
                          route_kind="note_skipped", will_wake=0,
                          skip_reason="/note 前缀=不叫醒")
        d = m.to_dict()
        self.assertFalse(d["will_wake"])
        self.assertEqual(d["route_kind"], "note_skipped")
        self.assertIsNone(d["comment_id"])  # 评论表缺口：普通列可空，不造引用


class TestM037ImBindings(unittest.TestCase):
    def test_table_unique_identity(self):
        conn = _migrated()
        # UNIQUE(workspace_id, external_user_id, external_tenant) 生效
        conn.execute("INSERT INTO im_bindings (workspace_id, external_user_id, "
                     "external_tenant, user_id, status, created_at, updated_at) "
                     "VALUES ('w1','u1','','admin','bound','2026-01-01','2026-01-01')")
        with self.assertRaises(sqlite3.IntegrityError):
            conn.execute("INSERT INTO im_bindings (workspace_id, external_user_id, "
                         "external_tenant, user_id, status, created_at, updated_at) "
                         "VALUES ('w1','u1','','other','pending','2026-01-01','2026-01-01')")
        conn.close()

    def test_binding_to_dict(self):
        b = ImBinding(workspace_id="w", external_user_id="x", status="pending")
        d = b.to_dict()
        self.assertIsNone(d["user_id"])  # 未认领 = None，不是空串假象
        self.assertEqual(d["status"], "pending")


class TestChannelTypesV25(unittest.TestCase):
    def test_six_value_alignment_with_design(self):
        from models.channel_config import CHANNEL_TYPES
        for want in ("feishu", "dingtalk", "slack", "telegram", "wecom",
                     "self_hosted_im", "lark"):
            self.assertIn(want, CHANNEL_TYPES)


if __name__ == "__main__":
    unittest.main()
