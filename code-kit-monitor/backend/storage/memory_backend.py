"""内存存储后端 — 用于测试和快速开发."""
import datetime
from storage import StorageBackend

_stores: dict[str, dict[int, dict]] = {}
_next_ids: dict[str, int] = {}


class MemoryBackend(StorageBackend):
    def _ensure(self, table: str):
        if table not in _stores:
            _stores[table] = {}
            _next_ids[table] = 1

    def create(self, table: str, data: dict) -> dict:
        self._ensure(table)
        obj_id = _next_ids[table]
        _next_ids[table] += 1
        obj = {"id": obj_id, **data, "created_at": datetime.datetime.utcnow().isoformat(), "updated_at": datetime.datetime.utcnow().isoformat()}
        _stores[table][obj_id] = obj
        return obj

    def get(self, table: str, entity_id: int) -> dict | None:
        self._ensure(table)
        return _stores[table].get(entity_id)

    def list(self, table: str, owner_id: str | None = None, is_admin: bool = False, filters: dict | None = None) -> list[dict]:
        self._ensure(table)
        results = list(_stores[table].values())
        if not is_admin and owner_id:
            results = [r for r in results if r.get("owner_id") == owner_id]
        if filters:
            results = [r for r in results if all(r.get(k) == v for k, v in filters.items())]
        results.sort(key=lambda r: r.get("updated_at", ""), reverse=True)
        return results

    def update(self, table: str, entity_id: int, data: dict, owner_id: str | None = None, is_admin: bool = False) -> dict | None:
        self._ensure(table)
        obj = _stores[table].get(entity_id)
        if not obj:
            return None
        if not is_admin and owner_id and obj.get("owner_id") != owner_id:
            return None
        obj.update(data)
        obj["updated_at"] = datetime.datetime.utcnow().isoformat()
        return obj

    def delete(self, table: str, entity_id: int, owner_id: str | None = None, is_admin: bool = False) -> bool:
        self._ensure(table)
        obj = _stores[table].get(entity_id)
        if not obj:
            return False
        if not is_admin and owner_id and obj.get("owner_id") != owner_id:
            return False
        del _stores[table][entity_id]
        return True

    def count(self, table: str, filters: dict | None = None) -> int:
        self._ensure(table)
        results = list(_stores[table].values())
        if filters:
            results = [r for r in results if all(r.get(k) == v for k, v in filters.items())]
        return len(results)
