"""SQLite 存储后端 — 通过 SQLAlchemy ORM."""
from storage import StorageBackend
from database import SessionLocal
from models.tool import Tool
from models.workflow import Workflow, WorkflowSnapshot
from models.agent import Agent
from models.project import Project
from models.metrics import MetricRaw
from sqlalchemy.orm import Session


MODEL_MAP = {
    "tools": Tool,
    "workflows": Workflow,
    "agents": Agent,
    "projects": Project,
    "metrics": MetricRaw,
}


class SQLiteBackend(StorageBackend):
    def _db(self) -> Session:
        return SessionLocal()

    def _model(self, table: str):
        m = MODEL_MAP.get(table)
        if not m:
            raise ValueError(f"Unknown table: {table}")
        return m

    def _filter_owner(self, q, model, owner_id: str | None, is_admin: bool):
        if not is_admin and owner_id and hasattr(model, 'owner_id'):
            q = q.filter(model.owner_id == owner_id)
        return q

    def create(self, table: str, data: dict) -> dict:
        db = self._db()
        model = self._model(table)
        obj = model(**data)
        db.add(obj)
        db.commit()
        db.refresh(obj)
        result = obj.to_dict()
        db.close()
        return result

    def get(self, table: str, entity_id: int) -> dict | None:
        db = self._db()
        model = self._model(table)
        obj = db.query(model).filter(model.id == entity_id).first()
        db.close()
        return obj.to_dict() if obj else None

    def list(self, table: str, owner_id: str | None = None, is_admin: bool = False, filters: dict | None = None) -> list[dict]:
        db = self._db()
        model = self._model(table)
        q = db.query(model)
        q = self._filter_owner(q, model, owner_id, is_admin)
        if filters:
            for k, v in filters.items():
                if hasattr(model, k):
                    q = q.filter(getattr(model, k) == v)
        if hasattr(model, 'updated_at'):
            q = q.order_by(model.updated_at.desc())
        elif hasattr(model, 'created_at'):
            q = q.order_by(model.created_at.desc())
        results = [obj.to_dict() for obj in q.all()]
        db.close()
        return results

    def update(self, table: str, entity_id: int, data: dict, owner_id: str | None = None, is_admin: bool = False) -> dict | None:
        db = self._db()
        model = self._model(table)
        q = db.query(model).filter(model.id == entity_id)
        q = self._filter_owner(q, model, owner_id, is_admin)
        obj = q.first()
        if not obj:
            db.close()
            return None
        for k, v in data.items():
            if hasattr(obj, k):
                setattr(obj, k, v)
        db.commit()
        db.refresh(obj)
        result = obj.to_dict()
        db.close()
        return result

    def delete(self, table: str, entity_id: int, owner_id: str | None = None, is_admin: bool = False) -> bool:
        db = self._db()
        model = self._model(table)
        q = db.query(model).filter(model.id == entity_id)
        q = self._filter_owner(q, model, owner_id, is_admin)
        obj = q.first()
        if not obj:
            db.close()
            return False
        db.delete(obj)
        db.commit()
        db.close()
        return True

    def count(self, table: str, filters: dict | None = None) -> int:
        db = self._db()
        model = self._model(table)
        q = db.query(model)
        if filters:
            for k, v in filters.items():
                if hasattr(model, k):
                    q = q.filter(getattr(model, k) == v)
        result = q.count()
        db.close()
        return result
