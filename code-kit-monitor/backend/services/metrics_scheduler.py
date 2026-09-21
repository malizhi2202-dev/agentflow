"""后台调度器 — 每 3 分钟注入模拟运行时数据，模拟 real claude-code 调用."""

import time
import random
import threading
import uuid
from services.runtime_tracer import tracer

# 模拟数据
MODELS = ["claude-sonnet-5", "claude-opus-4-8", "qwen2:0.5b"]
TOOLS = ["天气查询 Plugin", "代码审查 Skill", "数据库查询 MCP", "安全扫描 Skill", "文本分析 Plugin"]
AGENTS = ["代码审查 Agent", "安全检查 Agent", "code-kit 标准 Agent"]
WORKFLOWS = ["code-kit 标准流程", "天气+审查 工作流", "纯代码审查 工作流"]
TASKS = ["T01-需求分析", "T02-架构设计", "T03-代码实现", "T04-测试验证", "T05-安全审查", "T06-部署上线"]

_running = False
_thread = None


def start_scheduler(owner_id: str = "admin", interval_seconds: int = 180):
    """启动后台 metrics 生成器."""
    global _running, _thread
    if _running:
        return
    _running = True
    _thread = threading.Thread(target=_run, args=(owner_id, interval_seconds), daemon=True)
    _thread.start()
    print(f"[metrics-scheduler] 启动，每 {interval_seconds}s 注入一次运行时数据")


def stop_scheduler():
    global _running
    _running = False


def _run(owner_id: str, interval: int):
    while _running:
        try:
            _inject_metrics(owner_id)
        except Exception as e:
            print(f"[metrics-scheduler] 错误: {e}")
        time.sleep(interval)


def _inject_metrics(owner_id: str):
    """注入一轮模拟运行时数据."""
    sessions = random.randint(3, 8)

    for _ in range(sessions):
        model = random.choice(MODELS)
        tool = random.choice(TOOLS)
        entity_type = random.choice(["tool", "workflow", "agent", "project"])
        entity_id = random.randint(1, 10)
        prompt_tok = random.randint(500, 15000)
        completion_tok = random.randint(200, 12000)
        duration = random.randint(100, 15000)

        tracer.trace_model_call(
            entity_type=entity_type, entity_id=entity_id,
            owner_id=owner_id, model_name=model,
            prompt_tokens=prompt_tok, completion_tokens=completion_tok,
            duration_ms=duration, tool_name=tool,
            tool_calls=random.randint(1, 5),
            status=random.choice(["success"] * 9 + ["error"])
        )

    # 模拟一次 Agent 完整运行
    agent_id = random.randint(1, 5)
    node_traces = [
        {"node_label": f"stage-{i}", "tokens": random.randint(1000, 20000),
         "duration_ms": random.randint(500, 5000)}
        for i in range(random.randint(2, 6))
    ]
    tracer.trace_agent_run(
        owner_id=owner_id, agent_id=agent_id,
        agent_name=random.choice(AGENTS),
        model_name=random.choice(MODELS),
        workflow_name=random.choice(WORKFLOWS),
        node_traces=node_traces
    )

    # 模拟一次项目执行（含拆分任务）
    project_id = random.randint(1, 3)
    tasks = [
        {"task_name": random.choice(TASKS), "tokens": random.randint(5000, 80000),
         "duration_ms": random.randint(2000, 30000)}
        for _ in range(random.randint(1, 4))
    ]
    tracer.trace_project_exec(
        owner_id=owner_id, project_id=project_id,
        project_name=f"项目-{uuid.uuid4().hex[:6]}",
        agent_name=random.choice(AGENTS),
        model_name=random.choice(MODELS),
        tasks=tasks
    )

    print(f"[metrics-scheduler] ✅ 注入 {sessions} 会话 + 1 Agent + 1 项目")
