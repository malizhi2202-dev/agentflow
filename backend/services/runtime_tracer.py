"""运行时追踪器 — 拦截工具/Agent/项目/模型调用，实时写入 metrics."""

import time
import uuid
import datetime
from contextlib import contextmanager
from database import SessionLocal
from models.metrics import SessionMetric, MetricRaw


class RuntimeTracer:
    """全局单例，记录每次模型调用/工具执行/Agent 运行."""

    @staticmethod
    def trace_model_call(entity_type: str, entity_id: int, owner_id: str,
                         model_name: str, prompt_tokens: int, completion_tokens: int,
                         duration_ms: int, tool_name: str = "", tool_calls: int = 0,
                         status: str = "success", error_msg: str = ""):
        """记录一次模型调用会话."""
        db = SessionLocal()
        try:
            session_id = str(uuid.uuid4())[:12]
            total = prompt_tokens + completion_tokens
            m = SessionMetric(
                session_id=session_id, entity_type=entity_type, entity_id=entity_id,
                owner_id=owner_id, model_name=model_name,
                prompt_tokens=prompt_tokens, completion_tokens=completion_tokens,
                total_tokens=total, duration_ms=duration_ms,
                tool_name=tool_name, tool_calls=tool_calls,
                status=status, error_msg=error_msg,
                timestamp=datetime.datetime.utcnow()
            )
            db.add(m)
            # 同时写入聚合 bucket
            agg = MetricRaw(
                entity_type=entity_type, entity_id=entity_id, owner_id=owner_id,
                model_name=model_name, token_count=total,
                tool_hit_count=tool_calls, execution_time_ms=duration_ms,
                status=status, timestamp=datetime.datetime.utcnow()
            )
            db.add(agg)
            # 通知探针系统（被动收集执行数据）
            try:
                from services.agent_probe_service import _notify_activity
                _notify_activity(entity_type, entity_id, owner_id, status,
                                duration_ms, total, action=tool_name)
            except Exception:
                pass
            db.commit()
        finally:
            db.close()

    @staticmethod
    def trace_tool_call(owner_id: str, tool_name: str, model_name: str,
                        tokens: int, duration_ms: int, status: str = "success"):
        """记录工具调用."""
        RuntimeTracer.trace_model_call(
            entity_type="tool", entity_id=0, owner_id=owner_id,
            model_name=model_name, prompt_tokens=tokens // 2,
            completion_tokens=tokens // 2, duration_ms=duration_ms,
            tool_name=tool_name, tool_calls=1, status=status
        )

    @staticmethod
    def trace_agent_run(owner_id: str, agent_id: int, agent_name: str,
                        model_name: str, workflow_name: str,
                        node_traces: list[dict]):
        """记录一次 Agent 完整运行（含每个工作流节点的 trace）."""
        total_tokens = sum(n.get("tokens", 0) for n in node_traces)
        total_ms = sum(n.get("duration_ms", 0) for n in node_traces)
        RuntimeTracer.trace_model_call(
            entity_type="agent", entity_id=agent_id, owner_id=owner_id,
            model_name=model_name,
            prompt_tokens=total_tokens // 2, completion_tokens=total_tokens // 2,
            duration_ms=total_ms,
            tool_name=agent_name, tool_calls=len(node_traces),
            status="success"
        )
        # 每个工作流节点单独记录
        for node in node_traces:
            RuntimeTracer.trace_model_call(
                entity_type="workflow", entity_id=0, owner_id=owner_id,
                model_name=model_name,
                prompt_tokens=node.get("tokens", 0) // 2,
                completion_tokens=node.get("tokens", 0) // 2,
                duration_ms=node.get("duration_ms", 0),
                tool_name=node.get("node_label", "unknown"),
                tool_calls=1
            )

    @staticmethod
    def trace_project_exec(owner_id: str, project_id: int, project_name: str,
                           agent_name: str, model_name: str,
                           tasks: list[dict]):
        """记录一次项目执行（含拆分任务的 trace）."""
        total_tokens = sum(t.get("tokens", 0) for t in tasks)
        total_ms = sum(t.get("duration_ms", 0) for t in tasks)
        RuntimeTracer.trace_model_call(
            entity_type="project", entity_id=project_id, owner_id=owner_id,
            model_name=model_name,
            prompt_tokens=total_tokens // 2, completion_tokens=total_tokens // 2,
            duration_ms=total_ms,
            tool_name=project_name, tool_calls=len(tasks),
            status="success"
        )
        # 每个拆分任务单独记录
        for task in tasks:
            RuntimeTracer.trace_model_call(
                entity_type="tool", entity_id=0, owner_id=owner_id,
                model_name=model_name,
                prompt_tokens=task.get("tokens", 0) // 2,
                completion_tokens=task.get("tokens", 0) // 2,
                duration_ms=task.get("duration_ms", 0),
                tool_name=task.get("task_name", "task"),
                tool_calls=1
            )


tracer = RuntimeTracer()
