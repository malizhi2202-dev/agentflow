# ① 头脑风暴 · S10
候选：A 自建新时序存储（❌ 重复造轮子）· B 内嵌 Langfuse（❌ ClickHouse+Redis+S3 重栈，只作外接接收端）· C 三档：/metrics 直读→OTLP 可选→版本化延后（✅ 采纳）· D 先修产生端再谈出口（✅ 采纳为前置——调研揭示 trace_spans/metrics_raw **零写入**，一级病）。
