"""GET /api/search — 搜索过滤."""
from fastapi import APIRouter, Query
from scanner import get_file_scanner

router = APIRouter()
_scanner = get_file_scanner()


@router.get("/api/search")
async def search(
    q: str = Query(default="", description="搜索关键词"),
    status: str = Query(default="all", description="状态过滤: all/normal/interrupted/blocked"),
    phase: str = Query(default="all", description="阶段过滤: all/0-change/1-requirement/..."),
):
    changes = _scanner.scan()
    results = []
    for c in changes:
        if q and q.lower() not in c.id.lower():
            continue
        if status != "all" and c.status != status:
            continue
        if phase != "all" and c.phase != phase:
            continue
        results.append({
            "id": c.id, "phase": c.phase, "progress": c.progress,
            "status": c.status, "interrupted": c.interrupted,
        })
    return {"results": results, "total": len(results), "q": q, "status": status, "phase": phase}
