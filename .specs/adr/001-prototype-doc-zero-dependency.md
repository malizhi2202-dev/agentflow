# ADR-001: 原型/界面交付稿 = 零外部依赖单文件静态 HTML

- **状态**: accepted（2026-09-22，`product-prototype-refresh` 2-design；待 G2 方案门票面确认）
- **关联**: `@.specs/product-prototype-refresh/DESIGN.md` §0 / D1 / D12 · `@.specs/product-prototype-refresh/REQUIREMENT.md` AC-3 / AC-12 / NFR · `@.specs/CONTEXT.md` §15.2 已锁决策（零外部依赖 · 视觉取既有实现实际值）
- **决策者**: Architect（架构设计）+ G2 方案门专家团

## Context

`product-prototype-refresh` 要交付一份"双击就能看"的产品原型 + 界面原型文档，覆盖 11 能力域 / 32 页面 / 13 侧边栏入口，并把 9 条竞品结论画进界面。它同时受三条既有约束夹击：

- AC-3：断网完整渲染，零外部资源、零网络 API（`fetch(` / `<script src>` / 协议相对 URL / `<iframe>` 全部判红），但 **必须保留** `<a href="https://…">` 来源引用（R6.2）。
- AC-12：本 change 零 L1 代码写入，提交只允许触及 `.specs/**` 与 `STATE.md` —— 所以不能"顺便搭个 Vite 页面 / 装个图表库"。
- NFR：单文件 ≤2 MB、本机双击到首屏可交互 ≤2 s；且 13 条 AC 里有 9 条是**对这份稿跑的 grep/awk 命令**——内容必须可被文本检索命中。

反例基线就在仓库里：`README.md` 曾大面积过时（差异清单 D1-D7），`CLAUDE.md` 里连默认管理员口令都还写着字面量（本次交付稿一律用 `<管理员口令>` 占位，AC-4 tier-1 对该形态 0 容忍）。

## Decision

交付稿形态锁定为**手写单文件零依赖静态 HTML**：

1. 一个 `.html` 文件，内联一份 `<style>`；颜色/间距/圆角/字体**取 `frontend/src/styles/tokens.css` 的实际值内联**（51 个变量），不引 Tailwind runtime、不引 CDN、不引任何 `<link>`。
2. **无 JavaScript**：导航靠锚点 + `<details>` 原生折叠；不引入构建链（Vite/JIT/`npm build`）。
3. 图形一律**手写内联 SVG**（框图/表格），禁位图与 base64 内联图（反例：仓库根 `demo.gif` 实测 2.8 MB，一张即爆 NFR 预算）。
4. **来源引用必须保留**为 `<a href="https://…">` 文本节点——删掉它才是违规（R6.2 出处纪律）。
5. 文件名**必须保持 `.html` 后缀**：`backend/routes/artifact.py:10-26` 的无鉴权 GET 面按"子串匹配 + `endswith('.md')`"取文件，`product-design.md` 会被 `artifact=DESIGN` 读走，`.html` 不会（详见 DESIGN §5-R5 / §9.3）。

## Consequences

**正向**

- 断网双击必开（AC-3 / NFR 首屏），且内容 100% 可 grep —— 需求侧的 13 条验收命令才有落点。
- 零供应链入口：不新增依赖、不新增构建步骤、不产生 `node_modules`/dist 漂移面。
- 与"本 change 零 L1 写入"完全兼容：交付物落 `.specs/`，`frontend/`、`backend/` 一行不动。

**负向 / 需长期承担**

- 无交互（不能搜索、不能切换视图、不能拉真实数据）——可交互高保真版已是登记议题（v2），不在本 change。
- 单文件偏长（预期 1.5–2.5k 行），人工 diff 不友好；靠 DESIGN §1.5 的标记契约与 K 系列派生闸降低维护成本。
- 内联 token 值意味着 `tokens.css` 变更后交付稿会**静默过时** → 由 DESIGN §9.5 的禁动条 + `docs-drift-resync` 议题 + S-align（AC-6 校准基线）兜底。
- 若将来要求"接真实数据 / 复用真组件渲染"，**必须另开 change**（out-1 + R7.1）：那会把演示边界变成真实暴露面。

**推翻本 ADR 的代价**：中—高。下游三处依赖此假设（S-align 判过期、`docs-drift-resync` 的输入、5-test 的 13 条命令本体）。真要换形态（构建站 / 可交互原型），须先改 AC-3、AC-12 与 NFR 的判据并重开票面，而不是先改稿。
