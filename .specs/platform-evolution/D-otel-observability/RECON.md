# RECON · S10 可观测标准化（差距③）— 第 4 轮 ②

> **状态**：已过审（随 ⑤ 门「通过」2026-09-23）· 落盘 2026-09-23 · 证据源：agent `5e86549d`（web_fetch 直连 + 本地只读核实）；未达项如实标注

## ① 事实底座（外部）

- **F1 · GenAI semconv 已拆仓且全 Development**：权威源迁至 `github.com/open-telemetry/semantic-conventions-genai`（主仓 gen-ai.md 全行 Deprecated/Moved）；agent-spans 与 token-metrics 文档首行 Status: [Development]，**无任何 gen_ai.* 属性 stable**（仅复用 error.type/server.address/server.port 为 Stable，上游钉 v1.44.0）。
- **F2 · 操作名清单**：`chat / create_agent / invoke_agent / invoke_workflow / plan / generate_content / embeddings / retrieval / text_completion / execute_tool / fetch_response` + memory 族。span 命名 `<op> <name>`：invoke_agent(kind CLIENT/INTERNAL)、invoke_workflow(INTERNAL，多 agent 编排入口)、plan(INTERNAL)。
- **F3 · invoke_agent 属性分层**：Required=operation.name+provider.name；CondReq=error.type/agent.id/agent.name/conversation.id/server.*；Recom=request.model/response.model/**usage.input_tokens/output_tokens**(含 cache/reasoning 细分)/finish_reasons。execute_tool 属性=tool.name/type/call.id/call.arguments/call.result（kind/逐条 requirement **未达**：gen-ai-spans.md 正文截断）。
- **F4 · token 指标族**：Counter `gen_ai.client.inference.usage.{input,output}_tokens` + Histogram `.operation.*`；维度 operation/provider/token.modality/model。
- **F5 · OpenInference 分歧**：`openinference.span.kind` 枚举(LLM/AGENT/CHAIN/TOOL/…) + `llm.*` 命名空间 vs OTel 的 operation.name 路线；两者同跑 OTLP。OpenInference 原生=Arize Phoenix/AX。**裁决参照：以 OTel GenAI 为内部出口契约，OpenInference 降为"接 Phoenix 时再加一层 processor"的可选翻译。**
- **F6 · Langfuse**：OTLP 端点 `/api/public/otel`（HTTP/JSON+protobuf，gRPC 不支持；Basic Auth；需 `x-langfuse-ingestion-version:4` 否则最多延迟 10min）；**自托管 v4=Web+Worker+Postgres+ClickHouse+Redis+S3 重栈——不内嵌，只当外部接收端**（逐行属性映射表**未达**）。
- **F7 · Prometheus**：`trallnag/prometheus-fastapi-instrumentator`（ISC）`Instrumentator().instrument(app).expose(app)` 白得 RED；支持 `should_respect_env_var` 开关与 excluded_handlers。
- **F8 · FastAPI OTel 自动埋点**：`opentelemetry-instrumentation-fastapi` 成熟但只给 HTTP 层，GenAI 语义须自补。
- 未达：Databricks/LangSmith 一手源。

## ② 事实底座（本地核实，file:line）

- `backend/models/orchestration.py:83 TraceSpan`：列=`id,instance_id(FK),from_agent_id,to_agent_id,duration_ms,tokens(单合计),input_hash,output_hash,span_type(agent_call|retry|degrade),timestamp`。**无 trace_id/span_id/parent_span_id/name/status/provider/model**。
- `backend/models/metrics.py`：MetricRaw(entity_type/owner_id/model_name/token_count/…)与 **SessionMetric（prompt/completion tokens 拆分在此，不在 trace_spans）**。
- ⇒ 现状断言「自建 SQLite 指标」证实；差距③比"没标准"更糟的是**父子链缺失**（OTLP 树需从 from→to 重建）。

## ③ 映射与阶梯（agent 综合，可复核）

- trace_spans→OTel 映射表：instance_id→合成 trace_id(md5[:32])；span_type=agent_call→invoke_agent；retry/degrade 无标准值→自定义或 plan；tokens 单值→暂填 input 或接 SessionMetric 拆分；provider/model 缺列→从 agent 配置补（Required 缺值即违规）；input/output_hash→走自定义 `agentflow.*`（内容属性默认 Opt-In）。
- **A 档（~0.5d）**：instrumentator `/metrics` + Counter/Histogram 直读现表（SQLite 聚合+TTL 缓存）；env 门 `AF_ENABLE_METRICS`。无新组件。
- **B 档（2-4d）**：OTLP exporter 可选（`AF_OTLP_ENDPOINT` 默认关）+ 补 trace_id/parent 列（expand-only ALTER）+ 引擎处发 gen_ai.* span；下游 Collector→Langfuse。
- **C 档（不做）**：契约版本化延后——semconv 全 Development 且刚拆仓，冻结收益低；内部记录对齐基线即可。

## ④ 界面落点候选（v8 供料）

集成页 exporter 双开关状态展示（env 驱动如实显示）；仪表盘加 HTTP RED 卡；trace 详情按 span_type 分色（B 档后 span 树）；token/成本卡数据源切 SessionMetric（口径统一）——细节见 CONCLUSION。
