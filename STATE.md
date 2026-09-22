# STATE — 跨会话项目状态

> 仓库根 `STATE.md`。AI 每次开始新会话先读这个，结束前更新。（本文件 2026-09-22 由 0-change 阶段首建）

---

## 当前位置

- **活跃 Change**: `product-prototype-refresh`（来源 issue：MALIZHI-6 项目原型文档审核）
- **当前阶段**: REQUIREMENT 出口·**需求门计票中（票面 1/4：🟦 ✅ ｜ 🟫🟩🔴 未到 → 不裁决不推进）** —— 产物 `REQUIREMENT.md`（7 US / 12 AC / v1·v2·out / NFR 5 轮）＋ W1 底稿 `BASELINE-code-facts.md` ＋ W2 深挖 `RESEARCH-competitors.md`（15 条缺口去向闭合）＋ `CONTEXT.md` 域语言已落盘；🟦 三条非阻断承接项已当轮改入 AC-2/AC-11（票面与去向记 REQUIREMENT §7）
- **当前 Task**: —
- **中断任务**（R1.5 清窗）: 无
- **会话开始建议**: 先读 `@.specs/product-prototype-refresh/REQUIREMENT.md`（§1 口径与判定 + §7 票面表）与 `@.specs/product-prototype-refresh/BASELINE-code-facts.md`（数字唯一基准）。每有一票回帖先重读线程数票：集齐 4 票才按 R13.2 裁决（4/4 或 3/4 → 交架构设计 2-design；前端项目另需 2a-ui-design，票面抄 §7），未集齐静默收口。进入 2a 前必须拿到人工对 `product-design.html` ①/② 的拍板。

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
- 由 `product-prototype-refresh` / W2 出口登记的需代码议题（去向表见 `RESEARCH-competitors.md` §2，均"需代码 → 新 change"，本 change 内零代码写入）：
  - 轻成本可先行：`token-cost-ledger`（逐运行真实成本账）、`unified-inbox`（告警+审批+待办单一入口）、`trace-viewer-reattach`（把零挂载的 `TraceViewer` 接回界面）、`model-verification-tier`（模型"已验证/自担风险"分级）、`separation-of-duty-gate`（产出者不得自证）、`skill-capture-from-run`（一次成功运行沉淀为可复用 skill）
  - 中等：`mcp-tool-runtime`（MCP 从类型标签变成可运行接入）、`inbound-channel-session`（渠道入站 mention 开会话闭环）、`approval-ladder-autonomy`（硬地板→一次性批准→standing rules→allowlist + 熔断）
  - 架构级（须 2-design + ADR）：`agent-execution-sandbox`（隔离执行/沙箱）、`knowledge-rag-retrieval`（向量检索，破 SQLite 默认形态）
  - 边界待定：`human-agent-assignment-board`（人 + Agent 同板派工，先定产品边界再谈实现）

## 决策日志（最近 10 条，倒序）

- `[2026-09-22]` **需求门第 1 票入账（🟦 ✅ 1/4）**：三条非阻断承接项当轮改入工件而非拖到 2a/5-test —— AC-2「32 行归属表」系本阶段措辞错（BASELINE §2 实为 12 行 · 32 页），已改并写清"行≠页"；AC-11 由"数量地板 ≥4"抬为**六项逐处 + ≥6 + UAT-6 勾清单**（数量可被凑数、逐处才有效）；US-2 的 13 个一级入口并入 AC-2。票面与三人未到状态记 REQUIREMENT §7。数票依据＝服务端 issue 级 delta 空报告 + 触发票本身（本时段 `multica` 读接口连接失败，未凭记忆数票）；GitHub 侧可达，故修正照常提交推送
- `[2026-09-22]` **1-requirement 出口**：`REQUIREMENT.md`（7 US / 12 AC 全 GWT+单一验证 / v1·v2·out / NFR 5 轮）交付；W1 事实底稿 `BASELINE-code-facts.md` 成为数字唯一基准（页面 34 文件·**挂载 32**、端点 **168**、模型 19、表 26=ORM 口径、store 12、孤儿 2 页 + 9 组件、既有能力边界 S1-S9、漂移 D1-D7）；W2 `RESEARCH-competitors.md` 15 条缺口去向闭合（融入原型 9 / 议题 11 个 slug / 否决 3）+ 3 个扩展候选交人工一次拍板；`CONTEXT.md` §15 追加域语言（11 术语 / 9 已锁决策 / 5 默认行为）— `@.specs/product-prototype-refresh/REQUIREMENT.md`
- `[2026-09-22]` **调研取证通道降级备案**：本运行时 `web_search` 不可用（endpoint 未配置），事实改由官网 HTML + 官方 README + GitHub Search API 直连取得（2026-09-22 全部实测可达）；竞品自述一律经「归属」字段隔离，禁止当本项目现状（R6.2）
- `[2026-09-22]` **W1 定性两处「壳能力」**：`routes/token_usage.py` 系正则扫 `.specs/*-SUMMARY.md` 文本（非逐运行记账）、`tools_api.py:89-91` 的 MCP 只生成骨架 zip（无运行时）→ 原型必须标「未接入/演示边界」，并登记议题 `token-cost-ledger` / `mcp-tool-runtime`
- `[2026-09-22]` **G1 终裁：4/4 全票通过**（🔴 复验 `3de89ded` 后按原话翻 ✅；其改票附注两条当轮落地：核对命令换 `1[2]3456`+`--exclude=CHANGE.md` 防自命中/防 glob 空匹配 exit 2、加密陈述补 `ENCRYPTION_KEY` RuntimeError 与短密钥零填充无 KDF 边界——均复测后写入）。0-change 出口：需求分析接 1-requirement — `@.specs/product-prototype-refresh/CHANGE.md#过程记录`
- `[2026-09-22]` G1 第 2 轮：🟫 产品经理复验 `3de89ded` 后按原话改票 ✅（票面 3✅ + 🔴 未到 → 静默待票）；其假锚点纠错（「Artifact 页」不存在，产物视图实为 `components/ArtifactTab.tsx`、宿主 `Detail.tsx:60` 计入工作流监控域）复测属实、当轮改掉，不留给 REQUIREMENT 继承 — `@.specs/product-prototype-refresh/CHANGE.md#过程记录`
- `[2026-09-22]` G1 首轮集票 4/4：原始 2/2 但两张 ❌ 均为「修正落地即改 ✅」条件票→不当真分歧提交人工；🔴 R-1（数据分类与敏感面节 + 示例数据合成排除条）、R-2（验收线 4 零外部依赖）、🟩（数字口径条 + 29 文件/168 端点复测）、W3 归属双字段全部落盘 v3，已请 🟫🔴 改票；任一仍 ❌ → 平票提交人工 — `@.specs/product-prototype-refresh/CHANGE.md#过程记录`
- `[2026-09-22]` 立项 `product-prototype-refresh`：W1 审核 / W2 竞品调研 / W3 融合原型文档，三个工作包全在文档层，L1 代码零改动 — `@.specs/product-prototype-refresh/CHANGE.md`
- `[2026-09-22]` G1 第 1 轮：🟫 产品经理 ❌→三条修正全部核实成立并落盘（验收线能力域 8→11：补知识产物与文档/告警/人工审批；验收线 3 增「校准基线」声明要求；页面口径 34 文件 vs 32 挂载写清 + SecurityPage/AssemblyView 登记 W1 孤儿盘点）；另采纳验收线 2 判定期标注、扩展候选一次拍板两条建议 — `@.specs/product-prototype-refresh/CHANGE.md#过程记录`
- `[2026-09-22]` 视觉调性锁定既有前端实现（Tremor+Tailwind+tokens.css 管控台基线）；code-kit 九卡库未安装，2a 可修正 — `@.specs/product-prototype-refresh/CHANGE.md#视觉调性`
- `[2026-09-22]` 首建仓库根 STATE.md（此前不存在）

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
