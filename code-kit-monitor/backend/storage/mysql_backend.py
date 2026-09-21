"""MySQL 存储后端 — 同 SQLiteBackend，通过 DATABASE_URL 切换."""
from storage.sqlite_backend import SQLiteBackend


class MySQLBackend(SQLiteBackend):
    """MySQL 与 SQLite 共用 SQLAlchemy 接口，通过 DATABASE_URL 区分."""
    pass
