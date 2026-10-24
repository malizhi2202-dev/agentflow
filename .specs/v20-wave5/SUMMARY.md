# SUMMARY: v20-wave5 — 波 5 差距能力（P2-3 / P2-4 / P2-5）

- **Change ID**: v20-wave5
- **Task ID**: T-01（P2-4 可观测）/ T-02（P2-5 声明式 API）/ T-03（P2-3 隔离契约）/ T-04（文档收口）
- **完成时间**: 2026-10-24（提交 `943b7e5e`）
- **AI 角色**: Dev（与 v20-wave7 同一会话的并行会话协作，本轮由主 agent 复核）
- **补记说明**: 7-integration 阶段补落（漂移 D4-1）

## 做了什么

① **P2-4 先修产生端**：`trace_spans` 此前零写入（`instance_id`/`to_agent_id` NOT NULL 只能装编排实例调用），迁移 011 expand-only 整表重建 + `runtime_tracer` 写根/子 span（合成 `trace_id`，**书面声明非 W3C**）；A 档 `/metrics` 直读现表、env 门（默认 404）且仍需身份。
② **P2-5 四件组**：规范化 JSON sha256 的强 ETag + `If-Match`→412（治 `workflow.json` PUT 盲覆盖）；`apiVersion`/`kind` 文档体 + 未知 kind 400、弃用只告警；`change_log` 全局单账本同事务 + `resource_conditions`（observedGeneration 区分「没处理」与「结果未变」）；`/api/watch` SSE 应用层 cursor，过期先发 `event: resync`。
③ **P2-3 隔离契约先行**：tier 阶梯（仅 `inproc` 实现）、ttl/retain、egress 默认拒且 `*` 拒绝；未实现档位**选即拒绝，不降级**；启动校验 + 执行前闸门两处独立兜底；`/api/runtime/execution-contract` 只读呈现。

## 改动文件（关键）

| 文件 | 性质 | 说明 |
|---|---|---|
| `backend/services/runtime_tracer.py`、`models/orchestration.py` | 修改 | span 产生端 + 父子链列 |
| `backend/routes/prom_metrics.py` | 新增 | Prometheus 文本渲染（无缓存、无第二套存储） |
| `backend/models/declarative.py`、`services/declarative.py` | 新增 | 账本 + conditions + ETag |
| `backend/routes/watch_api.py` | 新增 | SSE（cursor/resync） |
| `backend/services/execution_contract.py`、`routes/execution_api.py` | 新增 | 隔离契约 + 只读端点 |
| `backend/migrations.py` | 修改 | 011 trace_spans / 012 账本两表 |
| `backend/tests/{test_observability,test_declarative,test_execution_contract}.py` | 新增 | 6 + 12 + 9 用例 |

## verify 输出（本轮复跑）

```text
$ 16 个波次相关模块同批：Ran 217 tests in 39.809s — OK
  （含 test_observability / test_declarative / test_execution_contract）
$ 全新库 init_db()：[migrate] 已应用 15 个迁移 · tables: 49 · 二次无待应用
```

## 已知接受 + 理由

- **OTLP（B 档）/ 语义版本化（C 档）不做**：`gen_ai.*` 语义仍 Development，不提前冻契约。
- **真实容器/microVM 执行面无**：契约先行，档位随首个本地工具执行面开放（P1-14）。
- **前端隔离徽章未挂**：界面当前无执行详情页，新增即空壳（API + 审计两处已显式）。
