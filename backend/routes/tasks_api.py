"""任务 API（P1-4）— 任务 CRUD / 状态机 / 负责人三轨 / 运行连接 / 订阅。

约定：
- 身份只来自中间件（`request.state.user`）；缺省 401。
- 非本人（非创建者 / 非 member 负责人 / 非管理员）一律 404——不泄露资源存在性。
- 状态转移只走 `collab_service.change_status`（白名单在服务层，不在提示词里）。
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from auth import is_admin
from database import get_db
from models.collab import ASSIGNEE_KINDS, TRIAGE_STATES, WorkItem, WorkItemRun
from services import collab_service

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


def _user(request: Request) -> dict:
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="未认证")
    return user


def _visible(db: Session, user: dict, task_id: int) -> WorkItem:
    item = db.query(WorkItem).filter(WorkItem.id == task_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="任务不存在")
    if is_admin(user):
        return item
    mine = item.creator_id == user["id"] or (
        item.assignee_kind == "member" and item.assignee_id == user["id"]
    )
    if not mine:
        raise HTTPException(status_code=404, detail="任务不存在")
    return item


@router.get("")
def list_tasks(
    request: Request,
    status: str | None = Query(default=None),
    triage_state: str | None = Query(default=None),
    assignee_kind: str | None = Query(default=None),
    assignee_id: str | None = Query(default=None),
    mine: bool = Query(default=False, description="只看与我有关的（我建的 / 指派给我的）"),
    include_archived: bool = Query(default=False),
    limit: int = Query(default=100, le=500),
    db: Session = Depends(get_db),
):
    user = _user(request)
    q = db.query(WorkItem)
    if not include_archived:
        q = q.filter(WorkItem.archived_at.is_(None))
    if status:
        q = q.filter(WorkItem.status == status)
    if triage_state:
        q = q.filter(WorkItem.triage_state == triage_state)
    if assignee_kind:
        q = q.filter(WorkItem.assignee_kind == assignee_kind)
    if assignee_id:
        q = q.filter(WorkItem.assignee_id == assignee_id)
    if mine:
        from sqlalchemy import and_, or_

        q = q.filter(or_(
            WorkItem.creator_id == user["id"],
            and_(WorkItem.assignee_kind == "member", WorkItem.assignee_id == user["id"]),
        ))
    elif not is_admin(user):
        from sqlalchemy import and_, or_

        q = q.filter(or_(
            WorkItem.creator_id == user["id"],
            and_(WorkItem.assignee_kind == "member", WorkItem.assignee_id == user["id"]),
        ))
    rows = q.order_by(WorkItem.updated_at.desc()).limit(limit).all()
    return {"tasks": [r.to_dict() for r in rows], "total": len(rows)}


@router.post("")
def create_task(payload: dict, request: Request, db: Session = Depends(get_db)):
    user = _user(request)
    accountable_id = payload.get("accountable_id") or None
    # R8-2：accountable 是审计/成本主体，代他人记账需要管理员权限
    if accountable_id and accountable_id != user["id"] and not is_admin(user):
        raise HTTPException(status_code=403, detail="代他人记 accountability 需要管理员权限")
    try:
        item = collab_service.create_item(
            db, creator=user["id"],
            title=payload.get("title", ""),
            description=payload.get("description", ""),
            assignee_kind=payload.get("assignee_kind"),
            assignee_id=payload.get("assignee_id"),
            priority=int(payload.get("priority", 50)),
            due_date=payload.get("due_date"),
            parent_id=payload.get("parent_id"),
            team_id=payload.get("team_id"),
            accountable_id=accountable_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"ok": True, "task": item.to_dict()}


@router.get("/{task_id}")
def get_task(task_id: int, request: Request, db: Session = Depends(get_db)):
    user = _user(request)
    item = _visible(db, user, task_id)
    return {"task": item.to_dict()}


@router.put("/{task_id}")
def update_task(task_id: int, payload: dict, request: Request, db: Session = Depends(get_db)):
    user = _user(request)
    item = _visible(db, user, task_id)
    if is_admin(user) or item.creator_id == user["id"] or (
        item.assignee_kind == "member" and item.assignee_id == user["id"]
    ):
        changed = False
        for field in ("title", "description", "priority", "due_date", "team_id"):
            if field in payload:
                setattr(item, field, payload[field])
                changed = True
        if changed:
            db.commit()
            db.refresh(item)
            if "priority" in payload or "due_date" in payload:
                collab_service.notify(
                    db, item, "priority" if "priority" in payload else "date",
                    actor=user["id"], action_required=False, body="字段变更",
                )
        return {"ok": True, "task": item.to_dict()}
    raise HTTPException(status_code=403, detail="只有创建者或负责人可以修改任务")


@router.post("/{task_id}/status")
def change_task_status(task_id: int, payload: dict, request: Request,
                       db: Session = Depends(get_db)):
    user = _user(request)
    item = _visible(db, user, task_id)
    try:
        result = collab_service.change_status(
            db, item, user["id"], payload.get("status", ""),
            evidence=payload.get("evidence"),
        )
    except collab_service.TransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"ok": True, "task": item.to_dict(), **result}


@router.post("/{task_id}/assign")
def assign_task(task_id: int, payload: dict, request: Request,
                db: Session = Depends(get_db)):
    user = _user(request)
    item = _visible(db, user, task_id)
    kind = (payload.get("assignee_kind") or "").strip()
    assignee_id = str(payload.get("assignee_id") or "").strip()
    if kind == "squad":
        # 指派小队不是「把负责人字段写成 squad」：必须给 leader 入队一条 leader 任务
        # （成员不抢单，见 team_service），否则任务落到小队就没人接。
        from services import team_service as ts
        try:
            squad = ts._squad(db, assignee_id)
            result = ts.assign_task_to_squad(db, squad, user["id"], item.id)
        except ts.TeamError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except ts.NotFound as e:
            raise HTTPException(status_code=404, detail=str(e))
        db.refresh(item)
        return {"ok": True, "task": item.to_dict(), **result}
    try:
        item = collab_service.assign(
            db, item, user["id"], kind=kind, assignee_id=assignee_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"ok": True, "task": item.to_dict()}


@router.post("/{task_id}/triage")
def triage_task(task_id: int, payload: dict, request: Request,
                db: Session = Depends(get_db)):
    user = _user(request)
    item = _visible(db, user, task_id)
    state = payload.get("triage_state", "")
    if state not in TRIAGE_STATES:
        raise HTTPException(status_code=400, detail=f"triage_state 必须是 {sorted(TRIAGE_STATES)}")
    item.triage_state = state
    db.commit()
    return {"ok": True, "task": item.to_dict()}


@router.post("/{task_id}/comment")
def comment_task(task_id: int, payload: dict, request: Request,
                 db: Session = Depends(get_db)):
    user = _user(request)
    item = _visible(db, user, task_id)
    body = (payload.get("body") or "").strip()
    if not body:
        raise HTTPException(status_code=400, detail="body 不能为空")
    mentions = [m for m in (payload.get("mentions") or []) if isinstance(m, str)]
    return collab_service.add_comment(db, item, user["id"], body, mentions)


@router.get("/{task_id}/runs")
def list_runs(task_id: int, request: Request, db: Session = Depends(get_db)):
    user = _user(request)
    _visible(db, user, task_id)
    rows = db.query(WorkItemRun).filter(
        WorkItemRun.work_item_id == task_id
    ).order_by(WorkItemRun.id.desc()).all()
    return {"runs": [r.to_dict() for r in rows], "total": len(rows)}


@router.post("/{task_id}/runs")
def register_run(task_id: int, payload: dict, request: Request,
                 db: Session = Depends(get_db)):
    user = _user(request)
    item = _visible(db, user, task_id)
    run_id = (payload.get("run_id") or "").strip()
    if not run_id:
        raise HTTPException(status_code=400, detail="run_id 不能为空")
    try:
        run = collab_service.record_run(
            db, item, run_id,
            status=payload.get("status", "queued"),
            agent_id=payload.get("agent_id"),
            summary=payload.get("summary", ""),
            evidence=payload.get("evidence"),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"ok": True, "run": run.to_dict()}


@router.post("/{task_id}/subscribe")
def subscribe_task(task_id: int, request: Request, db: Session = Depends(get_db)):
    user = _user(request)
    item = _visible(db, user, task_id)
    collab_service.subscribe(db, item, user["id"], source="commenter")
    return {"ok": True}


@router.post("/{task_id}/unsubscribe")
def unsubscribe_task(task_id: int, request: Request, db: Session = Depends(get_db)):
    user = _user(request)
    item = _visible(db, user, task_id)
    ok = collab_service.unsubscribe(db, item, user["id"])
    return {"ok": ok}
