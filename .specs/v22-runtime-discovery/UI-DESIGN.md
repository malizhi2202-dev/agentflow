# UI-DESIGN: 运行时发现（「执行环境 · 自动发现」区）

- **Change ID**: `v22-runtime-discovery`
- **调性**：沿用 v20 既定 tokens（`--bg-panel` / `--border` / `--text-muted` / `--blue` / `--red` / `--green`），不新增视觉语言

---

## 位置与结构

「运行时」页（`/runtimes`）现有两块：概览 stats、会话表。新区块插在**概览之后、会话表之前**：

```
┌ 运行时   会话 3 条 · 失败 0                        [刷新] ┐
│ 概览 stats（既有）                                        │
│ ┌ 执行环境 · 自动发现            daemon 心跳 15s [刷新] ┐ │
│ │ 机器 · CLI      协议族  状态·心跳      模型目录  可见性 绑定 ┐
│ │ workstation · hermes  stdio  ●在线 12s前  deepseek-chat ×3  private  2 │
│ └──────────────────────────────────────────────────────┘ │
│ 会话表（既有）                                            │
└──────────────────────────────────────────────────────────┘
```

- 区标题：`执行环境 · 自动发现`；右侧小字 `daemon 心跳 15s` + 刷新按钮（重新 `GET /api/runtimes`）
- 表列固定 6 列（< 900px 时横向滚动，不折行）：`机器 · CLI` / `协议族` / `状态 · 心跳` / `模型目录` / `可见性` / `绑定 Agent`
- 每行末尾操作：`置为公开` / `收回私有`（仅 `mine=true` 时渲染）

## 状态矩阵

| 状态 | 表现 | 文案 |
|---|---|---|
| 无任何记录 | 区内空态（不隐藏整区） | 「还没有运行时上报。在要接入的机器上启动 daemon（`scripts/runtime-daemon.py`），它每 15s 自动上报本机 CLI。」 |
| online | `● 在线`（`--green`）+ `last_seen` 相对时间 | `● 在线 · 12s 前` |
| offline | `○ 离线`（`--red`）+ 绝对时间 | `○ 离线 · 上次心跳 14:32（>3 分钟）` |
| 模型目录可读 | 前 2 个模型名 + `+N` | `deepseek-chat · reasoner +1` |
| 模型目录不可读 | `chip warn` 文案取 `models_error` | `不可读：--list-models 不支持` |
| private / public | 小 chip | `私有 · 仅我` / `公开 · 只共享路由权` |
| 加载中 | 行内小字 | `加载中…` |
| 读失败 | 区内 `role="alert"` | 后端 `detail` 原样透传 |

## 无障碍

- 区块 `section[aria-label="执行环境 · 自动发现"]`；表格用真 `<table>` + `<th scope="col">`（既有页面同款）
- 状态 chip 不只用颜色：文字里带「在线/离线」；`离线` 同时给绝对时间
- 可见性切换是 `<button>`（不是裸 `<div>`），`aria-pressed` 反映当前是否 public
- 空态文案直接给下一步动作（启动 daemon），不是「暂无数据」

## 复用

`panel` 样式常量、`Stat` 卡片形态、`safeFetch` + 既有 store 模式；不新增依赖、不新增全局样式。
