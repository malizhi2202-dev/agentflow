# ④ GD 议题门 · S13
### 🟥 安全审计师：✅ 三板斧全有先例背书（Jupyter/Gitea/OWASP 一手 URL）。**三条硬要求入验收**：debug header 即使 localhost 也默认关+白名单；权限变化旋转为 MUST 非选项；http 下 cookie 名退化状态必须在 p16 卡可见——安全降级不许静默。
### 🟦 研发负责人：✅ P0-2 半日级可先行；⚠ 双数据面：口令迁移=重写 users.json（无 DB 可依），sessions 走 SQLite——两套迁移脚本必须分开、回滚各自独立（_save_users 现有 5 份备份正好作 JSON 侧回滚）。
### 🟫 架构师：✅ session+PAT 双轨是单机产品自动化的正确形态（顺带终结 cron 回环自调用的身份戏法）；⚠ PAT scopes 枚举与权限目录表（S7#6）同源，设计时一次定死。
| 项 | 裁决 |
|---|---|
| C13-0/1/2/3/4 | ✅ 3/3 通过（安全三条+双迁移分离+scopes 同源为验收项） |
