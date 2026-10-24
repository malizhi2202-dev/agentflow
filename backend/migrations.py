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


MIGRATIONS: list[Migration] = [
    ("001_agent_memories_domain_id", "agent_memories 增加 domain_id（域归属）", m001_agent_memories_domain_id),
    ("002_knowledge_sources_status_file_path", "knowledge_sources 增加 status/file_path", m002_knowledge_sources_status_file_path),
    ("003_knowledge_tags", "新建 knowledge_tags 标签表", m003_knowledge_tags),
    ("004_knowledge_source_tags", "新建 knowledge_source_tags 连接表", m004_knowledge_source_tags),
    ("005_scheduled_tasks", "新建 scheduled_tasks 定时任务表", m005_scheduled_tasks),
    ("006_auth_sessions", "新建 sessions/PAT 令牌表（P0-1 服务端会话）", m006_auth_sessions),
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
