# CLAUDE.md — 项目级 AI 指令

> 本文件每次会话自动加载。

## 强制入口

**每次会话必须首先调用 code-kit 入口技能：**
加载 `@code-kit/GO.md` 并按其完整流程执行。

**AI 行为约束：**
- 收到任何开发请求 → 先走 GO.md 路由，不要直接动手
- GO.md 中的所有步骤（STATE.md 读取、Artifact Preflight Gate、路由声明、Token 预算）**一个不能跳**
- 用户 `@code-kit/GO.md` 时必须严格走完整流程
