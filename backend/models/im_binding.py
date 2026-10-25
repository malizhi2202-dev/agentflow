"""IM 身份绑定 ORM 模型（im_bindings）—— 与渠道连接配置（integrations 层）**分层两表**。

主档 html:1314 裁定：渠道「连接凭据」在一层（channel_configs：一 Agent × 一渠道怎么连），
「发信人身份」在另一层（本表：外部 workspace 里的某个用户 ≡ 平台哪个 user）——
同一个渠道可能横跨多个 workspace/租户，身份绑定不能塞进连接配置的单行里。

状态机：pending（首见未绑）→ bound（已认领）→ revoked（解绑留痕，不删行）。
写入位点：入站消息的身份解析处——若无真实入站解析位点则**表先行挂账**
（同 exec_ledgers 模式，宁挂账不伪造绑定）。
"""

import datetime

from sqlalchemy import DateTime, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from models import Base

IM_BINDING_STATUSES = ("pending", "bound", "revoked")


class ImBinding(Base):
    __tablename__ = "im_bindings"
    __table_args__ = (
        UniqueConstraint("workspace_id", "external_user_id", "external_tenant",
                         name="ux_im_binding_identity"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    # 外部工作区/群空间标识（飞书 tenant_key、Slack workspace id 等）
    workspace_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    # 外部发信人标识（同 workspace 内唯一）
    external_user_id: Mapped[str] = mapped_column(String(128), nullable=False)
    # 跨租户去重要素（无租户概念的渠道存 ''）
    external_tenant: Mapped[str] = mapped_column(String(128), default="")
    # 平台用户；'' = 尚未认领（pending）
    user_id: Mapped[str] = mapped_column(String(64), default="", index=True)
    status: Mapped[str] = mapped_column(String(16), default="pending", index=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "workspace_id": self.workspace_id,
            "external_user_id": self.external_user_id,
            "external_tenant": self.external_tenant or "",
            "user_id": self.user_id or None,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
