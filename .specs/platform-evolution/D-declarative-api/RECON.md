# RECON · S9 声明式 API 面 — 第 4 轮 ②
> 状态：待审 · 2026-09-23 · 源：agent `73c384ce`（web_fetch 直连，重试≤2）；本地现状见 `../R4-CODEAUDIT.md` 议题2

## ① 外部事实
- **F1 kagent 契约面（⚠ 修正：官方 0.x=v1alpha2，非任务假设 v1alpha3）**：apiGroup `kagent.dev/v1alpha2` 共 6 kinds——Agent/SandboxAgent/AgentHarness/ModelConfig/ModelProviderConfig/RemoteMCPServer；统一 `apiVersion+kind+metadata+spec+status`，status 必带 `observedGeneration+conditions[]`；示范「status.secretHash 侦测凭据轮换→下次 reconcile 滚动」（源 kagent.dev/docs/kagent/0.x/resources/api-ref.md）
- **F2 K8s 弃用政策四则**（release-1.29 deprecation-policy.md）：破坏性变更=只升版本段不原地改义；同 release 跨版本无损 round-trip（annotation 兜底）；新不指向更旧稳定级；窗口=GA 同 major 不移除/Beta 引入≤9mo 弃用+再 9mo 停服/Alpha 随时；弃用端点返 `Warning` header(RFC7234§5.5)+审计 annotation+指标
- **F3 conditions 最小集**（api-conventions.md）：type(CamelCase)/status(True|False|Unknown)/lastTransitionTime/reason(机器单词)/message(人读)+可选 observedGeneration——「处理了但结果未变」vs「没处理」的判据；**level-based 收敛**是声明式根基；PUT/POST 忽略 status、/status 子资源另写
- **F4 变更流四形态**：GitHub=ETag+If-None-Match+304 免配额+X-Poll-Interval（SSE **先例仍在但形变了**：MCP 2026-07-28 撤 GET 流与协议级会话→单 POST 端点+**请求范围内 SSE**；跨连接恢复改由应用层 cursor 重发订阅，不再指望 Last-Event-ID）；Telegram offset 长轮询=推演无源（**未达**：站点 3 连 fetch 失败）；etcd revision **未达**（正文渲染仅导航）；Kafka 过重定性
- **F5 SQLite cursor 地基**（sqlite.org/autoinc.html）：`INTEGER PRIMARY KEY AUTOINCREMENT`=严格单调不复用（经 sqlite_sequence），但**单调≠连续**——读端只按 seq>cursor 不假设无缝；「SQLite 官方直接命名的 change-log+watch 先例」未检到→标推演
- **F6 RFC7232**：If-Match 不匹配 MUST 412（lost-update 防治）；「严格版本控制的内部 revision number 是最佳强校验器来源」；If-None-Match GET→304

## ② 本地真值（摘要，全文见 R4-CODEAUDIT）
workflow.json PUT=盲覆盖零并发；⚠ 但编排面已有 apply/validate(dry-run)——契约化是在**半成品上加规格**，不是从零；双 queue 表需一并收拾。

## ③ 最小设计草案（agent 推演，⑤ 后为 DESIGN 输入）
1. `apiVersion: agentflow.io/v1alpha1`+kind 入文档体；四则弃用规则移植（含 Warning/X-Deprecates-In 头）
2. `workflow_condition` 表（seq AUTOINCREMENT/UNIQUE(workflow_id,type)/reason/message/observed_generation/RFC3339）+ 主表 generation(意图版)/revision(任意写版)
3. `change_log` 同事务账本 = 全局 cursor；`GET /api/watch?cursor&wait` SSE 帧 id:<seq>；**cursor 早于保留窗口→先发 `event:resync`(快照+起始 seq)**＝K8s 410 Gone 等价；备选长轮询 /api/changes
4. ETag `"<name>-<revision>"` 强校验；PUT/YAML apply 认 If-Match→412
界面候选：watch 实时 conditions 徽标（画布）+「API 契约手册」只读页（kagent api-ref 表格风）。

## ④ 未达：Telegram 原文/etcd 机制正文/Kafka 实核/v1alpha3 不存在（已证伪）/Deprecation+Sunset 头标准未 fetch。
