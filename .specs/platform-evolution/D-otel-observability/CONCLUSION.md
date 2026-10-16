# ③ 结论与建议 · S10 可观测标准化
> 状态：已过审（第 4 轮 · 2026-09-23 用户原话「通过」）· 依据 RECON F1-F8 + R4-CODEAUDIT 议题3

- **C10-0（前置·最高优先）修死表**：trace_spans/metrics_raw 实测 0 行全后台零写入——「没标准」是二级病，「数据没产生」是一级病。编排执行点补 INSERT（父子链列一并加：expand-only ALTER）。「调用链追踪」对外声称须降为「表+读 API 在、产生端待补」。
- **C10-1 A 档（~0.5d）**：prometheus-fastapi-instrumentator `/metrics`（`AF_ENABLE_METRICS` env 门+excluded_handlers）+ Counter/Histogram 直读现表（命名贴 gen_ai.* 语义，scrape 侧 TTL 缓存）。零新组件，止住「无法接既有栈」血口。
- **C10-2 B 档（前置=C10-0）**：OTLP exporter 可选（`AF_OTLP_ENDPOINT` 默认关），span 语义选 **OTel GenAI**（invoke_agent/execute_tool/usage.{input,output}_tokens）；OpenInference 降为接 Phoenix 时的可选翻译层。semconv 全 Development 的现实下：允许 `agentflow.*` 前缀兜底，**不对外冻结契约**。
- **C10-3 口径归一**：token/成本卡数据源切 session_metrics（有 in/out 拆分）；trace_spans.tokens 单值列仅作链路结构；runtime_watcher 写死 owner_id=admin 的写侧一并修。
- **C10-4 C 档延后**：版本化承诺待 semconv Development→Stable 或季度基线。
- 文档落点：1.5.2 差距③升级句+⚠修正（半空管道新事实）；P2-4 充实为 A/B/C 三档+前置；§1.3 能力地图与监控节如实降级。原型：p27「可观测接入」tab（双开关生效态+映射只读表）；执行回放页（任务回放，无独立列表页）注一行「依赖 C10-0」。
