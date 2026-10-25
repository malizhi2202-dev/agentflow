"""版本化 schema 迁移账本（P0-8）。

为什么要有它：`init_db()` 里原本是 5 段内联 `try/except + PRAGMA table_info` 的临时迁移，
**无版本账本、无回滚、失败静默**（`except Exception: print(跳过)`），且只对 SQLite 生效。
产品档 P0-8 要求「可参照 Multica 的 schema_migrations + fix-forward 纪律」。

设计（保持 ponytail：不加框架、不加依赖）：
- 账本表 `schema_migrations(version PK, description, applied_at)`，一行一版。
- 每个迁移是**幂等函数** `fn(conn, dialect)`：先查后改，重复执行无副作用。
  因此新库（`create_all` 已建全列）与老库（缺列缺表）走同一条路径，不需要分支。
- 只做 **expand**（加列 / 建表 / 建索引），不做 contract；本仓数据模型只增不减。
- **失败即抛**：迁移异常向上传播并回滚，绝不静默跳过（旧实现的最大病）。
- 纯标准库：`sqlite3` 与 MySQL DBAPI 连接都能用，不引入 SQLAlchemy 依赖，
  也不因此绑定 ORM —— 这样才能在没有第三方包的机器上跑测试。

用法（`database.init_db()` 内）：
    applied = apply_migrations(conn, "sqlite")   # 返回本次实际应用的版本号列表
"""
from __future__ import annotations

import datetime
from typing import Callable, Iterable

LEDGER = "schema_migrations"

Migration = tuple[str, str, Callable[[object, str], None]]


# ── 方言适配与幂等基元 ──────────────────────────────────────

def _is_sqlite(dialect: str) -> bool:
    """方言一律由调用方显式传入：SQLAlchemy 的 raw_connection 是代理对象，
    按连接类型猜方言在集成时会猜错（这本身是个坑，别再猜）。"""
    return dialect == "sqlite"


def _pk_clause(dialect: str) -> str:
    """自增主键：SQLite 与 MySQL 写法不同。"""
    return "INT AUTO_INCREMENT PRIMARY KEY" if dialect == "mysql" else "INTEGER PRIMARY KEY AUTOINCREMENT"


def _table_exists(conn, dialect: str, table: str) -> bool:
    cur = conn.cursor()
    if _is_sqlite(dialect):
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
        return cur.fetchone() is not None
    cur.execute("SELECT table_name FROM information_schema.tables "
                "WHERE table_schema=DATABASE() AND table_name=%s", (table,))
    return cur.fetchone() is not None


def _columns(conn, dialect: str, table: str) -> list[str]:
    if not _table_exists(conn, dialect, table):
        return []
    cur = conn.cursor()
    if _is_sqlite(dialect):
        cur.execute(f"PRAGMA table_info({table})")
        return [row[1] for row in cur.fetchall()]
    cur.execute("SELECT column_name FROM information_schema.columns "
                "WHERE table_schema=DATABASE() AND table_name=%s", (table,))
    return [row[0] for row in cur.fetchall()]


def _index_exists(conn, dialect: str, index: str, table: str) -> bool:
    cur = conn.cursor()
    if _is_sqlite(dialect):
        cur.execute("SELECT name FROM sqlite_master WHERE type='index' AND name=?", (index,))
        return cur.fetchone() is not None
    cur.execute("SELECT index_name FROM information_schema.statistics "
                "WHERE table_schema=DATABASE() AND table_name=%s AND index_name=%s", (table, index))
    return cur.fetchone() is not None


def add_column_if_missing(conn, dialect: str, table: str, column: str, ddl_type: str) -> bool:
    """加列（幂等）。表不存在时跳过（由 create_all / 建表迁移负责）。"""
    if column in _columns(conn, dialect, table):
        return False
    if not _table_exists(conn, dialect, table):
        return False
    conn.cursor().execute(f"ALTER TABLE {table} ADD COLUMN {column} {ddl_type}")
    return True


def create_table_if_missing(conn, dialect: str, table: str, body: str) -> bool:
    if _table_exists(conn, dialect, table):
        return False
    conn.cursor().execute(f"CREATE TABLE {table} ({body})")
    return True


def create_index_if_missing(conn, dialect: str, index: str, table: str, columns: str,
                            unique: bool = False) -> bool:
    if not _table_exists(conn, dialect, table):
        return False  # 表不在（裸库/尚未建表）→ 跳过，与 add_column_if_missing 一致
    existing = set(_columns(conn, dialect, table))
    if any(c.strip() not in existing for c in columns.split(",")):
        return False  # 列不齐（半截 schema）→ 留给后续迁移，不在此处炸
    if _index_exists(conn, dialect, index, table):
        return False
    kind = "UNIQUE INDEX" if unique else "INDEX"
    conn.cursor().execute(f"CREATE {kind} {index} ON {table}({columns})")
    return True


# ── 迁移清单（只增不改：历史版本永不改写）──────────────────

def m001_agent_memories_domain_id(conn, dialect: str) -> None:
    add_column_if_missing(conn, dialect, "agent_memories", "domain_id", "INTEGER")


def m002_knowledge_sources_status_file_path(conn, dialect: str) -> None:
    add_column_if_missing(conn, dialect, "knowledge_sources", "status", "VARCHAR(32)")
    add_column_if_missing(conn, dialect, "knowledge_sources", "file_path", "VARCHAR(1024)")


def m003_knowledge_tags(conn, dialect: str) -> None:
    pk = _pk_clause(dialect)
    create_table_if_missing(conn, dialect, "knowledge_tags",
        f"id {pk}, name VARCHAR(64) NOT NULL, color VARCHAR(7) NOT NULL DEFAULT '#3b82f6', "
        "owner_id VARCHAR(64) NOT NULL, created_at DATETIME")
    create_index_if_missing(conn, dialect, "ix_knowledge_tags_owner_id", "knowledge_tags", "owner_id")


def m004_knowledge_source_tags(conn, dialect: str) -> None:
    pk = _pk_clause(dialect)
    create_table_if_missing(conn, dialect, "knowledge_source_tags",
        f"id {pk}, source_id INTEGER NOT NULL, tag_id INTEGER NOT NULL, created_at DATETIME, "
        "UNIQUE(source_id, tag_id)")
    create_index_if_missing(conn, dialect, "ix_knowledge_source_tags_source_id", "knowledge_source_tags", "source_id")
    create_index_if_missing(conn, dialect, "ix_knowledge_source_tags_tag_id", "knowledge_source_tags", "tag_id")


def m005_scheduled_tasks(conn, dialect: str) -> None:
    pk = _pk_clause(dialect)
    create_table_if_missing(conn, dialect, "scheduled_tasks",
        f"id {pk}, agent_id INTEGER NOT NULL, cron_expr VARCHAR(64) NOT NULL, "
        "capability VARCHAR(128) NOT NULL, enabled BOOLEAN DEFAULT 1, last_run DATETIME, "
        "owner_id VARCHAR(64) NOT NULL, name VARCHAR(128) DEFAULT '', "
        "created_at DATETIME, updated_at DATETIME")
    create_index_if_missing(conn, dialect, "ix_scheduled_tasks_agent_id", "scheduled_tasks", "agent_id")
    create_index_if_missing(conn, dialect, "ix_scheduled_tasks_owner_id", "scheduled_tasks", "owner_id")


def m006_auth_sessions(conn, dialect: str) -> None:
    """P0-1：服务端会话 + PAT 令牌（只存哈希）。"""
    pk = _pk_clause(dialect)
    create_table_if_missing(conn, dialect, "sessions",
        f"id {pk}, token_hash VARCHAR(64) NOT NULL, user_id VARCHAR(64) NOT NULL, "
        "created_at DATETIME, last_seen DATETIME, expires_at DATETIME NOT NULL, "
        "absolute_expires_at DATETIME NOT NULL, ip VARCHAR(64), ua VARCHAR(255), revoked_at DATETIME")
    create_index_if_missing(conn, dialect, "ux_sessions_token_hash", "sessions", "token_hash", unique=True)
    create_index_if_missing(conn, dialect, "ix_sessions_user_id", "sessions", "user_id")

    create_table_if_missing(conn, dialect, "pat_tokens",
        f"id {pk}, name VARCHAR(128) NOT NULL, user_id VARCHAR(64) NOT NULL, "
        "token_hash VARCHAR(64) NOT NULL, scopes_json TEXT, created_at DATETIME, "
        "expires_at DATETIME NOT NULL, last_used_at DATETIME, revoked_at DATETIME")
    create_index_if_missing(conn, dialect, "ux_pat_tokens_token_hash", "pat_tokens", "token_hash", unique=True)
    create_index_if_missing(conn, dialect, "ix_pat_tokens_user_id", "pat_tokens", "user_id")


def _rebuild_scheduler_queue(conn, dialect: str) -> None:
    """把旧 scheduler_queue（agent_id 必填、无租约列）整表重建为新形态。

    旧表在生产路径从未写入过（队列此前只在进程内存里），因此这里只需保住
    可能存在的历史行：老列原样搬过去，新列给默认值。
    """
    cols = _columns(conn, dialect, "scheduler_queue")
    new = "scheduler_queue__p1_7"
    has_created_at = "created_at" in cols
    ph = "%s" if dialect == "mysql" else "?"
    pk = _pk_clause(dialect)
    cur = conn.cursor()
    cur.execute(f"DROP TABLE IF EXISTS {new}")
    cur.execute(
        f"CREATE TABLE {new} (id {pk}, task_id VARCHAR(128) NOT NULL, label VARCHAR(64), "
        "domain_id INTEGER, agent_id INTEGER, priority INTEGER DEFAULT 50, score FLOAT DEFAULT 0, "
        "status VARCHAR(16) DEFAULT 'queued', enqueued_at DATETIME, started_at DATETIME, "
        "attempts INTEGER DEFAULT 0, lease_owner VARCHAR(128), lease_expires_at DATETIME, "
        "heartbeat_at DATETIME, finished_at DATETIME)"
    )
    cur.execute(
        "SELECT id, task_id, agent_id, priority, score, status, "
        + ("created_at" if has_created_at else "NULL")
        + ", started_at FROM scheduler_queue"
    )
    rows = cur.fetchall()
    for row in rows:
        cur.execute(
            f"INSERT INTO {new} (id, task_id, agent_id, priority, score, status, "
            f"enqueued_at, started_at, attempts) VALUES ({ph}, {ph}, {ph}, {ph}, {ph}, {ph}, {ph}, {ph}, 0)",
            row,
        )
    cur.execute("DROP TABLE scheduler_queue")
    cur.execute(f"ALTER TABLE {new} RENAME TO scheduler_queue")
    for index, column in (
        ("ix_scheduler_queue_task_id", "task_id"),
        ("ix_scheduler_queue_label", "label"),
        ("ix_scheduler_queue_domain_id", "domain_id"),
        ("ix_scheduler_queue_agent_id", "agent_id"),
        ("ix_scheduler_queue_status", "status"),
        ("ix_scheduler_queue_enqueued_at", "enqueued_at"),
    ):
        create_index_if_missing(conn, dialect, index, "scheduler_queue", column)


def m007_cluster_state(conn, dialect: str) -> None:
    """P1-7：队列落库（含租约/心跳）+ 限流/退避/租约/监控偏移四表。"""
    # 1) 队列：老库整表重建（agent_id 必填 → 可空 + 租约列）；新库已由 create_all 建好
    cols = _columns(conn, dialect, "scheduler_queue")
    if cols and "label" not in cols:
        _rebuild_scheduler_queue(conn, dialect)

    # 2) 固定窗口限流
    create_table_if_missing(conn, dialect, "rate_limit_windows",
        "scope VARCHAR(160) PRIMARY KEY, window_start INTEGER NOT NULL DEFAULT 0, "
        "count INTEGER NOT NULL DEFAULT 0, updated_at DATETIME")

    # 3) 调和退避（原进程内 _backoff_state）
    create_table_if_missing(conn, dialect, "reconcile_states",
        "instance_id INTEGER PRIMARY KEY, failures INTEGER NOT NULL DEFAULT 0, "
        "next_retry_at DATETIME, paused INTEGER NOT NULL DEFAULT 0, updated_at DATETIME")

    # 4) 单例循环租约（cron / reconcile / runtime watcher 谁在跑）
    create_table_if_missing(conn, dialect, "cluster_leases",
        "name VARCHAR(64) PRIMARY KEY, owner VARCHAR(128) NOT NULL, "
        "expires_at DATETIME NOT NULL, heartbeat_at DATETIME")

    # 5) runtime.jsonl 已读行数（原进程内 _watched，副本切换不重放）
    create_table_if_missing(conn, dialect, "runtime_watcher_offsets",
        "file_path VARCHAR(512) PRIMARY KEY, line_count INTEGER NOT NULL DEFAULT 0, "
        "updated_at DATETIME")



def m008_alerts_and_queue_merge(conn, dialect: str) -> None:
    """P1-16：告警落表 + 双队列并表。

    - `alerts`：告警从进程内环形 500 条改为落库（重启不丢、可审计、多副本同源）。
    - 并表：`scheduling_queue`（编排实例队列）的存量行搬进 `scheduler_queue`，
      用 `kind='orchestration_instance'` 区分，然后删掉旧表——只保留一张队列。
      旧表在函数里先判存在，重复执行无副作用。
    """
    pk = _pk_clause(dialect)
    create_table_if_missing(conn, dialect, "alerts",
        f"id VARCHAR(80) PRIMARY KEY, alert_type VARCHAR(32) NOT NULL, "
        "severity VARCHAR(16) NOT NULL, title VARCHAR(255) NOT NULL, message TEXT NOT NULL, "
        "entity_type VARCHAR(32) DEFAULT '', entity_id INTEGER DEFAULT 0, metadata_json TEXT, "
        "timestamp DATETIME, acknowledged INTEGER DEFAULT 0, acknowledged_at DATETIME, "
        "acknowledged_by VARCHAR(64)")
    create_index_if_missing(conn, dialect, "ix_alerts_alert_type", "alerts", "alert_type")
    create_index_if_missing(conn, dialect, "ix_alerts_severity", "alerts", "severity")
    create_index_if_missing(conn, dialect, "ix_alerts_timestamp", "alerts", "timestamp")
    create_index_if_missing(conn, dialect, "ix_alerts_acknowledged", "alerts", "acknowledged")
    create_index_if_missing(conn, dialect, "ix_alerts_entity", "alerts", "entity_type, entity_id")

    # 并表：目标表可能还没建（极老库/裸库先建出来），再补列
    create_table_if_missing(conn, dialect, "scheduler_queue",
        f"id {pk}, task_id VARCHAR(128) NOT NULL, label VARCHAR(64), domain_id INTEGER, "
        "agent_id INTEGER, kind VARCHAR(24) DEFAULT 'agent_task', instance_id INTEGER, "
        "priority INTEGER DEFAULT 50, score FLOAT DEFAULT 0, "
        "status VARCHAR(16) DEFAULT 'queued', enqueued_at DATETIME, started_at DATETIME, "
        "attempts INTEGER DEFAULT 0, lease_owner VARCHAR(128), lease_expires_at DATETIME, "
        "heartbeat_at DATETIME, finished_at DATETIME")
    add_column_if_missing(conn, dialect, "scheduler_queue", "kind", "VARCHAR(24) DEFAULT 'agent_task'")
    add_column_if_missing(conn, dialect, "scheduler_queue", "instance_id", "INTEGER")

    if not _table_exists(conn, dialect, "scheduling_queue"):
        return

    ph = "%s" if dialect == "mysql" else "?"
    status_map = {
        "queued": "queued",
        "scheduled": "queued",
        "executing": "leased",
        "evicted": "failed",
        "completed": "done",
        "failed": "failed",
    }
    cur = conn.cursor()
    cur.execute(
        "SELECT id, instance_id, priority, status, enqueued_at FROM scheduling_queue"
    )
    rows = cur.fetchall()
    for row in rows:
        _id, instance_id, priority, status, enqueued_at = row
        cur.execute(
            f"INSERT INTO scheduler_queue (task_id, kind, instance_id, priority, status, "
            f"enqueued_at) VALUES ({ph}, {ph}, {ph}, {ph}, {ph}, {ph})",
            (
                f"instance-{instance_id}-{_id}",
                "orchestration_instance",
                instance_id,
                priority,
                status_map.get(status, "queued"),
                enqueued_at,
            ),
        )
    cur.execute("DROP TABLE scheduling_queue")



def m009_collab_layer(conn, dialect: str) -> None:
    """P1-4：任务 / 运行连接 / 订阅 / 收件箱四表（协作层最小集）。"""
    pk = _pk_clause(dialect)

    create_table_if_missing(conn, dialect, "work_items",
        f"id {pk}, title VARCHAR(255) NOT NULL, description TEXT, team_id VARCHAR(64), "
        "creator_id VARCHAR(64) NOT NULL, status VARCHAR(24) DEFAULT 'backlog', "
        "triage_state VARCHAR(16) DEFAULT 'needs_triage', assignee_kind VARCHAR(16), "
        "assignee_id VARCHAR(64), priority INTEGER DEFAULT 50, due_date VARCHAR(32), "
        "parent_id INTEGER, evidence_json TEXT, evidence_warned INTEGER DEFAULT 0, "
        "archived_at DATETIME, created_at DATETIME, updated_at DATETIME")
    for index, cols in (
        ("ix_work_items_creator_id", "creator_id"),
        ("ix_work_items_team_id", "team_id"),
        ("ix_work_items_status", "status"),
        ("ix_work_items_triage_state", "triage_state"),
        ("ix_work_items_assignee_kind", "assignee_kind"),
        ("ix_work_items_assignee_id", "assignee_id"),
        ("ix_work_items_parent_id", "parent_id"),
        ("ix_work_items_created_at", "created_at"),
    ):
        create_index_if_missing(conn, dialect, index, "work_items", cols)

    create_table_if_missing(conn, dialect, "work_item_runs",
        f"id {pk}, work_item_id INTEGER NOT NULL, run_id VARCHAR(80) NOT NULL, "
        "agent_id INTEGER, status VARCHAR(16) DEFAULT 'queued', summary TEXT, "
        "evidence_json TEXT, started_at DATETIME, finished_at DATETIME, created_at DATETIME")
    create_index_if_missing(conn, dialect, "ix_work_item_runs_work_item_id", "work_item_runs", "work_item_id")
    create_index_if_missing(conn, dialect, "ix_work_item_runs_run_id", "work_item_runs", "run_id")
    create_index_if_missing(conn, dialect, "ix_work_item_runs_agent_id", "work_item_runs", "agent_id")
    create_index_if_missing(conn, dialect, "ix_work_item_runs_status", "work_item_runs", "status")

    create_table_if_missing(conn, dialect, "work_item_subscriptions",
        f"id {pk}, work_item_id INTEGER NOT NULL, user_id VARCHAR(64) NOT NULL, "
        "source VARCHAR(16) DEFAULT 'creator', unsubscribed INTEGER DEFAULT 0, "
        "created_at DATETIME, UNIQUE(work_item_id, user_id)")
    create_index_if_missing(conn, dialect, "ix_work_item_subscriptions_work_item_id",
                            "work_item_subscriptions", "work_item_id")
    create_index_if_missing(conn, dialect, "ix_work_item_subscriptions_user_id",
                            "work_item_subscriptions", "user_id")

    create_table_if_missing(conn, dialect, "inbox_items",
        f"id {pk}, user_id VARCHAR(64) NOT NULL, work_item_id INTEGER, "
        "event_type VARCHAR(24) DEFAULT 'status', relation VARCHAR(16) DEFAULT 'responsible', "
        "title VARCHAR(255) DEFAULT '', body TEXT, action_required INTEGER DEFAULT 0, "
        "has_failure INTEGER DEFAULT 0, merged_count INTEGER DEFAULT 1, "
        "read_at DATETIME, archived_at DATETIME, "
        "created_at DATETIME, updated_at DATETIME, UNIQUE(user_id, work_item_id)")
    for index, cols in (
        ("ix_inbox_items_user_id", "user_id"),
        ("ix_inbox_items_work_item_id", "work_item_id"),
        ("ix_inbox_items_event_type", "event_type"),
        ("ix_inbox_items_relation", "relation"),
        ("ix_inbox_items_action_required", "action_required"),
        ("ix_inbox_items_has_failure", "has_failure"),
        ("ix_inbox_items_created_at", "created_at"),
    ):
        create_index_if_missing(conn, dialect, index, "inbox_items", cols)



def m010_teams_and_squads(conn, dialect: str) -> None:
    """R5-3/R5-4：Team 与 Squad 两实体 + 五类资产归属列 + leader 任务列。"""
    pk = _pk_clause(dialect)

    create_table_if_missing(conn, dialect, "teams",
        f"id {pk}, slug VARCHAR(32) NOT NULL, name VARCHAR(64) NOT NULL, description TEXT, "
        "owner_user_id VARCHAR(64) NOT NULL, status VARCHAR(16) DEFAULT 'active', "
        "token_soft_limit INTEGER DEFAULT 80000, token_hard_limit INTEGER DEFAULT 100000, "
        "max_agents INTEGER DEFAULT 10, max_workflows INTEGER DEFAULT 5, "
        "max_members INTEGER DEFAULT 20, created_at DATETIME, updated_at DATETIME, "
        "UNIQUE(slug)")
    create_index_if_missing(conn, dialect, "ix_teams_owner_user_id", "teams", "owner_user_id")
    create_index_if_missing(conn, dialect, "ix_teams_status", "teams", "status")

    create_table_if_missing(conn, dialect, "team_members",
        f"id {pk}, team_id INTEGER NOT NULL, user_id VARCHAR(64) NOT NULL, "
        "role VARCHAR(16) DEFAULT 'member', created_at DATETIME, "
        "UNIQUE(team_id, user_id)")
    create_index_if_missing(conn, dialect, "ix_team_members_team_id", "team_members", "team_id")
    create_index_if_missing(conn, dialect, "ix_team_members_user_id", "team_members", "user_id")
    create_index_if_missing(conn, dialect, "ix_team_members_role", "team_members", "role")

    create_table_if_missing(conn, dialect, "squads",
        f"id {pk}, slug VARCHAR(32) NOT NULL, name VARCHAR(64) NOT NULL, "
        "leader_agent_id INTEGER NOT NULL, instructions TEXT, "
        "status VARCHAR(16) DEFAULT 'active', last_evaluated_at DATETIME, "
        "created_at DATETIME, updated_at DATETIME, UNIQUE(slug)")
    create_index_if_missing(conn, dialect, "ix_squads_leader_agent_id", "squads", "leader_agent_id")
    create_index_if_missing(conn, dialect, "ix_squads_status", "squads", "status")

    create_table_if_missing(conn, dialect, "squad_members",
        f"id {pk}, squad_id INTEGER NOT NULL, member_kind VARCHAR(16) DEFAULT 'agent', "
        "member_id VARCHAR(64) NOT NULL, created_at DATETIME, "
        "UNIQUE(squad_id, member_kind, member_id)")
    create_index_if_missing(conn, dialect, "ix_squad_members_squad_id", "squad_members", "squad_id")
    create_index_if_missing(conn, dialect, "ix_squad_members_member_id", "squad_members", "member_id")

    # 首批五类资产：加归属两列（存量默认 personal、team_id 为空 → 零回填）
    for table in ("agents", "workflows", "tools", "knowledge_sources", "domains"):
        add_column_if_missing(conn, dialect, table, "team_id", "INTEGER")
        add_column_if_missing(conn, dialect, table, "owner_kind", "VARCHAR(16) DEFAULT 'personal'")
        create_index_if_missing(conn, dialect, f"ix_{table}_team_id", table, "team_id")

    # 指派小队 → leader 任务标记
    add_column_if_missing(conn, dialect, "work_items", "squad_id", "INTEGER")
    add_column_if_missing(conn, dialect, "work_items", "is_leader_task", "INTEGER DEFAULT 0")
    create_index_if_missing(conn, dialect, "ix_work_items_squad_id", "work_items", "squad_id")
    create_index_if_missing(conn, dialect, "ix_work_items_is_leader_task", "work_items", "is_leader_task")



def m011_trace_spans_observability(conn, dialect: str) -> None:
    """P2-4 前置：trace_spans 补父子链与产端字段（expand-only）。

    旧表把 `instance_id` / `to_agent_id` 设为 NOT NULL，只能装编排实例内的调用；
    绝大多数模型调用（chat / tool）没有实例，于是这张表长期零行。SQLite 不能改
    可空性，因此整表重建（旧行按列搬，缺失列给默认值）。表此前实测零写入，
    但迁移仍按「保数据」写。
    """
    cols = _columns(conn, dialect, "trace_spans")
    if not cols or "trace_id" in cols:
        return

    new = "trace_spans__p2_4"
    cur = conn.cursor()
    cur.execute(f"DROP TABLE IF EXISTS {new}")
    cur.execute(
        f"CREATE TABLE {new} (id {_pk_clause(dialect)}, trace_id VARCHAR(32), "
        "parent_span_id INTEGER, instance_id INTEGER, from_agent_id INTEGER, "
        "to_agent_id INTEGER, owner_id VARCHAR(64), name VARCHAR(128), "
        "span_kind VARCHAR(16), status VARCHAR(16), duration_ms INTEGER DEFAULT 0, "
        "tokens INTEGER DEFAULT 0, input_hash VARCHAR(64), output_hash VARCHAR(64), "
        "span_type VARCHAR(16), timestamp DATETIME)"
    )
    ph = "%s" if dialect == "mysql" else "?"
    cur.execute(
        "SELECT id, instance_id, from_agent_id, to_agent_id, duration_ms, tokens, "
        "input_hash, output_hash, span_type, timestamp FROM trace_spans"
    )
    rows = cur.fetchall()
    for row in rows:
        cur.execute(
            f"INSERT INTO {new} (id, instance_id, from_agent_id, to_agent_id, duration_ms, "
            f"tokens, input_hash, output_hash, span_type, timestamp, trace_id, span_kind, status) "
            f"VALUES ({ph}, {ph}, {ph}, {ph}, {ph}, {ph}, {ph}, {ph}, {ph}, {ph}, '', 'internal', 'ok')",
            row,
        )
    cur.execute("DROP TABLE trace_spans")
    cur.execute(f"ALTER TABLE {new} RENAME TO trace_spans")
    for index, column in (
        ("ix_trace_spans_trace_id", "trace_id"),
        ("ix_trace_spans_parent_span_id", "parent_span_id"),
        ("ix_trace_spans_instance_id", "instance_id"),
        ("ix_trace_spans_to_agent_id", "to_agent_id"),
        ("ix_trace_spans_owner_id", "owner_id"),
        ("ix_trace_spans_status", "status"),
        ("ix_trace_spans_timestamp", "timestamp"),
    ):
        create_index_if_missing(conn, dialect, index, "trace_spans", column)



def m012_declarative_api(conn, dialect: str) -> None:
    """P2-5：change_log 单账本 + resource_conditions（generation/observedGeneration）。"""
    pk = _pk_clause(dialect)
    create_table_if_missing(conn, dialect, "change_log",
        f"id {pk}, resource_type VARCHAR(32) NOT NULL, resource_id VARCHAR(64), "
        "generation INTEGER DEFAULT 1, actor VARCHAR(64), action VARCHAR(32), "
        "before_hash VARCHAR(64), after_hash VARCHAR(64), payload_json TEXT, created_at DATETIME")
    for index, cols in (
        ("ix_change_log_resource", "resource_type, resource_id"),
        ("ix_change_log_generation", "generation"),
        ("ix_change_log_created_at", "created_at"),
    ):
        create_index_if_missing(conn, dialect, index, "change_log", cols)

    create_table_if_missing(conn, dialect, "resource_conditions",
        f"id {pk}, resource_type VARCHAR(32) NOT NULL, resource_id VARCHAR(64), "
        "condition_type VARCHAR(32) DEFAULT 'Ready', status VARCHAR(8) DEFAULT 'True', "
        "reason VARCHAR(64), message TEXT, generation INTEGER DEFAULT 1, "
        "observed_generation INTEGER DEFAULT 0, last_transition_at DATETIME, "
        "UNIQUE(resource_type, resource_id, condition_type)")
    create_index_if_missing(conn, dialect, "ix_resource_conditions_resource",
                            "resource_conditions", "resource_type, resource_id")



def m017_agent_prompt_fields(conn, dialect: str) -> None:
    """T-05：Agent 人设三件落库（system_prompt / role_def / sop）。"""
    for column in ("system_prompt", "role_def", "sop"):
        add_column_if_missing(conn, dialect, "agents", column, "TEXT")


def m016_domain_attribution_policy(conn, dialect: str) -> None:
    """R8-2 剩余面：域级 accountable 策略表（一域一条；无行 = 现状）。"""
    pk = _pk_clause(dialect)
    create_table_if_missing(conn, dialect, "domain_attribution_policies",
        f"id {pk}, domain_id INTEGER NOT NULL, accountable_kind VARCHAR(16) DEFAULT 'originator', "
        "accountable_ref VARCHAR(64), updated_by VARCHAR(64), updated_at DATETIME, "
        "UNIQUE(domain_id)")
    create_index_if_missing(conn, dialect, "ix_domain_attr_policy_domain",
                            "domain_attribution_policies", "domain_id")


def m015_attribution_columns(conn, dialect: str) -> None:
    """R8-2：任务与运行各加归因双列（originator 只鉴权 / accountable 只审计成本）。

    存量**零回填**：老行两列为空串，表示「历史数据未归因」——不猜、不拿 creator 顶替。
    """
    for table in ("work_items", "work_item_runs"):
        add_column_if_missing(conn, dialect, table, "originator_id", "VARCHAR(64) DEFAULT ''")
        add_column_if_missing(conn, dialect, table, "accountable_id", "VARCHAR(64) DEFAULT ''")
        create_index_if_missing(conn, dialect, f"ix_{table}_originator_id",
                                table, "originator_id")
        create_index_if_missing(conn, dialect, f"ix_{table}_accountable_id",
                                table, "accountable_id")


def m014_rsi_review_and_switches(conn, dialect: str) -> None:
    """R7-4/R7-5/R6-4：记忆补四列（因果前缀 + 防污染）+ 晋升评审账 + 类目开关。"""
    pk = _pk_clause(dialect)
    for column, ddl in (
        ("source_seq", "INTEGER DEFAULT 0"),
        ("cites_seq", "INTEGER DEFAULT 0"),
        ("pollution_flagged", "INTEGER DEFAULT 0"),
        ("post_ingest_scan", "INTEGER DEFAULT 0"),
    ):
        add_column_if_missing(conn, dialect, "memories", column, ddl)

    create_table_if_missing(conn, dialect, "promotion_reviews",
        f"id {pk}, memory_id INTEGER NOT NULL, verdict VARCHAR(16) DEFAULT 'no_entry', "
        "fields_complete INTEGER DEFAULT 0, causal_check INTEGER DEFAULT 1, "
        "pollution_scan INTEGER DEFAULT 0, reviewer VARCHAR(64), note TEXT, "
        "created_at DATETIME")
    create_index_if_missing(conn, dialect, "ix_promotion_reviews_memory_id",
                            "promotion_reviews", "memory_id")
    create_index_if_missing(conn, dialect, "ix_promotion_reviews_verdict",
                            "promotion_reviews", "verdict")

    create_table_if_missing(conn, dialect, "rsi_switches",
        "category VARCHAR(16) PRIMARY KEY, enabled INTEGER DEFAULT 1, "
        "updated_by VARCHAR(64), updated_at DATETIME")


def m013_rsi_governance(conn, dialect: str) -> None:
    """R6/R7：记忆四层 / 提案 / 可改面 / 熔断四表。"""
    pk = _pk_clause(dialect)

    create_table_if_missing(conn, dialect, "memories",
        f"id {pk}, layer VARCHAR(4) DEFAULT 'L1', kind VARCHAR(8) DEFAULT 'positive', "
        "scope VARCHAR(16) DEFAULT 'agent', owner_id VARCHAR(64), cue TEXT, lesson TEXT, "
        "evidence_json TEXT, source_ref VARCHAR(256), status VARCHAR(16) DEFAULT 'no_entry', "
        "confounded INTEGER DEFAULT 0, decay_score INTEGER DEFAULT 100, "
        "last_used_at DATETIME, created_at DATETIME")
    for index, col in (
        ("ix_memories_layer", "layer"),
        ("ix_memories_kind", "kind"),
        ("ix_memories_scope", "scope"),
        ("ix_memories_owner_id", "owner_id"),
        ("ix_memories_source_ref", "source_ref"),
        ("ix_memories_status", "status"),
    ):
        create_index_if_missing(conn, dialect, index, "memories", col)

    create_table_if_missing(conn, dialect, "orchestration_proposals",
        f"id {pk}, title VARCHAR(255), dimension VARCHAR(16) DEFAULT 'invariant', "
        "surface_name VARCHAR(64), target VARCHAR(256), status VARCHAR(24) DEFAULT 'generated', "
        "budget_steps INTEGER DEFAULT 10, used_steps INTEGER DEFAULT 0, "
        "budget_tokens INTEGER DEFAULT 20000, used_tokens INTEGER DEFAULT 0, "
        "probe_json TEXT, shadow_json TEXT, judge_model VARCHAR(128), "
        "domain_signoff_json TEXT, approved_by VARCHAR(64), approved_at DATETIME, "
        "created_at DATETIME, updated_at DATETIME")
    for index, col in (
        ("ix_orchestration_proposals_dimension", "dimension"),
        ("ix_orchestration_proposals_surface_name", "surface_name"),
        ("ix_orchestration_proposals_status", "status"),
    ):
        create_index_if_missing(conn, dialect, index, "orchestration_proposals", col)

    create_table_if_missing(conn, dialect, "surface_manifests",
        f"id {pk}, name VARCHAR(64) NOT NULL, allow_edit_json TEXT, owner_id VARCHAR(64), "
        "created_at DATETIME, UNIQUE(name)")
    create_index_if_missing(conn, dialect, "ix_surface_manifests_name",
                            "surface_manifests", "name")

    create_table_if_missing(conn, dialect, "breaker_states",
        "name VARCHAR(32) PRIMARY KEY, status VARCHAR(16) DEFAULT 'closed', "
        "reason VARCHAR(255), counter INTEGER DEFAULT 0, opened_at DATETIME, updated_at DATETIME")



def m018_users_and_audit_tables(conn, dialect: str) -> None:
    """用户档案与审计日志表化（裁定⑦：MySQL 为权威档，文件态退化为导入源/兜底）。

    口令只存哈希；`project_ids`/`custom_permissions` 用 TEXT 存 JSON 数组
    （SQLite 与 MySQL 都能存，读侧自己 json.loads——不依赖方言的 JSON 类型）。
    """
    create_table_if_missing(conn, dialect, "app_users",
        "id VARCHAR(64) PRIMARY KEY, name VARCHAR(128), role VARCHAR(16) DEFAULT 'member', "
        "password_hash VARCHAR(512), must_change_password BOOLEAN DEFAULT 0, "
        "project_ids TEXT, custom_permissions TEXT, active BOOLEAN DEFAULT 1, "
        "created_at VARCHAR(32), updated_at DATETIME")
    create_index_if_missing(conn, dialect, "ix_app_users_role", "app_users", "role")

    create_table_if_missing(conn, dialect, "audit_log",
        f"id {_pk_clause(dialect)}, timestamp VARCHAR(32), user_id VARCHAR(64), "
        "user_name VARCHAR(128), action VARCHAR(64), target TEXT, target_type VARCHAR(64), "
        "detail TEXT, ip VARCHAR(64), result VARCHAR(16) DEFAULT 'success'")
    create_index_if_missing(conn, dialect, "ix_audit_log_timestamp", "audit_log", "timestamp")
    create_index_if_missing(conn, dialect, "ix_audit_log_user", "audit_log", "user_id")
    create_index_if_missing(conn, dialect, "ix_audit_log_action", "audit_log", "action")



def m019_runtime_registry(conn, dialect: str) -> None:
    """运行时发现注册表（v22 · §6.28）：daemon 上报的「机器 × CLI × 协议族」。

    - 唯一键 `(machine_id, cli, protocol_family)` → daemon 重启只更新不新建（AC-1）
    - `models` / `capabilities` 用 TEXT 存 JSON 数组：不依赖方言 JSON 类型，读侧自解析（D6/D7）
    - **不落 status 列**：online/offline 由 `last_seen` 在读侧现算（D5）
    - 不存任何凭据字段：账号 / OAuth / Key 留成员本机（AC-7）
    """
    create_table_if_missing(conn, dialect, "runtime_registry",
        f"id {_pk_clause(dialect)}, machine_id VARCHAR(64) NOT NULL, machine_name VARCHAR(128), "
        "cli VARCHAR(32) NOT NULL, protocol_family VARCHAR(16) NOT NULL DEFAULT 'exec', "
        "binary_path VARCHAR(512), source_file VARCHAR(64), version VARCHAR(64), "
        "models TEXT, models_error VARCHAR(200), capabilities TEXT, "
        "owner_id VARCHAR(64) NOT NULL, visibility VARCHAR(16) DEFAULT 'private', "
        "last_seen DATETIME, created_at DATETIME, updated_at DATETIME, "
        "UNIQUE(machine_id, cli, protocol_family)")
    create_index_if_missing(conn, dialect, "ix_runtime_registry_owner",
                            "runtime_registry", "owner_id")
    create_index_if_missing(conn, dialect, "ix_runtime_registry_last_seen",
                            "runtime_registry", "last_seen")


def m020_tool_skill_files(conn, dialect: str) -> None:
    """工具库的**多文件技能包**（v23 · multica 迁移）：`files_json` = [{path, content}] 的 JSON 文本。

    为什么用 TEXT 存 JSON：`m019` 已定「不依赖方言 JSON 类型、读侧自解析」，
    SQLite / MySQL 同一份 DDL 都能跑（MySQL 上 TEXT 存 JSON 文本同样合法）。
    只给 `tools` 加列，不新建表：技能 = `tools.type='skill'` 的一种，文件是它的附属内容。
    """
    add_column_if_missing(conn, dialect, "tools", "files_json", "TEXT")


def m021_tool_skill_files_longtext(conn, dialect: str) -> None:
    """把 `tools.files_json` 从 TEXT(64KB) 拓宽到 MEDIUMTEXT(16MB)（MySQL）。

    为什么需要：多文件技能包会超过 64KB——multica 现网实测有技能「正文 + 12 个文件」序列化后
    >86KB，TEXT 列直接 `Data too long for column 'files_json'`（真库撞到过）。
    SQLite 无宽度概念，跳过；已是 mediumtext/longtext 时幂等跳过。
    """
    if _is_sqlite(dialect):
        return
    if "files_json" not in _columns(conn, dialect, "tools"):
        return
    cur = conn.cursor()
    cur.execute("SELECT data_type FROM information_schema.columns "
                "WHERE table_schema=DATABASE() AND table_name='tools' AND column_name='files_json'")
    row = cur.fetchone()
    if not row or (row[0] or "").lower() in ("mediumtext", "longtext"):
        return
    cur.execute("ALTER TABLE tools MODIFY COLUMN files_json MEDIUMTEXT")


def m022_tool_config_and_squad_role(conn, dialect: str) -> None:
    """工具通用 config（multica `skill.config`）+ 小队成员角色（multica `squad_member.role`）。

    - `tools.config_json`：TEXT 存 JSON（与 019/020 同口径，方言无关）；
    - `squad_members.role`：'' = 未标注（multica 有 member / leader / expert-reviewer 三种）。
    """
    add_column_if_missing(conn, dialect, "tools", "config_json", "TEXT")
    add_column_if_missing(conn, dialect, "squad_members", "role", "VARCHAR(32) DEFAULT ''")


def m023_agent_extra_fields(conn, dialect: str) -> None:
    """Agent 的迁移补齐字段（multica `agent` 表里有、agentflow 原来没有的列）。

    `avatar_url` 是 multica 的 `emoji:🧠` 形态（本机 38 个 Agent 全部有值）；
    其余是 opaque 配置块，用 TEXT 存 JSON 文本（不依赖方言 JSON 类型）。
    """
    for column, ddl in (
        ("avatar_url", "VARCHAR(512)"),
        ("custom_env", "TEXT"),
        ("custom_args", "TEXT"),
        ("mcp_config", "TEXT"),
        ("thinking_level", "VARCHAR(16)"),
        ("service_tier", "VARCHAR(16)"),
        ("composio_toolkit_allowlist", "TEXT"),
    ):
        add_column_if_missing(conn, dialect, "agents", column, ddl)


def m024_agent_tools(conn, dialect: str) -> None:
    """Agent ↔ 工具/技能 关联表（multica `agent_skill` 的落点）。

    agentflow 此前没有这层关系：技能只能躺在工具库里，挂不到具体 Agent 上。
    唯一键 `(agent_id, tool_id)`：重复绑定幂等，不产生重复行。
    """
    create_table_if_missing(conn, dialect, "agent_tools",
        f"id {_pk_clause(dialect)}, agent_id INT NOT NULL, tool_id INT NOT NULL, "
        "created_at DATETIME, UNIQUE(agent_id, tool_id)")
    create_index_if_missing(conn, dialect, "ix_agent_tools_agent", "agent_tools", "agent_id")
    create_index_if_missing(conn, dialect, "ix_agent_tools_tool", "agent_tools", "tool_id")


def m019_decision_and_finetune(conn, dialect: str) -> None:
    """决策模型登记 + 微调批次表（P4：小模型决策面）。

    只加不删；bindings 用 TEXT 存 JSON 数组（方言无关）；健康态默认 `unprobed`——没探测过不写 healthy。
    """
    create_table_if_missing(conn, dialect, "decision_models",
        f"id {_pk_clause(dialect)}, owner_id VARCHAR(64) NOT NULL, name VARCHAR(128) NOT NULL, "
        "track VARCHAR(16) DEFAULT 'local', kind VARCHAR(64), health VARCHAR(16) DEFAULT 'unprobed', "
        "latency_p95_ms INTEGER, threshold FLOAT DEFAULT 0.6, escalated INTEGER DEFAULT 0, "
        "fallback INTEGER DEFAULT 0, bindings TEXT, enabled BOOLEAN DEFAULT 1, "
        "created_at DATETIME, updated_at DATETIME")
    create_index_if_missing(conn, dialect, "ix_decision_models_owner", "decision_models", "owner_id")

    create_table_if_missing(conn, dialect, "finetune_batches",
        f"id {_pk_clause(dialect)}, owner_id VARCHAR(64) NOT NULL, task_name VARCHAR(128) NOT NULL, "
        "base_model VARCHAR(128), data_sessions INTEGER DEFAULT 0, data_memories INTEGER DEFAULT 0, "
        "fingerprint VARCHAR(64), engine VARCHAR(128), hw_ok BOOLEAN DEFAULT 0, "
        "status VARCHAR(24) DEFAULT 'draft', acc FLOAT, ece FLOAT, agree FLOAT, "
        "gate_verdict VARCHAR(16) DEFAULT 'blocked', gate_reason TEXT, created_at DATETIME")
    create_index_if_missing(conn, dialect, "ix_finetune_batches_owner", "finetune_batches", "owner_id")


def m025_automations_center(conn, dialect: str) -> None:
    """自动化中心四表（P3-1，原型 automations.html 九节）。

    为什么是 025 而不是 020：020/021…024 已被 v23 multica 迁移占用，账本按 version 字符串
    判重，重号会静默顶掉已有迁移（pending 判的是集合成员），所以取下一个空号。

    为什么拆四张表：⑨ 的「一个自动化 = 三段构成」要求 Runbook / 负责人 / 触发器分开存
    （改一段不覆盖另两段），⑥ 的「两级账本」要求运行史与投递记录分开记
    （跑了什么 ⟂ 外面投了什么），混一张表就没法分账。
    `runbook` / `event_filter` 用 TEXT 存 JSON：方言无关（SQLite 与 MySQL 都不需要 JSON 类型）。
    """
    create_table_if_missing(conn, dialect, "automations",
        f"id {_pk_clause(dialect)}, owner_id VARCHAR(64) NOT NULL, name VARCHAR(128) NOT NULL, "
        "runbook TEXT, owner_track VARCHAR(16) DEFAULT 'agent', owner_id_ref VARCHAR(64) DEFAULT '', "
        "exec_mode VARCHAR(16) DEFAULT 'run_only', status VARCHAR(16) DEFAULT 'enabled', "
        "enabled BOOLEAN DEFAULT 1, breaker_open BOOLEAN DEFAULT 0, breaker_reason TEXT, "
        "paused_reason TEXT, spec_version INTEGER DEFAULT 1, "
        "created_at DATETIME, updated_at DATETIME")
    create_index_if_missing(conn, dialect, "ix_automations_owner", "automations", "owner_id")

    create_table_if_missing(conn, dialect, "automation_triggers",
        f"id {_pk_clause(dialect)}, automation_id INT NOT NULL, kind VARCHAR(16) DEFAULT 'schedule', "
        "cron VARCHAR(64), timezone VARCHAR(64) DEFAULT 'Asia/Shanghai', "
        "secret VARCHAR(128), secret_preview VARCHAR(64), event_filter TEXT, "
        "payload_limit INTEGER DEFAULT 65536, enabled BOOLEAN DEFAULT 1, created_at DATETIME")
    create_index_if_missing(conn, dialect, "ix_automation_triggers_auto",
                            "automation_triggers", "automation_id")
    # webhook 投递要按 token 反查触发器：唯一索引把「一个 token 两行」挡在建表这层
    create_index_if_missing(conn, dialect, "ix_automation_triggers_secret",
                            "automation_triggers", "secret", unique=True)

    create_table_if_missing(conn, dialect, "automation_runs",
        f"id {_pk_clause(dialect)}, automation_id INT NOT NULL, trigger_id INT, "
        "status VARCHAR(16) DEFAULT 'queued', summary TEXT, error TEXT, error_kind VARCHAR(16), "
        "spec_version INTEGER DEFAULT 1, started_at DATETIME, finished_at DATETIME")
    create_index_if_missing(conn, dialect, "ix_automation_runs_auto",
                            "automation_runs", "automation_id")

    create_table_if_missing(conn, dialect, "automation_deliveries",
        f"id {_pk_clause(dialect)}, automation_id INT NOT NULL, trigger_id INT, "
        "external_id VARCHAR(128), event VARCHAR(128), payload_bytes INTEGER DEFAULT 0, "
        "status VARCHAR(16) DEFAULT 'accepted', response_code INTEGER DEFAULT 200, "
        "dedup_key VARCHAR(128), error TEXT, replayed_from INT, received_at DATETIME")
    create_index_if_missing(conn, dialect, "ix_automation_deliveries_auto",
                            "automation_deliveries", "automation_id")


def m026_memory_dimensions_and_manifests(conn, dialect: str) -> None:
    """D1/D2/D3：记忆表的两个正交维度补齐 + 可改面声明对象补结构字段。

    D1（记忆表三处枚举）：设计 §3.3 要求「层级 + **内容域**（与层级正交）+ **生命周期**」三件事，
    代码只落了层级，且把**晋升状态**占用了 `status` 列。裁定（v24-doc-refresh RULINGS）：
    两个维度都要有，**列名以不破坏既有 API/UI 契约为约束**——
    - `status` **保持晋升状态**语义（`GET /api/rsi/memories?status=` 与前端 `MEMORY_STATUSES` 是已发布契约）
    - 新增 `life_status` 承载**生命周期**（active / revoked / stale-flagged）
    - 新增 `domain` 承载**内容域**（semantic / procedural / preference / instruction / rule），与层级正交
    D2：补 `content` / `confidence` / `quarantine_until`（静置期时间列）/ 来源链**真外键**两列。
    D3：`surface_manifests` 补设计要求的四个结构字段（本档称「非表」，代码已建表 → 补字段而非拆表）。
    """
    # ── memories ──
    add_column_if_missing(conn, dialect, "memories", "domain", "VARCHAR(32) NOT NULL DEFAULT 'semantic'")
    add_column_if_missing(conn, dialect, "memories", "life_status", "VARCHAR(16) NOT NULL DEFAULT 'active'")
    add_column_if_missing(conn, dialect, "memories", "content", "TEXT")
    add_column_if_missing(conn, dialect, "memories", "confidence", "FLOAT")
    add_column_if_missing(conn, dialect, "memories", "quarantine_until", "DATETIME")
    # 来源链真外键：设计要求「来源 run / 会话 id」。旧列 source_ref 保留兼容（外部引用/历史行）。
    add_column_if_missing(conn, dialect, "memories", "source_run_id", "INTEGER")
    add_column_if_missing(conn, dialect, "memories", "source_conversation_id", "INTEGER")
    if _is_sqlite(dialect):
        # SQLite 的表已带 FK 定义由 create_all 建；老库补列无法 ALTER 加表级 FK
        # （SQLite 限制）——列上 inline REFERENCES 仅对新表定义有效，这里如实注记。
        pass
    else:
        # MySQL 静默忽略 inline REFERENCES——权威档必须显式补表级约束
        add_fk_if_missing(conn, "memories", "fk_memories_source_run",
                          "FOREIGN KEY (source_run_id) REFERENCES work_item_runs(id)")
        add_fk_if_missing(conn, "memories", "fk_memories_source_conversation",
                          "FOREIGN KEY (source_conversation_id) REFERENCES conversations(id)")
    for index, col in (
        ("ix_memories_domain", "domain"),
        ("ix_memories_life_status", "life_status"),
        ("ix_memories_source_run_id", "source_run_id"),
        ("ix_memories_source_conversation_id", "source_conversation_id"),
    ):
        create_index_if_missing(conn, dialect, index, "memories", col)

    # ── surface_manifests（可改面声明对象的四个结构字段）──
    add_column_if_missing(conn, dialect, "surface_manifests", "path_pattern", "VARCHAR(512)")
    add_column_if_missing(conn, dialect, "surface_manifests", "cap_bytes", "INTEGER")
    add_column_if_missing(conn, dialect, "surface_manifests", "structure_rules", "TEXT")
    add_column_if_missing(conn, dialect, "surface_manifests", "exclusions", "TEXT")


def _fk_exists(conn, table: str, name: str) -> bool:
    """仅 MySQL：查表级外键约束是否存在（SQLite 的 FK 藏在列定义里，由 ALTER ADD
    COLUMN ... REFERENCES 直接生效，无需此查）。"""
    cur = conn.cursor()
    cur.execute("SELECT constraint_name FROM information_schema.table_constraints "
                "WHERE constraint_schema=DATABASE() AND table_name=%s AND constraint_name=%s",
                (table, name))
    return cur.fetchone() is not None


def add_fk_if_missing(conn, table: str, name: str, ddl: str) -> bool:
    """仅 MySQL 路径调用：SQLite 不支持 ALTER TABLE ADD CONSTRAINT FK。

    背景（v24 代码批真库首跑抓出）：MySQL **静默忽略** inline `ADD COLUMN ... REFERENCES`
    ——「day-1 真外键」在权威档必须用表级约束补实，否则只是名义外键。
    """
    if _fk_exists(conn, table, name):
        return False
    conn.cursor().execute(f"ALTER TABLE {table} ADD CONSTRAINT {name} {ddl}")
    return True


def drop_index_if_exists(conn, dialect: str, index: str, table: str | None = None) -> bool:
    """删索引（幂等）。MySQL 的 DROP INDEX 语法要带 ON <table>。"""
    if not _index_exists(conn, dialect, index, table or ""):
        return False
    if _is_sqlite(dialect):
        conn.cursor().execute(f"DROP INDEX {index}")
    else:
        conn.cursor().execute(f"DROP INDEX {index} ON {table}")
    return True


def m027_improvement_proposals_rename(conn, dialect: str) -> None:
    """D4：提案表名统一 + 补齐设计 §3.3 的五个字段。

    设计 §3.3 的表名是 `improvement_proposals`，代码里是 `orchestration_proposals`——
    **一条口径只活在一个地方**，表名必须统一（这里统一到设计侧的名字）。

    同时补设计的五个列（`proposal_diff` / `probe_pack` / `seed` / `blind_rank` /
    `fell_back`）：原先证据包只落在一个 `probe_json` 单串里，**不可按字段查询**。
    维度取值保留代码的可读写法 `invariant` / `domain`（与设计的 `INV` / `DOM` 等价），
    不为字面改数据——等价映射写进设计口径。

    兼容两条路径：
    - 老库（表名是旧的）→ 重命名 + 加列 + 迁索引；
    - 新库（`create_all` 已按 ORM 建出新表名，旧表被历史迁移 013 建出来且为空）→ 搬空表后删旧表。
    """
    old, new = "orchestration_proposals", "improvement_proposals"
    has_old, has_new = _table_exists(conn, dialect, old), _table_exists(conn, dialect, new)
    if has_old and not has_new:
        conn.cursor().execute(f"ALTER TABLE {old} RENAME TO {new}")
    elif has_old and has_new:
        # 新表由 create_all 建：ORM 每个非 Optional 的 `Mapped[X]` 都在 MySQL 落成
        # NOT NULL，而 `default=` 是**客户端默认**（SQLAlchemy 插入时代填，裸 SQL
        # INSERT…SELECT 带不上）——搬旧行即 1364。v24 真库首跑连抓两件
        # （proposal_diff/probe_pack → fell_back），证明逐列点修必漏第三件，
        # 这里**族级止住**：凡「新表有、旧表无、NOT NULL 且无库级默认」的列，
        # 一律先放可空再搬行（ORM 写入恒给值，放可空只是迁移容纳；旧行该列得 NULL，
        # 读取侧 `bool(None)=False` / `json.loads(None or "[]")` 已容）。SQLite 宽松无此题。
        old_cols = _columns(conn, dialect, old)
        new_cols = _columns(conn, dialect, new)
        if not _is_sqlite(dialect):
            cur = conn.cursor()
            cur.execute("SELECT column_name, column_type, is_nullable, column_default "
                        "FROM information_schema.columns "
                        "WHERE table_schema=DATABASE() AND table_name=%s", (new,))
            for col, ctype, nullable, dflt in cur.fetchall():
                if col == "id" or col in old_cols:
                    continue
                if str(nullable).upper() == "NO" and dflt is None:
                    cur.execute(f"ALTER TABLE {new} MODIFY {col} {ctype} NULL")
        # 搬行**带 id**（引用一致性：probe_evidence.proposal_id 指向这些 id）
        shared = [c for c in old_cols if c in new_cols and c != "id"]
        if shared:
            cols_sql = "id, " + ", ".join(shared)
            conn.cursor().execute(
                f"INSERT INTO {new} ({cols_sql}) SELECT id, {', '.join(shared)} FROM {old} "
                f"WHERE id NOT IN (SELECT id FROM {new})"
            )
        conn.cursor().execute(f"DROP TABLE {old}")
    # 五个设计列
    add_column_if_missing(conn, dialect, new, "proposal_diff", "TEXT")
    add_column_if_missing(conn, dialect, new, "probe_pack", "TEXT")
    add_column_if_missing(conn, dialect, new, "seed", "INTEGER")
    add_column_if_missing(conn, dialect, new, "blind_rank", "INTEGER")
    add_column_if_missing(conn, dialect, new, "fell_back", "INTEGER DEFAULT 0")
    # 索引：老名换新名（SQLite 不支持改索引名 → 建新的、删旧的）。
    # 重命名后老索引挂在**新表**上（表名变了、索引名没变），所以按新表去删。
    for col in ("dimension", "surface_name", "status"):
        create_index_if_missing(conn, dialect, f"ix_improvement_proposals_{col}", new, col)
        drop_index_if_exists(conn, dialect, f"ix_orchestration_proposals_{col}", new)


def m028_governance_ledgers(conn, dialect: str) -> None:
    """D5：三张治理账表——探针证据包 / 作业预算账 / 规则版本账。

    设计 §3.3 与 §6.30 C/E/I：
    - `probe_evidence`：探针证据包（盲评位次 + 证据三件套 diff/trajectory/produced +
      原始资料 source_ref + `evidence` ∈ {trajectory, deliverable} + `similarity_mean`
      两两行级 Jaccard 均值，塌缩探测输入）。**全表无打分级字段**——把差异摆成布局
      交给模型读，**代码不写打分器**。
    - `exec_ledgers`：作业预算账（恒等式断言**事前写死**：批形状 k base + 2k 候选 +
      k 终身，参数由预算帽生成器定 → expected_*；actual_* 是实际发生；
      `budget_error` 预算偏差；`dup_label` 等式不符或标签重复=**批次失败**，不是事后账单；
      `fp_mark` / `cache_digest` 执行指纹幂等：不同配置绝不复用旧证据、配置漂移拒续跑）。
    - `rule_versions`：规则版本**不可变行账**（每版一行快照 + 理由 + 创建人）。
      运行史每行带 `spec_version`；界面显示 v1…vN + 版本 diff 只读 +「为何停用」可查；
      **不删被引用中的旧快照**（时间线要能复盘当时的规则）。
    """
    pk = _pk_clause(dialect)

    create_table_if_missing(conn, dialect, "probe_evidence",
        f"id {pk}, proposal_id INTEGER NOT NULL, label VARCHAR(64), "
        "diff_ref VARCHAR(512), trajectory_ref VARCHAR(512), produced_ref VARCHAR(512), "
        "source_ref VARCHAR(256), evidence VARCHAR(16) DEFAULT 'trajectory', "
        "similarity_mean FLOAT, created_at DATETIME")
    create_index_if_missing(conn, dialect, "ix_probe_evidence_proposal_id",
                            "probe_evidence", "proposal_id")

    create_table_if_missing(conn, dialect, "exec_ledgers",
        f"id {pk}, scope VARCHAR(256) NOT NULL, "
        "expected_rollouts INTEGER DEFAULT 0, expected_sessions INTEGER DEFAULT 0, "
        "actual_rollouts INTEGER DEFAULT 0, actual_sessions INTEGER DEFAULT 0, "
        "budget_error FLOAT, dup_label VARCHAR(256), fp_mark VARCHAR(128), "
        "cache_digest VARCHAR(128), created_at DATETIME")
    create_index_if_missing(conn, dialect, "ix_exec_ledgers_scope", "exec_ledgers", "scope")

    create_table_if_missing(conn, dialect, "rule_versions",
        f"id {pk}, automation_id INTEGER NOT NULL, version INTEGER NOT NULL, "
        "spec_json TEXT, reason VARCHAR(512), created_by VARCHAR(64), created_at DATETIME, "
        "UNIQUE(automation_id, version)")
    create_index_if_missing(conn, dialect, "ix_rule_versions_automation_id",
                            "rule_versions", "automation_id")


def m029_automation_kind_and_keys(conn, dialect: str) -> None:
    """D6/D7：自动化触发器加 `api` 型 · 投递账两键分开记账 · 自动化加小队引用列。

    - D6：`automation_triggers.kind` ∈ {schedule, webhook, **api**}——api 型是我方自扩展通道，
      设计明写「收口成本限定在 kind 枚举一处」（列本身是 VARCHAR，无需改 schema，只放开取值）。
    - D6：`webhook_deliveries`（代码表名 `automation_deliveries`）**两键分开记账**：
      `idem_key`（通用 Idempotency-Key）与 `delivery_key`（GitHub X-GitHub-Delivery）
      各一列——**不能合成一个键**（合成 = 一方来键会吃掉另一方的投递）。
      旧的 `dedup_key` 列保留兼容，新写入不再依赖它。
    - D7：不另加引用列——`owner_track="squad" + owner_id_ref` 就是存在指向（两轨负责人），
      级联查询沿它走（`disable_for_squad`）。本迁移只补两键列。
    """
    add_column_if_missing(conn, dialect, "automation_deliveries", "idem_key",
                          "VARCHAR(128)")
    add_column_if_missing(conn, dialect, "automation_deliveries", "delivery_key",
                          "VARCHAR(128)")
    for index, col in (
        ("ix_automation_deliveries_idem_key", "idem_key"),
        ("ix_automation_deliveries_delivery_key", "delivery_key"),
    ):
        create_index_if_missing(conn, dialect, index, "automation_deliveries", col)


def m030_golden_sets(conn, dialect: str) -> None:
    """D10：金标集实体表——「冻结金标 + 异厂系 judge」从**调用方自报布尔**升级为**平台按实体校验**。

    设计 R7-1 终身门：影子重放必须用**冻结的金标**、judge 必须**异厂**。
    现状是 `golden_set_frozen`/`cross_vendor` 两个入参布尔（`rsi_api.py:229-230`），
    平台不校验——等于门禁可被自报绕过。本迁移落实体：
    - `golden_sets`：金标集（cases_json）+ `frozen`（冻结由管理员动作置位，记 frozen_at/by）
      + `produced_by`（金标产出厂牌——异厂判定基准：judge 厂牌 == produced_by ⇒ 拒绝，fail-closed）
      + `eval_mark`（内容指纹：防污染闸的比对物，`rsi_service._pollution_scan` 之外的结构面）。
    """
    pk = _pk_clause(dialect)
    create_table_if_missing(conn, dialect, "golden_sets",
        f"id {pk}, name VARCHAR(128) NOT NULL, kind VARCHAR(32) DEFAULT 'eval_set', "
        "cases_json TEXT DEFAULT '[]', produced_by VARCHAR(64) DEFAULT '', "
        "frozen BOOLEAN DEFAULT 0, frozen_at DATETIME, frozen_by VARCHAR(64) DEFAULT '', "
        "eval_mark VARCHAR(128) DEFAULT '', owner_id VARCHAR(64) DEFAULT '', "
        "created_at DATETIME, UNIQUE(name)")
    create_index_if_missing(conn, dialect, "ix_golden_sets_name", "golden_sets", "name")


def m031_rsi_switch_reason(conn, dialect: str) -> None:
    """D11：`rsi_switches` 补「操作必填原因」——设计 §3.3/§6.30 E 的状态转换层纪律。

    停用类目是「必须人批」的动作：原因进列、进审计，不靠提示词（CLAUDE.md 纪律）。
    （「四类目 + 全局一行」的全局行本轮仍挂账：前端已按「无总闸端点、逐类目」如实呈现，
    全局行改动面涉及前端聚合语义，另行批次收口。）
    """
    add_column_if_missing(conn, dialect, "rsi_switches", "last_reason", "VARCHAR(512)")
    add_column_if_missing(conn, dialect, "rsi_switches", "last_actor", "VARCHAR(64)")


def m032_rsi_global_switch(conn, dialect: str) -> None:
    """R25-7（人工裁定 · v25）：rsi_switches「四类目 + 全局」的**全局总闸行落表**。

    `category='global'` 一行；off 时短路一切类目（服务层 `assert_category_running`
    先查总闸，见 v25 治理批接线）。初值 enabled=1——总闸默认开 = 现状零行为变化。
    """
    if not _table_exists(conn, dialect, "rsi_switches"):
        return
    cur = conn.cursor()
    cur.execute("SELECT category FROM rsi_switches WHERE category = 'global'")
    if cur.fetchone() is not None:
        return
    ph = "%s" if dialect == "mysql" else "?"
    cur.execute(
        "INSERT INTO rsi_switches (category, enabled, updated_by, last_reason, last_actor, updated_at) "
        f"VALUES ({ph}, 1, {ph}, {ph}, {ph}, {ph})",
        ("global", "migration", "全局总闸初始插入（v25 R25-7 落表）", "system",
         datetime.datetime.utcnow()),
    )


def m033_squad_shape(conn, dialect: str) -> None:
    """R25-11（C 组 · 主档 html:1306）：squad 表族列形态补。

    - `squads.avatar_url`：主档有、代码缺 → 补列（NOT NULL DEFAULT ''，L-014 纪律）。
    - `squad_members.created_by`：入池动作留痕列（历史行 '' = 无主，不回填伪造）。
    - leader **真外键**：列名 leader_agent_id 保留（v21/v23 行注已认账，不做破坏性
      rename），但 MySQL 权威档补表级 `fk_squads_leader_agent`（ON DELETE RESTRICT）。
      SQLite 不支持 ALTER 加表级 FK → 本地体验档豁免（新建库由 ORM 声明建出）。
    """
    add_column_if_missing(conn, dialect, "squads", "avatar_url",
                          "VARCHAR(256) NOT NULL DEFAULT ''")
    add_column_if_missing(conn, dialect, "squad_members", "created_by",
                          "VARCHAR(64) NOT NULL DEFAULT ''")
    if not _is_sqlite(dialect) and _table_exists(conn, dialect, "agents"):
        add_fk_if_missing(conn, "squads", "fk_squads_leader_agent",
                          "FOREIGN KEY (leader_agent_id) REFERENCES agents(id) ON DELETE RESTRICT")


def m034_queue_shape(conn, dialect: str) -> None:
    """R25-11（C 组 · 主档 html:1307「任务队列扩列设计注」）：七列全补。

    trigger_comment_id / coalesced_comment_ids / handoff_note / fire_at（v21 行注认缺
    的四列）+ is_leader_task / squad_id / workflow_id（同注的其余设计列）。
    全部可空或带库级默认（MySQL 严格语义）。**写路径只接真实存在的投喂点**——
    coalesce 收据依赖评论表（代码暂无、主档 §3.3 未列，缺口挂 RULINGS 残项），
    本迁移先行落列，不造数。
    """
    for column, ddl in (
        ("trigger_comment_id", "INTEGER NULL"),
        ("coalesced_comment_ids", "TEXT NULL"),
        ("handoff_note", "TEXT NULL"),
        ("fire_at", "DATETIME NULL"),
        ("is_leader_task", "INTEGER NOT NULL DEFAULT 0"),
        ("squad_id", "INTEGER NULL"),
        ("workflow_id", "INTEGER NULL"),
    ):
        add_column_if_missing(conn, dialect, "scheduler_queue", column, ddl)
    create_index_if_missing(conn, dialect, "ix_scheduler_queue_squad_id",
                            "scheduler_queue", "squad_id")
    create_index_if_missing(conn, dialect, "ix_scheduler_queue_workflow_id",
                            "scheduler_queue", "workflow_id")


def m035_automation_shape(conn, dialect: str) -> None:
    """R25-11（C 组 · 主档 html:1308/:1311）：automations 三列 + trigger 签名密钥列。

    - `concurrency_policy` ∈ {skip, queue, replace}，默认 queue（=现状行为，不擅改语义）。
    - `issue_title_template`：产任务标题模板（'' = 用默认标题）。
    - `created_by`：创建人留痕（与 owner_id 归属人分开，沿 R8-2 归因纪律）。
    - `automation_triggers.signing_secret`：v25-R25-5 HMAC 双通道的前置列
      （'' = 未启用签名；校验逻辑在治理批，本迁移只落列）。
    """
    add_column_if_missing(conn, dialect, "automations", "concurrency_policy",
                          "VARCHAR(16) NOT NULL DEFAULT 'queue'")
    add_column_if_missing(conn, dialect, "automations", "issue_title_template",
                          "VARCHAR(256) NOT NULL DEFAULT ''")
    add_column_if_missing(conn, dialect, "automations", "created_by",
                          "VARCHAR(64) NOT NULL DEFAULT ''")
    add_column_if_missing(conn, dialect, "automation_triggers", "signing_secret",
                          "VARCHAR(128) NOT NULL DEFAULT ''")


def m036_collab_receipts(conn, dialect: str) -> None:
    """R25-11（C 组 · 主档 html:1313）：提及收据表 + 订阅泛化列。

    - `mention_targets`：「谁被叫醒」收据面（计划 vs 收据分账 §6.0 ⑪）。
      `comment_id` 为普通列非外键——代码无评论表（缺口如实挂账，不凭空造引用目标）。
    - `work_item_subscriptions` 补 subject_type / subscriber_type 泛化列（默认
      task / member = 现状语义）。**旧 UNIQUE(work_item_id,user_id) 保留不删**
      （expand-only）——「按来源多行」需表重建，如实挂残项。
    """
    pk = _pk_clause(dialect)
    create_table_if_missing(conn, dialect, "mention_targets",
        f"id {pk}, comment_id INTEGER, mentioned_type VARCHAR(16) DEFAULT 'member', "
        "mentioned_id VARCHAR(64) DEFAULT '', route_kind VARCHAR(32) DEFAULT 'explicit', "
        "will_wake INTEGER DEFAULT 0, skip_reason VARCHAR(256), created_at DATETIME")
    create_index_if_missing(conn, dialect, "ix_mention_targets_comment_id",
                            "mention_targets", "comment_id")
    create_index_if_missing(conn, dialect, "ix_mention_targets_mentioned_id",
                            "mention_targets", "mentioned_id")
    add_column_if_missing(conn, dialect, "work_item_subscriptions", "subject_type",
                          "VARCHAR(16) NOT NULL DEFAULT 'task'")
    add_column_if_missing(conn, dialect, "work_item_subscriptions", "subscriber_type",
                          "VARCHAR(16) NOT NULL DEFAULT 'member'")


def m037_im_bindings(conn, dialect: str) -> None:
    """R25-11（C 组 · 主档 html:1314）：IM 身份绑定表落表（与连接配置分层两表）。

    channel_configs 管「一 Agent × 一渠道怎么连」（凭据层），本表管
    「外部 workspace 的发信人 ≡ 平台哪个 user」（身份层）——跨租户/群空间
    的绑定不能塞进连接配置单行。状态 pending → bound → revoked（留痕不删行）。
    写入位点 = 入站身份解析处；当前无真实入站解析位点 → **表先行挂账**
    （同 exec_ledgers 模式，宁挂账不伪造绑定）。
    """
    pk = _pk_clause(dialect)
    create_table_if_missing(conn, dialect, "im_bindings",
        f"id {pk}, workspace_id VARCHAR(64) NOT NULL, external_user_id VARCHAR(128) NOT NULL, "
        "external_tenant VARCHAR(128) NOT NULL DEFAULT '', user_id VARCHAR(64) NOT NULL DEFAULT '', "
        "status VARCHAR(16) NOT NULL DEFAULT 'pending', created_at DATETIME, updated_at DATETIME, "
        "UNIQUE(workspace_id, external_user_id, external_tenant)")
    create_index_if_missing(conn, dialect, "ix_im_bindings_workspace_id",
                            "im_bindings", "workspace_id")
    create_index_if_missing(conn, dialect, "ix_im_bindings_user_id",
                            "im_bindings", "user_id")
    create_index_if_missing(conn, dialect, "ix_im_bindings_status",
                            "im_bindings", "status")


MIGRATIONS: list[Migration] = [
    ("001_agent_memories_domain_id", "agent_memories 增加 domain_id（域归属）", m001_agent_memories_domain_id),
    ("002_knowledge_sources_status_file_path", "knowledge_sources 增加 status/file_path", m002_knowledge_sources_status_file_path),
    ("003_knowledge_tags", "新建 knowledge_tags 标签表", m003_knowledge_tags),
    ("004_knowledge_source_tags", "新建 knowledge_source_tags 连接表", m004_knowledge_source_tags),
    ("005_scheduled_tasks", "新建 scheduled_tasks 定时任务表", m005_scheduled_tasks),
    ("006_auth_sessions", "新建 sessions/PAT 令牌表（P0-1 服务端会话）", m006_auth_sessions),
    ("007_cluster_state", "队列落库+租约/心跳，限流/退避/租约/监控偏移四表（P1-7）", m007_cluster_state),
    ("008_alerts_and_queue_merge", "告警落表 + 双队列并表（P1-16）", m008_alerts_and_queue_merge),
    ("009_collab_layer", "任务/运行连接/订阅/收件箱四表（P1-4）", m009_collab_layer),
    ("010_teams_and_squads", "Team/Squad 两实体 + 五类资产归属列（R5）", m010_teams_and_squads),
    ("011_trace_spans_observability", "trace_spans 父子链与产端字段（P2-4）", m011_trace_spans_observability),
    ("012_declarative_api", "change_log 单账本 + resource_conditions（P2-5）", m012_declarative_api),
    ("013_rsi_governance", "记忆四层/提案/可改面/熔断四表（R6/R7）", m013_rsi_governance),
    ("014_rsi_review_and_switches", "记忆因果前缀/防污染 + 晋升评审账 + 类目开关（R6-4/R7-4/R7-5）", m014_rsi_review_and_switches),
    ("015_attribution_columns", "任务/运行归因双列 originator⟂accountable（R8-2）", m015_attribution_columns),
    ("016_domain_attribution_policy", "域级 accountable 策略表（R8-2 剩余面）", m016_domain_attribution_policy),
    ("017_agent_prompt_fields", "Agent 人设三件落库（T-05）", m017_agent_prompt_fields),
    ("018_users_and_audit_tables", "用户档案与审计日志表化（裁定⑦收尾，T-07）", m018_users_and_audit_tables),
    ("019_decision_and_finetune", "决策模型登记 + 微调批次（P4 小模型决策面）", m019_decision_and_finetune),
    ("019_runtime_registry", "运行时发现注册表（§6.28，daemon 上报机器×CLI×协议族）", m019_runtime_registry),
    ("020_tool_skill_files", "工具库多文件技能包（files_json，v23 multica 迁移）", m020_tool_skill_files),
    ("021_tool_skill_files_longtext", "技能文件包拓宽到 MEDIUMTEXT（>64KB 技能包，MySQL）", m021_tool_skill_files_longtext),
    ("022_tool_config_and_squad_role", "工具通用 config + 小队成员 role（v23 multica 迁移）", m022_tool_config_and_squad_role),
    ("023_agent_extra_fields", "Agent 迁移补齐字段（avatar/custom_env/自定义参数/mcp/thinking/服务档/工具白名单）", m023_agent_extra_fields),
    ("024_agent_tools", "Agent ↔ 工具/技能 关联表（multica agent_skill 落点）", m024_agent_tools),
    ("025_automations_center", "自动化中心四表（Runbook/负责人/触发器 + 两级账本，P3-1）", m025_automations_center),
    ("026_memory_dimensions_and_manifests", "记忆表补内容域/生命周期/正文/置信度/静置期/来源链真外键 + 可改面补四个结构字段（D1/D2/D3）", m026_memory_dimensions_and_manifests),
    ("027_improvement_proposals_rename", "提案表名统一为 improvement_proposals + 补五列（D4）", m027_improvement_proposals_rename),
    ("028_governance_ledgers", "三张治理账表：探针证据包 / 作业预算账 / 规则版本账（D5）", m028_governance_ledgers),
    ("029_automation_kind_and_keys", "自动化：api 型触发器 / 投递两键分开记账 / 小队引用列（D6/D7）", m029_automation_kind_and_keys),
    ("030_golden_sets", "金标集实体表：冻结/厂牌/指纹落库，影子门改平台校验（D10）", m030_golden_sets),
    ("031_rsi_switch_reason", "类目开关补必填原因与操作人列（D11）", m031_rsi_switch_reason),
    ("032_rsi_global_switch", "rsi_switches 全局总闸行落表：四类目+global（R25-7 · 人工裁定）", m032_rsi_global_switch),
    ("033_squad_shape", "squad 表族形态补：avatar_url / 成员 created_by / leader 表级 FK（MySQL）（R25-11）", m033_squad_shape),
    ("034_queue_shape", "任务队列设计注七列全补（trigger_comment_id 等 4 + is_leader_task/squad_id/workflow_id）（R25-11）", m034_queue_shape),
    ("035_automation_shape", "automations 并发策略/标题模板/created_by + trigger signing_secret（HMAC 前置）（R25-11）", m035_automation_shape),
    ("036_collab_receipts", "mention_targets 收据表 + 订阅泛化列（旧 UNIQUE 保留挂残项）（R25-11）", m036_collab_receipts),
    ("037_im_bindings", "im_bindings 身份绑定表落表（与连接配置分层 · 表先行挂账）（R25-11）", m037_im_bindings),
]


# ── 执行器 ──────────────────────────────────────────────────

def _ensure_ledger(conn, dialect: str) -> None:
    create_table_if_missing(conn, dialect, LEDGER,
        "version VARCHAR(64) PRIMARY KEY, description VARCHAR(255), applied_at DATETIME")


def applied_versions(conn, dialect: str) -> list[str]:
    _ensure_ledger(conn, dialect)
    cur = conn.cursor()
    cur.execute(f"SELECT version FROM {LEDGER} ORDER BY version")
    return [r[0] for r in cur.fetchall()]


def pending_versions(conn, dialect: str, migrations: Iterable[Migration] | None = None) -> list[str]:
    done = set(applied_versions(conn, dialect))
    return [v for v, _d, _f in (migrations or MIGRATIONS) if v not in done]


def apply_migrations(conn, dialect: str, migrations: Iterable[Migration] | None = None) -> list[str]:
    """应用未执行的迁移；返回本次应用的版本号列表（幂等：重跑返回 []）。"""
    _ensure_ledger(conn, dialect)
    todo = pending_versions(conn, dialect, migrations)
    applied: list[str] = []
    for version, desc, fn in (migrations or MIGRATIONS):
        if version not in todo:
            continue
        fn(conn, dialect)                      # 异常直接上抛，由调用方回滚
        conn.cursor().execute(
            f"INSERT INTO {LEDGER} (version, description, applied_at) VALUES (?, ?, ?)"
            if dialect != "mysql" else
            f"INSERT INTO {LEDGER} (version, description, applied_at) VALUES (%s, %s, %s)",
            (version, desc, datetime.datetime.utcnow()),
        )
        applied.append(version)
    conn.commit()
    return applied


# ── 回滚（D9：波 0 判据「可回滚」的兑现）────────────────────
#
# 机制：`DOWN` 登记「版本 → 回滚函数」；`rollback_to()` 从账上最高版**逐版逆序**回滚，
# 每版执行 down 并删除账行（之后 `apply_migrations` 可幂等重放）。
# **没登记 down 的版本显式拒绝**（`RollbackNotSupported`）——与执行隔离同一精神：
# 不假装能回滚。001–025 属历史迁移（部分含整表重建，不可逆），按需补 down，不冒充全量。

class RollbackNotSupported(RuntimeError):
    """该版本未登记 down，或目标区间内含未登记版本：显式拒绝，不静默半回滚。"""


def drop_column_if_exists(conn, dialect: str, table: str, column: str) -> bool:
    if not _table_exists(conn, dialect, table):
        return False
    if column not in _columns(conn, dialect, table):
        return False
    conn.cursor().execute(f"ALTER TABLE {table} DROP COLUMN {column}")
    return True


def drop_table_if_exists(conn, dialect: str, table: str) -> bool:
    if not _table_exists(conn, dialect, table):
        return False
    conn.cursor().execute(f"DROP TABLE {table}")
    return True


def _down_026(conn, dialect: str) -> None:
    if not _is_sqlite(dialect):
        # MySQL：列被外键引用时不许 DROP COLUMN——先摘约束
        for name in ("fk_memories_source_run", "fk_memories_source_conversation"):
            if _fk_exists(conn, "memories", name):
                conn.cursor().execute(f"ALTER TABLE memories DROP FOREIGN KEY {name}")
    # 先删索引再删列：SQLite 的 DROP COLUMN 不会带走该列上的索引（留下悬空即报错）
    for index in ("ix_memories_domain", "ix_memories_life_status",
                  "ix_memories_source_run_id", "ix_memories_source_conversation_id"):
        drop_index_if_exists(conn, dialect, index, "memories")
    for col in ("domain", "life_status", "content", "confidence", "quarantine_until",
                "source_run_id", "source_conversation_id"):
        drop_column_if_exists(conn, dialect, "memories", col)
    for col in ("path_pattern", "cap_bytes", "structure_rules", "exclusions"):
        drop_column_if_exists(conn, dialect, "surface_manifests", col)


def _down_027(conn, dialect: str) -> None:
    for col in ("proposal_diff", "probe_pack", "seed", "blind_rank", "fell_back"):
        drop_column_if_exists(conn, dialect, "improvement_proposals", col)
    if _table_exists(conn, dialect, "improvement_proposals"):
        conn.cursor().execute("ALTER TABLE improvement_proposals RENAME TO orchestration_proposals")


def _down_028(conn, dialect: str) -> None:
    for table in ("probe_evidence", "exec_ledgers", "rule_versions"):
        drop_table_if_exists(conn, dialect, table)


def _down_029(conn, dialect: str) -> None:
    for index in ("ix_automation_deliveries_idem_key",
                  "ix_automation_deliveries_delivery_key"):
        drop_index_if_exists(conn, dialect, index, "automation_deliveries")
    for col in ("idem_key", "delivery_key"):
        drop_column_if_exists(conn, dialect, "automation_deliveries", col)


def _down_030(conn, dialect: str) -> None:
    drop_table_if_exists(conn, dialect, "golden_sets")


def _down_031(conn, dialect: str) -> None:
    for col in ("last_reason", "last_actor"):
        drop_column_if_exists(conn, dialect, "rsi_switches", col)


def _down_032(conn, dialect: str) -> None:
    if _table_exists(conn, dialect, "rsi_switches"):
        conn.cursor().execute("DELETE FROM rsi_switches WHERE category = 'global'")


def _down_033(conn, dialect: str) -> None:
    if not _is_sqlite(dialect):
        # MySQL：先把 033 加的表级 FK 约束摘净（恢复回 033 之前的形状），再删列
        if _table_exists(conn, dialect, "squads") and _fk_exists(conn, "squads", "fk_squads_leader_agent"):
            conn.cursor().execute("ALTER TABLE squads DROP FOREIGN KEY fk_squads_leader_agent")
    drop_column_if_exists(conn, dialect, "squads", "avatar_url")
    drop_column_if_exists(conn, dialect, "squad_members", "created_by")


def _down_034(conn, dialect: str) -> None:
    for index in ("ix_scheduler_queue_squad_id", "ix_scheduler_queue_workflow_id"):
        drop_index_if_exists(conn, dialect, index, "scheduler_queue")
    for col in ("trigger_comment_id", "coalesced_comment_ids", "handoff_note",
                "fire_at", "is_leader_task", "squad_id", "workflow_id"):
        drop_column_if_exists(conn, dialect, "scheduler_queue", col)


def _down_035(conn, dialect: str) -> None:
    for col in ("concurrency_policy", "issue_title_template", "created_by"):
        drop_column_if_exists(conn, dialect, "automations", col)
    drop_column_if_exists(conn, dialect, "automation_triggers", "signing_secret")


def _down_036(conn, dialect: str) -> None:
    drop_table_if_exists(conn, dialect, "mention_targets")
    for col in ("subject_type", "subscriber_type"):
        drop_column_if_exists(conn, dialect, "work_item_subscriptions", col)


def _down_037(conn, dialect: str) -> None:
    drop_table_if_exists(conn, dialect, "im_bindings")


DOWN: dict[str, Callable[[object, str], None]] = {
    "037_im_bindings": _down_037,
    "036_collab_receipts": _down_036,
    "035_automation_shape": _down_035,
    "034_queue_shape": _down_034,
    "033_squad_shape": _down_033,
    "032_rsi_global_switch": _down_032,
    "031_rsi_switch_reason": _down_031,
    "026_memory_dimensions_and_manifests": _down_026,
    "027_improvement_proposals_rename": _down_027,
    "028_governance_ledgers": _down_028,
    "029_automation_kind_and_keys": _down_029,
    "030_golden_sets": _down_030,
}


def rollback_to(conn, dialect: str, target_version: str,
                migrations: Iterable[Migration] | None = None) -> list[str]:
    """把已应用迁移逐版回滚到 `target_version`（**不含**它，即它保持已应用）。

    - 先全量预检：回滚区间内任何一版没登记 down → 立刻 `RollbackNotSupported`，
      **一版都不动**（不做「回滚到一半发现不行」的半截状态）。
    - 成功路径：逆序执行 down + 从账本删行；返回本次回滚的版本列表（新→旧）。
    """
    _ensure_ledger(conn, dialect)
    known = [v for v, _d, _f in (migrations or MIGRATIONS)]
    done = applied_versions(conn, dialect)
    if target_version not in known:
        raise RollbackNotSupported(f"目标版本不在账本词汇表里：{target_version!r}")
    # 需要回滚的 = 已应用且排在 target 之后的版本，逆序（账上有、词汇表没有的不动它）
    to_undo = [v for v in done if v in known
               and known.index(v) > known.index(target_version)][::-1]
    missing = [v for v in to_undo if v not in DOWN]
    if missing:
        raise RollbackNotSupported(
            f"以下版本未登记 down，拒绝半截回滚：{missing}（001–025 属历史迁移，按需补登记）")
    rolled_back: list[str] = []
    ph = "%s" if dialect == "mysql" else "?"
    for version in to_undo:
        DOWN[version](conn, dialect)
        conn.cursor().execute(
            f"DELETE FROM {LEDGER} WHERE version = {ph}", (version,))
        rolled_back.append(version)
    conn.commit()
    return rolled_back
