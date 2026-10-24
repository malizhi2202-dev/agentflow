# UI-DESIGN: 记忆中心与提案抽屉

- **Change ID**: v20-ui-rsi · 上游 `DESIGN.md`（G2 4/4）· 调性继承（锁定：既有深色控制台 + tokens）

## 1. 色板与语义（只用既有 token）

`--bg-panel/--bg-selected/--border` 表面；强调 `--blue`；状态语义 `--green`(running/promoted) /
`--orange`(paused/confounded/quarantined warning) / `--red`(archived/collapsed/blocked) / `--text-muted`(只读)。
**一个声音**：只有 `--blue` 是装饰强调，其余为状态语义且带文字。

## 2. 布局

```
页头：记忆中心        [记忆] [提案]                [刷新]
─────────────────────────────────────────────────────────
记忆 tab
  ▸ 自动化治理（折叠：4 开关 + 4 熔断）       ← aria-expanded，标题带「N 个已暂停」
  ▸ 写入记忆（表单：layer/kind/scope/cue/lesson/evidence/confounded/source_seq/cites_seq）
  ▸ 筛选：layer/status  [列表]
      每行：cue · status chip · confounded · 污染标记 · 层级 · [看评审]
  ▸ 检疫（source_ref + 执行） · 衰减队列（days + 列出候选）
提案 tab
  ▸ 新建提案（surface 下拉 + title/dimension/target/限额）
  ▸ 列表（title · dimension · status chip · 预算/已用）
  ▸ 选中详情：按状态显示 探针表单 / 影子表单 / 会签 / 发布
```

## 3. 组件与状态

| 组件 | 状态 |
|---|---|
| `Tabs` | `role=tablist` + `aria-selected` |
| `Fold`（治理） | `aria-expanded`；标题显示「已暂停 N / 熔断 N」 |
| `MemoryRow` | 默认/选中；状态 chip + 污染/冲突标记 |
| `ReviewPanel` | 加载/空/有 |
| `ProposalCard` | 按 status 裁剪动作 |
| `ActionForm` | 行内校验错 / 提交中 / 后端错误 |
| `EmptyState` | 记忆空 / 提案空 / 候选空 |

**加载**：一行文字「加载中…」；**错误**：读 → 横幅 `role="alert"`；写 → 就地。

## 4. 交互细则

1. 发布：仅 `status === 'awaiting_approval'` 且 `isAdmin` 可点；非管理员 `disabled` + `title="只有平台管理员可以发布提案"`；点击后二次确认（按钮变「确认发布」）。
2. 领域类提案：`awaiting_approval` 前显示「需要域成员会签」+ 会签按钮。
3. 开关：点击即提交（启用/暂停），文案「自动体已暂停/运行中」；失败显示 403/409 原文。
4. 熔断：显示状态；「复位」需二次确认；「手动熔断」需填原因。
5. 探针：steps/tokens 数字必填；影子：judge/golden/cross_vendor/pass_rate/baseline，未勾金标或异厂 → 后端 409 文案透传。
6. evidence 文本域：一行一条 `ref`，空行忽略；解析为空则不提交并提示。
7. Esc 关闭选中详情（提案卡）。

## 5. 文案

- 记忆空：「还没有记忆。写一条：cue 是什么场景、lesson 学到什么、evidence 是证据。」
- 提案空：「还没有提案。提案=对四类产物的改进草案，发布前必须过人批。」
- 治理折叠标题：「自动化治理（已暂停 0 · 熔断 0）」
- 发布确认：「发布后该提案进入已发布；实际应用仍走既有 Apply。确认发布？」

## 6. 无障碍检查表

- [ ] 每个输入有 label（不用 placeholder 顶替）
- [ ] Tabs `role=tablist`/`aria-selected`；治理折叠 `aria-expanded`
- [ ] 发布/复位二次确认可键盘操作
- [ ] 状态不只靠颜色（chip 带文字）
- [ ] 错误 `role=alert`；批量结果 `role=status`
- [ ] `disabled` 按钮有 `title` 原因

## 7. 占位符

无图片；空态均有中文引导；不使用 lorem ipsum。

## 8. 反模式自检

无渐变/无侧色条/无卡片套卡片/无 placeholder 替 label/无 bounce/无纯黑纯白/单一装饰强调色。
system-ui 主字体：既有基线偏离，本 change 不改（留 L-restyle）。

## 🛡️ G2a UI 门（自评轮）

```
🎨 ✅（token 复用、密度合适）| 🧑‍💼 ✅（两个心智切分清楚；治理折叠有计数提醒）| 🟦 ✅（复用双 tab 骨架）|
♿ ✅（label/tablist/expanded/alert/disabled-title 全部列出）
结果: 4/4 → 进入 3-task
```
