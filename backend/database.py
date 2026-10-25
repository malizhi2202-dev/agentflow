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
        # SQLite 默认**不执行**外键约束（MySQL 一直执行）——不打开则设计 §3.3 的
        # 「day-1 真外键」在本地档只是名义上的。打开它，让 SQLite 与权威档行为一致。
        # 注意：PRAGMA 必须逐连接设置，且不能在建表事务里改。
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """建表 + 应用未执行的 schema 迁移。

    迁移账本见 `migrations.py`：一行一版、幂等、失败即抛（旧实现是 5 段内联
    try/except + PRAGMA 探测，无账本、失败静默、且只对 SQLite 生效）。
    """
    from models import Base
    Base.metadata.create_all(bind=engine)

    from migrations import apply_migrations
    dialect = "sqlite" if "sqlite" in DATABASE_URL else "mysql"
    conn = engine.raw_connection()
    try:
        applied = apply_migrations(conn, dialect)
    finally:
        conn.close()
    if applied:
        print(f"[migrate] 已应用 {len(applied)} 个迁移: {', '.join(applied)}")
    else:
        print("[migrate] 无待应用迁移")


def get_db() -> Session:
    """FastAPI 依赖注入：获取数据库 session。"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
