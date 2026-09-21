"""对话服务 — 消息路由 + Agent LLM 调用 + 会话管理."""
import datetime
from sqlalchemy.orm import Session
from models.agent import Agent
from models.channel_config import ChannelConfig
from models.conversation import Conversation
from models.message import Message
from services.encryption_service import encrypt, decrypt
from services.audit_service import log_audit
from services.runtime_tracer import tracer
from services.llm_providers import get_provider, SUPPORTED_PROVIDERS

_ATTACK_PREFIXES = [
    "ignore all previous instructions",
    "ignore previous instructions",
    "forget all previous",
    "disregard previous",
    "system:",
    "new instructions:",
    "you are now",
    "pretend you are",
    "your new system prompt is",
]
MAX_MESSAGE_LENGTH = 4000


class ChatService:
    """消息路由 + LLM 调用编排."""

    def send_message(
        self,
        agent_id: int,
        content: str,
        owner_id: str,
        db: Session,
        conversation_id: int | None = None,
        channel_type: str = "web",
    ) -> dict:
        """发送消息给 Agent，返回 agent 回复的 Message dict."""
        # 1. 输入校验
        was_truncated = False
        if len(content) > MAX_MESSAGE_LENGTH:
            content = content[:MAX_MESSAGE_LENGTH]
            was_truncated = True
        attack_hit = self._detect_attack(content)

        # 2. 查 Agent
        agent = db.query(Agent).filter(Agent.id == agent_id).first()
        if not agent:
            raise ValueError(f"Agent {agent_id} 不存在")

        # 3. 查或创建 Conversation
        if conversation_id:
            conv = db.query(Conversation).filter(
                Conversation.id == conversation_id,
                Conversation.owner_id == owner_id,
            ).first()
            if not conv:
                raise ValueError(f"会话 {conversation_id} 不存在")
        else:
            conv = Conversation(
                agent_id=agent_id,
                owner_id=owner_id,
                channel_type=channel_type,
                title=f"新对话",
            )
            db.add(conv)
            db.commit()
            db.refresh(conv)

        # 4. 写 user message
        user_msg = Message(
            conversation_id=conv.id,
            role="user",
            content=content,
            status="done",
        )
        db.add(user_msg)
        db.commit()
        db.refresh(user_msg)

        # 5. 写 agent pending message
        agent_msg = Message(
            conversation_id=conv.id,
            role="agent",
            content="",
            status="processing",
        )
        db.add(agent_msg)
        db.commit()
        db.refresh(agent_msg)

        # 6. 构造 prompt（角色标记隔离）
        system_prompt = getattr(agent, "system_prompt", None) or agent.description or "You are a helpful assistant."
        messages = [{"role": "system", "content": system_prompt}]
        user_content = content
        if was_truncated:
            user_content += "\n\n[系统提示：你的消息超过长度限制，以上基于前 {} 字符回复]".format(MAX_MESSAGE_LENGTH)
        messages.append({"role": "user", "content": user_content})

        # 7. 调用 LLM（通过提供者适配器）
        try:
            api_key = decrypt(agent.api_key_encrypted) if agent.api_key_encrypted else ""
            provider = get_provider(agent.model_provider)
            reply, usage = provider.chat(
                messages, api_key,
                agent.model_name or "gpt-3.5-turbo",
            )
            # 运行时埋点：记录真实 token 消耗
            tracer.trace_model_call(
                entity_type="agent", entity_id=agent_id, owner_id=owner_id,
                model_name=agent.model_name or "unknown",
                prompt_tokens=usage.get("prompt_tokens", len(content) // 4),
                completion_tokens=usage.get("completion_tokens", len(reply) // 4),
                duration_ms=0,
                tool_name="chat", tool_calls=1,
                status="success"
            )
        except ValueError as e:
            # 未知 provider → 友好提示
            reply = f"[Agent {agent.name}]: 收到消息「{content[:100]}」，但 {e}"
        except Exception as e:
            agent_msg.content = "Agent 暂时无法回复，请稍后重试"
            agent_msg.status = "error"
            db.commit()
            log_audit(owner_id, owner_id, "agent_chat_error", str(agent_id), "agent", f"LLM error: {str(e)[:200]}", "127.0.0.1", "error")
            return {
                "user_message": user_msg.to_dict(),
                "agent_message": agent_msg.to_dict(),
                "conversation_id": conv.id,
                "error": str(e)[:200],
                "truncated": was_truncated,
                "attack_detected": attack_hit,
            }

        # 8. 写 agent message 成功
        agent_msg.content = reply
        agent_msg.status = "done"
        conv.updated_at = datetime.datetime.utcnow()
        db.commit()
        db.refresh(agent_msg)

        # 9. 审计日志
        log_audit(owner_id, owner_id, "agent_chat", str(agent_id), "agent",
                  f"conv={conv.id} channel={channel_type} in={len(content)} out={len(reply)}"
                  + (" [truncated]" if was_truncated else "")
                  + (" [attack_hit]" if attack_hit else ""),
                  "127.0.0.1")

        return {
            "user_message": user_msg.to_dict(),
            "agent_message": agent_msg.to_dict(),
            "conversation_id": conv.id,
            "truncated": was_truncated,
            "attack_detected": attack_hit,
        }

    def get_messages(
        self,
        conversation_id: int,
        owner_id: str,
        db: Session,
        since_id: int | None = None,
        limit: int = 100,
    ) -> list[dict]:
        """获取消息列表（按 owner_id 做会话隔离）."""
        conv = db.query(Conversation).filter(
            Conversation.id == conversation_id,
            Conversation.owner_id == owner_id,
        ).first()
        if not conv:
            return []
        q = db.query(Message).filter(Message.conversation_id == conversation_id)
        if since_id:
            q = q.filter(Message.id > since_id)
        messages = q.order_by(Message.id.asc()).limit(limit).all()
        return [m.to_dict() for m in messages]

    def list_conversations(self, owner_id: str, db: Session, agent_id: int | None = None) -> list[dict]:
        """列出用户的所有会话."""
        q = db.query(Conversation).filter(Conversation.owner_id == owner_id)
        if agent_id:
            q = q.filter(Conversation.agent_id == agent_id)
        convs = q.order_by(Conversation.updated_at.desc()).limit(50).all()

        result = []
        for c in convs:
            last_msg = db.query(Message).filter(
                Message.conversation_id == c.id
            ).order_by(Message.id.desc()).first()
            item = c.to_dict()
            item["last_message"] = last_msg.to_dict() if last_msg else None
            result.append(item)
        return result

    def create_conversation(
        self, agent_id: int, owner_id: str, db: Session, channel_type: str = "web"
    ) -> dict:
        """创建新会话."""
        conv = Conversation(
            agent_id=agent_id,
            owner_id=owner_id,
            channel_type=channel_type,
        )
        db.add(conv)
        db.commit()
        db.refresh(conv)
        return conv.to_dict()

    def _detect_attack(self, content: str) -> bool:
        """检测已知 prompt injection 攻击前缀."""
        lower = content.lower().strip()
        for prefix in _ATTACK_PREFIXES:
            if lower.startswith(prefix):
                return True
        return False


# 单例
chat_service = ChatService()
