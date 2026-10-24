"""收件箱 API（P1-4）— 指针不是副本；三规则的服务层实现见 collab_service。

规则②（读失败宁多发不漏发）在路由层体现为：**不 catch**——数据库读失败一律 500，
绝不返回空列表让人误以为「没有待办」。
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from database import get_db
from services import collab_service

router = APIRouter(prefix="/api/inbox", tags=["inbox"])


def _uid(request: Request) -> str:
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="未认证")
    return user["id"]


@router.get("")
def list_inbox(
    request: Request,
    include_archived: bool = Query(default=False),
    include_read: bool = Query(default=True),
    limit: int = Query(default=100, le=500),
    db: Session = Depends(get_db),
):
    """分两组：需我处理（action_required 且未读）与已读/自动推进。"""
    return collab_service.inbox_for(
        db, _uid(request),
        include_archived=include_archived,
        include_read=include_read,
        limit=limit,
    )


@router.get("/count")
def inbox_count(request: Request, db: Session = Depends(get_db)):
    return collab_service.inbox_count(db, _uid(request))


@router.post("/{inbox_id}/read")
def read_item(inbox_id: int, request: Request, db: Session = Depends(get_db)):
    try:
        row = collab_service.mark_read(db, _uid(request), inbox_id)
    except collab_service.InboxError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {"ok": True, "item": row.to_dict()}


@router.post("/read-all")
def read_all(request: Request, db: Session = Depends(get_db)):
    return {"ok": True, "count": collab_service.mark_all_read(db, _uid(request))}


@router.post("/{inbox_id}/archive")
def archive_item(inbox_id: int, request: Request, db: Session = Depends(get_db)):
    try:
        row = collab_service.archive(db, _uid(request), inbox_id)
    except collab_service.InboxError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {"ok": True, "item": row.to_dict()}


@router.post("/archive-read")
def archive_read(
    request: Request,
    only_closed_tasks: bool = Query(default=False),
    db: Session = Depends(get_db),
):
    return {
        "ok": True,
        "count": collab_service.archive_read(
            db, _uid(request), only_closed_tasks=only_closed_tasks,
        ),
    }
