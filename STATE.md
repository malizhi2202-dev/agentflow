# STATE — 跨会话项目状态

> 仓库根 `STATE.md`。AI 每次开始新会话先读这个，结束前更新。（本文件 2026-09-22 由 0-change 阶段首建）

---

## 当前位置

- **活跃 Change**: `product-prototype-refresh`（来源 issue：MALIZHI-6 项目原型文档审核）
- **当前阶段**: CHANGE —— 产物已落 `.specs/product-prototype-refresh/CHANGE.md`，G1 需求门 4 专家投票进行中
- **当前 Task**: —
- **中断任务**（R1.5 清窗）: 无
- **会话开始建议**: 先加载 `@.specs/product-prototype-refresh/CHANGE.md` 与 issue 评论流的 G1 票；票齐按 R13.2 裁决（4/4 或 3/4 → 进 1-requirement，反对意见记 CHANGE 末尾；平票 → 提交人工）。

## 阻塞与待决策

| 项 | 类型 | 详情 | 待谁 | 自 |
|---|---|---|---|---|
| product-design.html 存在性 | 决策（歧义） | 仓库 main 与全部分支均无此文件。① 人工提供既有稿→按「既有稿上融合」做；② 确认不存在→以 README+代码为事实源新建。**2a-ui-design 前必须落定**，W1/W2 不依赖 | 用户 | 2026-09-22 |
| 小队无 D-discovery 主责 | 决策（编制） | 「调研/竞品分析」类诉求按 GO.md 应走 D-discovery 五步 + GD 议题门，但无该阶段成员；现按 0-change→1-requirement 内嵌 research 降级执行 | 用户 | 2026-09-22 |

## 已留档议题（R18.4）

- `docs-drift-resync`：README.md 大面积过时（2026-07-06 一致性报告实测 10 项 8 不准）。待 `product-prototype-refresh` 的新原型文档成为产品事实源后，另开 change 做 README 同步。

## 决策日志（最近 10 条，倒序）

- `[2026-09-22]` 立项 `product-prototype-refresh`：W1 审核 / W2 竞品调研 / W3 融合原型文档，三个工作包全在文档层，L1 代码零改动 — `@.specs/product-prototype-refresh/CHANGE.md`
- `[2026-09-22]` 视觉调性锁定既向前端实现（Tremor+Tailwind+tokens.css 管控台基线）；code-kit 九卡库未安装，2a 可修正 — `@.specs/product-prototype-refresh/CHANGE.md#视觉调性`
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
