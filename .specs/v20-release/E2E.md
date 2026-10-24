# E2E：真实后端 + 真实浏览器验收（四个已挂载页面）

- **时间**：2026-10-24 18:00
- **环境**：后端 `uvicorn main:app --port 8000`（`PROJECT_ROOT=/tmp/e2e/backend`，全新 SQLite，隔离 users.json）· 前端 `vite --port 5173`（代理 `/api` → 8000）· 浏览器 Playwright Chromium headless（`chromium_headless_shell-1208`）
- **脚本**：`/tmp/e2e/run.js`（功能）· `/tmp/e2e/layout.js`（布局/溢出）
- **截图**：`/tmp/e2e/shots/{tasks,inbox,teams,memory,proposals}.png`
- **说明**：本模型不支持读图，像素级人工审阅**未做**；用 DOM/计算样式断言替代（见 §2），并保留截图供人工复核。

## 1. 功能 E2E（7/7 通过 · 真实写路径）

```text
$ node /tmp/e2e/run.js
PASS 登录（服务端会话）
PASS 任务：新建并出现在看板                 # POST /api/tasks 真链路
PASS 收件箱渲染
PASS 团队：建团 + 抽屉（我的角色 owner）     # POST /api/teams + GET /api/teams/{slug}
PASS 记忆中心：开关切换（paused→running）    # POST /api/rsi/switches/memory
PASS 提案 tab 渲染
PASS 未登录落到登录页

SUMMARY 7/7 passed
```

## 2. 布局 / 未捕获错误检查（5/5 clean）

```text
$ node /tmp/e2e/layout.js
PASS 任务 无横向溢出 | bg=rgb(13, 14, 18) | nav=21 | alerts=0 | 任务
PASS 收件箱 无横向溢出 | bg=rgb(13, 14, 18) | nav=21 | alerts=0 | 收件箱
PASS 团队与小隊 无横向溢出 | bg=rgb(13, 14, 18) | nav=21 | alerts=0 | 团队与小隊
PASS 记忆中心 无横向溢出 | bg=rgb(13, 14, 18) | nav=21 | alerts=0 | 记忆中心
PASS 团队与小隊 @880px 无横向溢出 | bg=rgb(13, 14, 18) | nav=21 | alerts=0 | 团队与小隊

LAYOUT SUMMARY 5/5 clean
```

判据：`documentElement.scrollWidth <= clientWidth + 1`（无横向滚动）· `body` 背景 = `--bg-app #0d0e12` →
`rgb(13, 14, 18)` · 侧栏按钮 21 个 · `[role=alert]` 计数 0（页面无错误横幅）· 窄屏 880px 不溢出。

## 3. 仍未覆盖

- 像素级视觉（颜色/间距/对齐是否"好看"）——模型不支持读图，需人工看截图。
- 触屏/移动端手势；键盘 Tab 顺序（有 DOM 断言但无真实键盘遍历）。
- 写操作之外的边界：并发、超长输入、权限 403 的真实浏览器路径（仅 mock 覆盖）。
