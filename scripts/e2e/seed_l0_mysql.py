"""在 MySQL 上种一个会话，并用 CLI(dsh) 真实跑 L0 抽取作业。"""
import os, sys, json
os.environ["DATABASE_URL"] = os.environ.get("DATABASE_URL", "mysql+pymysql://root@127.0.0.1:3307/agentflow_e2e")
os.environ.setdefault("ENCRYPTION_KEY", "e2e-key-32bytes-0123456789abcdef")
os.environ["RSI_EXTRACTOR_PROVIDER"] = "cli"
os.environ["RSI_EXTRACTOR_MODEL"] = "dsh-cli"
os.environ["RSI_CLI_PROVIDER"] = "dsh"
os.environ["RSI_CLI_TIMEOUT_SECONDS"] = "240"
sys.path.insert(0, ".")

from database import SessionLocal
from models.agent import Agent
from models.conversation import Conversation
from models.message import Message
from services import l0_job

db = SessionLocal()
agent = db.query(Agent).filter(Agent.name == "L0 试验 Agent").first()
if agent is None:
    agent = Agent(owner_id="admin", name="L0 试验 Agent", model_provider="deepseek",
                  model_name="deepseek-flash", api_key_encrypted="x")
    db.add(agent); db.commit()
conv = db.query(Conversation).filter(Conversation.title == "MySQL 抽取试验").first()
if conv is None:
    conv = Conversation(agent_id=agent.id, owner_id="admin", title="MySQL 抽取试验")
    db.add(conv); db.commit()
    for role, text in [
        ("user", "线上 502 报警，先查什么？"),
        ("assistant", "先看网关日志的错误码和后端健康；优先确认是不是发布导致的。"),
        ("user", "明白，先看发布记录。"),
    ]:
        db.add(Message(conversation_id=conv.id, role=role, content=text))
    db.commit()
out = l0_job.run_once(db, max_conversations=1)
print("L0 job:", json.dumps({k: out[k] for k in ("conversations", "dry_run", "candidates", "created")}, ensure_ascii=False))
db.close()
