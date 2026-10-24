"""团队与小队 API（R5-3 / R5-4）— 成员四档 / 五类资产归属 / 可指派小队。

口径（服务层实现，路由只做映射）：
- 非成员一律 404（`services.team_service.NotFound`）；
- Team 不可被指派；Squad 不拥有资产；
- 指派小队 = 给 leader 入队一条 leader 任务（去重）。
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from auth import is_admin
from database import get_db
from services import team_service as ts

router = APIRouter(prefix="/api", tags=["teams"])


def _user(request: Request) -> dict:
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="未认证")
    return user


def _map_error(exc: Exception):
    if isinstance(exc, ts.NotFound):
        raise HTTPException(status_code=404, detail=str(exc))
    if isinstance(exc, ts.TeamConflict):
        raise HTTPException(status_code=409, detail=str(exc))
    if isinstance(exc, ts.SquadForbidden):
        raise HTTPException(status_code=403, detail=str(exc))
    if isinstance(exc, ts.TeamError):
        raise HTTPException(status_code=400, detail=str(exc))
    raise exc


def _require_team_admin(db: Session, user: dict, team) -> None:
    if is_admin(user):
        return
    role = ts.member_role(db, team, user["id"])
    if role not in ("owner", "admin"):
        # 非成员已由 get_for_member 拦成 404；成员但权限不够 → 403
        raise HTTPException(status_code=403, detail="需要团队 owner/admin 权限")


# ── 团队 ──────────────────────────────────────────────────

@router.get("/teams")
def list_teams(request: Request, db: Session = Depends(get_db)):
    return {"teams": ts.list_for_user(db, _user(request))}


@router.post("/teams")
def create_team(payload: dict, request: Request, db: Session = Depends(get_db)):
    user = _user(request)
    try:
        team = ts.create_team(
            db, user,
            slug=payload.get("slug", ""),
            name=payload.get("name", ""),
            owner_user_id=payload.get("owner_user_id"),
            description=payload.get("description", ""),
            quotas=payload.get("quotas") or {},
        )
    except Exception as e:  # noqa: BLE001 — 统一映射
        _map_error(e)
    return {"ok": True, "team": ts._team_dict(db, team)}


@router.get("/teams/{ref}")
def get_team(ref: str, request: Request, db: Session = Depends(get_db)):
    user = _user(request)
    try:
        team = ts.get_for_member(db, user, ref)
    except Exception as e:  # noqa: BLE001
        _map_error(e)
    return {
        "team": ts._team_dict(db, team),
        "members": [
            m.to_dict() for m in db.query(ts.TeamMember).filter(
                ts.TeamMember.team_id == team.id
            ).order_by(ts.TeamMember.id.asc()).all()
        ],
        "assets": ts.list_assets(db, team),
    }


@router.post("/teams/{ref}/members")
def add_member(ref: str, payload: dict, request: Request, db: Session = Depends(get_db)):
    user = _user(request)
    try:
        team = ts.get_for_member(db, user, ref)
        _require_team_admin(db, user, team)
        row = ts.add_member(db, team, payload.get("user_id", ""), payload.get("role", "member"))
    except Exception as e:  # noqa: BLE001
        _map_error(e)
    return {"ok": True, "member": row.to_dict()}


@router.delete("/teams/{ref}/members/{user_id}")
def remove_member(ref: str, user_id: str, request: Request, db: Session = Depends(get_db)):
    user = _user(request)
    try:
        team = ts.get_for_member(db, user, ref)
        _require_team_admin(db, user, team)
        ok = ts.remove_member(db, team, user_id)
    except Exception as e:  # noqa: BLE001
        _map_error(e)
    if not ok:
        raise HTTPException(status_code=404, detail="成员不存在")
    return {"ok": True}


@router.post("/teams/{ref}/transfer-owner")
def transfer_owner(ref: str, payload: dict, request: Request, db: Session = Depends(get_db)):
    user = _user(request)
    try:
        team = ts.get_for_member(db, user, ref)
        if not is_admin(user) and team.owner_user_id != user["id"]:
            raise HTTPException(status_code=403, detail="只有当前 owner 可以发起转让")
        team = ts.transfer_owner(
            db, team, payload.get("new_owner", ""), bool(payload.get("confirm", False)),
        )
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        _map_error(e)
    return {"ok": True, "team": ts._team_dict(db, team)}


@router.post("/teams/{ref}/status")
def set_status(ref: str, payload: dict, request: Request, db: Session = Depends(get_db)):
    user = _user(request)
    try:
        team = ts.get_for_member(db, user, ref)
        _require_team_admin(db, user, team)
        team = ts.set_status(db, team, payload.get("status", ""))
    except Exception as e:  # noqa: BLE001
        _map_error(e)
    return {"ok": True, "team": ts._team_dict(db, team)}


@router.get("/teams/{ref}/assets")
def list_assets(ref: str, request: Request, db: Session = Depends(get_db)):
    user = _user(request)
    try:
        team = ts.get_for_member(db, user, ref)
    except Exception as e:  # noqa: BLE001
        _map_error(e)
    return {"assets": ts.list_assets(db, team), "counts": ts.asset_counts(db, team)}


@router.post("/teams/{ref}/assets/{kind}/{asset_id}/claim")
def claim_asset(ref: str, kind: str, asset_id: int, request: Request,
                db: Session = Depends(get_db)):
    user = _user(request)
    try:
        team = ts.get_for_member(db, user, ref)
        _require_team_admin(db, user, team)
        result = ts.claim_asset(db, team, user["id"], kind, asset_id)
    except Exception as e:  # noqa: BLE001
        _map_error(e)
    return {"ok": True, "asset": result}


@router.post("/teams/{ref}/assets/{kind}/{asset_id}/release")
def release_asset(ref: str, kind: str, asset_id: int, request: Request,
                  db: Session = Depends(get_db)):
    user = _user(request)
    try:
        team = ts.get_for_member(db, user, ref)
        _require_team_admin(db, user, team)
        result = ts.release_asset(db, team, user["id"], kind, asset_id)
    except Exception as e:  # noqa: BLE001
        _map_error(e)
    return {"ok": True, "asset": result}


# ── 小队 ──────────────────────────────────────────────────

@router.get("/squads")
def list_squads(request: Request, db: Session = Depends(get_db)):
    _user(request)
    return {"squads": ts.list_squads(db)}


@router.post("/squads")
def create_squad(payload: dict, request: Request, db: Session = Depends(get_db)):
    user = _user(request)
    try:
        squad = ts.create_squad(
            db, slug=payload.get("slug", ""), name=payload.get("name", ""),
            leader_agent_id=int(payload.get("leader_agent_id") or 0),
            instructions=payload.get("instructions", ""),
            created_by=user["id"],     # 写操作授权来源（assert_can_manage_squad 读它）
        )
    except Exception as e:  # noqa: BLE001
        _map_error(e)
    return {"ok": True, "squad": ts._squad_dict(db, squad)}


@router.get("/squads/{ref}")
def get_squad(ref: str, request: Request, db: Session = Depends(get_db)):
    _user(request)
    try:
        squad = ts._squad(db, ref)
    except Exception as e:  # noqa: BLE001
        _map_error(e)
    return {"squad": ts._squad_dict(db, squad)}


@router.post("/squads/{ref}/members")
def add_squad_member(ref: str, payload: dict, request: Request,
                     db: Session = Depends(get_db)):
    user = _user(request)
    try:
        squad = ts._squad(db, ref)
        ts.assert_can_manage_squad(db, squad, user)
        row = ts.add_squad_member(
            db, squad, payload.get("member_kind", "agent"), payload.get("member_id", ""),
        )
    except Exception as e:  # noqa: BLE001
        _map_error(e)
    return {"ok": True, "member": row.to_dict()}


@router.delete("/squads/{ref}/members/{member_kind}/{member_id}")
def remove_squad_member(ref: str, member_kind: str, member_id: str, request: Request,
                        db: Session = Depends(get_db)):
    user = _user(request)
    try:
        squad = ts._squad(db, ref)
        ts.assert_can_manage_squad(db, squad, user)
        ok = ts.remove_squad_member(db, squad, member_kind, member_id)
    except Exception as e:  # noqa: BLE001
        _map_error(e)
    if not ok:
        raise HTTPException(status_code=404, detail="成员不存在")
    return {"ok": True}


@router.post("/squads/{ref}/archive")
def archive_squad(ref: str, request: Request, db: Session = Depends(get_db)):
    user = _user(request)
    try:
        squad = ts._squad(db, ref)
        ts.assert_can_manage_squad(db, squad, user)
        squad = ts.archive_squad(db, squad)
    except Exception as e:  # noqa: BLE001
        _map_error(e)
    return {"ok": True, "squad": ts._squad_dict(db, squad)}


@router.post("/squads/{ref}/assign")
def assign_squad(ref: str, payload: dict, request: Request, db: Session = Depends(get_db)):
    user = _user(request)
    try:
        squad = ts._squad(db, ref)
        ts.assert_can_manage_squad(db, squad, user)
        result = ts.assign_task_to_squad(db, squad, user["id"], int(payload.get("task_id") or 0))
    except Exception as e:  # noqa: BLE001
        _map_error(e)
    return result
