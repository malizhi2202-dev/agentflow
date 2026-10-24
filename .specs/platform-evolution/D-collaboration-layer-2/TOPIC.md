# D-collaboration-layer-2 — S12 · 协作层落地形态（差距⑤增量）

> 〔口径注 2026-10-23 · v20 归并〕本包为**历史评审记录**（成文早于 v20）；现行有效口径以 `platform-evolution/RULINGS.md` 与 `product-design/PRODUCT-DESIGN.html` **v20** 为准——与本文冲突处让位 RULINGS，**原文不改写**（历史保留纪律）。

> **状态**：通过（第 4 轮 · 2026-09-23 用户原话「通过」）· 完整链路见 REVIEW/PANEL
> **拆解依据（R16.4 用户点名 = 第 4 轮重启合法性来源）**：用户原话⑤「没有协作层——无工作项、负责人、收件箱；Multica 的整个产品都建在这一层上」。轮1包已定"要做"，本包穷尽 schema：任务表族（双正交轴 status×triage/负责人人 Agent 双轨/证据字段）/收件箱投递规则表/与 orchestration 挂钩点；p20-22 原型的表级注记；现有底账（human_approvals/alerts/无 work_items 表——R-F 核实）到目标的差距表。

**问题清单**
1. 竞品一手实践（证据：URL+日期，web_search 后端故障 → 一律 web_fetch 直连）
2. 单机无 K8s / FastAPI+SQLite 栈的可行性与成本
3. AgentFlow 落点：写进文档哪节、是否新增路线图建议条（⑤ 前不入 ROADMAP）
4. 界面落点：哪页原型、什么形态、遵守 §6.0 全局交互纪律

**成员文件**（R16.8）：`TOPIC/RECON/CONCLUSION/PANEL/REVIEW.md`，随步落盘。
