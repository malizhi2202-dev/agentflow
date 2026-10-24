# UAT · v20-release（波 0–7 集成）

> 环境：`PROJECT_ROOT=/tmp/uatroot/backend`（隔离 users.json）· `DATABASE_URL=sqlite:////tmp/uatdb/uat.db`（全新库）· `DEPLOY_MODE=localhost` · `uvicorn --port 8123`
> 说明：这是**程序级 UAT**（8 个 change 属同一次发布），不再按 change 拆 8 份空壳；ALIGNMENT §3a A4 已同步为程序级。
> 「人工确认」列已回填：用户 2026-10-24 答复「全部通过（已看证据）」。

## 结论速览

| # | 场景 | 自动证据 | 人工确认 |
|---|---|---|---|
| UAT-0 | 探活面可用 | `GET /api/health` → **200**（修复前 500，见 T-FIX-01） | ✅ 通过（用户 2026-10-24 确认「全部通过（已看证据）」） |
| UAT-1 | 登录 + 强制改密 | `POST /api/auth/login` → 200 `must_change_password:true`；`POST /api/auth/password` → 200；再登录 `must_change_password:false` | ✅ 通过（用户 2026-10-24 确认「全部通过（已看证据）」） |
| UAT-2 | ETag / If-Match→412 | `GET /api/admin/workflow` 返回 `etag: "0663a354…"`；合法 body + 错 `If-Match` → **412**；对 ETag → 200 + `generation:1` | ✅ 通过（用户 2026-10-24 确认「全部通过（已看证据）」） |
| UAT-3 | `/metrics` 端点门 | 未开开关 → **404**（不给探测面） | ✅ 通过（用户 2026-10-24 确认「全部通过（已看证据）」） |
| UAT-4 | 任务归因双列 | `POST /api/tasks` → 200，`originator_id=admin`、`accountable_id=admin` | ✅ 通过（用户 2026-10-24 确认「全部通过（已看证据）」） |
| UAT-5 | RSI 四类开关 | `GET /api/rsi/switches` → `[memory, skill, orchestration, model]`；暂停 memory → 写记忆 **409「自动体已暂停」**；恢复后 → 200 `promoted`、`post_ingest_scan=true` | ✅ 通过（用户 2026-10-24 确认「全部通过（已看证据）」） |
| UAT-6 | A2A M0 静态卡 | `GET /api/a2a/agents/1/card` → 200，`maturity=M0`、capabilities 三项 false；`grep -c "sk-uat\|api_key"` → **0**；不存在 → 404 | ✅ 通过（用户 2026-10-24 确认「全部通过（已看证据）」） |
| UAT-7 | watch SSE | `GET /api/watch?since=0&max_polls=1` → `id: 1` / `event: change` / `data: {...}`（游标即 id） | ✅ 通过（用户 2026-10-24 确认「全部通过（已看证据）」） |

## 原始输出（真实粘贴）

```text
== UAT-0 health ==
HTTP=200
{"consistent":false,"issues":[{"change_id":"v20-wave7","type":"missing_requirement",
 "detail":"有 CHANGE.md 但缺少 REQUIREMENT.md"}]}

== UAT-1 登录 / 改密 ==
POST /api/auth/login → 200 {"ok":true,"user":{"id":"admin","name":"管理员","role":"admin"},"must_change_password":true}
POST /api/auth/password → 200 {"ok":true}
POST /api/auth/login → 200 {"ok":true,...,"must_change_password":false}

== UAT-2 ETag / 412 ==
GET /api/admin/workflow → HTTP=200
etag: "0663a35455f740e2703b142eeaf1caa6fb1ff34f81f69549a72724df2cc46c3a"
PUT + If-Match: "stale-etag" → HTTP=412
{"detail":"If-Match 与当前资源不一致：期望 \"stale-etag\"，当前 \"0663a354…\""}
PUT + 正确 ETag → HTTP=200 {"ok":true,"stages":[…9 段…],"generation":1,"etag":"\"0663a354…\""}

== UAT-3 /metrics 未开启 ==
GET /metrics → HTTP=404

== UAT-4 任务双列 ==
POST /api/tasks → HTTP=200
{'id': 1, 'title': 'UAT 任务', 'originator_id': 'admin', 'accountable_id': 'admin'}

== UAT-5 RSI 开关 ==
GET /api/rsi/switches → ['memory','skill','orchestration','model']
POST /api/rsi/switches/memory {"enabled":false} → 200 {"category":"memory","enabled":false,
 "state":"paused","label":"自动体已暂停"}
POST /api/rsi/memories → HTTP=409 {"detail":"自动体已暂停（memory）：关闭期间拒绝一切自动写入/提案/发布"}
POST /api/rsi/switches/memory {"enabled":true} → 200
POST /api/rsi/memories → HTTP=200 {'stored': True, 'status': 'promoted', 'post_ingest_scan': True}

== UAT-6 A2A 卡 ==
POST /api/agents → HTTP=200 agent_id=1
GET /api/a2a/agents/1/card → HTTP=200
{"apiVersion":"agentflow/v1","kind":"AgentCard","maturity":"M0","name":"UAT 助手",
 "capabilities":{"streaming":false,"pushNotifications":false,"stateTransitionHistory":false},
 "endpoints":{"invoke":"/api/agents/1/run"},
 "note":"M0 静态卡：只做发现，不做 A2A 任务协商（M2 冻结，见 RULINGS R4-2）"}
grep -c "sk-uat-should-not-leak|api_key" card.json → 0
GET /api/a2a/agents/999999/card → HTTP=404

== UAT-7 watch SSE ==
id: 1
event: change
data: {"id":1,"resource_type":"workflow_config","resource_id":"0","generation":1,...}

== UAT-8 团队 ==
POST /api/teams {"slug":"uat-team","name":"UAT 团队"} → HTTP=200
{"ok":true,"team":{"id":1,"slug":"uat-team","status":"active",...}}
```

## 自动化四门（同批）

```text
$ cd backend && /tmp/afvenv2/bin/python -m unittest discover -s tests
Ran 391 tests in 76.433s — FAILED (failures=29, errors=12, skipped=6)
  → 与登记基线 29F/12E/6S 逐条同名（diff 为空）= 0 新增红
$ 16 个波次相关模块同批 → Ran 217 tests in 39.809s — OK（UAT 修复后复跑）
$ cd frontend && npx tsc --noEmit → exit 0
$ cd frontend && npx vitest run → Test Files 6 passed, Tests 57 passed
$ cd frontend && npm run build → ✓ built in 15.08s
```

## 失败诊断记录

| 编号 | 现象 | 根因 | 处理 | 重跑结果 |
|---|---|---|---|---|
| T-FIX-01 | `GET /api/health` → 500 `NameError: STAGES` | `scanner._phase_order` 未随波 0 收口改判 | 改取 `stage_config.STAGES` + 3 条回归用例 | health 200、`test_regressions` 3 绿 |
| T-FIX-02 | pyflakes：`metrics_api.py:35 undefined name 'SessionMetric'` | 死函数 `_owner_filter` 里引用未导入符号 | 删除死代码 | pyflakes 0 命中、全量回归无新增红 |

## 未覆盖（如实记账）

- 前端界面：波 3–7 的界面未挂载（无页面可点），UAT 只覆盖 API 与既有页面（登录/改密）。
- `users.json`→表化（裁定⑦）未做，UAT 的 users 仍是文件态（隔离到 `/tmp/uatroot/users.json`）。
- `/metrics` 开启态未在本轮实测（只验了关闭态 404；开启态由 `test_observability` 覆盖 401）。
