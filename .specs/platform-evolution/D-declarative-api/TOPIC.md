# D-declarative-api — S9 · 声明式 API 面（差距②）

> **状态**：通过（第 4 轮 · 2026-09-23 用户原话「通过」）· 完整链路见 REVIEW/PANEL
> **拆解依据（R16.4 用户点名 = 第 4 轮重启合法性来源）**：用户原话②「没有声明式 API 面——有 YAML apply，但没有 CRD 那样的稳定契约与 watch 语义」。问题清单：非 K8s 栈的 watch 实现形态（revision 游标/SSE/ETag/changes-feed）；apiVersion 生命周期与弃用惯例；conditions/observedGeneration 最小语义集；kagent CRD kinds 实证清单；SQLite+FastAPI 落点参照（P2-5 充实）。

**问题清单**
1. 竞品一手实践（证据：URL+日期，web_search 后端故障 → 一律 web_fetch 直连）
2. 单机无 K8s / FastAPI+SQLite 栈的可行性与成本
3. AgentFlow 落点：写进文档哪节、是否新增路线图建议条（⑤ 前不入 ROADMAP）
4. 界面落点：哪页原型、什么形态、遵守 §6.0 全局交互纪律

**成员文件**（R16.8）：`TOPIC/RECON/CONCLUSION/PANEL/REVIEW.md`，随步落盘。
