# TEST · v20-wave5

## 1. 可观测（6 条）

```
$ cd backend && /tmp/afvenv2/bin/python -m unittest tests.test_observability -v
TestSpanProduction: 根 span（model_call/server/tokens/status）+ 子 span（tool_call/client/parent 指向根、同 trace_id）
                    / 失败调用 status=error、非 agent 实体不写 to_agent_id
TestMetricsRender: Prometheus 文本格式合法（每行过正则）、counter/gauge 值正确、
                   token 按 input/output 拆分、标签转义
TestMetricsEndpointGate: 未开启 404；开启后匿名仍 401
Ran 6 tests — OK
```

## 2. 声明式 API（9 条）

```
TestEtag: 规范化哈希与键序无关 / 匹配放行 / '*' 放行 / 未带头不拦 / 不匹配 412
TestDocumentMeta: 默认 apiVersion/kind / 未知 kind 与 kind 不匹配 400 / 未知 apiVersion 400
TestChangeLog: generation 递增 / 增量游标 / 游标过期要求 resync / conditions 覆盖不新增、
               observedGeneration 正确 / envelope 带 status
TestWatchSse: 历史事件推成 SSE（event: change + id 即游标）/ 游标过期先发 event: resync
Ran 9 tests — OK
```

## 3. 执行隔离契约（9 条）

```
TestTiers: inproc 可用且 egress_enforced=false / 四个未实现档位选即抛错 / 未知档位拒绝
TestTtlAndEgress: ttl 上下界 / egress 默认空=拒、'*' 拒、非法主机拒、域名与 CIDR 接受 / retain 需 ttl
TestStartupAndGate: env 档位非法启动失败 / egress '*' 启动失败 / 执行前闸门对 microvm 明确拒绝
                    （不降级）/ describe 暴露契约与 fail-closed 说明
Ran 9 tests — OK
```

## 4. 全量回归

```
$ cd backend && /tmp/afvenv2/bin/python -m unittest discover -s tests -p 'test_*.py'
Ran 336 tests — FAILED (failures=29, errors=12, skipped=6)   # 与基线同红，0 新增红
```
