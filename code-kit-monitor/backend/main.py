"""code-kit-monitor FastAPI 入口."""
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from config import CORS_ORIGIN, HOST, PORT
from auth import get_user, load_users
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


async def _cron_scheduler_loop():
    """后台定时任务调度器 — 每 30s 检查 cron 表达式."""
    import datetime
    import calendar
    from database import SessionLocal
    from models.scheduled_task import ScheduledTask

    print("[cron] 定时任务调度器已启动，每 30s 检查一次")

    while True:
        try:
            await asyncio.sleep(30)
        except asyncio.CancelledError:
            break

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
                        # 异步调用 agent run（不阻塞调度器）
                        try:
                            import urllib.request
                            import json as _json
                            data = _json.dumps({}).encode("utf-8")
                            req = urllib.request.Request(
                                f"http://127.0.0.1:8000/api/agents/{task.agent_id}/run",
                                data=data,
                                method="POST",
                                headers={
                                    "Content-Type": "application/json",
                                    "X-User-Id": task.owner_id,
                                },
                            )
                            urllib.request.urlopen(req, timeout=10)
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
    print(f"[monitor] 启动中... 数据源: .specs/ 扫描间隔: 5s")
    from database import init_db
    try:
        init_db()
        print("[monitor] 数据库表已就绪")
        # 自动创建默认域
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
    except Exception as e:
        print(f"[monitor] 数据库初始化跳过（可能 MySQL 未启动）: {e}")
    # 启动 runtime.jsonl 文件监控器（每 30s 增量导入 code-kit 运行时数据）
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
    yield
    _cron_task.cancel()
    try:
        await _cron_task
    except asyncio.CancelledError:
        pass
    print("[monitor] 关闭.")


app = FastAPI(title="code-kit-monitor", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[CORS_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 认证中间件：读取 X-User-Id header，注入 request.state.user
@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    # localhost 安全检查
    host = request.client.host if request.client else "unknown"
    if host not in ("127.0.0.1", "localhost", "::1"):
        return JSONResponse({"error": "forbidden: localhost only"}, status_code=403)

    # 加载用户：从 X-User-Id header 获取
    # - 未传 header → 默认 admin（向后兼容）
    # - 传了 header 但用户不存在 → 401（安全：不静默提权）
    user_id = request.headers.get("X-User-Id")
    if user_id:
        user = get_user(user_id)
        if not user:
            return JSONResponse({"error": f"用户 '{user_id}' 不存在"}, status_code=401)
    else:
        user = get_user("admin")  # 默认 admin
    request.state.user = user
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
            user = getattr(request.state, "user", {"id": "admin"})
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


@app.get("/api/ping")
async def ping():
    return {"status": "ok", "version": "0.1.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=HOST, port=PORT, reload=True)
