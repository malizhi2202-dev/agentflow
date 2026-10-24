# P3-3 / P3-4 · 对话中心四语义 + 知识库四节（原型 6.8 `chat.html` / 6.9 `knowledge.html`）

- **状态**：✅ 前端已实现（对话 15 例 · 知识库 13 例 · 回归 16 例仍绿；tsc 0）
- **实现文件**
  - 对话：`frontend/src/components/chat/{types.ts,chatSemantics.ts,RunStatusChip.tsx,RuntimeQueueNotice.tsx,ConversationList.tsx,ProjectContextPicker.tsx,ChatRulesPanel.tsx}`、`components/ChatWindow.tsx`、`pages/ConversationCenter.tsx`、`stores/chat.ts`
  - 知识：`frontend/src/components/knowledge/{policy.ts,PermissionMatrix.tsx,PublicKnowledgeSection.tsx,KnowledgeSpacesSection.tsx,ExternalSourcesSection.tsx}`、`pages/KnowledgeBase.tsx`、`stores/knowledge.ts`
  - 用例：`src/__tests__/chat-semantics.test.tsx`、`src/__tests__/knowledge-sections.test.tsx`
- **纪律**：语义类（`panel / tbl / chip / toolbar / page-note / section-title`）；页面内无 `h1/h2`（页名归壳层 `.crumb`）；缺后端一律标「未接入」，不造假数据。

## 一、对话中心四语义逐条落点

| 语义 | 页面落点 | 判定来源（不是自造） | 用例 |
|---|---|---|---|
| ① 1:1 完全私密（管理员也看不到） | 左栏底部常驻 `PRIVACY_NOTE`（含「管理员也看不到」）+ 详情头 `一对一 · 完全私密` chip + 「会话信息 · 私密性」行；全页**无**「管理员可查看全部会话」 | 后端 `chat_service.list_conversations/get_messages` 只按 `owner_id` 过滤（事实与文案一致） | ①（含反向断言 `queryByText` 为空） |
| ② 一条消息 = 一个 run | 消息行 `run <标识>` + 状态 token（`queued/running/done/failed`）+ 中文标签；失败行给「原因：<后端 detail / 消息正文>」 | `models/message.py:MSG_STATUSES = pending/processing/done/error` → `runStateOf()` 单点映射；run 标识由消息 id 承载（表无 `run_id`） | ②×3（含映射单测、失败原因） |
| ③ 运行时离线 → queued 等待上线 | 详情工具栏运行时 chip + 排队提示条（不丢 / 不算失败 / 不占 run）+ 消息行 queued 文案 + 列表「排队等待上线」分组；并写「与小队 runtime_offline 暂存同一口径」 | `GET /api/runtimes`（`services/runtime_registry`）按 `cli` 命中判 online/offline；进程内 provider 判 `unregistered`（不误报离线） | ③×3（含「排队尚未实现」缺口断言） |
| ④ 归档 = 只读 · Agent 不可运行禁发 | 归档会话：输入框 + 发送按钮同时 `disabled`，写明「会话已归档 = 只读」；Agent `status ∈ archived/disabled`：禁用并点名 `status=archived`；选择器里归档 Agent 灰置「已归档 · 不可作为会话归属」且点了不建会话 | `services/team_service.py` 的既有判定 `agent.status in ("archived","disabled")`（与团队/小队侧同一口径） | ④×4（禁用态 + 发送键 + 不可归属 + 判定单测） |
| 补充：不自动建任务 | `ChatRulesPanel` 常驻「被明确要求时才用你的权限查 / 动资源」+「聊天绝不自动任务化」 | 原型 callout | 断言无任何 `POST /api/tasks` 类写请求 |
| 补充：＋ 挂 Project context | 选择器列真实项目；选中后出现「未接入」标 + 原因（无 chat context 端点，不入参、不落库） | 后端无端点 → 只做选择器 | 断言选中后不发任何写请求 |

「实时状态行 / 会话规则门禁六条」以 `CHAT_RULES` 常驻呈现（归档只读、Agent 失权、离线 queued、停止保留已返回内容、唤起口径=一条消息一次运行、权限轴）。

## 二、知识库四节逐条落点

| 节 | 实现 | 数据诚实性 |
|---|---|---|
| §0 权限矩阵 | 四层（公共知识 / 知识空间 / 跨空间引用 / 外部源）× 四列（全体 / 空间成员 / 平台管理员 / 写入路径）一屏表 + 两条判定句（空间与项目 1:1、越权与不存在同码 404） | 标「口径」：**无权限矩阵端点**，按钮真实可用性以后端 403/404 为准 |
| §1 公共知识 | 四分类（公司规范 / API 契约 / 安全基线 / 入职引导）+ 读范围 + 维护者 + 「写不进去是设计」 | 无公共知识表/端点 → **不摆示例文档**；用例反向断言 `规范.pdf / api-schema.json` 等一个都不出现 |
| §2 知识空间 | 用**真实项目列表**（`GET /api/projects`）做「空间 ↔ 项目 1:1」归属映射；非成员不可见 + 成员（用户与 Agent）读写口径 | 成员 / 文档数 / 最近写入三列标未接入；空间独立表未接入 |
| §3 外部源 | 真端点 `GET /api/agents/{id}/knowledge-sources` + `POST …/{sid}/test` + `POST …/upload` + `POST /api/agents/{id}/knowledge-sources` + `DELETE`；源级只读口径 + 「凭据只写不读」+ 「未关联空间对普通成员不可见」 | 关联空间 / 源级授权标未接入；**页面任何位置不渲染 `config_json`**（反向断言凭据值不出现）；后端只打码 password/api_key 的缺口明文写出 |

写操作失败一律把后端 `detail` 原样显示（`stores/knowledge.ts` 改写 `WriteResult`，不再用 `T | null` 吞掉 detail）：
上传 400「不支持的文件类型: .exe」「文件过大: 11534336 bytes，最大允许 10485760 bytes (10MB)」、测试连接 400、创建 400 三处各一条用例。

## 三、实测（本机，2026-10-25）

```text
$ cd frontend && npx tsc --noEmit
TSC_EXIT:0                       # 0 错误

$ npx vitest run src/__tests__/chat-semantics.test.tsx src/__tests__/knowledge-sections.test.tsx
✓ src/__tests__/chat-semantics.test.tsx (15 tests)
✓ src/__tests__/knowledge-sections.test.tsx (13 tests)
Test Files  2 passed (2)
     Tests  28 passed (28)

$ npx vitest run src/__tests__/ConversationCenter.test.tsx src/__tests__/ChatWindow.test.tsx
✓ src/__tests__/ConversationCenter.test.tsx (5 tests)
✓ src/__tests__/ChatWindow.test.tsx (11 tests)
Test Files  2 passed (2)
     Tests  16 passed (16)

# 改动面外的风险探针（ChatWindow 被 AgentDetail/ProjectDetail 复用、chat store 被 edge-case 覆盖）
$ npx vitest run src/__tests__/frontend-edge-cases.test.tsx src/__tests__/chat-store.test.ts
     Tests  27 passed (27)
$ npx vitest run src/__tests__/ui-parity-pages2.test.tsx
     Tests  4 passed (4)

$ python3 scripts/proto_parity_check.py
原型：127 页 / 35 页族；导航 34 项；实现：独立页面页族 31；部分实现 0；App.tsx 导航项 41
缺失页族（0）：无       部分实现（0）：无
```

> 未跑全量 vitest（按要求）；上表只覆盖改动面 + 三个风险探针。P3-4 台账行（`TASK.md`）本轮未改（文件不在本任务的可写面内）。

## 四、后端缺口清单（本轮不造假，全部显式标未接入）

| # | 缺口 | 现状证据 | 影响 / 建议 |
|---|---|---|---|
| G1 | **会话归档无字段无端点**（`conversations` 无 `archived_at`；无 `PATCH /api/chat/{id}`） | `models/conversation.py:to_dict()` 只有 id/agent/owner/channel/title/created/updated | 只读门禁已实现且可测，但真实数据永远进不了只读态。建议：迁移加 `archived_at/archived_by` + PATCH 端点 + 列表返回该列 |
| G2 | **消息无 `run_id`** | `models/message.py` 无该列；`MSG_STATUSES` 有 `pending` 但 `chat_service` 只写 `done/processing/error` | run 标识暂用消息 id 承载（页面已注明）；补 `run_id` 后无需改页面 |
| G3 | **离线排队未实现**（同步直调，无 queued 暂存 / 自动补发） | `chat_service.send_message` 直接 `provider.chat()` | 页面能显示 queued 与「等待上线」，但后端不会真的排队；`QUEUED_GAP_NOTE` 常驻写明 |
| G4 | **Agent 归档无端点**（表无 `archived_at/archived_by`） | `components/agent-config/OpsSections.tsx:96` 已记录同一缺口 | 判定口径（`status ∈ archived/disabled`）已与团队侧共用；要真能置 archived 需补端点 |
| G5 | 会话**置顶 / 重命名 / 删除**无端点 | 会话表只有 `title/updated_at`，无 pinned；路由只有 list/create/messages/send | 列表无「置顶」分组；⋯ 操作面（重命名/归档/删除）未做 |
| G6 | **chat context 挂载**无端点 | 无 `/api/chat/*/context`，消息不落 `project_id` | 「＋ 挂 Project context」只做选择器 + 未接入说明 |
| G7 | 会话**开场白 / 触发预览 / 停止 / 消息操作行（复制·转@·不对）** 无端点 | 原型为演示态 | 未做（超出本轮四语义 DoD，避免假入口） |
| G8 | **知识空间三层全缺**：`spaces / space_members / space_docs` 表与端点 | `grep -rn "knowledge.?space"` 全仓 0 命中 | §2 只能做项目 1:1 映射；成员/文档/最近写入标未接入 |
| G9 | **公共知识无表无端点** | 同上 | §1 只列四分类口径，不摆文档行 |
| G10 | **外部源 ↔ 空间关联 / 源级授权无端点** | `agent_knowledge_api.py` 只有 Agent 维度 sources | §3「关联空间」列标未接入 |
| G11 | **凭据并非全字段只写不读** | `models/knowledge_source.py:to_dict(mask_secrets=True)` 只打码 `password`/`api_key` | 其他自定义键原样返回 → 页面整体不渲染 `config_json`，缺口写进页面文案 |
| G12 | 知识库**权限矩阵无端点** | 全仓无 permissions 相关路由 | §0 标「口径」而非实时授权 |

## 五、与原型的有意偏差

1. **无 `h1/h2`**：页名归壳层 `.crumb`（仓库既有 a11y 约定）；分区标题用 `.section-title`。
2. **不做置顶 / 开场白 / 渠道绑定 / 触发预览 / 停止 / 消息操作行**：原型这些块是演示态（原型自注「mock open / 演示值」），后端无端点；按「不做存不进去的假入口」纪律不摆。
3. **会话分组改为真实可推导的五档**（运行中 / 排队等待上线 / 今天 / 更早 / 已归档），不是原型的「置顶 / 今天 / 昨天 / 已归档」——置顶无字段。
4. **知识库 §1 不渲染文档行**（原型有 `规范.pdf` 等演示文档），改列分类口径；§2 用真实项目替代演示空间（`AgentFlow 平台研发空间`…）；§3 用真实 Agent 资料源替代演示源（`Confluence · 架构决策记录` 等）。
5. **「挂载 Agent / 标签 / 搜索」三筛选**：本轮实现「搜索 + 范围 + 标签（§3）」，未做「挂载 Agent」筛选（无挂载关系端点）。
6. `stores/knowledge.ts` 写操作签名由 `T | null` 改为 `{ ok, data?, error? }`（为了 detail 透传；唯一调用方是本页）。

## 六、遗留风险

- **知识库页是重写**（850 行 → 页面 ~470 行 + 4 个 section 组件）：上传 / 标签 / 删除 / 状态轮询四条能力保留，但标签筛选从页级移到 §3 内；如有人按旧 DOM 结构写 E2E 需要跟着改。
- **ConversationCenter 改用 `useAgents/useRuntimes/useProjects`**（三者均 `safeFetch` + 5s 缓存）：用例必须 `invalidateCache()`，否则跨例串数据（已在两个新用例 beforeEach 里做）。
- **ChatWindow 新 prop 全部可选**，`ProjectDetail` / `AgentDetail` 行为不变（`ui-parity-pages2` 4 例仍绿）；但消息行多了 run/状态 chip，做像素级视觉回归的用例需要更新快照。
- **未起真实后端跑页面**：本轮为前端对齐 + 契约级用例；`GET /api/runtimes`、`/api/projects`、`knowledge-sources` 均按 `services/` 返回形状 mock。端到端留待 E2E（本轮未改 E2E 脚本，按要求不动）。
