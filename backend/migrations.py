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
