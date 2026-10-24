# SUMMARY: v20-wave1 — 波 1 身份三连（P0-1 / P0-2 / P0-3）

- **Change ID**: v20-wave1
- **Task ID**: T-01…T-04（按 change 归并，逐任务见 `TASK.md`）
- **完成时间**: 2026-10-24（提交 `5cf2a6fa` `129c33ec`）
- **AI 角色**: Dev
- **补记说明**: 7-integration 阶段补落（漂移 D4-1）

## 做了什么

把「身份自述 + 缺省 admin + 无盐口令」这三处 fail-open 一次清掉：
① **P0-1 服务端会话**：`sessions` / `pat_tokens` 迁移 006，`__Host-session` HttpOnly cookie；请求身份链 cookie > Bearer PAT > **401**，三处 fail-open 清零；登录失败节流 5 次/15 分钟 → 429；`must_change_password` 服务端 403；PAT 90 天到期且不可永不过期。
② **P0-2 口令**：argon2id 优先、scrypt 兜底、历史 sha256 渐进升级；废掉硬编码出厂口令，首启随机口令只打一次日志。
③ **P0-3 部署闸门**：`DEPLOY_MODE` 三值 + 可信代理 XFF 纪律，非法配置**启动即失败**；CORS 放最外层；`/api/auth/deploy-info`。

## 改动文件（关键）

| 文件 | 性质 | 说明 |
|---|---|---|
| `backend/passwords.py`、`backend/auth.py`、`backend/routes/auth_api.py` | 新增/改写 | argon2id + 渐进升级 + 会话/PAT |
| `backend/models/session.py`、`backend/services/session_service.py` | 新增 | 会话与令牌落库 |
| `backend/services/deploy_guard.py`、`backend/config.py` | 新增/修改 | 部署模式与来源判定 |
| `backend/main.py` | 改写 | 身份中间件：cookie > PAT > 401；`/metrics` 门在中间件 |
| 22 个 `backend/routes/*.py` | 修改 | 去掉 `X-User-Id` 自述回退 |
| `frontend/src/pages/LoginPage.tsx`、`components/ForcePasswordChange.tsx`、`stores/auth.ts` 等 | 修改 | 登录态与强制改密 |

## verify 输出（本轮复跑）

```text
$ 16 个波次相关模块同批：Ran 217 tests in 39.809s — OK
  （含 test_passwords / test_auth_sessions 27 / test_deploy_guard）
$ cd frontend && npx tsc --noEmit → exit 0
```

## 已知接受 + 理由

- **登录节流已落库**（后续波 2 随 P1-7 外置；本条 SUMMARY 写于波 2 之后，记录为「已落库 · 5 败/15min 多副本共享」）。
- **`users.json` 仍为文件态**：裁定⑦ 的「users 表化」未做（见 ALIGNMENT D2-1 裁决项 V1）。
