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

## T-08 五条小项（2026-10-24）

```text
$ backend: unittest discover -s tests
Ran 499 tests in 134.848s
OK (skipped=6)                     （新增 tests/test_t08_items.py 11 例）

$ frontend: npx tsc --noEmit && npx vitest run
Test Files 12 passed (12) · Tests 109 passed (109)   （新增 domain-policy 3 例 + 团队 tab 1 例 + 可改面编辑删除 1 例）
```

覆盖点：
- 域归因策略：读回显 / 三档 PUT 打对值 / 后端 400 detail 原样展示（不谎报成功）
- 可改面：非管理员 403 · 更新白名单成功 · 非数组 400 · 删除后 404（不再混进 400）
- 熔断审计：trip/reset 均落审计；非管理员 403 且不留痕（`audit_service` 复用 `auth` 的落盘路径）
- squad 指派：生成 leader 任务（assignee=leader agent, parent=任务）· 重复指派去重 · 归档小队 400 · 不存在 404 · member 指派不产生 leader 任务
- 团队页 Tabs：roving tabindex + ←/→/Home/End

## T-06 a11y / 多用户 / 多副本 / 迁移回滚（2026-10-24）

```text
$ backend: unittest discover -s tests
Ran 510 tests in 133.155s
OK (skipped=6)                    （新增 test_cluster_lease.py 5 例 + test_migrations_discipline.py 6 例）

$ E2E_CLI=dsh bash scripts/e2e/run_e2e.sh
SUMMARY 23/23 passed
PASS a11y：回放/任务看板/团队与小队/记忆中心/自动化中心（各 0 违规）
PASS 多用户：bob 的任务列表不含 admin 的任务 — bob 可见 0 条
PASS 多用户：bob 直取 admin 任务详情 = 404 — status=404
```

覆盖点：
- a11y（自研轻量审计，非 axe）：按钮可达名 / 表单控件标签（含包裹 label）/ img alt / 标题层级 / 正 tabindex / tab 的 aria-selected
- 多用户：列表侧不可见 + 详情侧 404（不以 403 泄漏存在性）
- 多副本：单租约独占 · 续租 · 过期接管 · 释放交接 · 待命副本 tick 返回 None
- 迁移：禁止 DROP COLUMN/TRUNCATE/DELETE；裸 DROP TABLE 仅限表重建或登记的历史表；逐条幂等；中途失败不入账且可 fix-forward

## T-07 用户/审计表化（2026-10-24）

```text
$ MySQL：apply_migrations(raw_conn, "mysql")
applied: ['018_users_and_audit_tables'] · pending: []
app_users / audit_log 列齐全（口令哈希、must_change_password、project_ids、custom_permissions…）

$ python scripts/import_users_to_db.py --file /tmp/e2e-mysql/users.json          # dry-run
[import-users] 文件内用户 2 条；导入前表已启用=False → 未写库
$ ... --apply                                                    → upserted=2 deleted=0
$ ... --apply（第二次）                                           → upserted=2 deleted=0（幂等）

$ 移走 users.json 后重启后端
login(no users.json)=200        # 证明登录读表，不回退文件

$ E2E_CLI=hermes bash scripts/e2e/run_e2e.sh
SUMMARY 23/23 passed            # users.json 全程不在

$ mysql> SELECT COUNT(*) FROM audit_log;  → 7（含 auth:login / rsi.breaker.trip / rsi.breaker.reset / scheduled_task.create）
$ GET /api/audit → 返回表内行（表化为查询权威）

$ backend: unittest discover -s tests
Ran 523 tests in 113.483s
OK (skipped=6)
```

覆盖点（`tests/test_t07_user_store.py` 13 例）：
- 迁移 018 建表与列（app_users/audit_log）
- 表空不权威 · 导入 dry-run 不写 · apply 全字段往返（哈希原样）
- 导入幂等 + 删除多余用户
- `auth.load_users` 表优先（文件里同名用户不参与）· 表空退回文件 · `_save_users` 断言不写文件 · `get_user` 读表
- 审计写表 + 留文件 · 读表优先 · 表化前历史行合并去重
- 真实 app 登录：表里的用户能登进来，文件里的「幽灵用户」401
