"""在 MySQL 上种一个会话，并用本地 CLI（dsh/hermes）真实跑一次 L0 抽取。

退出码：0=至少抽到并落库 1 条；3=CLI 跑通但没抽到候选（真调用、结果是空，属外部模型行为）。
"""
import os, sys, json
os.environ["DATABASE_URL"] = os.environ.get("DATABASE_URL", "mysql+pymysql://root@127.0.0.1:3307/agentflow")
os.environ.setdefault("ENCRYPTION_KEY", "e2e-key-32bytes-0123456789abcdef")
CLI = os.environ.get("RSI_CLI_PROVIDER", "dsh")
os.environ["RSI_EXTRACTOR_PROVIDER"] = "cli"
os.environ["RSI_EXTRACTOR_MODEL"] = os.environ.get("RSI_EXTRACTOR_MODEL", f"{CLI}-cli")
os.environ["RSI_CLI_TIMEOUT_SECONDS"] = os.environ.get("RSI_CLI_TIMEOUT_SECONDS", "240")
# 脚本从仓库根调用，backend 才是模块根（不能依赖 cwd）
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "backend"))

from database import SessionLocal
from models.agent import Agent
from models.conversation import Conversation
from models.message import Message

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
        ("assistant", "发布回滚后 502 消失，确认是这次发布引入的；以后 502 先对齐发布窗口。"),
    ]:
        db.add(Message(conversation_id=conv.id, role=role, content=text))
    db.commit()
# 只跑**本脚本种的那个会话**：run_once 取「最近更新」，E2E 跑过一次后可能挑到别的会话，
# 断言就失去意义（历史上就出现过 candidates=0 的假阴性）。
from services import l0_extractor, l0_llm_extractor
extractor = l0_llm_extractor.build_extractor()   # 按上面 env 构真实 CLI 抽取器
if extractor is None:
    raise SystemExit("抽取器未配置（RSI_EXTRACTOR_PROVIDER/MODEL）：拒绝假装跑过")

# CLI 模型是**外部不确定性**：同一段对话可能回 [] 或格式漂移，重试几次再判定
out = None
for attempt in range(1, 4):
    out = l0_extractor.extract(db, conv, extractor=extractor)
    stored = len([c for c in out["created"] if c.get("stored")])
    print(f"L0 第 {attempt} 次：candidates={out['candidates']} stored={stored}", flush=True)
    if stored:
        break
stored = len([c for c in out["created"] if c.get("stored")])
print("L0 job:", json.dumps({"conversation_id": conv.id, "dry_run": out["dry_run"],
                             "candidates": out["candidates"], "created": stored},
                            ensure_ascii=False))
if not stored:
    print(f"CLI({CLI}) 真跑了但没抽到可入库候选：E2E 的 L0 断言会失真，按失败处理")
    raise SystemExit(3)
db.close()
