"""AgentFlow FastAPI 入口."""
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import config
from config import CORS_ORIGIN, HOST, PORT
from auth import get_user, load_users, write_audit
from services import deploy_guard, session_service
from routes.changes import router as changes_router
from routes.change_detail import router as detail_router
from routes.artifact import router as artifact_router
from routes.health import router as health_router
from routes.token_usage import router as token_router
from routes.git_safety import router as git_router
from routes.search import router as search_router
from routes.roles_api import router as roles_router
from routes.admin_api import router as admin_router
from routes.runtime_api import router as runtime_router
from routes.daemon_api import router as daemon_router
from routes.runtimes_api import router as runtimes_router
from routes.auth_api import router as auth_router
from routes.audit_api import router as audit_router
from routes.tools_api import router as tools_router
from routes.workflows_api import router as workflows_router
from routes.agents_api import router as agents_router
from routes.orchestration_api import router as orchestration_router
from routes.metrics_api import router as metrics_router
from routes.projects_api import router as projects_router
from routes.roles_custom_api import router as roles_custom_router
from routes.assembly_api import router as assembly_router
from routes.agent_knowledge_api import router as agent_knowledge_router
from routes.chat_api import router as chat_router
from routes.channel_api import router as channel_router
from routes.control_plane_api import router as control_plane_router
from routes.domain_api import router as domain_router
from routes.gateway_api import router as gateway_router
from routes.alerts_api import router as alerts_router
from routes.human_approval_api import router as human_approval_router
from routes.tasks_api import router as tasks_router
from routes.inbox_api import router as inbox_router
from routes.teams_api import router as teams_router
from routes.prom_metrics import router as prom_metrics_router
from routes.watch_api import router as watch_router
from routes.execution_api import router as execution_router
from routes.rsi_api import router as rsi_router
from routes.a2a_api import router as a2a_router
from routes.automations_api import router as automations_router


async def _l0_extract_loop():
    """L0→L1 定时抽取（默认关闭：`L0_EXTRACT_INTERVAL_SECONDS=0`）。

    单例租约与 cron 一致：多副本只有一个跑；未配置抽取器时只统计规模（dry-run），不花钱。
    """
    from database import SessionLocal
    from services import cluster_store, l0_job

    interval = int(config.L0_EXTRACT_INTERVAL_SECONDS or 0)
    print(f"[l0] 抽取作业启动，每 {interval}s 一次（dry-run：无抽取器）")
    standby_logged = False
    while True:
        try:
            await asyncio.sleep(interval)
        except asyncio.CancelledError:
            break
        db = SessionLocal()
        try:
            out = l0_job.tick(db)          # 租约 + 作业一体，便于单测
            if out is None:
                if not standby_logged:
                    print("[l0] 待命：租约由其他副本持有")
                    standby_logged = True
            else:
                standby_logged = False
                print(f"[l0] 本轮：会话 {out['conversations']} · 候选 {out['candidates']} · 入库 {out['created']}")
        except Exception as e:  # noqa: BLE001 — 作业失败不拖垮进程
            print(f"[l0] 本轮失败: {e}")
        finally:
            db.close()


async def _cron_scheduler_loop():
    """后台定时任务调度器 — 每 30s 检查 cron 表达式（受数据库租约保护）."""
    import datetime
    import calendar
    from database import SessionLocal
    from models.scheduled_task import ScheduledTask
    from services import cluster_store

    print("[cron] 定时任务调度器已启动，每 30s 检查一次")
    standby_logged = False

    while True:
        try:
            await asyncio.sleep(30)
        except asyncio.CancelledError:
            break

        # P1-7：多副本下只有一个副本的 cron 生效，否则同一任务会被触发多次
        try:
            if not cluster_store.acquire_lease("cron-scheduler", config.CLUSTER_LEASE_TTL_SECONDS):
                if not standby_logged:
                    print("[cron] 待命：租约由其他副本持有")
                    standby_logged = True
                continue
            standby_logged = False
        except Exception as e:
            print(f"[cron] 租约失败，跳过本轮: {e}")
            continue

        try:
            now = datetime.datetime.utcnow()
            db = SessionLocal()
            try:
                tasks = db.query(ScheduledTask).filter(
                    ScheduledTask.enabled == True,
                ).all()

                for task in tasks:
                    if _cron_matches(task.cron_expr, now, task.last_run):
                        print(f"[cron] 触发任务: agent={task.agent_id} capability={task.capability} cron={task.cron_expr}")
                        task.last_run = now
                        db.commit()
                        # 直调 service（P0-1 AC-1.5）：不再回环 HTTP、不再伪造 X-User-Id
                        try:
                            from services.agent_trigger import AgentRunError, trigger_agent_run
                            try:
                                result = trigger_agent_run(task.agent_id, task.owner_id)
                            except AgentRunError as e:
                                print(f"[cron] 跳过 agent={task.agent_id}: {e}")
                            else:
                                if result is None:
                                    print(f"[cron] 跳过 agent={task.agent_id}: 不存在或不属于 owner={task.owner_id}")
                        except Exception as e:
                            print(f"[cron] 触发失败 agent={task.agent_id}: {e}")
            finally:
                db.close()
        except Exception as e:
            print(f"[cron] 调度器错误: {e}")


def _cron_matches(cron_expr: str, now, last_run) -> bool:
    """简单 cron 表达式匹配（5 字段：分 时 日 月 周）.
    返回 True 表示当前时间匹配且距离上次运行超过 60 秒."""
    import datetime
    try:
        parts = cron_expr.strip().split()
        if len(parts) != 5:
            return False

        minute, hour, day, month, weekday = parts

        def _matches(field: str, value: int) -> bool:
            if field == "*":
                return True
            if field == str(value):
                return True
            if "/" in field:
                step = int(field.split("/")[1])
                return value % step == 0
            if "," in field:
                return str(value) in field.split(",")
            return False

        # 检查每个字段
        if not _matches(minute, now.minute):
            return False
        if not _matches(hour, now.hour):
            return False
        if not _matches(day, now.day):
            return False
        if not _matches(month, now.month):
            return False

        # weekday: 0=Monday, 6=Sunday (Python datetime: 0=Monday)
        if not _matches(weekday, now.weekday()):
            return False

        # 避免同一分钟内重复触发
        if last_run and (now - last_run).total_seconds() < 55:
            return False

        return True
    except Exception:
        return False


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 部署配置先响亮失败（P0-3）：非法配置不启动，绝不静默降级
    deploy_guard.validate_deploy_config()
    # 执行隔离契约（P2-3）：选了未实现的 tier 就拒绝启动，不静默降级到 inproc
    from services.execution_contract import validate_startup as _validate_exec
    print(f"[exec] 执行隔离契约：{_validate_exec().to_dict()}")
    print(
        f"[deploy] 模式={config.DEPLOY_MODE} · 可信代理={config.TRUSTED_PROXY_IPS or '无'} · "
        f"网段={config.ALLOW_CIDRS or '无'} · TLS={config.TLS_TERMINATED} · "
        f"会话 cookie={deploy_guard.session_cookie_name()}"
    )
    if not deploy_guard.cookie_secure():
        print("[deploy] ⚠ 非 TLS：会话 cookie 退化为 af_session（__Host- 前缀需要 Secure）")
    if deploy_guard.debug_header_enabled():
        print(
            "[deploy] ⚠⚠ X-User-Id 调试通道已开启（env ∧ localhost ∧ admit 白名单）："
            f"{config.AUTH_DEBUG_HEADER_ADMIT_USERS} —— 每个请求都会写 auth:debug_header 审计"
        )
    print(f"[monitor] 启动中... 数据源: .specs/ 扫描间隔: 5s")
    from database import init_db
    # 迁移失败必须让启动失败（P0-8：失败即抛；旧实现把它 try/except 成「跳过」）
    init_db()
    print("[monitor] 数据库表已就绪")
    try:
        session_service.cleanup_expired()
    except Exception as e:
        print(f"[monitor] 会话清理跳过: {e}")
    # 自动创建默认域（可失败：MySQL 未起时上面 init_db 已经先挂了）
    from models.domain import Domain
    from database import SessionLocal
    _db = SessionLocal()
    try:
        if not _db.query(Domain).filter(Domain.name == "默认域", Domain.owner_id == "admin").first():
            _db.add(Domain(name="默认域", owner_id="admin"))
            _db.commit()
            print("[monitor] 默认域 '默认域' 已创建")
    finally:
        _db.close()
    # 启动 runtime.jsonl 文件监控器（每 30s 增量导入运行时数据）
    from services.runtime_watcher import start_watcher
    start_watcher()
    # 启动 Agent 探针服务（每 3s 采集 Agent 健康状态）
    from services.agent_probe_service import probe_service
    probe_service.start()
    # 启动告警服务（每 30s 检测）
    from services.alert_service import alert_service
    alert_service.start()
    # 启动 metrics 模拟数据生成器（仅 METRICS_DEMO=true 时启用）
    import os
    if os.getenv("METRICS_DEMO", "").lower() in ("1", "true", "yes"):
        from services.metrics_scheduler import start_scheduler
        start_scheduler(owner_id="admin", interval_seconds=300)
        print("[monitor] 📊 演示数据生成器已启动（每 5min）")
    # 启动定时任务 cron 调度器
    _cron_task = asyncio.create_task(_cron_scheduler_loop())
    _l0_task = None
    if int(config.L0_EXTRACT_INTERVAL_SECONDS or 0) > 0:
        _l0_task = asyncio.create_task(_l0_extract_loop())
    yield
    _cron_task.cancel()
    try:
        await _cron_task
    except asyncio.CancelledError:
        pass
    if _l0_task is not None:
        _l0_task.cancel()
        try:
            await _l0_task
        except asyncio.CancelledError:
            pass
    print("[monitor] 关闭.")


app = FastAPI(title="AgentFlow", version="0.1.0", lifespan=lifespan)


# ── 认证中间件（P0-1 重写）───────────────────────────────
# 身份唯一来源：cookie 会话 > Bearer PAT > 三重 opt-in 的 debug header > 401。
# X-User-Id 默认**不产生身份**；开启调试通道要 env ∧ localhost ∧ admit 白名单
# 三者同时成立，且每个请求都写 auth:debug_header 审计。
_PUBLIC_PATHS = frozenset({"/api/health", "/api/ping"})
# daemon 上报自带机器级 token（routes/daemon_api）：跳过用户会话；
# 来源闸门不跳过（deploy_guard.peer_allowed 在它之前执行）。
_DAEMON_PATHS = frozenset({"/api/daemon/report"})
# 无需身份、但仍受来源闸门约束的入口（登录页要拿用户列表/权限表）
_ANON_AUTH_PATHS = frozenset({"/api/auth/login", "/api/auth/list", "/api/auth/permissions"})
_MUST_CHANGE_EXEMPT_PREFIX = "/api/auth/"


def _resolve_identity(request: Request):
    """解析身份；返回 (user, session_info, source)。任一层无效即整体 401。"""
    cookie_token = (
        request.cookies.get("__Host-session") or request.cookies.get("af_session")
    )
    if cookie_token:
        row = session_service.resolve_session(cookie_token)
        if not row:
            return None, None, "invalid_session"
        user = get_user(row["user_id"])
        if not user:
            return None, None, "unknown_user"
        return user, row, "session"

    header = request.headers.get("authorization", "")
    if header.lower().startswith("bearer "):
        pat = session_service.resolve_pat(header[7:].strip())
        if not pat:
            return None, None, "invalid_pat"
        user = get_user(pat["user_id"])
        if not user:
            return None, None, "unknown_user"
        return user, pat, "pat"

    # 最后一档：调试头（默认关闭；三重 opt-in、开启有红条、逐请求审计）
    if deploy_guard.debug_header_enabled():
        debug_uid = request.headers.get("x-user-id")
        if debug_uid and deploy_guard.debug_header_allows(debug_uid):
            user = get_user(debug_uid)
            if not user:
                return None, None, "unknown_user"
            return user, {"debug_header": True}, "debug_header"

    return None, None, None


@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    path = request.url.path
    peer = request.client.host if request.client else "unknown"
    # health/ping 是探活面：不要求身份、也不受来源闸门限制（仅 GET，无副作用）
    if path in _PUBLIC_PATHS:
        request.state.client_ip = peer
        return await call_next(request)

    # 1) 来源闸门：DEPLOY_MODE 三值（localhost 仅回环 / lan 网段 / behind-proxy 只收可信反代）
    if not deploy_guard.peer_allowed(peer):
        return JSONResponse(
            {"detail": f"forbidden: 来源不在允许范围（DEPLOY_MODE={config.DEPLOY_MODE}）"},
            status_code=403,
        )
    # 2) 客户端 IP 只用于审计/节流；XFF 仅在 peer 是可信代理时采纳，取右起首个非可信
    client_ip = deploy_guard.effective_client_ip(peer, request.headers.get("x-forwarded-for"))
    request.state.client_ip = client_ip

    # 2.5) /metrics 开关：未开启连 401 都不给（404，不暴露端点存在）
    if path == "/metrics" and not config.METRICS_ENDPOINT_ENABLED:
        return JSONResponse({"detail": "metrics endpoint disabled"}, status_code=404)

    # 2.6) daemon 上报：机器级 token 在路由里校验；这里不解析用户会话
    if path in _DAEMON_PATHS:
        request.state.user = None
        return await call_next(request)

    # 3) 匿名入口（登录/用户列表/权限表）：不需要身份，来源闸门仍然生效
    if path in _ANON_AUTH_PATHS:
        request.state.user = None
        return await call_next(request)

    # 4) 凭证解析（cookie 会话 / Bearer PAT / debug 头）
    user, session_info, source = _resolve_identity(request)
    if not user:
        return JSONResponse({"detail": "未认证"}, status_code=401)
    if not user.get("active", True):
        return JSONResponse({"detail": "用户已被禁用"}, status_code=403)

    request.state.user = user
    request.state.session = session_info
    request.state.auth_source = source

    if source == "debug_header":
        # 开启=逐请求审计（设计口径：知道谁在用后门）
        write_audit(user, "auth:debug_header", user["id"], "auth",
                    f"X-User-Id 调试通道；path={path}", request=request)

    # 5) 首登强制改密：除 /api/auth/* 外一律 403（服务端才是门，前端弹窗只是体验）
    if user.get("must_change_password") and not path.startswith(_MUST_CHANGE_EXEMPT_PREFIX):
        return JSONResponse(
            {"detail": "必须先修改初始口令", "code": "password_change_required"},
            status_code=403,
        )

    return await call_next(request)


# 运行时 Metrics 收集中间件（兜底 — 自动追踪关键 API 调用）
@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    import time
    start = time.time()
    response = await call_next(request)
    duration_ms = int((time.time() - start) * 1000)

    # 只追踪有副作用的 API（chat/run/execute）
    path = request.url.path
    method = request.method
    if method in ("POST", "PUT") and any(k in path for k in ("/chat", "/run", "/execute", "/stop")):
        try:
            from services.runtime_tracer import tracer
            user = getattr(request.state, "user", None)
            if not user:
                return response  # 未认证请求已在 auth 中间件被 401，不记 trace
            # 从路径推断 entity_type 和 entity_id
            import re
            entity_type = "agent"
            entity_id = 0
            if "/agents/" in path:
                m = re.search(r'/agents/(\d+)', path)
                entity_type = "agent"
                entity_id = int(m.group(1)) if m else 0
            elif "/projects/" in path:
                m = re.search(r'/projects/(\d+)', path)
                entity_type = "project"
                entity_id = int(m.group(1)) if m else 0
            elif "/orchestration/" in path:
                entity_type = "orchestration"
                m = re.search(r'/orchestration/(\d+)', path)
                entity_id = int(m.group(1)) if m else 0

            tracer.trace_model_call(
                entity_type=entity_type, entity_id=entity_id,
                owner_id=user.get("id", "admin"),
                model_name="auto-traced",
                prompt_tokens=0, completion_tokens=0,
                duration_ms=duration_ms,
                tool_name=path.split("/")[-1] if "/" in path else path,
                tool_calls=1,
                status="success" if response.status_code < 400 else "error",
            )
        except Exception:
            pass  # 追踪失败不影响业务

    return response


app.include_router(changes_router)
app.include_router(detail_router)
app.include_router(artifact_router)
app.include_router(health_router)
app.include_router(token_router)
app.include_router(git_router)
app.include_router(search_router)
app.include_router(roles_router)
app.include_router(admin_router)
app.include_router(runtime_router)
app.include_router(auth_router)
app.include_router(daemon_router)      # v22 §6.28：daemon 上报（token 鉴权）
app.include_router(runtimes_router)    # v22 §6.28：运行时注册表（会话鉴权）
app.include_router(audit_router)
app.include_router(tools_router)
app.include_router(workflows_router)
app.include_router(agents_router)
app.include_router(orchestration_router)
app.include_router(metrics_router)
app.include_router(projects_router)
app.include_router(roles_custom_router)
app.include_router(agent_knowledge_router)
app.include_router(assembly_router)
app.include_router(chat_router)
app.include_router(channel_router)
app.include_router(control_plane_router)
app.include_router(domain_router)
app.include_router(gateway_router)
app.include_router(alerts_router)
app.include_router(human_approval_router)
app.include_router(tasks_router)
app.include_router(inbox_router)
app.include_router(teams_router)
app.include_router(prom_metrics_router)
app.include_router(watch_router)
app.include_router(execution_router)
app.include_router(rsi_router)
app.include_router(a2a_router)
app.include_router(automations_router)

# CORS 必须**最后**加（Starlette 的 add_middleware 头插 → 最后注册 = 最外层）：
# 这样来源闸门/认证返回的 403/401 与预检响应都带 CORS 头（P0-3 AC-3.3）。
app.add_middleware(
    CORSMiddleware,
    allow_origins=[CORS_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/ping")
async def ping():
    return {"status": "ok", "version": "0.1.0"}


if __name__ == "__main__":
    import uvicorn
    # proxy_headers=False：XFF 由 deploy_guard 自己按 TRUSTED_PROXY_IPS 解析，
    # 不让 uvicorn 再按 forwarded_allow_ips 改写 request.client（避免两套真相）。
    uvicorn.run("main:app", host=HOST, port=PORT, reload=True, proxy_headers=False)
