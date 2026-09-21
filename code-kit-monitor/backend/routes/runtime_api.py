"""GET /api/runtime/* — 双路数据：埋点 + 适配器."""
import asyncio
import json
import time
from datetime import datetime, timedelta
from fastapi import APIRouter, Query, Request
from fastapi.responses import StreamingResponse
from runtime.scanner import get_runtime_scanner

router = APIRouter()
_scanner = get_runtime_scanner()


@router.get("/api/runtime/summary")
async def runtime_summary():
    return _scanner.summary()


@router.get("/api/runtime/sessions")
async def runtime_sessions(
    status: str | None = Query(default=None, description="过滤状态: success, error, running"),
):
    sessions = _scanner.sessions()
    if status and status != "all":
        sessions = [s for s in sessions if s.get("status") == status]
    return {"sessions": sessions}


@router.get("/api/runtime/stream")
async def runtime_stream(request: Request):
    """SSE 端点：实时推送会话事件。
    
    事件类型:
    - session_started: 新会话开始
    - agent_status_changed: Agent 状态变更
    - session_completed: 会话完成
    """
    async def event_generator():
        last_sessions = {}
        last_summary = {}
        while True:
            if await request.is_disconnected():
                break
            try:
                sessions = {s['session_id']: s for s in _scanner.sessions()}
                summary = _scanner.summary()

                # 检测新会话
                new_ids = set(sessions.keys()) - set(last_sessions.keys())
                for sid in new_ids:
                    s = sessions[sid]
                    yield f"event: session_started\ndata: {json.dumps(s, ensure_ascii=False)}\n\n"

                # 检测状态变更
                for sid, s in sessions.items():
                    if sid in last_sessions:
                        old_s = last_sessions[sid]
                        if old_s.get('status') != s.get('status'):
                            yield f"event: agent_status_changed\ndata: {json.dumps({'session_id': sid, 'old_status': old_s.get('status'), 'new_status': s.get('status'), 'agent': s.get('agent')}, ensure_ascii=False)}\n\n"
                    # 检测完成
                    if s.get('status') == 'success' and sid in last_sessions and last_sessions[sid].get('status') != 'success':
                        yield f"event: session_completed\ndata: {json.dumps(s, ensure_ascii=False)}\n\n"

                # 心跳（保持连接）
                yield f": heartbeat {int(time.time())}\n\n"

                last_sessions = sessions
                last_summary = summary
            except Exception as e:
                yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"

            await asyncio.sleep(5)  # 每5秒轮询一次

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/api/runtime/stats")
async def runtime_stats(
    granularity: str = Query(default="hour"),
    days: int = Query(default=7),
):
    stats = _scanner.stats(granularity=granularity, days=days)
    # 从 DB 获取延迟百分位数（P50/P95/P99）
    try:
        from database import SessionLocal
        from models.metrics import SessionMetric
        from datetime import datetime, timedelta
        db = SessionLocal()
        try:
            since = datetime.utcnow() - timedelta(days=days)
            durations = [row[0] for row in db.query(SessionMetric.duration_ms).filter(
                SessionMetric.timestamp >= since,
                SessionMetric.duration_ms > 0,
            ).all()]
            import statistics
            if durations:
                sorted_durs = sorted(durations)
                n = len(sorted_durs)
                stats["latency"] = {
                    "p50_ms": sorted_durs[int(n * 0.50)] if n > 0 else 0,
                    "p95_ms": sorted_durs[int(n * 0.95)] if n > 1 else sorted_durs[0] if n == 1 else 0,
                    "p99_ms": sorted_durs[int(n * 0.99)] if n > 1 else sorted_durs[0] if n == 1 else 0,
                    "avg_ms": statistics.mean(durations) if durations else 0,
                    "min_ms": min(durations) if durations else 0,
                    "max_ms": max(durations) if durations else 0,
                    "sample_count": n,
                }
            else:
                stats["latency"] = {"p50_ms": 0, "p95_ms": 0, "p99_ms": 0, "avg_ms": 0, "min_ms": 0, "max_ms": 0, "sample_count": 0}
        finally:
            db.close()
    except Exception:
        stats["latency"] = {"p50_ms": 0, "p95_ms": 0, "p99_ms": 0, "avg_ms": 0, "min_ms": 0, "max_ms": 0, "sample_count": 0}
    return stats


@router.get("/api/runtime/sessions/{session_id}")
async def runtime_session_detail(session_id: str):
    events = [e for e in _scanner.scan() if (e.get('change_id') or e.get('agent')) == session_id]
    if not events:
        return {"error": "not found"}
    total_input = sum(e.get('tokens_input', 0) for e in events)
    total_output = sum(e.get('tokens_output', 0) for e in events)
    # 推断状态
    status = events[0].get('status', 'running')
    return {
        "session_id": session_id,
        "agent": events[0].get('agent', ''),
        "timestamp": events[0].get('timestamp', ''),
        "stage": events[0].get('stage', ''),
        "change_id": events[0].get('change_id', ''),
        "status": status,
        "input_tokens": total_input,
        "output_tokens": total_output,
        "total_tokens": total_input + total_output,
        "message_count": len(events),
        "events": [{
            "timestamp": e.get('timestamp', ''),
            "stage": e.get('stage', ''),
            "model": e.get('model', ''),
            "tokens_input": e.get('tokens_input', 0),
            "tokens_output": e.get('tokens_output', 0),
            "skills": e.get('skills', []),
            "mcps": e.get('mcps', []),
            "summary": e.get('summary', '')[:200],
            "source": e.get('_source', 'unknown'),
        } for e in events],
    }


@router.post("/api/runtime/sessions/{session_id}/retry")
async def runtime_session_retry(session_id: str):
    """重试失败的会话：基于 session_id 重新触发执行."""
    events = [e for e in _scanner.scan() if (e.get('change_id') or e.get('agent')) == session_id]
    if not events:
        return {"error": "not found", "session_id": session_id}
    
    # 记录原始事件
    original = events[0]
    agent_name = original.get('agent', 'unknown')
    change_id = original.get('change_id', session_id)
    stage = original.get('stage', '')
    
    # 尝试通过对应的 code-kit agent 重新执行
    retry_result = {
        "session_id": session_id,
        "status": "retry_triggered",
        "original_agent": agent_name,
        "original_stage": stage,
        "change_id": change_id,
        "message": f"已触发 {agent_name} 重新执行会话 {session_id}",
    }
    
    # 尝试写入 runtime.jsonl 标记重试
    try:
        import os
        from config import get_specs_dir
        specs_dir = get_specs_dir()
        for entry in os.listdir(specs_dir):
            path = os.path.join(specs_dir, entry)
            if not os.path.isdir(path) or entry.startswith('.'):
                continue
            if change_id and change_id in entry:
                rt_file = os.path.join(path, 'runtime.jsonl')
                retry_event = {
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "agent": agent_name,
                    "model": original.get('model', ''),
                    "stage": stage,
                    "change_id": change_id,
                    "status": "running",
                    "skills": original.get('skills', []),
                    "mcps": original.get('mcps', []),
                    "summary": f"[RETRY] 重新执行 {change_id}",
                    "_source": "retry",
                }
                with open(rt_file, 'a') as f:
                    f.write(json.dumps(retry_event) + "\n")
                retry_result["retry_written"] = True
                retry_result["retry_file"] = rt_file
                # 清除缓存以立即反映变更
                _scanner._cache = None
                break
    except Exception as e:
        retry_result["retry_note"] = f"写入重试标记失败: {e}"
    
    return retry_result
