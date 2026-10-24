"""`/api/watch` SSE（P2-5 ④）— 应用层 cursor，不跟 MCP 已撤的 Last-Event-ID 路线。

协议：
- `GET /api/watch?since=<change_log.id>`：从该游标之后推送事件；`id:` 行就是游标，客户端断线后
  带回来即可续传。
- **游标过期**（早于账本最早一行）→ 先发 `event: resync`，客户端应重新 GET 全量；
  这是 410 等价语义，不用 HTTP 状态码表达（SSE 一旦开始就只能用事件）。
- 推送形状 = `change_log` 行（`id / resource_type / resource_id / generation / ...`），
  与 `/api/watch?since=` 的查询结果同形状——纪律⑧「推送只是降延迟，DB 才是最终态」。
"""
import asyncio
import json

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database import SessionLocal, get_db
from services import declarative

router = APIRouter(prefix="/api", tags=["watch"])

POLL_SECONDS = 1.0


def _sse(event: str | None, data: dict, event_id: int | None = None) -> str:
    lines = []
    if event_id is not None:
        lines.append(f"id: {event_id}")
    if event:
        lines.append(f"event: {event}")
    lines.append("data: " + json.dumps(data, ensure_ascii=False))
    return "\n".join(lines) + "\n\n"


@router.get("/watch")
async def watch(
    request: Request,
    since: int = Query(default=0, ge=0, description="上次收到的事件 id；0 = 从头"),
    limit: int = Query(default=200, le=500),
    max_polls: int = Query(default=30, le=600, description="最多轮询次数（测试/短连接用）"),
    db: Session = Depends(get_db),
):
    """SSE 流：先补历史事件，再轮询新事件（有界，避免挂死连接）。"""
    events, resync = declarative.list_changes(db, since=since, limit=limit)

    async def gen():
        if resync:
            yield _sse("resync", {"reason": "cursor_expired", "since": since})
        cursor = since
        for event in events:
            cursor = max(cursor, event["id"])
            yield _sse("change", event, event_id=event["id"])
        polls = 0
        while polls < max_polls:
            if await request.is_disconnected():
                return
            await asyncio.sleep(POLL_SECONDS)
            polls += 1
            fresh = SessionLocal()
            try:
                more, expired = declarative.list_changes(fresh, since=cursor, limit=limit)
            finally:
                fresh.close()
            if expired:
                yield _sse("resync", {"reason": "cursor_expired", "since": cursor})
                return
            for event in more:
                cursor = max(cursor, event["id"])
                yield _sse("change", event, event_id=event["id"])

    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
