# ③ 结论与建议 · S9 声明式 API 面
> 状态：已过审（第 4 轮 · 2026-09-23 用户原话「通过」）· 依据 RECON F1-F6 + R4-CODEAUDIT 议题2

- **C9-1 契约形体**：文档体内嵌 `apiVersion: agentflow.io/v1alpha1` + kind；K8s 弃用政策四则移植（破坏性只升版本段/≥2 版本并存无损互转/新不指旧/到期窗口+Warning 头）。**定位声明：语义稳定，不承诺 K8s 兼容**。
- **C9-2 乐观并发（第一批）**：GET 返 `ETag: "<name>-<revision>"`；PUT/apply 认 If-Match→412（RFC7232 MUST）。直接治「PUT 盲覆盖」现病，成本最低收益最快。
- **C9-3 意图/观测分离**：主表 generation + `workflow_condition` 表（UNIQUE(workflow_id,type)/True|False|Unknown/reason/message/observed_generation）；PUT 忽略 status 另立 /status 写口；level-based 收敛入文档为可对外声明的语义。
- **C9-4 watch**：`change_log(seq AUTOINCREMENT)` 与业务写**同事务**；`GET /api/watch?cursor` SSE（帧 id:<seq>）；恢复走**应用层 cursor 重发**（MCP 2026-07-28 撤销传输层 GET 流/Last-Event-ID 先例，明示不跟）；cursor 早于保留窗口→`event:resync`（快照+起始 seq）＝410 Gone 等价；备选长轮询 /api/changes。
- 文档落点：1.5.2 差距②升级句（含两脸事实：workflow.json 裸、编排面 apply/validate 半成品——补查纠正）；1.6.3 P2-5 充实为四件组；建议条（编号待 ⑤）「契约面最小实施」。
- 原型落点：p27 新增「API 契约手册」tab（kind 表/lifecycle 轨/watch+curl 示例，规划态 ⧉）。


> **追加（2026-09-23 · 裁定⑦）**：change_log/sessions 等账本表建在 **MySQL 权威库**（非 SQLite）。AUTOINCREMENT 只增不连续纪律在 MySQL 同样成立（重启取 MAX+1，可跳号），「读 cursor 只往前推 + 过期即 resync」两库通用，结论不变。
