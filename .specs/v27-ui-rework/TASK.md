# TASK: AgentFlow UI 重构与导航交互统一

- **Change ID**: v27-ui-rework
- **关联**: `@.specs/v27-ui-rework/REQUIREMENT.md`、`@.specs/v27-ui-rework/DESIGN.md`、`@.specs/v27-ui-rework/UI-DESIGN.md`

---

## 波次划分

```text
Wave 1 (parallel): T01[P] 导航清理、T02[P] token/全局样式
Wave 2:            T03        PageHeader 与壳层标题责任
Wave 3 (parallel): T04[P] Agent列表、T05[P] Agent详情、T06[P] 项目、T07[P] 自动化、T08[P] 任务、T09[P] 编排
Wave 4 (parallel): T10[P] 跨页面无障碍状态、T11[P] 兼容性扫描
Wave 5:            T12        自动化质量门
Wave 6:            T13        浏览器走查与报告
```

> `tokens.css` / `ui.css` 只由 T02 写入；T03–T09 不得写全局 CSS；T04–T09 不得修改 `frontend/src/components/agent-config/**`。

---

## 任务清单

```xml
<task id="T01" parallel="true" status="done">
  <name>修复一级导航切换时的覆盖态清理</name>
  <read_files>frontend/src/App.tsx; frontend/src/__tests__/nav-groups.test.tsx; frontend/src/__tests__/frontend-edge-cases.test.tsx; frontend/src/__tests__/agent-detail-tabs.test.tsx</read_files>
  <write_files>frontend/src/App.tsx; frontend/src/__tests__/nav-groups.test.tsx; frontend/src/__tests__/frontend-edge-cases.test.tsx; frontend/src/__tests__/agent-detail-tabs.test.tsx</write_files>
  <action>沿用现有导航状态，一级入口切换时清理 project/workflow/role/tool/agent/detail/create 等不属于目标入口的覆盖态；覆盖 agents↔projects、automations↔tasks、tasks↔orchestration、orchestration↔agents 五组正反路径；不改 URL、API、权限或业务请求。</action>
  <verify>cd frontend && npx vitest run src/__tests__/nav-groups.test.tsx src/__tests__/frontend-edge-cases.test.tsx src/__tests__/agent-detail-tabs.test.tsx</verify>
  <done>已完成：10 条跨入口路径均显示目标列表、目标 active 和目标标题，旧详情 / 编辑 / 创建覆盖态不可见且不响应交互；T01 verify 通过。</done>
  <depends_on></depends_on><auto>true</auto>
</task>

<task id="T02" parallel="true" status="done">
  <name>物化极简主题 token 与全局语义样式</name>
  <read_files>frontend/src/main.tsx; frontend/src/styles/tokens.css; frontend/src/styles/ui.css; frontend/src/hooks/useTheme.ts; .specs/v27-ui-rework/UI-DESIGN.md</read_files>
  <write_files>frontend/src/main.tsx; frontend/src/styles/tokens.css; frontend/src/styles/ui.css</write_files>
  <action>只修改全局样式入口和 token：浅色默认、近黑深色、brand/action/focus/status、8/12/20/28/40/64/96 spacing、4/6/10/14 radius；保留旧变量别名，补 --bg-panel 等未定义变量；显式加载 ui.css；统一 focus-visible、reduced-motion、按钮/输入/面板/toolbar 基础规则。</action>
  <verify>cd frontend && npm run typecheck && npm run build</verify>
  <done>浅/深主题和共享语义样式构建通过；旧变量仍可解析；全局样式文件只由 T02 写入；已执行 typecheck/build。</done>
  <depends_on></depends_on><auto>true</auto>
</task>

<task id="T03" parallel="false" status="done">
  <name>建立 PageHeader 与壳层标题责任</name>
  <read_files>frontend/src/components/ui/AppTopBar.tsx; frontend/src/components/ui/Toolbar.tsx; frontend/src/components/ui/Panel.tsx; frontend/src/pages/AgentBuilder.tsx; frontend/src/pages/ProjectManager.tsx; .specs/v27-ui-rework/UI-DESIGN.md</read_files>
  <write_files>frontend/src/components/ui/AppTopBar.tsx; frontend/src/components/ui/PageHeader.tsx; frontend/src/components/ui/Toolbar.tsx</write_files>
  <action>新增业务无关 PageHeader：唯一 h1、上下文/摘要、最多一个主动作，标题 tabindex=-1；AppTopBar 只保留全局壳层上下文，不渲染页面 h1；复用已有 ui.css，不写 CSS。定义组件 props 和焦点行为，不发请求、不管理业务 state。</action>
  <verify>cd frontend && npm run typecheck && npm run build</verify>
  <done>PageHeader 已建立：支持唯一可聚焦 h1、上下文/摘要、最多一个主动作及挂载焦点进入；AppTopBar 不再产生页面级 h1；Toolbar 保持现有语义与 props 兼容；T03 verify 通过。</done>
  <depends_on>T01,T02</depends_on><auto>true</auto>
</task>

<task id="T04" parallel="true" status="done">
  <name>迁移 Agent 列表页</name>
  <read_files>frontend/src/pages/AgentBuilder.tsx; frontend/src/components/ui/PageHeader.tsx; frontend/src/components/ui/Toolbar.tsx; frontend/src/__tests__/agent-detail-tabs.test.tsx</read_files>
  <write_files>frontend/src/pages/AgentBuilder.tsx</write_files>
  <action>只迁移 Agent 列表的标题区、摘要/筛选、主列表、辅助区和实际请求状态；不改 AgentConfigEditor、API、store、权限或详情保存逻辑。</action>
  <verify>cd frontend && npx vitest run src/__tests__/agent-detail-tabs.test.tsx && npm run typecheck</verify>
  <done>已完成：Agent 列表已使用 PageHeader/Toolbar，标题、摘要/筛选、主列表、辅助区及加载/成功/空/错误状态可见；原有创建、选择、运行、停止、删除和加载记忆逻辑保留。指定 Vitest 通过；typecheck 受既有 `Automations.tsx` 缺失 Runbook、RuleVersion、Automation、AutomationRun、AutomationDelivery 类型错误阻塞。</done>
  <depends_on>T03</depends_on><auto>true</auto>
</task>

<task id="T05" parallel="true" status="done">
  <name>迁移 Agent 详情与创建覆盖态</name>
  <read_files>frontend/src/pages/AgentDetail.tsx; frontend/src/components/agent-detail/OverviewPane.tsx; frontend/src/components/agent-detail/WorkPane.tsx; frontend/src/components/agent-detail/MemoryPane.tsx; frontend/src/components/agent-detail/ChatPane.tsx; frontend/src/components/ui/PageHeader.tsx; frontend/src/__tests__/agent-detail-tabs.test.tsx; frontend/src/__tests__/agent-config-sections.test.tsx</read_files>
  <write_files>frontend/src/pages/AgentDetail.tsx; frontend/src/components/agent-detail/OverviewPane.tsx; frontend/src/components/agent-detail/WorkPane.tsx; frontend/src/components/agent-detail/MemoryPane.tsx; frontend/src/components/agent-detail/ChatPane.tsx; frontend/src/__tests__/agent-config-sections.test.tsx</write_files>
  <action>只调整详情/创建覆盖态的 PageHeader、主工作区、辅助区、焦点和保存反馈；保留 AgentConfigEditor 与所有配置分区不改；保存成功进入资源详情，失败保留输入并聚焦错误摘要/重试。</action>
  <verify>cd frontend && npx vitest run src/__tests__/agent-detail-tabs.test.tsx src/__tests__/agent-config-sections.test.tsx && npm run typecheck</verify>
  <done>详情→编辑→取消/保存成功/失败路径可见且可恢复，Agent 详情 tab 和草稿跨栏回归通过。</done>
  <depends_on>T03</depends_on><auto>true</auto>
</task>

<task id="T06" parallel="true" status="done">
  <name>迁移项目列表与详情页</name>
  <read_files>frontend/src/pages/ProjectManager.tsx; frontend/src/pages/ProjectDetail.tsx; frontend/src/components/ui/PageHeader.tsx; frontend/src/components/ui/Toolbar.tsx; frontend/src/__tests__/collab-pages.test.tsx; frontend/src/__tests__/frontend-edge-cases.test.tsx</read_files>
  <write_files>frontend/src/pages/ProjectManager.tsx; frontend/src/pages/ProjectDetail.tsx; frontend/src/__tests__/collab-pages.test.tsx</write_files>
  <action>按 PageHeader→摘要/状态→Toolbar→主工作区→辅助区迁移项目列表/详情；保留项目到 Agent 详情入口和权限；补实际请求的状态；详情标题可聚焦，返回焦点回列表触发项。</action>
  <verify>cd frontend && npx vitest run src/__tests__/collab-pages.test.tsx src/__tests__/frontend-edge-cases.test.tsx && npm run typecheck</verify>
  <done>项目列表/详情结构和返回行为通过，项目到 Agent 入口仍可用。</done>
  <depends_on>T03</depends_on><auto>true</auto>
</task>

<task id="T07" parallel="true" status="done">
  <name>迁移自动化页面</name>
  <read_files>frontend/src/pages/Automations.tsx; frontend/src/components/control/GoldenSetsCard.tsx; frontend/src/components/control/MaintenanceJobsCard.tsx; frontend/src/components/control/RsiSwitchesCard.tsx; frontend/src/components/control/SchedulerBaseCard.tsx; frontend/src/components/ui/PageHeader.tsx; frontend/src/__tests__/automations-nine-sections.test.tsx; frontend/src/__tests__/automations-runtimes-replay.test.tsx</read_files>
  <write_files>frontend/src/pages/Automations.tsx; frontend/src/components/control/GoldenSetsCard.tsx; frontend/src/components/control/MaintenanceJobsCard.tsx; frontend/src/components/control/RsiSwitchesCard.tsx; frontend/src/components/control/SchedulerBaseCard.tsx; frontend/src/__tests__/automations-nine-sections.test.tsx; frontend/src/__tests__/automations-runtimes-replay.test.tsx</write_files>
  <action>保留九节、运行时和回放入口；重排标题/目标、工具栏、主配置区和辅助状态；只覆盖实际请求状态和已有写操作反馈，不改 API/store。</action>
  <verify>cd frontend && npx vitest run src/__tests__/automations-nine-sections.test.tsx src/__tests__/automations-runtimes-replay.test.tsx && npm run typecheck</verify>
  <done>自动化九节仍可访问，运行时/回放入口通过，配置成功/失败反馈可见。</done>
  <depends_on>T03</depends_on><auto>true</auto>
</task>

<task id="T08" parallel="true" status="done">
  <name>迁移任务列表与看板</name>
  <read_files>frontend/src/pages/Tasks.tsx; frontend/src/components/task/AssigneePicker.tsx; frontend/src/components/task/BoardFilters.tsx; frontend/src/components/task/MarkDoneForm.tsx; frontend/src/components/task/NewTaskForm.tsx; frontend/src/components/task/TaskCard.tsx; frontend/src/components/ui/PageHeader.tsx; frontend/src/__tests__/board-variants.test.tsx</read_files>
  <write_files>frontend/src/pages/Tasks.tsx; frontend/src/components/task/AssigneePicker.tsx; frontend/src/components/task/BoardFilters.tsx; frontend/src/components/task/MarkDoneForm.tsx; frontend/src/components/task/NewTaskForm.tsx; frontend/src/components/task/TaskCard.tsx; frontend/src/__tests__/board-variants.test.tsx</write_files>
  <action>按标题/摘要、筛选工具栏、主列表或看板、辅助操作迁移任务页；保留筛选、指派、完成、新建语义；补实际请求和写操作反馈，不改 API/store。</action>
  <verify>cd frontend && npx vitest run src/__tests__/board-variants.test.tsx && npm run typecheck</verify>
  <done>任务列表/看板的筛选、指派、完成、新建通过，空态/错误/保存反馈有可见恢复动作。</done>
  <depends_on>T03</depends_on><auto>true</auto>
</task>

<task id="T09" parallel="true" status="done">
  <name>迁移编排列表、编辑和文档页</name>
  <read_files>frontend/src/pages/OrchestrationListPage.tsx; frontend/src/pages/OrchestrationPage.tsx; frontend/src/pages/WorkflowDetail.tsx; frontend/src/pages/OrchDocPage.tsx; frontend/src/components/OrchestrationCanvas.tsx; frontend/src/components/EdgeEditor.tsx; frontend/src/components/ui/PageHeader.tsx; frontend/src/__tests__/ui-parity-pages.test.tsx; frontend/src/__tests__/ui-parity-pages2.test.tsx</read_files>
  <write_files>frontend/src/pages/OrchestrationListPage.tsx; frontend/src/pages/OrchestrationPage.tsx; frontend/src/pages/WorkflowDetail.tsx; frontend/src/pages/OrchDocPage.tsx; frontend/src/components/OrchestrationCanvas.tsx; frontend/src/components/EdgeEditor.tsx; frontend/src/__tests__/ui-parity-pages.test.tsx; frontend/src/__tests__/ui-parity-pages2.test.tsx</write_files>
  <action>保留列表、新建/编辑、Markdown/YAML 文档和画布交互；统一 PageHeader、Toolbar、主画布/编辑区、辅助配置区和保存反馈；不改数据格式、API、store 或权限。</action>
  <verify>cd frontend && npx vitest run src/__tests__/ui-parity-pages.test.tsx src/__tests__/ui-parity-pages2.test.tsx && npm run typecheck</verify>
  <done>编排列表/编辑/文档页面结构通过，画布和文档入口保持可用，保存失败保留输入。</done>
  <depends_on>T03</depends_on><auto>true</auto>
</task>

<task id="T10" parallel="true" status="done">
  <name>补跨页面状态与无障碍回归</name>
  <read_files>frontend/src/components/ui/PageHeader.tsx; frontend/src/components/ui/AppTopBar.tsx; frontend/src/components/ConfirmDialog.tsx; frontend/src/pages/AgentBuilder.tsx; frontend/src/pages/AgentDetail.tsx; frontend/src/pages/ProjectManager.tsx; frontend/src/pages/ProjectDetail.tsx; frontend/src/pages/Automations.tsx; frontend/src/pages/Tasks.tsx; frontend/src/pages/OrchestrationListPage.tsx; frontend/src/pages/OrchestrationPage.tsx; frontend/src/styles/tokens.css; frontend/src/styles/ui.css; .specs/v27-ui-rework/UI-DESIGN.md</read_files>
  <write_files>frontend/src/__tests__/v27-ui-rework.test.tsx; frontend/src/components/ConfirmDialog.tsx</write_files>
  <action>验证五类页面唯一 h1、PageHeader、role=status/alert、Tab 顺序、Escape、焦点进入/回收、44px 目标、reduced-motion、实际状态矩阵；ConfirmDialog 只补 aria 名称、Escape、焦点限制/返回，不改确认业务语义。</action>
  <verify>cd frontend && npx vitest run src/__tests__/v27-ui-rework.test.tsx && npm run typecheck</verify>
  <done>结构、键盘、焦点、状态区域和对话框无障碍回归均有自动化断言。</done>
  <depends_on>T04,T05,T06,T07,T08,T09</depends_on><auto>true</auto>
</task>

<task id="T11" parallel="true" status="done">
  <name>登记非首批页面兼容与 anti-slop 扫描</name>
  <read_files>frontend/src/pages/Home.tsx; frontend/src/pages/Roles.tsx; frontend/src/pages/KnowledgeBase.tsx; frontend/src/pages/MonitoringDashboard.tsx; frontend/src/styles/tokens.css; frontend/src/styles/ui.css; .specs/v27-ui-rework/UI-DESIGN.md; /home/malizhi/.penguin/data/agentflow/agents/default_agent/agent_state/skills/code-kit/reference/ui-anti-patterns.md</read_files>
  <write_files>.specs/v27-ui-rework/COMPATIBILITY-SCAN.md</write_files>
  <action>只读扫描未列入首批页面的旧变量、未定义变量、重复 h1、纯黑/纯白、渐变、静态阴影和 emoji 图标，登记命中及是否属于 v1；不改低频页面代码。</action>
  <verify>grep -R -n -e '--bg-panel' -e '#000' -e '#fff' -e 'gradient' -e 'emoji' frontend/src/styles frontend/src/pages > /tmp/v27-ui-scan.txt || true; test -s .specs/v27-ui-rework/COMPATIBILITY-SCAN.md</verify>
  <done>扫描报告存在且列明命中、范围判断和后续处理，不扩大代码修改范围。</done>
  <depends_on>T02,T03</depends_on><auto>true</auto>
</task>

<task id="T12" parallel="false" status="done">
  <name>执行自动化质量门与对比度检查</name>
  <read_files>frontend/src/*; scripts/*; .specs/v27-ui-rework/COMPATIBILITY-SCAN.md; .specs/v27-ui-rework/REQUIREMENT.md; .specs/v27-ui-rework/UI-DESIGN.md</read_files>
  <write_files>.specs/v27-ui-rework/TEST.md</write_files>
  <action>执行全量 typecheck、Vitest、build 和仓库已有 parity/权限回归命令；在 TEST 中附上浅/深主题对比度实测表（主/次/弱文字、边框、focus、状态色）及使用的脚本或 axe/Lighthouse 命令；逐项映射 AC-01～AC-12 的自动化证据，未自动覆盖的标为人工走查，不修改代码。</action>
  <verify>cd frontend && npm run typecheck && npm test && npm run build && test -f ../scripts/proto_parity_check.py</verify>
  <done>TEST.md 逐项列出 AC-01～AC-12 的命令、输出、对比度证据和未覆盖项；typecheck、Vitest、build 真实通过。</done>
  <depends_on>T10,T11</depends_on><auto>true</auto>
</task>

<task id="T13" parallel="false" status="pending">
  <name>关键路径浏览器走查与审查报告</name>
  <read_files>.specs/v27-ui-rework/CHANGE.md; .specs/v27-ui-rework/REQUIREMENT.md; .specs/v27-ui-rework/DESIGN.md; .specs/v27-ui-rework/UI-DESIGN.md; .specs/v27-ui-rework/TEST.md</read_files>
  <write_files>.specs/v27-ui-rework/REVIEW.md</write_files>
  <action>使用可用浏览器或项目 e2e 工具逐项记录 10 条跨入口路径、详情/编辑保存成功/失败、键盘 Tab/Escape/焦点、浅/深主题和 ≥1280、768–1279、<768 三档；逐项核对 T12 的 AC-01～AC-12 证据，发现缺口或失败就写入 REVIEW 并追加 T-FIX；若工具不可用如实登记人工欠账，不以单测绿替代。</action>
  <verify>cd frontend && node -e "const p=require('./package.json'); if(!p.scripts || !p.scripts.e2e) process.exit(1)" && npm run e2e</verify>
  <done>浏览器走查按清单逐项记录通过/失败/未执行；失败项追加 T-FIX，不声称未观察到的结果。</done>
  <depends_on>T12</depends_on><auto>false</auto>
</task>
```

---

## AC 映射

| AC | 主要任务 | 证据 |
|---|---|---|
| AC-01 | T01 | 10 条跨入口导航测试 |
| AC-02 | T05、T06、T07、T08、T09 | Agent/项目/自动化/任务/编排详情编辑回归；T12 汇总 |
| AC-03 | T01 | 跨入口后回流测试 |
| AC-04 | T01、T12 | 现有 URL 初始化/路径测试、刷新/后退/前进既有回归和 URL 不新增写入记录 |
| AC-05 | T03–T09 | PageHeader/布局结构测试 + 浏览器清单 |
| AC-06～AC-09 | T04–T09 | 各页面实际请求状态 fixture；T12 汇总状态矩阵 |
| AC-10 | T01、T05–T09、T12 | 既有未授权读写/入口回归；T12 记录命令输出 |
| AC-11 | T02、T03、T10、T13 | focus/reduced-motion 自动化 + 键盘走查 |
| AC-12 | T05–T09、T10、T13 | 写操作 saving/success/error fixture + 浏览器走查 |

> 页面任务的局部 verify 只证明本页面边界；跨页面和逐 AC 汇总由 T10–T13 完成。任何“按实际请求”的不适用状态必须在 TEST.md 写出页面、代码依据和理由。

---

## 阻塞日志

| 任务 | 阻塞原因 | 待人工决策项 | 时间 |
|---|---|---|---|
| T13 | 后端 `127.0.0.1:8000` 不可用，`npm run e2e` 在前置检查退出 2；尝试 SQLite 启动时系统 Python 缺少 uvicorn | 启动可用后执行浏览器走查；未以单测代替 | 2026-10-27 |

## Fix 任务（来自 REVIEW / INTEGRATION）

> 由 REVIEW / INTEGRATION 阶段追加 `T-FIX-XX`，默认人工介入。
