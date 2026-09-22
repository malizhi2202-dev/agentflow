# STATE — 跨会话项目状态

> 仓库根 `STATE.md`。AI 每次开始新会话先读这个，结束前更新。（本文件 2026-09-22 由 0-change 阶段首建）

---

## 当前位置

- **活跃 Change**: `product-prototype-refresh`（来源 issue：MALIZHI-6 项目原型文档审核）
- **当前阶段**: REQUIREMENT —— G1 需求门 **4/4 通过**（🟫✅🟦✅🟩✅🔴✅，条件票全部复验翻正，R9.2 链闭合），0-change 收口移交需求分析；W2 逐项深挖 + `REQUIREMENT.md` 归 1-requirement
- **当前 Task**: —
- **中断任务**（R1.5 清窗）: 无
- **会话开始建议**: 先读 `@.specs/product-prototype-refresh/CHANGE.md`（含 G1 全投票记录与 W1/1-requirement 承接项：数字口径、安全域边界含 `ENCRYPTION_KEY` 精度条、竞品消歧、扩展候选随出口一次拍板、验收线 2 判定在其出口）。进入 2a-ui-design 前必须拿到人工对 `product-design.html` ①/② 的拍板。

## 阻塞与待决策

| 项 | 类型 | 详情 | 待谁 | 自 |
|---|---|---|---|---|
| product-design.html 存在性 | 决策（歧义） | 仓库 main 与全部分支均无此文件。① 人工提供既有稿→按「既有稿上融合」做；② 确认不存在→以 README+代码为事实源新建。**2a-ui-design 前必须落定**，W1/W2 不依赖 | 用户 | 2026-09-22 |
| 小队无 D-discovery 主责 | 决策（编制） | 「调研/竞品分析」类诉求按 GO.md 应走 D-discovery 五步 + GD 议题门，但无该阶段成员；现按 0-change→1-requirement 内嵌 research 降级执行 | 用户 | 2026-09-22 |

## 已留档议题（R18.4）

- `docs-drift-resync`：README.md 大面积过时（2026-07-06 一致性报告实测 10 项 8 不准）。待 `product-prototype-refresh` 的新原型文档成为产品事实源后，另开 change 做 README 同步。

## 决策日志（最近 10 条，倒序）

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
