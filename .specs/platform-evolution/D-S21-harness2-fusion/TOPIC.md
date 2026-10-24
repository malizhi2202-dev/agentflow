# S21 · harness2 糅合 · 递归脚手架改进并入 RSI 框架

> 〔口径注 2026-10-23 · v20 归并〕本包为**历史评审记录**（成文早于 v20）；现行有效口径以 `platform-evolution/RULINGS.md` 与 `product-design/PRODUCT-DESIGN.html` **v20** 为准——与本文冲突处让位 RULINGS，**原文不改写**（历史保留纪律）。

> 轮次: 第 7 轮（2026-10-23 · 用户点名开启）
> 依据: 用户原话三裁定（见 TOPICS.md 第 7 轮申报）· Google Harness² arXiv 2610.14224（摘要已 web_fetch 一手核验）· /home/malizhi/project/harness2 全仓精读（深读包 26dbf892）
> 审核: **通过（第 7 轮）** · 用户原话：「同意」（2026-10-23）
> 状态: ①-⑤ 全走完，**已过审（第 7 轮）**。
> 前置框架: 本议题只在 S17-S20 已过审框架内做「深化与接线」，不改四条已审结论的边界（白名单禁改区 / 晋升与发布必人批 / 回流限人类角色 / 异厂系 judge）。

## 用户硬约束（2026-10-23 原话，三条）

1. 「如果有雏形或者相似的地方就在此基础上继续改」「如无必要不要增加新的」→ **零新页目标**，全部深化挂 canvas 提案抽屉 / memory.html / control-plane 开关卡组 / agents__new·agent-detail 能力域。
2. 「修改相关对应的 md 文档和产品原型设计的 html 和 mock 界面」→ 允许动 `.specs` md + 原型页 + PRODUCT-DESIGN（v16/v17）。
3. 「不要改代码」→ 裁定⑧继续生效，backend/frontend 零触碰。

叠加第 6 轮前置裁定：代码层禁自改。harness2 改的是 **scaffold（prompt/工具/记忆/技能/编排）**，恰在四类产物白名单内——**不越界**；但其代码若有「editor 全量可写 substrate」类危险默认，进《不该抄清单》并以我方门禁覆盖。

## 议题拆解（预置，随事实修正）

- F1 PPC（Propose–Probe–Compose）对比证据 vs S18 影子重放：合成「提案→探针→双门」一链，还是并列两种证据源？harness2 立论点=**无 ground-truth 也能可靠指导编辑**，正好补我们「外部可验证信号优先（AZR）」覆盖不到的无真值场景。
- F2 invariant ⟂ domain 编辑二分：给「声明式空间内搜索、禁触代码」加可执行类型学（不变量类跨域通用 / 领域类绑定域），提案卡与评审路是否分栏？
- F3 improvement harness + evidence-supported lessons：并入记忆四层哪些件（lessons≈带证据的 L1 原子候选→L3 晋升）？检疫/lineage 撤回/衰减重验是否原样复用？「adopted harnesses」与我们技能库/编排版本的关系？
- F4 递归模式与预算：k 并行（探针对→组合多份取一）vs 串行（carry 证据 k 步）；轮次帽与我们 S19 轮次预算同族不同物——编排域提案的「递归深度」参数入 control-plane 开关行还是提案生成器配置？
- F5 《不该抄清单》：无发布门（它的 compose 直接产出终稿 harness=无人在环）、无成本护栏形态、benchmark 专用件等，待深读补。

## ⑤ 人工审核记录

用户原话：「同意」（2026-10-23）。GD 门 3/3（工程两前置已并入 CONCLUSION：R7-3 单真源句、探针常数不抄承诺值）。R7-1..6 已入 ROADMAP 第 7 轮节，实施波=canvas/memory/control-plane 深化 + 主档 v17。
