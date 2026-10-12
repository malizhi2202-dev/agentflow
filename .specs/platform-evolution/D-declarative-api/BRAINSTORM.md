# ① 头脑风暴 · S9
候选：A 全量 CRD 兼容层（❌ 引入 K8s 依赖，违背单进程承诺）· B 只加版本字段不做 watch（❌ 不满足差距②原话）· C 最小契约面四件组：apiVersion/kind 形体+ETag 并发+conditions+change_log 游标 watch（✅ 采纳）· D 引 etcd/Kafka（❌ 过重）。落点全部走 C 的分级。
