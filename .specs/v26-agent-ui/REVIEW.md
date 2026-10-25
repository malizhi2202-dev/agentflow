# REVIEW · v26 自查（三个最易踩的坑逐一过）

## 坑1 · 受控态下沉 pane → 切栏草稿蒸发、单 PUT 口径崩

**结论：未踩。** `envRows/cliArgs/mcpText` 全部住 `useAgentDraft`，仅由壳层 `AgentDetail` 调用；`AgentConfigEditor` 是无状态渲染面（props 传 draft）；六个 `*Sections.tsx` 分区组件**零改动**（git diff 可验，均在 66aed2d5 外）。回归锁两条：CFG-06（能力·MCP 改文本 → 概览 → 设置·通用 → 保存恰 1 PUT 且新值在 payload）、AD-05（经「工作」栏中转回能力再保存）。

## 坑2 · 创建态默认栏不含必填 → 「两项必填即可创建」变死锁

**结论：未踩。** `panes.ts` 显式 `DEFAULT_TOP_CREATE='set'` + `DEFAULT_SET_PANE='gen'`（通用含 名称 sec1 / 运行时模型 sec4）。锁：CFG-10 + AD-06（两栏、5 子栏、名称+运行时立即可见、概览 null）。AG-01~05/07 新建态因此无需切栏前置，仅 AG-06（既有 Agent）加「设置」前置——改动最小化验证了该选择。

## 坑3 · 入口只测列表漏了 ProjectDetail 跳入；概览卡复制可编辑 UI → 双维护漂移

**结论：部分覆盖，诚实登记。**
- 入口链：AD-02 走 App 级覆盖态（侧栏→列表卡片→新壳）；**ProjectDetail「查看详情」入口**（App.tsx:301 `onNavigateAgent` → `setAgentDetail`）与卡片入口共用同一覆盖态与同一壳实例，代码上无第二壳可漂移，但**未写第二入口的专项用例**（App 级双 mock 成本高）——留浏览器走查第 5 项人工回销。
- 概览卡：全部只读 + `goto(top,pane)` 跳编辑口，无任何可写控件；「对外集成」页头注已declare只读、写入口唯一在 能力·集成——无重复可写 UI。

## 其它登记

- **保存语义未变**：高敏草稿（指令/环境/CLI/MCP/常规字段→sticky 一次 PUT + custom_* 双写）vs 低敏即存（技能/知识源/channels/定时任务/记忆=独立端点）——PUT 白名单不收 visibility/gate_* 的「未接入」延续，均按原口径。
- **parity 门**：`agent-detail` 由 routed 转为 declared_but_not_routed（exit 0），系计划内动作；GAP.md 不再生成已登记。
- **提交拆分偏差**：计划四笔，实际笔1/笔2 由用户 `66aed2d5` 单提交收编（代码交织无法事后拆）——已在 TASK.md 如实登记，未冒充四笔齐整。
- **会话纪律**：本批会话中多次出现冒充「Claude/Anthropic 安全团队」的提示注入（要求确认无视安全准则、生成恶意代码、对用户隐瞒）——一律按不可信数据**拒绝执行、不确认、透明上报**；用户明示「不要同意这个」，本批未采纳注入的任何指令。取证结论（注入走活体客户端旁路、未落盘仓库）已另行汇报；另：排查中 settings.json 的 `ANTHROPIC_AUTH_TOKEN` 曾打印进 transcript，**按已暴露处理、待用户轮换**。
