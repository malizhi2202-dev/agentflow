# ui-parity · 只读盘点与复核（不属于并行会话的实现范围）

- **状态**：**实现中**（P1 完成；P2+ 进行）
- **实现归属**：本 change 接管；前置设计/壳层由并行会话 `v22-ui-align`（W1/W2 已交付）+ `v22-nav-groups` / `v22-runtime-discovery` / `v22-agent-runtime-model` 落地
- **并行会话已收工**：用户确认后由本 change 接管；L-001 教训仍生效——同仓多会话写同一批文件会互相吞掉，接管前已确认对方工作已落树。

## 当前基线（`scripts/proto_parity_check.py` 实测）

```text
$ python3 scripts/proto_parity_check.py
原型：127 页 / 35 页族；导航 34 项
实现：独立页面页族 31；部分实现 0；App.tsx 导航项 41
缺失页族（0）：无
部分实现（2）：agent-detail（现为列表抽屉）/ squads（现为团队页 tab）
元页面（不计缺失，4）：discipline / index / login / relations
```

## 工具

| 文件 | 作用 |
|---|---|
| `scripts/proto_parity_check.py` | 原型 index 导航 + 页族 ⟂ `App.tsx` 的 case/导航 id，输出人与机器两种格式；`--md` 重写本目录 `GAP.md`，`--strict` 在有缺失族时退出 1（可接 CI） |
| `scripts/gen_proto_nav.py` | 从原型 `index.html` 生成导航清单（顺序/编号以原型为准，避免手抄漂移） |
| `INVENTORY.md` / `inventory.json` | 127 页 → 35 页族的机器清单（含每族变体页） |
| `GAP.md` | 机器生成的差距矩阵（`--md` 输出） |

## 口径（避免自欺）

- **页面** = App.tsx 有独立 case 且进导航；**部分** = 只有抽屉/子 tab；
  **元页** = 壳、登录流程、文档型页（不算业务缺失）；**缺失** = 无对应实现。
- 本工具只判「有没有对应实现形态」，**不冒充**页面深度验收；每页族的深度验收（节/交互/E2E）由 v22 会话的用例负责。

## 复核建议（给 v22 会话/验收用）

```bash
python3 scripts/proto_parity_check.py          # 看差距
python3 scripts/proto_parity_check.py --md     # 刷新 GAP.md（随实现推进同步）
python3 scripts/proto_parity_check.py --strict # 后续接 CI：缺失族未清零即失败
```

## 本轮验证（2026-10-25）

```text
$ cd frontend && npx tsc --noEmit && npx vitest run && npm run build
tsc 0 · Test Files 19 passed · Tests 174 passed · build ✓

$ python3 scripts/proto_parity_check.py --strict
原型 127 页 / 35 族；独立页 31 · 部分 0 · 缺失 0 · 元页 4   （exit 0）

$ NODE_PATH=~/ai/agentflow-data/e2e-deps/node_modules E2E_CLI=hermes bash scripts/e2e/run_e2e.sh
SUMMARY 39/39 passed
  · 新增 8 页族可达：阶段模型配置 / 决策模型目录 / 微调工厂 / 执行隔离 / 对外集成 / 环境参谋 / Agent 详情 / 小队中心
  · 每页同时跑 a11y（0 违规）；壳层 .crumb 由 span 改 h1 后「页面无标题」清零
```

顺带修掉的 E2E 假红（都是本仓自身变更带来的选择器漂移，不是产品回归）：
- v22 把页名移到壳层 crumb → 原 `getByRole('heading')` 断言改为 crumb 断言；
- 登录页用户列表默认不公开 → 登录抽成 `login()` 并兼容「用户卡片 / 手填 ID」两形态；
- E2E 默认解释器/库名指向旧 `/tmp` venv 与 `agentflow_e2e` → 改为持久 venv 与 `agentflow`。

## P4 落地（2026-10-25）

```text
迁移 019（真 MySQL 已应用）：
  decision_models：id/owner_id/name/track/kind/health/latency_p95_ms/threshold/escalated/fallback/bindings/enabled/...
  finetune_batches：id/owner_id/task_name/base_model/data_sessions/data_memories/fingerprint/engine/hw_ok/status/acc/ece/agree/gate_verdict/gate_reason

$ backend: unittest discover -s tests
Ran 629 tests in 202.676s · OK (skipped=6)          （+12：决策模型 6 / 门禁 5 / 画像 1）

$ frontend: npx vitest run
Test Files 19 passed · Tests 177 passed                （+3 换成真后端断言）

$ E2E_CLI=hermes bash scripts/e2e/run_e2e.sh
SUMMARY 39/39 passed                                  （三页已从「规划原型」变真数据）
```

口径要点（都写进了代码注释与用例）：
- **登记 ≠ 在用**：绑定默认全关（未绑定 ⇒ 直通）；`bindings` 落库。
- **不假装健康**：健康态只有探测能改；无探测适配器时重探返回 `unprobed` + 明确 detail（fail-closed）。
- **门禁在服务端**：硬件 → 准确率 → ECE 三段判定，前端只展示 verdict 与原因。
- **环境参谋零执行**：只读本机画像（默认不上传），方案给 `why` + 可复制步骤，不代装/不代跑。

## P3 第一批（2026-10-25）：自动化 9 节 + Agent 详情十六分区

```text
$ backend: unittest discover -s tests
Ran 649 tests in 235.394s · OK (skipped=6)      （含新 test_automations_v2 26 例；删除已被取代的旧文件 6 例）

$ frontend: vitest run
Test Files 21 passed · Tests 199 passed           （automations-nine-sections 18 + agent-config-sections 9）

$ E2E（hermes）
SUMMARY 39/39 passed —— 自动化页：9 节可见 + 新建自动化真落库；Agent 详情页：十六分区编辑器可用

$ 迁移 020（真 MySQL）：automations / automation_triggers / automation_runs / automation_deliveries，pending=0
```

并行执行方式（本轮实践）：两条互不重叠的 P3 任务分给两个 subagent（文件所有权写进 prompt），
结果：Agent 详情十六分区一次通过（9 例自测）；自动化 9 节后端 26 例中 2 条断言与实现语义冲突、
前端 1 处 TS 错误、旧 automations 用例与 E2E 断言漂移 —— 由父会话逐项修正后合并。
教训：**子 agent 的自测断言也要当代码 review**（它不是验收）。

## 更正（迁移号）

自动化中心四表的迁移号是 **`025_automations_center`**，不是提交信息里写的 `020`：
`020_tool_skill_files`…`024_agent_tools` 已被 v23 multica 迁移占用，账本按 version 字符串判重，
重号会静默顶掉已有迁移。提交 `67dd1491` 的信息无法改写，以此行为准。

已在真 MySQL 复核：`pending=[]`，四表列齐（automations 15 / automation_triggers 11 / automation_runs 10 / automation_deliveries 12）。

同批还有一处 `backend/main.py` 的必要改动：认证中间件放行 `/api/webhooks/automations/` 前缀
（外部系统无会话，**token 即凭据**；来源闸门 `peer_allowed` 仍在更早一档生效，未知/已轮换 token 一律 404）。

## P3 第二批（2026-10-25）：看板 / 对话 / 知识库 / 管控面

```text
$ backend: unittest discover -s tests
Ran 659 tests in 314.035s · OK (skipped=6)      （+10：test_board_evidence）

$ frontend: vitest run
Test Files 25 passed · Tests 250 passed          （+51：board 8 / chat 15 / knowledge 13 / control-plane 15）

$ E2E（hermes）
SUMMARY 43/43 passed
  · 看板：无证据完成 → 仍完成但出现「缺证据」警告（不硬拦）
  · 对话中心：私密 / 一条消息=一 run / 离线 queued 口径可见
  · 知识库：§0 权限矩阵 + §3 外部源
  · 管控面：调度底座 / RSI 开关 / 维护作业 三块卡区
```

三族口径要点（均由用例锁定）：
- **看板**：状态×受理两轴不混（改状态不动 triage）· 状态标签不授予行为 · **done 缺证据=警告式**（200 完成 + `evidence_warned` + 收件箱提醒，不做 400）· 指派三轨（squad=leader 入队）。
- **对话中心**：1:1 完全私密 · 一条消息=一个 run（含 queued/running/done/failed）· 运行时离线排队提示（并明标「排队转 queued 自动补发尚未实现」）· 归档只读 / Agent 不可运行禁发。
- **知识库**：§0 权限矩阵一屏 · §1 公共知识四分类 · §2 空间 1:1 真实项目 · §3 外部源（凭据值全页不渲染）；写操作 detail 透传（旧 `T|null` 签名吞 detail 已修）。
- **管控面**：三卡组数据全部来自接口，缺字段逐格「未接入」；RSI 总闸无端点 → 按类目逐个打并如实报部分失败；维护作业入口禁用（无端点不做假按钮）。

并行执行复盘（第二批）：
- 3 个 subagent 并行的**产出可用率**高于第一批（自动化那个中途挂掉），但**测试/选择器与既有用例的漂移**仍是主要返工点：
  本轮 E2E 先后修了 4 处定位（卡片 `article[aria-label]`、表单开关式 `ensureNewTask`、三轨 chip 按钮、`→ 待验收` 标签）。
- 结论：并行可以提速写实现，但**跨族集成（E2E/全量门禁）必须串行收口**，且 E2E 定位要优先用语义角色/稳定 aria 标识而不是层级 XPath。
