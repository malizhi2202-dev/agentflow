# D-execution-isolation-2 — S8 · 沙箱补深（差距①增量）

> 〔口径注 2026-10-23 · v20 归并〕本包为**历史评审记录**（成文早于 v20）；现行有效口径以 `platform-evolution/RULINGS.md` 与 `product-design/PRODUCT-DESIGN.html` **v20** 为准——与本文冲突处让位 RULINGS，**原文不改写**（历史保留纪律）。

> **状态**：通过（第 4 轮 · 2026-09-23 用户原话「通过」）· 完整链路见 REVIEW/PANEL
> **拆解依据（R16.4 用户点名 = 第 4 轮重启合法性来源）**：用户原话①「没有沙箱——Agent 在平台进程内执行，竞品普遍 gVisor/microVM。这是安全与多租户的硬伤」（2026-09-22 点名补调研）。轮1包 `D-execution-isolation` 已定性（结论=必须做分层），本包穷尽 HOW：gVisor/runsc/Firecracker(KVM 依赖)/libkrun/agent-sandbox v1.0 CRD/E2B·Daytona 自托管/OpenHands 隔离档；单机无 K8s 可行阶梯各档成本与失效面；界面落点（隔离档选择器+fail-closed 横幅）。

**问题清单**
1. 竞品一手实践（证据：URL+日期，web_search 后端故障 → 一律 web_fetch 直连）
2. 单机无 K8s / FastAPI+SQLite 栈的可行性与成本
3. AgentFlow 落点：写进文档哪节、是否新增路线图建议条（⑤ 前不入 ROADMAP）
4. 界面落点：哪页原型、什么形态、遵守 §6.0 全局交互纪律

**成员文件**（R16.8）：`TOPIC/RECON/CONCLUSION/PANEL/REVIEW.md`，随步落盘。
