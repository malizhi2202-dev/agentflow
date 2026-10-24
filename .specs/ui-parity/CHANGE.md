# CHANGE: 前端按 127 页原型全量对齐（ui-parity）

- **Change ID**: `ui-parity`（与并行会话的 `v22-ui-align` / `v22-nav-groups` **同一目标**；它们交付 W1/W2 后由本 change 接管继续）
- **创建日期**: 2026-10-24
- **权威源**: `.specs/product-design/PRODUCT-DESIGN.html`（设计文本）+ `.specs/product-design/prototype/`（127 页形态基线）
- **状态**: active（P1 完成；P2+ 进行中）

---

## Why

用户观察：「5173 的界面和 product-design.html 原型、mock 的 html 界面几乎都不一样；功能也和文档给的不一样」。

自跑取证（`scripts/proto_parity_check.py`，不是印象）：

| 维度 | 原型 | 接手时实现 | 现在 |
|---|---|---|---|
| 页族覆盖 | 35 族 / 127 页 | 22 族独立页（+2 部分：agent-detail 抽屉 / squads tab） | **29 族独立页 · 缺失 0**（余 2 族为「部分」：无独立页） |
| 导航项 | 34（6.0…6.31 + 关系全景） | 33（v22 分组后） | 39（补齐 6 页后） |
| 语义类/壳层 | `.app-top` / `.panel` / `.tbl` / `.chip` | v22 W1 已落 `ui.css` + `AppTopBar`，页面开始使用 | 新页一律用语义类，不再新增内联块 |

## What（分阶段）

| 阶段 | 内容 | 状态 |
|---|---|---|
| P0 盘点 | 127 页→35 族清单、页族⟂实现差距矩阵、导航生成器（`scripts/gen_proto_nav.py`） | ✅ 已落 `.specs/ui-parity/{INVENTORY,GAP,STATUS}.md` + `scripts/proto_parity_check.py` |
| P1 缺页补齐 | 6.19 阶段模型配置（真 `/api/admin/workflow`，PUT+If-Match）· 6.23 决策模型目录 · 6.24 微调工厂 · 6.25 环境参谋（三页为**规划原型**，显式标「后端未接入 + 示例数据」）· 6.26 执行隔离（真 `/api/runtime/execution-contract`）· 6.27 对外集成（真 channels + A2A 卡） | ✅ 本轮 |
| P2 两族独立页 | 6.4 Agent 详情（四标签独立页，替抽屉）· 6.29 小队中心（独立页 + 12 节点时间线） | ⬜ 下一阶段 |
| P3 逐页深度 | 按原型逐族补「节级」内容（例：6.31 自动化中心 9 节：Runbook⟂负责人⟂触发器、webhook 六步推断、两级账本、失败治理、权限两本账） | ⬜ |
| P4 后端缺口 | 决策模型/微调/环境参谋的真实端点（登记/健康态/双轨/训练批次/画像）——按原型口径先契约后实现 | ⬜ |
| P5 验收 | 每族 vitest 用例 + E2E 可达 + 截图；`proto_parity_check --strict` 接 CI | ⬜ |

## 明确不做

1. 视觉像素级复刻（同一份 `tokens.css` 体系内对齐信息架构与语义组件，不追像素差）。
2. 规划原型页伪造后端（三页必须显式标「后端未接入 + 示例数据」——见 `components/ui/PlanningNotice.tsx`）。
3. 重启 `LangGraph`/旧模型宇宙语义（RULINGS 已撤）。
