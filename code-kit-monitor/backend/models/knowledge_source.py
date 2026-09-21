"""Agent 资料源 ORM 模型 — 轻量接入外部数据源，不做重 RAG."""
import datetime
from sqlalchemy import String, Integer, DateTime, Text, JSON, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from models import Base

SOURCE_TYPES = ["rag_api", "mysql", "postgres", "redis", "http_api", "url_crawl", "local_file"]


class KnowledgeSource(Base):
    """Agent 绑定的外部资料源，执行时实时查询，不缓存数据."""
    __tablename__ = "knowledge_sources"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    agent_id: Mapped[int] = mapped_column(Integer, ForeignKey("agents.id"), nullable=False, index=True)
    owner_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    source_type: Mapped[str] = mapped_column(String(32), nullable=False, default="http_api")  # rag_api/mysql/postgres/redis/http_api/url_crawl
    url: Mapped[str] = mapped_column(String(1024), nullable=False)
    config_json: Mapped[dict] = mapped_column(JSON, default=dict)  # 连接配置（加密敏感字段）
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    description: Mapped[str] = mapped_column(Text, default="")
    # 文件上传 & 嵌入进度
    status: Mapped[str | None] = mapped_column(String(32), nullable=True, default=None)  # uploading/processing/indexing/completed/failed
    file_path: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    last_test_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)
    last_test_ok: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    def to_dict(self, mask_secrets: bool = True) -> dict:
        cfg = dict(self.config_json or {})
        if mask_secrets and "password" in cfg:
            cfg["password"] = "***"
        if mask_secrets and "api_key" in cfg:
            cfg["api_key"] = "***"
        return {
            "id": self.id, "agent_id": self.agent_id, "owner_id": self.owner_id,
            "name": self.name, "source_type": self.source_type, "url": self.url,
            "config_json": cfg, "enabled": self.enabled, "description": self.description,
            "status": self.status, "file_path": self.file_path,
            "last_test_at": self.last_test_at.isoformat() if self.last_test_at else None,
            "last_test_ok": self.last_test_ok,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
