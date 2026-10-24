# P3-4 · Agent 管控面另挂三块卡区（原型 6.3 / `control-plane.html`）

- **状态**：✅ 已实现（前端 15 例取自 `control-plane-cards.test.tsx`；无后端改动）
- **实现**：`frontend/src/pages/AgentControlPlane.tsx`、
  `frontend/src/stores/controlPlane.ts`（扩 RSI 只读源 + 写操作）、
  `frontend/src/components/control/RsiSwitchesCard.tsx`、
  `frontend/src/components/control/SchedulerBaseCard.tsx`、
  `frontend/src/components/control/MaintenanceJobsCard.tsx`、
  `frontend/src/__tests__/control-plane-cards.test.tsx`
- **数据来源**：`/api/rsi/switches`、`/api/rsi/surfaces`、`/api/control-plane/cluster`、
  `/api/control-plane/reconcile`（均为现有端点，**未新增迁移、未改后端**）
- **纪律**：页面内不写页级 `h1/h2`（页名在壳层 `.app-top h1.crumb`，本页原 `Agent 控制面板` 大字标题已移除）；
  用既有语义类 `.panel / .toolbar / .section-title / .chip / .tbl.compact / .page-note / .btn`；
  后端没有的字段一律标「未接入 / 该字段后端未提供」，**不填原型里的演示数值**。

## 逐条落点

| 原型条目 | 实现 | 关键口径 / 数据来源 |
|---|---|---|
| ① RSI 四类产物白名单 + 总闸 | `RsiSwitchesCard`：四行类目表（产物类 / 开关 / 状态 / 最近更新）+ 总闸 chip 与两个总闸动作 | 类目行由 `/api/rsi/switches` 的 `switches` 逐行渲染（后端 `RSI_CATEGORIES` 是唯一事实源），前端只做「category → 中文名」翻译，**不写死类目集合**；总闸态由四行派生（全开 / 全停 / 部分停用 n 关 m 开） |
| 总闸写操作 | 「总闸 · 一键全停（四类目同时停用）」/「总闸 · 一键全启」 | 后端**没有总闸端点**，所以按类目逐个打 `POST /api/rsi/switches/{category}`（每次都单独入审计）；任一类失败把后端 `detail` 收集后原样透传，不假装成功 |
| 类目开关写操作 | 每行「开 ▾ / 关 ▾」；停用先**二次确认**（影响清单成文），恢复直接打 | `POST /api/rsi/switches/{category}` body `{enabled}`；成功落 `role=status` 提示（含「审计记『自动体已暂停 / 已恢复』· 存量在途不受影响」） |
| 可改面声明对象 SurfaceSpec 四列 | 小表四列：**可写路径模式 / 体量上限 / 结构规则 / 显式排除** | ①④ 来自 `/api/rsi/surfaces`（`allow_edit` / `immutable`）；②③ **后端没有这两列** → 逐格写「未接入 · 该字段后端未提供」；另展示接口返回的 `immutable_prefixes`（永久禁改前缀，白名单再扩也不可写） |
| 白名单制成文（禁改区不是提示词） | 卡片首段 | 四类之外一切改进禁止自动化（含平台代码、闸门规则与门禁本体、本条款自身）；「RSI 的 RSI」永久出白名单；开关 = 状态转换层动作，入口 + 中间件两处独立校验 |
| ② 双通道坦白句 | `SchedulerBaseCard` 子块 1 | 政策纯文（WebSocket 只负责快、数据库才是终态、每条推送配轮询兜底）+ **真实回读值**：队列 total / leased / `checked_at`（来自 `/cluster`） |
| 排队 run 过期判定 · 双条件 | 子块 2 | 双条件规则成文（runtime 静默超宽限期 **且** 该 run 自身排队同样久；三例不再铺演示时长）；**宽限期 / 队列行判定字段标未接入** |
| Runtime 回收与清理（reclaim） | 子块 3 | 真数据：`lease_ttl_seconds` + 逐条租约行（单例循环 / 持有副本 / 有效或已过期 / 到期时间）；`runtime_recovery` 回收记录、心跳周期、离线 >N 天清理 → **标未接入** |
| 重试政策（自动只给环境抖动类） | 子块 4 | 边界句成文（自动重试资格只跟「重一次有可能不一样」绑定）；环境抖动分类 / 退避序列与次数 / run_only 是否重试 → **标未接入** |
| 并发上限（人话版） | 子块 5 | 「生效 = 两者取小」政策句成文；单 daemon 上限 / 单 Agent 上限 → **标未接入**，并注明单 Agent 并发位真实存在于 Agent 配置 `max_concurrency`（`PUT /api/control-plane/schedule` 写入），只是本页读到的副本事实里没有该字段 |
| 副本与单例事实 | 子块 6 | 全部真数据：`instance_id` / `deploy_mode` / 队列深度 / `by_label` 分布 / `reconcile_backoff_rows` / `process_local`（多副本下不共享的进程内残项） |
| ③ 维护作业区 | `MaintenanceJobsCard` | 与自动调和**并列成文**：调和管状态收敛（回收 / 过期 / 清理），维护作业管数据改写；「自动的那一路永不写大批历史数据，写大批历史数据的那一路永不自动」；七条纪律表（入口只听 127.0.0.1 / 默认 dry-run / 转 apply 需**新幂等键 + 人工担保旗标** / 短事务 + 双预算 / 暂停不自动 resume / 退出码 0·2·1 / 完成 = 全量校验过且 remaining=0） |
| 最近一次调和结果 | 卡片末段 | 真端点 `GET /api/control-plane/reconcile`（审计里的 reconcile 事件）取最新一行显示时间 + 操作者 + detail；无行时如实写「未接入 · 未读到 reconcile 事件」 |
| 维护作业入口（dry-run / 转 apply） | 两个按钮 | **禁用** + 标题写明原因（后端无维护作业端点）；不做假 toast、不编 remaining 行数 |

## 后端缺字段清单（本轮据实标「未接入」）

| 卡区 | 缺的字段 | 现状 |
|---|---|---|
| SurfaceSpec | `体量上限`（cap） | `SurfaceManifest` 只有 `name / allow_edit_json / owner_id`，无 cap 列 |
| SurfaceSpec | `结构规则`（frontmatter / 引用完整性等） | 同上，未落库 |
| RSI | 总闸端点 | 只有 `POST /api/rsi/switches/{category}`，无 `master` 端点（前端按类目逐个调用） |
| 调度底座 | 重连宽限期、排队 run 过期阈值 | `/api/control-plane/cluster` 无这两个字段 |
| 调度底座 | `runtime_recovery` 回收记录、心跳周期、离线 >N 天清理阈值 | 后端无对应端点/字段（`reclaim` 只有租约过期重取：`cluster_store.claim_task`） |
| 调度底座 | 重试政策（环境抖动分类、退避序列、次数） | 原型自标「规划 · 未实现」，后端无该政策 |
| 调度底座 | 单 daemon / 单 Agent 并发上限（生效值取小） | `/cluster` 无该字段；单 Agent `max_concurrency` 只存在于 Agent 配置 |
| 维护作业 | 作业列表 / dry-run / apply / 上次作业状态 | 后端无维护作业端点（管理面口径：不在管控面执行批量改写） |
| 维护作业 | 最近一次**维护作业**结果 | 同上；本页只能给「最近一次**调和**结果」 |

## 实测

```text
$ cd frontend && npx tsc --noEmit
[exit code: 0]

$ npx vitest run src/__tests__/control-plane-cards.test.tsx
✓ src/__tests__/control-plane-cards.test.tsx (15 tests)

$ npx vitest run src/__tests__/control-plane-cards.test.tsx src/__tests__/nav-groups.test.tsx
Test Files  2 passed (2)
     Tests  39 passed (39)
```

用例覆盖面（15 例）：四类目与总闸由接口派生 / SurfaceSpec 四列（两列真数据、两列未接入、空白名单如实说「空」）/
停用先二次确认再打对端点 / 总闸四类目各打一次 / 写失败 `detail` 原样进 `role=alert` / 可改面读取失败透传 /
调度底座五个子块都在 / 副本事实是真数据（instance_id、部署模式、队列深度、租约 TTL、租约行）/
缺字段一律「该字段后端未提供」且**不出现**原型编造值（20 / 6 / 15s / 7 天）/ cluster 读不到整块标未接入 /
维护作业七条纪律 + 入口按钮禁用 / 最近调和结果读真端点 / 无调和记录显示未接入 /
三层树多标签归属仍成立（同一 Agent 在两个能力组各出现一次）/ 页面内无 `h1/h2`。

## 既有行为核对（不退化）

- **三层树（域 → 能力组 → Agent）**：`DomainTreeTab` 未改动；用例实证「默认域 → code-review / python / 未分类 三组，
  同一 Agent 多标签同时出现在两组」。根级 `domain_id=NULL` 组在页面上的文案仍是「默认域」（本页历史口径），
  原型叫「未分类」——**未改文案**（不在本 change 范围，避免与域页术语冲突），已登记为偏差。
- **页内不写页级 `h1/h2`**：原 `Agent 控制面板` `<h1>` 已移除，改为 `.toolbar`（刷新按钮 + 副本 chip）；用例断言 `h1,h2` 计数为 0。
- **「暂停调和」**：**当前前端没有这个按钮/行为**，后端也没有对应 HTTP 端点——
  `engine/reconcile_loop.py` 有 `_resume_paused()`、`cluster_store.resume_reconcile()` 但**没有任何路由调用它们**
  （grep 全仓：仅定义处命中）。因此不存在可退化的行为；本轮**没有新增**该入口（无端点 = 加了就是假入口），
  调和态仍以 `/cluster` 的 `reconcile_backoff_rows` 如实呈现。

## 偏差

1. **原型「总闸 · 一键全停 ▾」是单个开关**，本实现拆成两个动作（全停 / 全启）并按类目逐个打端点——
   因为后端无总闸端点，逐个打才能保证每次启停都单独入审计。
2. **原型要求停用填「必填原因」**，本实现只做二次确认不带原因输入：`POST /api/rsi/switches/{category}`
   不接受 reason，收了也没处落库（收了不传 = 假数据），故不收集。
3. **原型「门禁矩阵」三行（提案塌缩熔断 / 执行指纹幂等 / 编辑会话缓存）本轮未铺开**——
   DoD 6.3 对 RSI 卡组的要求是「四类产物白名单 + 总闸 + SurfaceSpec 四列」，门禁矩阵属政策纯文位，
   且部分（执行指纹幂等 `.fp.mark`、编辑会话内容寻址缓存）后端无字段可读，铺了只能是假开关。
4. **原型三例过期演示表（12s / 18m / 40s / 4m20s）未复制**：那些时长是演示编造，本页只留判定规则句。
5. 原型把「调度底座 / 自动化改进 / 维护作业」列为 tab（实际是滚动锚点），本实现把它们作为**常驻卡区**挂在 tab 内容下方
   （顺序：调度底座 → RSI → 维护作业），不额外引导用户点 tab。
6. 「未分类」虚拟组（`domain_id=NULL`）在树里仍显示为「默认域」——见上「既有行为核对」。

## 风险

- **总闸的原子性**：四类目逐个 POST，中途失败会留下「部分停用」状态（后端无事务性批量端点）。
  当前处理是如实报「总闸部分失败 —— 类目 X：<detail>」，由人重试；不静默重试（避免掩盖后端 403/409）。
- **RSI 读权限**：`/api/rsi/switches|surfaces` 只需登录，但**写**需管理员；普通成员点开关会拿到 403 detail
  （页面如实透传，不做前端预判，避免出现「界面说能点、后端说不行」的假绿）。
- **`/api/control-plane/reconcile` 返回的是 audit 行**（`timestamp/action/target/detail`），不是 store 里
  `ReconcileEntry` 声明的 `orchestration_id/drift_detected` 形状。本卡对两种形状都做了容错取值；
  「Reconcile 日志」tab 的列映射属历史欠账，**本轮未改**（会牵动既有用例）。
- 卡片数值全部随轮询刷新（探针 / 队列 / 调和 3s），`/cluster` 与 RSI 只在首帧与点「刷新」时取——
  RSI 开关属低频治理动作，不做 3s 轮询以免打审计库。
