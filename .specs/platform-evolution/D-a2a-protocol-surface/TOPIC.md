# D-a2a-protocol-surface — S11 · A2A 协议面（差距④）

> **状态**：通过（第 4 轮 · 2026-09-23 用户原话「通过」）· 完整链路见 REVIEW/PANEL
> **拆解依据（R16.4 用户点名 = 第 4 轮重启合法性来源）**：用户原话④「没有 A2A——协议层已收敛（A2A v1.0.1 赢家通吃，ACP 已归档），缺席意味着无法被别人的 Agent 调用」。问题清单：v1.0.1 spec 本体（AgentCard 路径与字段/Task 状态机含 input-required/transport bindings/extensions 机制）；a2a-python SDK 实装面；谁真实现了（agent-framework/kagent HITL ext 等）；我们 AgentCard+最小端点集设计（衔接 P1-12 只映射不追协议纪律）。

**问题清单**
1. 竞品一手实践（证据：URL+日期，web_search 后端故障 → 一律 web_fetch 直连）
2. 单机无 K8s / FastAPI+SQLite 栈的可行性与成本
3. AgentFlow 落点：写进文档哪节、是否新增路线图建议条（⑤ 前不入 ROADMAP）
4. 界面落点：哪页原型、什么形态、遵守 §6.0 全局交互纪律

**成员文件**（R16.8）：`TOPIC/RECON/CONCLUSION/PANEL/REVIEW.md`，随步落盘。
