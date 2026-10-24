# P3-1 · 自动化中心 9 节（原型 6.31 / `automations.html`）

- **状态**：✅ 已实现（前端 18 例 + 后端 26 例 + E2E 入口）
- **实现**：`backend/models/automation.py`、`backend/services/automation_service.py`、`backend/routes/automations_api.py`、迁移 **025**（四表）、`frontend/src/pages/Automations.tsx`、`stores/automations.ts`
- **迁移号为什么是 025 而不是 020**：`020_tool_skill_files`…`024_agent_tools` 已被 v23 multica 迁移占用，账本按 `version` 字符串判重
  （`pending_versions` 判的是集合成员），重号会静默顶掉已有迁移 → 取下一个空号 `025_automations_center`。
  本仓已有 `019_*` 重号先例，但仍按「新迁移取空号」处理。任务书里写的「迁移 020」按此更正。
- **v21 旧端点迁移**（不是兼容影子）：`GET /api/automations` 改为返回新资源；`POST /{id}/toggle` 拆成
  `pause` ⟂ `resume`；`DELETE /{id}` 改为 `POST /{id}/archive`（删除 = 归档，两级账本全保留）。
  `scheduled_tasks` 与 `/api/agents/{id}/scheduled-tasks` 照旧，定时任务没有被删掉。

## 9 节逐条落点

| 原型节 | 实现 | 关键口径 |
|---|---|---|
| ① 清单 | 表列：名称 / 负责人轨 chip / 触发器摘要 / 执行模式 / 状态 / 近 7d 失败率 / 操作；页首四卡（总/启用/暂停/熔断） | 失败率**分母只算完结**（skipped 不计） |
| ② 三段构成 | Runbook（目标/背景/约束/步骤）、负责人（agent ⟂ squad 二轨不可混指）、触发器三块各存各的账，分别保存 | 保存一段不覆盖别段 |
| ③ schedule | 多 schedule 并存；cron 5 段校验（422 明确「无秒位」）；IANA 时区 + 非默认时区标注；Next runs 服务端算；**不预览不给保存** | `GET /{id}/triggers/preview` 服务端算 |
| ④ webhook | token 只显 `secret_preview`；Rotate 后旧 URL 立即失效；`idempotency-key`/`x-github-delivery` 去重；载荷上限 64KB（超限 413 并落投递记录）；事件过滤；**六步推断**返回 `inferred_at_step`；响应语义 200 ignored / 202 accepted / 4xx rejected | 每次投递都落账（跑没跑都记） |
| ⑤ 执行模式 | `create_issue ⟂ run_only`，取舍句写在下拉旁 | 见 `exec_mode` 两值 |
| ⑥ 两级账本 | 运行史（跑了什么）/ 投递记录（外面投了什么）两表 + 选中运行的**只读**回放（执行器未接入如实标注） | 空态写清「空」，不放 0 条假数据 |
| ⑦ 失败治理 | 三种后果各一句：自动熔断（止损非自愈）/ 手动暂停 / 归档（停未来触发、历史保留只读）；归档二次确认 | 三态均落审计 |
| ⑧ 权限两本账 | 「谁能管」（owner/admin）与「能不能真跑」（enabled + breaker）分开显示与判定 | 他人资源 404，不用 403 探测 |
| ⑨ 基线对照 | multica 口径（只有 schedule/webhook 两类触发器、多 schedule 并存）⟂ agentflow 自扩展，分行写 | 不混为一谈 |

## 实测

```text
$ cd backend && ENCRYPTION_KEY=test-key-for-ci-32bytes!! <venv>/bin/python -m unittest tests.test_automations_v2 -v
Ran 26 tests in 119.373s
OK
  （三段落独立保存 / cron 5 段校验+next_runs 真算 / webhook 幂等+64KB 超限+rotate 遮蔽+六步推断 /
    门禁响应语义 / 两级账本+只读回放 / 治理三态+审计 / 权限两本账 / 他人 404 / cron 纯函数 4 例）

$ cd frontend && npx tsc --noEmit
TSC_EXIT=0

$ cd frontend && npx vitest run src/__tests__/automations-nine-sections.test.tsx
✓ src/__tests__/automations-nine-sections.test.tsx (18 tests) 15647ms
Test Files  1 passed (1) · Tests  18 passed (18)
  （① 七列 + 空态 / ② 三段各自只提交自己那段 + detail 透传 / ③ 不预览不给保存 + 422 文案 /
    ④ 遮蔽+字节+六步+响应语义+Rotate / ⑤ 取舍句+exec_mode / ⑥ 两表+只读回放+两处空态 /
    ⑦ 三句后果+归档二次确认+暂停/熔断端点 / ⑧ 两本账分开 / ⑨ 基线分行 / 页内无 h1,h2）

$ 迁移 025（SQLite 新建库）：applied 26 条（… 024_agent_tools, 025_automations_center），pending=[]，重跑 []
$ 迁移 025（真 MySQL 8.0 · 3307 新建 automations_p3 库 · apply_migrations(raw,"mysql")）：
  applied 26 条含 025_automations_center，pending=[]，重跑 []
  四表列齐：automations(15) / automation_triggers(11) / automation_runs(10) / automation_deliveries(12)

$ E2E（hermes 通道）：SUMMARY 39/39 —— 自动化页断言 9 节可见 + 新建自动化真落库（v1 快照）
```

## 与原型/任务书的偏差（如实记）

- **载荷上限**：原型写 JSON ≤256KiB，本轮按任务书收紧到 **65536 字节（64 KiB）**，界面写明字节数，超限 413 且落投递记录。
- **accepted 用 202**：原型四类响应都写 200；按任务书「200/202/4xx 语义」，accepted 回 202（已派生成运行），
  ignored / skipped / duplicate 仍回 200（防上游重试风暴），400/404/413 给技术性拒绝。
- **`api` 型触发器未落库**：原型 ⑨ 的「v14 保留第三类 `api`」本轮只保留 `schedule | webhook` 两类
  （`TRIGGER_KINDS`），⑨ 的对照表里如实标注「本轮未落库」——没有把它说成已实现。
- **Run now / Replay 重放未接执行器**：按钮灰显并在 title/文案里写明「执行器未接入」，不造假运行。
- **webhook 签名（HMAC/401）未实现**：路由只做 token 反查 + 幂等 + 上限 + 事件过滤；
  ④ 的「签名不符 401」只体现在文案与响应码表，不存在校验代码（真实缺口，见遗留风险）。
- **`main.py` 除 import/include 外多一处**：`/api/webhooks/automations/` 前缀在认证中间件里放行 3 行
  （外部系统没有会话，token 即凭据；来源闸门仍生效）。不加这处 webhook 完全不可达。
- **协作/permission 粒度**：只实现「owner 或平台管理员」；原型 ⑧ 的协作者（可管理不可转授权）与 Viewer 只读
  是文案呈现，未做独立授权位。

## 遗留风险

- cron / next_runs 是本仓自实现的 5 段解析（`*`、`n`、`a-b`、步长、逗号列表），**不支持月/周英文名与 `@daily` 宏**；
  日/周同时限定时按标准 cron 取「或」。DST 用「墙钟往返归一化」跳过不存在的时刻，未做「重复时刻跑两次」的 fold 处理。
- webhook 无签名校验（无 HMAC/时间戳），token 泄露 = 可投递；已知并记在 ④ 文案与本节。
- Replay 只读：账本里 `replayed_from` 列已留（供将来写路径），本轮无写入端点。
- 无真实执行器：webhook accepted 只写 `queued` 运行行，不会真跑；失败率/熔断门的数值来自账本里的运行行。

## 顺带修掉的真缺陷

- `previewCron` 原用 `safeFetch`，把后端 **422 的 detail（「只能是 5 段/无秒位」）压成 `Server error: 422`**；改为裸 fetch 并原样透传（`safeFetch` 的错误对象没有 detail，这是读路径的通用坑）。
- 旧 `test_automations_api.py` 打的是已被取代的 `toggle/delete` 端点 → 删除；覆盖面由 v2 用例承接（pause/resume/archive + triggers）。
- 旧 `frontend/src/__tests__/automations-runtimes-replay.test.tsx` 的「自动化中心」那段断言旧一张 cron 表（「共 1 条 · 启用 1」/`POST /toggle`/`DELETE`）→ 该段按新九节页面改写，运行时与回放两段不动（重跑 6/6 通过）。
- v2 用例自身两处断言与实现语义冲突，已按实现口径修正并加注释：
  ① 「第 5 步正文 type」用了带 `push:opened` 过滤的触发器 → 该事件被正确过滤成 `ignored`，改用空规则（全收）的触发器；
  ② 运行史排序断言改为按 `summary` 取行（同一时间窗内多行，索引断言会随插入顺序飘）。
