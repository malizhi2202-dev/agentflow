# STATE — 跨会话项目状态

> 仓库根 `STATE.md`。AI 每次开始新会话先读这个，结束前更新。（本文件 2026-09-22 由 0-change 阶段首建）

---

## 当前位置

- **活跃 Change**: `product-prototype-refresh`（来源 issue：MALIZHI-6 项目原型文档审核）
- **当前阶段**: 需求门（G2 · 质量门）**4/4 ✅ 通过（15:49）→ 本阶段出口完成，已交架构设计进 2-design ＋ 2a-ui-design** —— `REQUIREMENT.md` 终稿：**7 US / 13 AC** / v1·v2·out（v2 含需代码议题 12 个 slug，真源＝RESEARCH §2）/ NFR 5 轮 ＋ W1 `BASELINE-code-facts.md`（含新增 S10）＋ W2 `RESEARCH-competitors.md` ＋ `CONTEXT.md` §15；票面首轮 1✅+3条件❌、全部修正落地后四张改票 ✅ 逐条实测证据与四条交接提示（AC-13 逐块打标、tier-2 作用范围、可选收紧式、人工 5 项）记 REQUIREMENT §7 终裁段
- **当前 Task**: —
- **中断任务**（R1.5 清窗）: 无
- **会话开始建议**: 需求门已过，1-requirement 不再回炉。进 2-design 先读 `@.specs/product-prototype-refresh/REQUIREMENT.md`（§1 口径 + §3 13 条 AC + §7 终裁与交接提示）与 `@.specs/product-prototype-refresh/BASELINE-code-facts.md`（数字唯一基准、S1-S10 边界）；12 个需代码议题**不在本 change 内实现**（R7.1，另开 change）。**2a-ui-design 开工前必须拿到人工对 `product-design.html` ①/② 的拍板**（现按 ② 新建起草）。

## 阻塞与待决策

| 项 | 类型 | 详情 | 待谁 | 自 |
|---|---|---|---|---|
| product-design.html 存在性 | 决策（歧义） | 仓库 main 与全部分支均无此文件。① 人工提供既有稿→按「既有稿上融合」做；② 确认不存在→以 README+代码为事实源新建。**2a-ui-design 前必须落定**，W1/W2 不依赖 | 用户 | 2026-09-22 |
| 小队无 D-discovery 主责 | 决策（编制） | 「调研/竞品分析」类诉求按 GO.md 应走 D-discovery 五步 + GD 议题门，但无该阶段成员；现按 0-change→1-requirement 内嵌 research 降级执行 | 用户 | 2026-09-22 |
| 竞品扩展候选 3 个 | 决策（偏好 · 一次拍板） | Dify / AgentOps / n8n（各一句理由见 `RESEARCH-competitors.md` §3）是否纳入深挖；不拍板则按现清单（4 点名）收口，不再单开提问 | 用户 | 2026-09-22 |
| 「Buzzz」未定位 | 决策（歧义） | 4 个候选域名不可解析、buzzz.io 是营销工具、GitHub 无同域仓库 → 待人工给官网或材料，否则本项永久标「待确认」 | 用户 | 2026-09-22 |
| 「AgentOS」三义 | 决策（歧义） | agentos.com=房产 CRM（已排除）/ rivet agentOS（本轮取此参照）/ AG2 自称 AgentOS——人工所指待明 | 用户 | 2026-09-22 |

## 已留档议题（R18.4）

- `docs-drift-resync`：README.md 大面积过时（2026-07-06 一致性报告实测 10 项 8 不准；本次差异清单 D1-D7 见 `BASELINE-code-facts.md` §5）。待 `product-prototype-refresh` 的新原型文档成为产品事实源后，另开 change 做 README 同步。
- 由 `product-prototype-refresh` / W2 出口登记的需代码议题（**合计 12 条 slug**；唯一真源 = `RESEARCH-competitors.md` §2 表内反引号 slug 去重集，核对命令见该节「计数不变式」；均"需代码 → 新 change"，本 change 内零代码写入）：
  - 轻成本可先行：`token-cost-ledger`（逐运行真实成本账）、`unified-inbox`（告警+审批+待办单一入口）、`trace-viewer-reattach`（把零挂载的 `TraceViewer` 接回界面）、`model-verification-tier`（模型"已验证/自担风险"分级）、`separation-of-duty-gate`（产出者不得自证）、`skill-capture-from-run`（一次成功运行沉淀为可复用 skill）
  - 中等：`mcp-tool-runtime`（MCP 从类型标签变成可运行接入）、`inbound-channel-session`（渠道入站 mention 开会话闭环）、`approval-ladder-autonomy`（硬地板→一次性批准→standing rules→allowlist + 熔断）
  - 架构级（须 2-design + ADR）：`agent-execution-sandbox`（隔离执行/沙箱）、`knowledge-rag-retrieval`（向量检索，破 SQLite 默认形态）
  - 边界待定：`human-agent-assignment-board`（人 + Agent 同板派工，先定产品边界再谈实现）

## 决策日志（最近 10 条，倒序）

- `[2026-09-22]` **需求门 4/4 ✅ 终裁通过，本阶段出口**：三张条件票（🟩 `01a0c815-603c`／🟫 `01a0c815-d682`／🔴 `01a0c816-eaff`）在修正落地后全部翻正，**且三位都是执行命令而非读文字**——🔴 按 `### AC-*` 分节把工件里验证方式行的命令原文抽进 bash 逐条跑（反例必红／合格稿必绿，AC-3/4/5/7/8/9 全对）、🟫 反测我采纳的判据能否被 inflate（漏画 → 7 拦下、挤一行 → 1 拦下）、🟩 原文照跑三条对账命令（`12 / SAME / SAME`）。落地的判据性改动：AC 12→**13**（新增 AC-13 竞品融入判据）、全文计数型命令换逐条/段内共现、AC-4 核对面纳入 `backup/`（平台编辑器自动备份已入库这一事实复验后入 BASELINE 新增 **S10**，S1-S9 引用范围同步 S1-S10）、归属字段统一 §1 四值枚举。**四条交接提示交下游、不回炉改已投票的 AC**（含 🔴 的可选收紧扩展式，登记不并档）。交 [@架构设计] 进 2-design ＋ 2a；人工 5 项仍挂、① 卡 2a 开工 — `@.specs/product-prototype-refresh/REQUIREMENT.md#终裁`

- `[2026-09-22]` **需求门 4/4 到齐 + 🔴🟫 两张条件票当轮闭合**：安全审计师构造反例证明 **AC-3/AC-4/AC-5/AC-7/AC-8 的全文计数型命令可被绕过**（远程 `url()`/协议相对/`srcset`/`iframe`/内联 `fetch` 判绿；同行堆叠多条"本项目已有"互相顶包；`grep -A2 加密` 被邻行蒙过；AC-4 核对面漏 `backup/`——平台编辑器保存即自动复制原件入 `backup/`，`CLAUDE.md` 亦记为"产物保存前的自动备份"）→ 本阶段**逐条独立重跑反例与合格稿后**换命令：AC-3 加强版（反例 5 命中 vs 旧命令 0）并把 out-1「不接真实数据」并进机器闸、Then 明写保留 `<a href>` 来源引用；AC-4 两级（tier-1 含 `backup/` 现 0 命中 exit 1，tier-2 管绝对路径/邮箱/主机名）＋ 新纪律"本 change 产物不经平台 PUT 编辑器"；AC-5 加同行堆叠探测；AC-7/8 改段内共现。高级产品经理指出 **CHANGE 验收线 1 末句「并含调研新增界面」在 12 条 AC 里无人验**（`grep -c 调研新增界面 REQUIREMENT` → 0 证实）→ 新增 **AC-13**（9 条「融入原型」须带"来源=调研结论 G<n>"标注 + 调研局限随稿一节 + UAT-7 逐条勾）。另：归属列两拨词汇（本文两值 vs 表内五值，实测 1/6/7/1）→ §1 定**四值枚举为唯一口径**；G11 补"最近骨架"锚点（`assignee` 全仓 0 命中、`scheduled_task.py:13,18` 的 `agent_id`+`owner_id`）；§4 追加安全类可引事实；🔴 非阻断 2 的代码事实复验后入 BASELINE 新增 **S10**（`artifact.py:10-26` GET 产物无鉴权、PUT 才要 `project:write`）→ S1-S10 整表禁搬进外发原型稿；`F=` 路径赋值统一。计数对账不变式复跑：12 / SAME-REQUIREMENT / SAME-STATE ✓

- `[2026-09-22]` **需求门第 1、2 票入账（🟦 ✅、🟩 ❌条件票）**：🟦 三条非阻断当轮改入工件（AC-2 行/页措辞纠错＝BASELINE §2 实为 12 行·32 页；AC-11 由数量地板抬为六项逐处 + UAT-6；US-2 的 13 入口并入 AC-2）→ `240b8e37`；🟩 唯一阻断项＝跨工件计数破口（真源 12 个需代码 slug，三处手抄 11、`approval-ladder-autonomy` 在 v2 枚举漏网）→ v2 分组重排＝12、RESEARCH §2 立「计数不变式 + 一条命令三处对账」、CONTEXT §15.2#10 立规、STATE 与自检同步，非阻断的 CONTEXT §3 快照路标同轮落地 → `47b624d9`（数票依据一律走服务端实时读，未凭记忆；该时段 `multica` 读接口曾一度不可达，GitHub 侧可达故照常推送）
- `[2026-09-22]` **1-requirement 出口**：`REQUIREMENT.md`（7 US / 12 AC（出口时点数；G2 🟫 条件票补 AC-13 → 现 **13 AC**）全 GWT+单一验证 / v1·v2·out / NFR 5 轮）交付；W1 事实底稿 `BASELINE-code-facts.md` 成为数字唯一基准（页面 34 文件·**挂载 32**、端点 **168**、模型 19、表 26=ORM 口径、store 12、孤儿 2 页 + 9 组件、既有能力边界 S1-S9（出口时点数；G2 🔴 复验后补 S10 → 现 S1-S10）、漂移 D1-D7）；W2 `RESEARCH-competitors.md` 15 条缺口去向闭合（融入原型 9 / **需代码议题 12 个 slug**（原文误记 11，漏 `approval-ladder-autonomy`，已由 G2 🟩 条件票纠正）/ 否决 3）+ 3 个扩展候选交人工一次拍板；`CONTEXT.md` §15 追加域语言（11 术语 / 10 已锁决策 / 5 默认行为，§3 另加快照路标）— `@.specs/product-prototype-refresh/REQUIREMENT.md`
- `[2026-09-22]` **调研取证通道降级备案**：本运行时 `web_search` 不可用（endpoint 未配置），事实改由官网 HTML + 官方 README + GitHub Search API 直连取得（2026-09-22 全部实测可达）；竞品自述一律经「归属」字段隔离，禁止当本项目现状（R6.2）
- `[2026-09-22]` **W1 定性两处「壳能力」**：`routes/token_usage.py` 系正则扫 `.specs/*-SUMMARY.md` 文本（非逐运行记账）、`tools_api.py:89-91` 的 MCP 只生成骨架 zip（无运行时）→ 原型必须标「未接入/演示边界」，并登记议题 `token-cost-ledger` / `mcp-tool-runtime`
- `[2026-09-22]` **G1 终裁：4/4 全票通过**（🔴 复验 `3de89ded` 后按原话翻 ✅；其改票附注两条当轮落地：核对命令换 `1[2]3456`+`--exclude=CHANGE.md` 防自命中/防 glob 空匹配 exit 2、加密陈述补 `ENCRYPTION_KEY` RuntimeError 与短密钥零填充无 KDF 边界——均复测后写入）。0-change 出口：需求分析接 1-requirement — `@.specs/product-prototype-refresh/CHANGE.md#过程记录`
- `[2026-09-22]` G1 第 2 轮：🟫 产品经理复验 `3de89ded` 后按原话改票 ✅（票面 3✅ + 🔴 未到 → 静默待票）；其假锚点纠错（「Artifact 页」不存在，产物视图实为 `components/ArtifactTab.tsx`、宿主 `Detail.tsx:60` 计入工作流监控域）复测属实、当轮改掉，不留给 REQUIREMENT 继承 — `@.specs/product-prototype-refresh/CHANGE.md#过程记录`
- `[2026-09-22]` G1 首轮集票 4/4：原始 2/2 但两张 ❌ 均为「修正落地即改 ✅」条件票→不当真分歧提交人工；🔴 R-1（数据分类与敏感面节 + 示例数据合成排除条）、R-2（验收线 4 零外部依赖）、🟩（数字口径条 + 29 文件/168 端点复测）、W3 归属双字段全部落盘 v3，已请 🟫🔴 改票；任一仍 ❌ → 平票提交人工 — `@.specs/product-prototype-refresh/CHANGE.md#过程记录`
- `[2026-09-22]` 立项 `product-prototype-refresh`：W1 审核 / W2 竞品调研 / W3 融合原型文档，三个工作包全在文档层，L1 代码零改动；视觉调性锁定既有前端实现（Tremor+Tailwind+tokens.css 管控台基线，2a 可修正）— `@.specs/product-prototype-refresh/CHANGE.md`（同轮首建本 `STATE.md`）

## 已归档 Changes（最近 5 个，倒序）

| 日期 | Change | 摘要 | PR |
|---|---|---|---|
| — | — | 暂无 | — |

> 注：`.specs/` 既有 6 个历史目录（agent-control-plane / agent-domains / capability-groups / k8s-final / knowledge-plus / multi-provider）为历史 change 产物，归档状态无记录（STATE.md 系本批新建）；`capability-groups` 含 CHANGE/REQUIREMENT/DESIGN/TASK 全链产物，疑似已完成未归档，待 INTEGRATION 期认领。

---

## 横向命令状态

```yaml
ai_context_doc: .specs/CONTEXT.md
last_intel_scan: 2026-07-06            # CONTEXT.md / README-CONSISTENCY-REPORT.md 头部记录的扫描日期
last_architect_at:                     # 从未跑 A-architect
last_evolve_at:
last_health_at:
```

---

## 健康检查（AI 每次会话开始前自检）

- [x] `.specs/` 目录存在
- [x] 当前活跃 change 的工件文件齐全（按阶段 CHANGE：CHANGE.md 已落盘）
- [ ] 没有未归档但已合并的 change —— 待核（见上方历史 6 目录注记）
- [x] 没有 > 3 轮自动重试仍未解决的失败
