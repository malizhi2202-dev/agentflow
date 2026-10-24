# P3-2 · Agent 详情 config 十六分区（change: ui-parity）

- **实现日期**：2026-10-25
- **原型基线**：`.specs/product-design/prototype/agent-detail__config.html`（锚点 `sec1…sec16` + `sec-im`，共 17 个）
- **需求形态**：把 `AgentDetail` 的「编辑」标签从「一屏散装表单」改造成**按原型编号的 16 分区配置页**；
  记忆 / 对话 / 监控三个标签行为不变。
- **独占文件**（本次只改这些）
  - `frontend/src/pages/AgentDetail.tsx`（改）
  - `frontend/src/components/agent-config/`（新建，10 个文件）
  - `frontend/src/__tests__/agent-config-sections.test.tsx`（新建）
  - `.specs/ui-parity/P3-agent-config.md`（本文件）
- **未改后端**：`PUT /api/agents/{id}` 的字段白名单已收录本页需要的全部键（核对见下「字段对照」），
  故本次一次 backend 文件都没动（无迁移、无路由改动）。

---

## 1. DoD（每条都给了判定命令与实测输出）

| # | DoD 条目 | 判定 | 实测 |
|---|---|---|---|
| D1 | 16 个分区**标题**全部存在（顺序即页面顺序） | `vitest` CFG-01 逐条 `getByText('N · 标题')` | ✅ 9 tests passed |
| D2 | 页首「分区直达」锚点条**正好 16 条链接**，且每条 href 都能落到真实分区 DOM（非假锚点） | CFG-02：`within(nav).getAllByRole('link')` 长度=16，href 严格等于 `#sec1…#sec16`，逐个 `querySelector` 到分区 | ✅ |
| D3 | 9A（集成 · IM 通道）不占第 17 条链接，只作编号说明 | CFG-02 断言 `9A = 集成（IM 通道）` 文本存在、链接仍为 16 | ✅ |
| D4 | 环境变量**值恒掩码**：显示 `****`，已存明文不进 DOM | CFG-03：`toHaveValue('****')` + `readonly` + `queryByDisplayValue('bar') === null` | ✅ |
| D5 | 危险区**二次确认**才删除（一次点击不发请求） | CFG-04：点「删除 Agent」后 `onDelete` 未调用且无 DELETE；点弹窗「确定」后调用 1 次。CFG-05：无 `onDelete` 时确认后才自己发 `DELETE /api/agents/7` | ✅ |
| D6 | 保存是**一次** PUT，且把 `model_config_json.env_vars / cli_args / mcp_servers` 一起提交 | CFG-06：捕获 PUT 请求体，三个键逐一断言；`calls.filter(PUT).length === 1` | ✅ |
| D7 | 后端 400 的 `detail` **原样透传**，失败不当作已保存 | CFG-07：断言 alert 含 `不支持的 runtime: 'claude'`，且 `onSave` 未被调用 | ✅ |
| D8 | MCP JSON 不合法时 **fail-closed**（半截配置不落库） | CFG-08：改坏 JSON 后点保存 → 报错、无 PUT | ✅ |
| D9 | 未接入项**显式标注**，不塞示例数据 | CFG-09：`getAllByText('未接入').length ≥ 5` | ✅ |
| D10 | 类型检查 0 错误 | `cd frontend && npx tsc --noEmit` | ✅ `[exit=0]`（无输出） |
| D11 | 既有用例不退化（模型来自运行时 / 能力·技能 / 详情路由） | `vitest run agent-skills-section agent-model-from-runtime` | ✅ 11 passed |

### 实测输出（原样）

```text
$ cd frontend && npx tsc --noEmit
[exit=0]

$ cd frontend && npx vitest run src/__tests__/agent-config-sections.test.tsx
 ✓ src/__tests__/agent-config-sections.test.tsx (9 tests) 8176ms
   ✓ CFG-01 十六个分区标题全部渲染 1574ms
   ✓ CFG-02 页首锚点条有 16 条链接且锚点存在 856ms
   ✓ CFG-03 环境变量值显示掩码，明文不出现在页面 1118ms
   ✓ CFG-04 危险区二次确认后才调用删除 1127ms
   ✓ CFG-05 无 onDelete 时确认后才自己发 DELETE 700ms
   ✓ CFG-06 保存把 model_config_json 的 env_vars/cli_args/mcp_servers 一起提交 557ms
   ✓ CFG-07 后端 400 文案透传，失败不调用 onSave 675ms
   ✓ CFG-08 MCP JSON 不合法时拦住保存 1154ms
   ✓ CFG-09 未接入项显式标注 408ms
 Test Files  1 passed (1)   Tests  9 passed (9)

$ cd frontend && npx vitest run src/__tests__/agent-skills-section.test.tsx src/__tests__/agent-model-from-runtime.test.tsx
 ✓ agent-model-from-runtime.test.tsx (7 tests)   ✓ agent-skills-section.test.tsx (4 tests)
 Test Files  2 passed (2)   Tests  11 passed (11)
```

> 未跑全量：按分工由主会话跑（本会话只跑与本次改动直接相关的三份用例 + tsc）。

---

## 2. 字段对照（16 分区 → 后端落点 → 写路径）

判定口径只有两条：**① 表里有没有这一列 ② `PUT /api/agents/{id}` 收不收**。
`backend/routes/agents_api.py:105-110` 的白名单 = `name / description / model_name / model_config_json /
system_prompt / role_def / sop / workflow_id / token_soft_limit / token_hard_limit / domain_id /
avatar_url / custom_env / custom_args / mcp_config / thinking_level / service_tier / composio_toolkit_allowlist`。

| 区 | 字段 | 后端落点 | 写路径 | 本页形态 |
|---|---|---|---|---|
| 1 标识 | 名称 / 描述 / 字母头像 | `name` / `description` / `avatar_url` | PUT 收录 | 可编辑 |
| 1 标识 | ID / 状态 / 归属人 / 创建·更新时间 | `id` / `status` / `owner_id` / `created_at` / `updated_at` | 只读（to_dict 回显） | 只读行 |
| 1 标识 | **别名（≤16 短显名）** | 无该列 | — | **未接入** |
| 2 域归属 | 所属域（可空） | `domain_id`（`SET NULL`） | PUT 收录；列表读 `GET /api/domains` | 可编辑（含「未分类」） |
| 2 域归属 | **归属团队 / owner_kind** | 列存在，但 **to_dict 不返回 team_id**，PUT 也不收 | — | 只读 + **未接入** |
| 3 指令 | 系统 Prompt / 角色定义 / SOP | `system_prompt` / `role_def` / `sop` | PUT 收录 | 可编辑（三块文本域） |
| 3 指令 | **会话开场白 prompts[]** | 无该列 | — | **未接入** |
| 3 指令 | **平台维护层（只读拼接段）** | 后端无该字段 | — | **未接入** |
| 4 运行时 | 运行时 / 模型 | `runtime` / `model_name` | PUT 收录；选项来自 `GET /api/runtimes`（离线置灰、目录随运行时） | 可编辑（复用 `useRuntimes` + `utils/runtimeOptions`，无新注册表） |
| 4 运行时 | thinking 档 / 服务档 | `thinking_level` / `service_tier` | PUT 收录 | 可编辑 |
| 4 运行时 | 运行时能力（协议族/能力项/目录数） | `GET /api/runtimes` 的 `capabilities` / `protocol_family` / `models` | 只读 | 只读（按上报原样，不推断「会话续跑 / 托管 MCP」） |
| 5 执行设置 | Token 软 / 硬上限 | `token_soft_limit` / `token_hard_limit` | PUT 收录 | 可编辑 |
| 5 执行设置 | IO 过滤 | `io_filter` 有列、to_dict 回显 | **PUT 不收** | 只读 + 说明「改了不落库」 |
| 5 执行设置 | **并发 / 轮次上限 / 单步超时 / 重试 / ttl / retain** | Agent 表无列（并发在控制面，ttl/retain 属执行契约） | — | **未接入** |
| 6 环境变量 | 键值（值掩码） | `custom_env` + `model_config_json.env_vars` | 一次 PUT 双写 | 可编辑（`****` 保留哨兵） |
| 7 CLI 参数 | 字符串数组（一行一项） | `custom_args` + `model_config_json.cli_args` | 一次 PUT 双写 | 可编辑 |
| 8 MCP | 配置 JSON（整体替换） | `mcp_config` + `model_config_json.mcp_servers` | 一次 PUT 双写；空串 = null | 可编辑（坏 JSON 拦截保存） |
| 9 对外集成 | **出站连接**（GitHub / CI / Notion…） | 无 connections 端点 | — | **未接入** |
| 9A IM 通道 | 通道连接 | `GET/POST/PUT/DELETE /api/agents/{id}/channels` | 即时请求 | 复用既有 `ChannelConfig`（未重写） |
| 10 技能 | 技能绑定 | `/api/agents/{id}/tools`（GET/POST/DELETE）+ `/api/tools?type=skill` | **即时请求**（不进「保存全部」） | 真实绑定/解绑（无一条假数据） |
| 11 知识源 | 源挂载 / 测试 / 上传 | `/api/agents/{id}/knowledge-sources...` | 即时请求 | 复用既有逻辑 |
| 12 编排引用 | `workflow_ids` | 列存在，但 **to_dict 不返回**、`PUT` 不收、写入路径不存在 | — | 只读 + **未接入**（不显示会被误读为事实的「未引用」空态） |
| 13 Access | owner / visibility | `owner_id` 回显；`visibility` 有列但 PUT 不收 | 只读 | 只读 |
| 13 Access | **team_id** | 列存在，to_dict 不返回 | — | **未接入** |
| 14 闸门 | gate_pre_check / gate_post_check | 两列有、to_dict 回显，**PUT 不收** | — | 只读 + 说明 |
| 15 探活 | 探活面板 | `GET /api/control-plane/probes` | 只读 | 复用 `AgentProbePanel` |
| 15 探活 | **health_url / 周期 / 阈值 / 退避** | Agent 表无列（现由 `agent_probe_service` 按 base_url 推导） | — | **未接入** |
| 16 危险区 | 彻底删除 | `DELETE /api/agents/{id}`（运行中 400 拒绝） | 即时请求 + 二次确认 | 可写（既有 `ConfirmDialog`） |
| 16 危险区 | **归档 / 删除前 9 项检查 / 复制为新 Agent** | 无列、无端点 | — | **未接入** |

---

## 3. 双写口径（`model_config_json` 三键 ↔ 专用列）

保存时同一份值写两个落点：

- `model_config_json.env_vars / cli_args / mcp_servers` —— 本页 DoD 要求的落点（`model_config_json` 是 PUT 收录的通用配置块）；
- `custom_env / custom_args / mcp_config` —— v23（multica 迁移）建的专用列，**其它页面与后端服务读的是它**。

为什么两边都写：只写 JSON 会让「本页看得见、别处不生效」；只写专用列则违背本 task 的
「三键进 `model_config_json`」验收。读时优先专用列、回落 JSON 同名字段（`initialEnv/initialCli/initialMcp`）。
`model_config_json` 的其余键在保存时**原样保留**（`Object.assign` 基于当前值），不会被覆盖清空。

---

## 4. 与需求条文 / 原型的**如实差异**（3 处，都已落在 UI 文案与本文里）

1. **技能区没有做成「占位 · 显示未接入」**。需求写的是「10 技能（占位式只读：显示未接入）」，
   理由是「后端无对应字段」。实测：后端**有真端点** `/api/agents/{id}/tools`（GET/POST/DELETE）与
   `/api/tools?type=skill`，且既有用例 `agent-skills-section.test.tsx` 4 条正盯着这套真实绑定/解绑。
   若改成静态「未接入」占位，会把已接入的能力说成没接入，并让那 4 条用例转红。
   因此保留**真实**绑定列表（无假数据），并注明其写路径是即时请求、不进全字段保存。
   → 缺口是「`model_config_json` 里没有技能字段」，不是「技能没接入」。
2. **env / CLI / MCP 没有专用端点**。原型要求 env 走 `PUT /api/agents/{id}/env`（带 rev 乐观锁，
   常规全字段请求带 env 应被 400 拒收）、MCP 走 `PUT /api/agents/{id}/mcp`（行尾即存）。
   本仓 `backend/routes/agents_api.py` 没有这两个端点，故三块只能随本页**一次 PUT** 提交；
   「防顺手改 env」的服务端闸门与乐观锁**未实现**（已在 6 / 8 区分区说明里点名）。
3. **多出一个不编号的「附 · 定时任务」节**（页尾、不进锚点条）。原型 16 区没有它，但它是既有真实能力
   （`/api/agents/{id}/scheduled-tasks`）。删掉＝功能退化，编号又会破坏「16 分区 / 16 链接」口径，
   所以保留为附录并写明原因。分区标题渲染为无编号（`Section` 的 `no=0` 即不渲染编号前缀）。

---

## 5. 遗留风险

1. **`gate_pre_check / gate_post_check / io_filter / visibility / team_id / workflow_ids` 目前只读**。
   要真能编辑，需在后端 PUT 白名单补字段（或提供专用端点）；本页刻意不做「能点但静默不落库」的假入口。
2. **env 明文会随 `GET /api/agents/{id}` 返回**（`to_dict` 原样输出 `custom_env`），
   本页只是界面掩码。要做到「值不回显」需后端改出参（写-only + 掩码），属后端缺口。
3. **保存后不走「自动保存 / 草稿槽」**：原型有 `draft:agent/1/config` 三态自动保存，
   本仓无草稿端点，做自动保存会变成假三态，故只提供「保存全部 / 放弃改动」。
4. **`onSave` 契约保留**：保存成功后仍调用壳层 `onSave(payload)`（`App.tsx` 会再 PUT 一次并关闭抽屉）。
   即「详情页保存 = 2 次 PUT」；既有 `AG-07` 依赖 `onSave` 被调用，故未改这条链路。
   （两次请求体相同、幂等，但若后端将来加乐观锁/审计去重，这里要一并改。）
5. **用例耗时**：本页首屏要渲染 16 个分区（含探活面板与 IM 通道卡），
   `agent-skills-section.test.tsx` 的 AS-01 在单跑时约 2.2–2.6s、与其它文件并行时曾到 4.9s
   （vitest 默认 `testTimeout = 5000`）。全量并发跑若出现该文件超时，优先考虑把 15 区探活面板改为
   展开后才挂载（`<details>`），而不是放宽断言。
6. **锚点深链**：`href="#secN"` 依赖页面容器可滚动（`AgentDetail` 根 div 自带 `overflow: auto`），
   E2E 截图时若发现跳转偏移，调 `Section` 的 `scrollMarginTop`（现为 56）。

---

## 6. 改动清单

| 文件 | 作用 |
|---|---|
| `frontend/src/pages/AgentDetail.tsx` | 变薄：页面骨架（返回/名称/四标签）+ 记忆 CRUD + 对话 + 监控；编辑标签改为挂载 `AgentConfigEditor` |
| `frontend/src/components/agent-config/meta.ts` | 16 分区锚点/编号/标题单一事实源 + 9A 说明 |
| `frontend/src/components/agent-config/model.ts` | env/CLI/MCP 的解析与序列化（掩码哨兵、一行一项、空=清空、fail-closed） |
| `frontend/src/components/agent-config/fields.ts` | 表单排布常量（视觉交给 tokens/ui.css，语义类复用 panel/chip/toolbar/page-note/section-title/tbl） |
| `frontend/src/components/agent-config/Section.tsx` | 分区外壳 + 「未接入」标 + 只读行 + 页首锚点条 |
| `frontend/src/components/agent-config/BasicsSections.tsx` | 1 标识 / 2 域归属 / 13 Access |
| `frontend/src/components/agent-config/PromptSections.tsx` | 3 指令与开场白 |
| `frontend/src/components/agent-config/RuntimeSections.tsx` | 4 运行时与模型 / 5 执行设置 / 14 闸门 |
| `frontend/src/components/agent-config/ConfigSections.tsx` | 6 环境变量 / 7 CLI 参数 / 8 MCP |
| `frontend/src/components/agent-config/BindingSections.tsx` | 9 对外集成（含 9A IM 通道）/ 10 技能 / 11 知识源 / 12 编排引用 |
| `frontend/src/components/agent-config/OpsSections.tsx` | 15 健康与探活 / 16 危险区 |
| `frontend/src/components/agent-config/ExtraSections.tsx` | 附 · 定时任务（不编号、不进锚点条） |
| `frontend/src/components/agent-config/AgentConfigEditor.tsx` | 16 分区组装 + 一次 PUT 保存 + 失败 detail 透传 + 放弃改动 |
| `frontend/src/__tests__/agent-config-sections.test.tsx` | CFG-01…09 验收用例 |
