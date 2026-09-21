"""存储抽象层 — 统一接口，多后端切换.

用法:
    from storage import get_store
    store = get_store()  # 默认 SQLite
    store.create("tools", {"name": "test", "type": "plugin"})

切换后端:
    STORE_BACKEND=mysql python main.py
    STORE_BACKEND=memory python main.py  # 测试用
"""

import os

_backend: "StorageBackend | None" = None


def get_store() -> "StorageBackend":
    global _backend
    if _backend is None:
        backend_name = os.environ.get("STORE_BACKEND", "sqlite").lower()
        if backend_name == "sqlite":
            from storage.sqlite_backend import SQLiteBackend
            _backend = SQLiteBackend()
        elif backend_name == "memory":
            from storage.memory_backend import MemoryBackend
            _backend = MemoryBackend()
        elif backend_name == "mysql":
            from storage.mysql_backend import MySQLBackend
            _backend = MySQLBackend()
        else:
            raise ValueError(f"Unknown storage backend: {backend_name}")
    return _backend


class StorageBackend:
    """存储抽象基类."""

    def create(self, table: str, data: dict) -> dict:
        raise NotImplementedError

    def get(self, table: str, entity_id: int) -> dict | None:
        raise NotImplementedError

    def list(self, table: str, owner_id: str | None = None, is_admin: bool = False, filters: dict | None = None) -> list[dict]:
        raise NotImplementedError

    def update(self, table: str, entity_id: int, data: dict, owner_id: str | None = None, is_admin: bool = False) -> dict | None:
        raise NotImplementedError

    def delete(self, table: str, entity_id: int, owner_id: str | None = None, is_admin: bool = False) -> bool:
        raise NotImplementedError

    def count(self, table: str, filters: dict | None = None) -> int:
        raise NotImplementedError
