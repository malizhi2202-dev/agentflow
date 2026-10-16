# 第 4 轮共享证据附录 · 本地代码真值（只读实测 2026-09-23）

> 〔口径注 2026-10-15〕本文档为历史评审/证据记录：其中「工作项」现称「任务」；以 PRODUCT-DESIGN.html v12 为准


> 源：agent `78a43dea`。本文件是 S8-S13 六包 RECON 共用的「现状钉死层」，与轮1记录/文档声称冲突处以 ⚠ 修正 为准。

## 议题·执行面（S8 输入）
- 「Agent 执行」= `chat_service.py:30/:105` 同进程 `provider.chat()` httpx 调 LLM——无 subprocess/容器/目录隔离；`agents_api.py:117 run` 仅翻 status（空壳）
- `runtime/` 适配器=**日志观测器**（detect/log_paths/parse 扫外部 CLI 的 JSONL），不是执行器——文档表述不得混淆二者；`claude_code.py:20` 硬编码 `-home-malizhi-ai-` 路径前缀
- cron 触发=urllib 回环打自己 8000 口并自填 X-User-Id（main.py:41/:78）；全 backend 唯一 subprocess 是 git_safety 只读 git
- 调度/退避/限流确在进程内存（scheduler.py:73 PriorityQueue + reconcile_loop.py:12 asyncio）

## 议题·声明式面（S9 输入）
- workflow.json：GET/PUT 两接口（admin_api.py:87/:97），PUT=**整包盲覆盖**，无 schema 校验/apply/dry-run/diff/版本/ETag——乐观并发为零；版本化=写前备份 5 份秒级时间戳
- ⚠ 但 **orchestration 面已有 apply/validate**（orchestration_api.py:84/:167，同名整字段覆盖+入队；validate=dry-run）——「声明式程度」两脸：workflow.json 裸，编排面有雏形
- YAML↔画布资产全在 orchestration：`orchestration-sync.ts`（js-yaml/15 边型/双向 effect）+ `yaml_raw/edges_json` + 回读端点（orchestration_api.py:285）
- ⚠ WorkflowSnapshot.version 是发布快照号非编辑版本；⚠ scheduling_queue 与 scheduler_queue 双表并存语义重叠

## 议题·可观测（S10 输入）
- ⚠ **trace_spans 与 metrics_raw 实测 0 行、全 backend 零写入**（只有查询 API）——「调用链追踪」目前是表结构+读端口的空转；session_metrics 9 行（唯一活数据）
- 三条采集路径：runtime_tracer(真·LLM 调用)/runtime_watcher(30s 扫 .specs runtime.jsonl，owner 写死 admin)/metrics_scheduler(METRICS_DEMO 假数)；/api/metrics 族 15 端点实测前缀（非 /api/monitoring）
- 全仓 prometheus/otel 零痕迹；OTel 选型是**净地**（无历史包袱也无半成品）

## 议题·协议面（S11 输入）
- 168+1=169 装饰器全扫：**agent-card/a2a/.well-known/jsonrpc 全零**；OpenAPI=FastAPI 默认无扩展；MCP 仅有 type 标签+mcp_host_config 列+下载打包里的 server.py 字符串骨架（`${NAME}` 未替换）
- gateway_api.py:21「gateway」实为库内 capability→Agent 查询——命名不得当协议网关引用

## 议题·协作层（S12 输入）
- ORM 19 模块→26 表 ✅；**无 work_items/inbox**（零命中）；Agent/Workflow/Domain 只有 owner_id（归属≠负责人），全仓无 assignee 字段
- ⚠ alerts 无表：AlertService 进程内 list 环形 500 条，**重启即丢**——告警中心界面消费的是易失数据
- human_approvals.task_id=String 无 FK 无约束（可作工作项过渡锚点）；messages 唯一 FK=conversation_id——挂工作项须新表新键

## 议题·身份三连（S13 复核 ✅ 与 538c7384 独立一致）
三层 fail-open/零凭证交换/无盐 sha256/双处 12356 兜底/无 XFF/闸门无豁免——两路 agent 交叉验证吻合。补充：auth.ts:77 前端注入头、LoginPage 下拉选用户（登录=选身份表演）；/api/auth/list 公开枚举。

## 交叉声称核对
- 「19 模块→26 表」「169 端点」「3 条内联 ALTER」✅ 实测成立
- ⚠「9 阶段硬编码在 13 个文件」**只证成 backend 6 文件**（admin_api.py:31-41 DEFAULT_WORKFLOW）——v8 引用处需降级为「后端至少 6 处+前端阶段表，全量待清点」或补数
