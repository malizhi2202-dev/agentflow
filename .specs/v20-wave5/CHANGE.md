# CHANGE · v20-wave5 —— 波 5 差距能力（P2-4 / P2-5 / P2-3）

> 来源：`PRODUCT-DESIGN.html` v20 §1.6.0 波 5 + §1.6.3 P2-3/P2-4/P2-5
> 路由：**压缩路径**（0→3→4→6），三件分三次提交：**P2-4 可观测 → P2-5 声明式 API → P2-3 隔离契约**。
> 前置：波 2（状态外置/租约）。设计口径：波 5 各条按 §1.6.3 自带验收。

## 一句话

波 1-4 把身份、状态、协作、团队做实了。本波补三条「不做会被甩开」的差距：
**可观测先修产生端**（`trace_spans` 零写入是真病）、**声明式 API 四件组**（治 PUT 盲覆盖）、
**执行隔离契约先行**（没实现的档位显式拒绝，不静默降级）。

## P2-4 可观测（本轮完成）

| AC | 判据 |
|---|---|
| AC-5.1 | `trace_spans` 真正产生：每次模型调用写根 span（`trace_id` 合成 ID、`span_kind=server`、`status=ok/error`、tokens、duration） |
| AC-5.2 | 有工具调用时写子 span（`parent_span_id` 指根、同 `trace_id`、`span_kind=client`） |
| AC-5.3 | `instance_id` / `to_agent_id` 改可空（多数调用不属于编排实例）——迁移 011 整表重建、旧行保数据 |
| AC-5.4 | `GET /metrics`：Prometheus 文本（`# HELP/# TYPE` + 样本行格式合法），直读现表（不建第二套存储） |
| AC-5.5 | 端点 env 门：未开启 → **404**（不给探测面）；开启后仍需身份（匿名 401） |
| AC-5.6 | 标签值转义（引号/反斜杠/换行），避免破坏 exposition 格式 |
| AC-5.7 | B 档 OTLP / C 档版本化**不做**并写明原因（gen_ai 语义仍 Development） |

## P2-5 声明式 API 四件组（本轮完成）

| AC | 判据 |
|---|---|
| AC-5.8 | ① `GET /api/admin/workflow` 返回 `ETag`；`PUT` 的 `If-Match` 不匹配 → **412**（`*` 放行；未带不拦，兼容旧客户端） |
| AC-5.9 | ① `GET/PUT /api/workflows/{id}` 同样有 `ETag` 与 412（哈希含 name/spec/updated_at 的规范化 JSON） |
| AC-5.10 | ② 文档体可带 `apiVersion`/`kind`；未知 `kind`/`apiVersion` → 400；弃用版本 → 200 + `warning`（不硬失败） |
| AC-5.11 | ③ 每次变更写 `change_log`（同事务）并产出 `generation`；GET 返回 `status.generation / observedGeneration / conditions` |
| AC-5.12 | ④ `GET /api/watch?since=<id>` SSE：`id:` 行即游标；历史补发 + 轮询新事件（有界 `max_polls`） |
| AC-5.13 | ④ 游标早于账本最早一行 → 先发 `event: resync`（410 等价语义），客户端应重拉全量 |
| AC-5.14 | `conditions` 同一资源类型只有一个 `Ready` 条件（覆盖不新增），状态变化才更新 `lastTransitionTime` |

## P2-3 执行隔离契约（本轮完成）

| AC | 判据 |
|---|---|
| AC-5.15 | `tier` 阶梯声明：`inproc|process|container|microvm|remote`；本版 `AVAILABLE_TIERS={inproc}` |
| AC-5.16 | 选择**未实现**档位 → `ExecutionContractError`（启动即失败 / 执行前拒绝），**不降级到 inproc** |
| AC-5.17 | `ttl_seconds` 正整数且 ≤ 3600；`retain=true` 必须配 ttl |
| AC-5.18 | `egress` 默认拒绝（空列表）；`*` 一律拒绝；域名/CIDR 逐条校验 |
| AC-5.19 | `egress_enforced` 如实声明：`inproc` 为 false（进程内没有网络边界），只有 container/microvm/remote 才算强制 |
| AC-5.20 | 启动时 `validate_startup()` 校验 env；执行前 `assert_can_execute()` 在 `chat_service` 与 `agent_trigger` 两处独立兜底 |
| AC-5.21 | `GET /api/runtime/execution-contract` 只读呈现契约；`POST .../validate` 供预检（400 说明哪条不成立） |

## 触碰模块

- P2-4：`models/orchestration.py`（TraceSpan）· `services/runtime_tracer.py` · `migrations.py`(011) · `routes/prom_metrics.py`(新) · `config.py` · `main.py`（/metrics 开关在中间件）
- P2-5：`models/declarative.py`(新) · `services/declarative.py`(新) · `routes/watch_api.py`(新) · `routes/admin_api.py` · `routes/workflows_api.py` · `migrations.py`(012)
- P2-3：`services/execution_contract.py`(新) · `routes/execution_api.py`(新) · `config.py` · `main.py` · `services/{chat_service,agent_trigger}.py`
- 测试：`tests/test_observability.py` · `tests/test_declarative.py` · `tests/test_execution_contract.py`（共 24 条）
- 文档：`README.md`（配置表 6 项 + 两节说明）

## 明确不做（记账）

- OTLP 导出（B 档）与 OTel 语义版本化（C 档）：gen_ai 语义仍 Development，不提前冻契约。
- `orchestration apply` 的 ETag（P2-5 第一步只覆盖「PUT 盲覆盖」最严重的 workflow 配置与工作流）。
- 真正的容器/微虚拟机执行面（P2-3 只做契约；档位未实现就显式拒绝）。
- `/metrics` 的进程级指标（CPU/内存）——设计只要求直读现表。
