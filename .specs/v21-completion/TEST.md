# TEST · v21-completion（逐项留证）


## T-02 Agent 真实运行时执行（2026-10-24）

```text
$ cd backend && unittest tests.test_runtime_exec tests.test_chat_runtime
Ran 12 tests — OK

真实 CLI 冒烟（RUNTIME_EXEC_ENABLED=1）：
hermes: reply='1' runtime=hermes (7.4s)
dsh:    reply='1' runtime=dsh    (3.7s)

$ unittest discover -s tests
Ran 477 tests in 76.655s
FAILED (failures=29, errors=12, skipped=6)
diff 基线失败清单 → 无差异（0 新增红）
```

覆盖点：默认关闭、模板缺失、无 `{prompt}` 占位、argv 单参数（不经 shell）、非零退出、命令不存在、
运行时报错**不降级**、未启用走 provider、启用走运行时（prompt 带角色标记）。

## T-04 测试基建（2026-10-24）

```text
$ bash scripts/ci.sh --with-coverage
后端 pyflakes（undefined name）= 0
Ran 482 tests in 102.335s
OK (skipped=6)
后端 coverage（services/routes）TOTAL 7340 / 未覆盖 3774 → 49%
前端 tsc --noEmit → 0 错误
前端 vitest → Test Files 10 passed · Tests 93 passed
前端 coverage → Statements 15.36% · Branches 67.7% · Functions 43.8% · Lines 15.36%
前端 npm run build → ✓ built in 16.17s
CI ✅ 全绿
```

```text
$ E2E_CLI=hermes bash scripts/e2e/run_e2e.sh
L0 第 1 次：candidates=1 stored=1
SUMMARY 13/13 passed
  记忆：L0 抽取结果已在列表 — 记忆行=32 含502=true
  运行时：judge=llm 真实调用 hermes CLI — pass_rate=0.5 kind=llm_judge

$ E2E_CLI=dsh bash scripts/e2e/run_e2e.sh
L0 job: {"conversation_id": 1, "dry_run": false, "candidates": 1, "created": 1}
SUMMARY 13/13 passed
  运行时：judge=llm 真实调用 dsh CLI — pass_rate=0.5 kind=llm_judge
```

覆盖点：
- CI 四道门：pyflakes 未定义名 / 后端全量单测 / 前端 tsc+vitest+coverage / 生产构建（`scripts/ci.sh` 与 `.github/workflows/ci.yml` 同源）
- 覆盖率：前端 v8 只统计 `src/**`（排除测试与入口）；后端 `coverage --source=.`
- E2E 双通道：同一个脚本换 `E2E_CLI=dsh|hermes`，后端 provider/judge 都换成对应 CLI，均 13/13
- L0 循环：`l0_job.tick` 三态（拿到租约抽一次 / 备用实例 standby 返回 None / 无租约不抽）
- 顺带回归：`requestDedup` 写后读（4 例，含在途读被失效的顺序）、抽取器解析（容器键/字段别名/单字符串 evidence）

## T-05 前端三页（2026-10-24）

```text
$ backend: unittest discover -s tests
Ran 488 tests in 123.862s
OK (skipped=6)                     （新增 tests/test_automations_api.py 6 例）

$ frontend: npx tsc --noEmit && npx vitest run
Test Files 11 passed (11)
Tests 104 passed (104)             （新增 automations-runtimes-replay.test.tsx 11 例）

$ E2E_CLI=dsh bash scripts/e2e/run_e2e.sh
SUMMARY 16/16 passed
PASS 自动化：新建定时任务（真落库）
PASS 运行时：页面可达（summary/sessions）
PASS 回放：选任务看运行时间线
```

覆盖点：
- 自动化中心：owner 可见性（他人任务 404 而非 403）· admin 全见 · 启停幂等落库 · 删除 · 未登录 401；
  前端空态、缺 cron 前端先拦不发请求（mock 下拉必须有真实选项，否则假绿）、暂停/删除打对端点
- 运行时：summary/stats/sessions 三读渲染 · 失败会话重试打对端点 · 无数据空态
- 回放：任务列表 → 运行时间线（有记录/无记录两态）· 只读（不触发重跑）
- 板：`pages/Tasks.tsx` 四列看板已存在（本轮核实，不重复造页）
