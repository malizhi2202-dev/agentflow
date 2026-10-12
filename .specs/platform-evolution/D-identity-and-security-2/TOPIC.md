# D-identity-and-security-2 — S13 · 身份三连修复方案（用户「再补充这些」2026-09-22）

> **状态**：通过（第 4 轮 · 2026-09-23 用户原话「通过」）· 完整链路见 REVIEW/PANEL
> **拆解依据（R16.4 用户点名 = 第 4 轮重启合法性来源）**：用户点名三条：①身份是客户端自述的（X-User-Id 缺省 admin）②localhost 闸门反代后失效（无 X-Forwarded-For/可信代理处理）③无盐 SHA-256+硬编码 123456+缺失自愈重置分支。问题清单：local-first 控制台认证先例（Jupyter/Open WebUI/Gitea token 模式）；可信代理正确姿势；argon2id 参数与首登强制改密惯例；session 旋转/吊销；MCP 2026-07-28 授权规范参照；P0-1/2/3 修法具体化（令牌形态/TTL/配置面）+界面落点（p1 改密弹窗/p16 部署模式卡）。

**问题清单**
1. 竞品一手实践（证据：URL+日期，web_search 后端故障 → 一律 web_fetch 直连）
2. 单机无 K8s / FastAPI+SQLite 栈的可行性与成本
3. AgentFlow 落点：写进文档哪节、是否新增路线图建议条（⑤ 前不入 ROADMAP）
4. 界面落点：哪页原型、什么形态、遵守 §6.0 全局交互纪律

**成员文件**（R16.8）：`TOPIC/RECON/CONCLUSION/PANEL/REVIEW.md`，随步落盘。
