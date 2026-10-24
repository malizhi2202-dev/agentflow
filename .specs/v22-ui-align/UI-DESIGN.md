# UI-DESIGN: 壳层顶栏与语义组件（W1）

- **Change ID**: `v22-ui-align`
- **权威源**: `PRODUCT-DESIGN.html`（主档）+ `prototype/*.html` 的 `.app-top` 形态
- **调性**: 沿用 v20 既定 tokens，不新增颜色/字号体系

---

## 1. 壳层结构（与原型一一对应）

```
<aside class="app-side">            ← 既有侧栏（v22-nav-groups 已分 6 组）
<main>
  ┌ .app-top（sticky，44px）────────────────────────────┐
  │ .crumb 页面名 · 上下文            .right [chip] [btn] │
  └──────────────────────────────────────────────────────┘
  <div class="app-body"> 页面内容（页面不再自己写页头）    </div>
</main>
```

- `.crumb`：14px / 600；上下文用 `.dim`（muted，400）
- `.right`：chip（11px）在前，主按钮（`.btn.primary`）在最后
- 顶栏 sticky，`z-index: 5`，与内容区同一底色 + 一条 `--border` 下边线

## 2. 组件契约

| 组件 | props | 说明 |
|---|---|---|
| `AppTopBar` | `crumb`（必填）、`context?`、`chips?`、`actions?` | 由 `App` 统一渲染；页面不自造顶栏 |
| `Chip` | `tone: default/ok/bad/warn/info/mono`、`title?` | 状态与元信息；**文字自解释**，不靠颜色单独传达 |
| `Panel` | `label?`、`style?` | 替代每页重复的 panel 内联对象 |
| `Toolbar` | `children`、`grow?` | 页面级动作/筛选行 |

## 3. 页面迁移规则（批 1 执行的口径）

1. 页名 → 壳层 `.crumb`；页内**删除**重复的 `<h1>/<h2>` 页面名。
2. 计数/状态 → `.chip mono`（如「共 12 条 · 启用 3」）。
3. 动作按钮 → `.toolbar` 行，主按钮靠右；不再手写 `padding: '8px 16px', background: ...` 的内联样式。
4. 页面容器 padding 收敛到 `.app-body`（16px）；分区标题统一 `.section-title`（12.5px / 600 / secondary）。

## 4. 无障碍

- 顶栏 `role="banner"`；chip 不承载交互；工具栏按钮保持既有 `aria-label`
- 状态色不单独承载语义（文字写「在线 / 离线 / 不可读」）
- 页面名移除后仍可由顶栏文本定位（读屏按 banner 播报）

## 5. 不含

- 不做暗色/多主题切换（既有 tokens 已支持变量覆盖，不在本次范围）
- 不引入组件库（坚持最小自有组件，零新依赖）
