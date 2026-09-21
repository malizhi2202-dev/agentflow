"""SQLAlchemy 数据库引擎与 session 管理."""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

DATABASE_URL: str = os.environ.get(
    "DATABASE_URL",
    "sqlite:///" + os.path.join(os.path.dirname(__file__), "..", "platform.db")
)

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
    pool_pre_ping=True if "mysql" in DATABASE_URL else False,
    pool_recycle=3600,
)

# ── SQLite WAL 模式（允许并发读 + 一写，解决 "database is locked"）──
if "sqlite" in DATABASE_URL:
    from sqlalchemy import event
    @event.listens_for(engine, "connect")
    def _set_wal(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """创建所有表（开发环境使用，生产用 Alembic）。"""
    from models import Base
    Base.metadata.create_all(bind=engine)

    # ── 轻量级 schema 迁移（开发环境）──
    # 添加 agent_memories.domain_id 列（如果不存在）
    try:
        if "sqlite" in DATABASE_URL:
            import sqlite3
            db_path = DATABASE_URL.replace("sqlite:///", "")
            conn = sqlite3.connect(db_path)
            cur = conn.cursor()
            cur.execute("PRAGMA table_info(agent_memories)")
            cols = [r[1] for r in cur.fetchall()]
            if "domain_id" not in cols:
                cur.execute("ALTER TABLE agent_memories ADD COLUMN domain_id INTEGER REFERENCES domains(id) ON DELETE SET NULL")
                conn.commit()
                print("[migrate] agent_memories.domain_id 列已添加")
            else:
                print("[migrate] agent_memories.domain_id 列已存在，跳过")
            conn.close()
    except Exception as e:
        print(f"[migrate] agent_memories 迁移跳过: {e}")

    # ── knowledge_sources.status + file_path 迁移 ──
    try:
        if "sqlite" in DATABASE_URL:
            import sqlite3
            db_path = DATABASE_URL.replace("sqlite:///", "")
            conn = sqlite3.connect(db_path)
            cur = conn.cursor()
            cur.execute("PRAGMA table_info(knowledge_sources)")
            cols = [r[1] for r in cur.fetchall()]
            if "status" not in cols:
                cur.execute("ALTER TABLE knowledge_sources ADD COLUMN status VARCHAR(32)")
                conn.commit()
                print("[migrate] knowledge_sources.status 列已添加")
            if "file_path" not in cols:
                cur.execute("ALTER TABLE knowledge_sources ADD COLUMN file_path VARCHAR(1024)")
                conn.commit()
                print("[migrate] knowledge_sources.file_path 列已添加")
            conn.close()
    except Exception as e:
        print(f"[migrate] knowledge_sources 迁移跳过: {e}")

    # ── knowledge_tags + knowledge_source_tags 迁移 ──
    try:
        if "sqlite" in DATABASE_URL:
            import sqlite3
            db_path = DATABASE_URL.replace("sqlite:///", "")
            conn = sqlite3.connect(db_path)
            cur = conn.cursor()
            # knowledge_tags
            cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='knowledge_tags'")
            if not cur.fetchone():
                cur.execute("""
                    CREATE TABLE knowledge_tags (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name VARCHAR(64) NOT NULL,
                        color VARCHAR(7) NOT NULL DEFAULT '#3b82f6',
                        owner_id VARCHAR(64) NOT NULL,
                        created_at DATETIME
                    )
                """)
                cur.execute("CREATE INDEX ix_knowledge_tags_owner_id ON knowledge_tags(owner_id)")
                conn.commit()
                print("[migrate] knowledge_tags 表已创建")
            # knowledge_source_tags
            cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='knowledge_source_tags'")
            if not cur.fetchone():
                cur.execute("""
                    CREATE TABLE knowledge_source_tags (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        source_id INTEGER NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
                        tag_id INTEGER NOT NULL REFERENCES knowledge_tags(id) ON DELETE CASCADE,
                        created_at DATETIME,
                        UNIQUE(source_id, tag_id)
                    )
                """)
                cur.execute("CREATE INDEX ix_knowledge_source_tags_source_id ON knowledge_source_tags(source_id)")
                cur.execute("CREATE INDEX ix_knowledge_source_tags_tag_id ON knowledge_source_tags(tag_id)")
                conn.commit()
                print("[migrate] knowledge_source_tags 表已创建")
            conn.close()
    except Exception as e:
        print(f"[migrate] knowledge_tags 迁移跳过: {e}")

    # ── scheduled_tasks 迁移 ──
    try:
        if "sqlite" in DATABASE_URL:
            import sqlite3
            db_path = DATABASE_URL.replace("sqlite:///", "")
            conn = sqlite3.connect(db_path)
            cur = conn.cursor()
            cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='scheduled_tasks'")
            if not cur.fetchone():
                cur.execute("""
                    CREATE TABLE scheduled_tasks (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
                        cron_expr VARCHAR(64) NOT NULL,
                        capability VARCHAR(128) NOT NULL,
                        enabled BOOLEAN DEFAULT 1,
                        last_run DATETIME,
                        owner_id VARCHAR(64) NOT NULL,
                        name VARCHAR(128) DEFAULT '',
                        created_at DATETIME,
                        updated_at DATETIME
                    )
                """)
                cur.execute("CREATE INDEX ix_scheduled_tasks_agent_id ON scheduled_tasks(agent_id)")
                cur.execute("CREATE INDEX ix_scheduled_tasks_owner_id ON scheduled_tasks(owner_id)")
                conn.commit()
                print("[migrate] scheduled_tasks 表已创建")
            conn.close()
    except Exception as e:
        print(f"[migrate] scheduled_tasks 迁移跳过: {e}")


def get_db() -> Session:
    """FastAPI 依赖注入：获取数据库 session。"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
