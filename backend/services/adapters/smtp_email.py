"""SMTP 邮件适配器 — 仅发件，不收件."""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from services.channel_adapter import ChannelAdapter, UniversalMessage, ChannelMeta


class SMTPAdapter(ChannelAdapter):
    """SMTP 发件适配器. v1 仅支持发送，不支持 IMAP 收件."""

    def validate_request(self, headers: dict, body: bytes, credentials: dict) -> bool:
        """SMTP 无 webhook，直接返回 True."""
        return True

    def parse_message(self, raw: dict) -> UniversalMessage:
        """SMTP 不支持收件（AC-19），此方法不适用."""
        raise NotImplementedError("SMTP 适配器不支持解析消息（v1 仅发件，不做 IMAP 收件）")

    def send_message(self, msg: UniversalMessage, credentials: dict, conversation_id: str) -> str:
        """通过 SMTP 发送邮件. 发送后立即清除内存中的密码."""
        smtp_host = credentials.get("smtp_host", "")
        smtp_port = int(credentials.get("smtp_port", 587))
        smtp_user = credentials.get("smtp_user", "")
        smtp_password = credentials.get("smtp_password", "")
        from_addr = credentials.get("from_addr", smtp_user)
        to_addr = credentials.get("to_addr", conversation_id)

        if not smtp_host or not smtp_user or not smtp_password:
            raise ValueError("SMTP 配置不完整（smtp_host/smtp_user/smtp_password 必填）")

        # 构造邮件
        mime_msg = MIMEMultipart()
        mime_msg["From"] = from_addr
        mime_msg["To"] = to_addr
        mime_msg["Subject"] = f"[Agent 消息] {msg.content[:50]}..."
        mime_msg.attach(MIMEText(msg.content, "plain", "utf-8"))

        message_id = ""
        try:
            server = smtplib.SMTP(smtp_host, smtp_port, timeout=30)
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.sendmail(from_addr, [to_addr], mime_msg.as_string())
            server.quit()
            message_id = f"smtp:{int(__import__('time').time())}"
        finally:
            # 安全要求：发送后立即清除密码
            if "smtp_password" in credentials:
                del credentials["smtp_password"]

        return message_id

    def update_message(self, channel_message_id: str, new_content: str, credentials: dict) -> bool:
        """SMTP 不支持修改已发送邮件."""
        return False

    def get_channel_info(self) -> ChannelMeta:
        return ChannelMeta(channel_type="smtp_email", display_name="SMTP 邮件", icon="📧")
