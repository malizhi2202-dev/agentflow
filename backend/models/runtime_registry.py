"""运行时发现注册表（v22 · PRODUCT-DESIGN §6.28）。

一条记录 = **一台机器 × 一个 CLI × 一个协议族**（`UNIQUE(machine_id, cli, protocol_family)`），
由成员机器上的 daemon 每 15s 上报 upsert；daemon 重启只更新既有记录，不新建（AC-1）。

口径（与 DESIGN D5/D6/D7 对齐）：
- `online/offline` **不落列**：读侧按 `last_seen` 与离线阈值现算，避免状态列过期；
- `models` 与 `models_error` 分列：解析不出 ≠ 没有模型；
- `capabilities` 是离散能力位（缺失按最老客户端处理，不据版本号推断）；
- 凭据一律不进表：账号 / OAuth / API Key 始终留成员本机。
"""
import datetime

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from models import Base


class RuntimeRegistry(Base):
    __tablename__ = "runtime_registry"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    machine_id: Mapped[str] = mapped_column(String(64), index=True, default="")
    machine_name: Mapped[str] = mapped_column(String(128), default="")
    cli: Mapped[str] = mapped_column(String(32), default="")
    protocol_family: Mapped[str] = mapped_column(String(16), default="exec")
    binary_path: Mapped[str] = mapped_column(String(512), default="")
    source_file: Mapped[str] = mapped_column(String(64), default="")
    version: Mapped[str] = mapped_column(String(64), default="")
    # JSON 文本：models 是字符串数组；capabilities 是离散能力位数组
    models_json: Mapped[str] = mapped_column("models", Text, default="[]")
    models_error: Mapped[str] = mapped_column(String(200), default="")
    capabilities_json: Mapped[str] = mapped_column("capabilities", Text, default="[]")
    owner_id: Mapped[str] = mapped_column(String(64), index=True, default="")
    visibility: Mapped[str] = mapped_column(String(16), default="private")
    last_seen: Mapped[datetime.datetime] = mapped_column(DateTime, index=True, default=datetime.datetime.utcnow)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
