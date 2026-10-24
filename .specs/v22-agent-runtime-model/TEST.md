# TEST: 创建 Agent 不再选模型 Provider / API Key

- **Change ID**: `v22-agent-runtime-model`
- **口径**: 只认「自跑输出 + 退出码」；`exit 0 ≠ 断言命中`，故关键项贴用例名与通过数。

---

## 1. 后端单测（本 change 新增）

```bash
cd /home/malizhi/ai/agentflow/backend
/tmp/afvenv2/bin/python -m unittest tests.test_agent_model_from_runtime -v
```

结果：`Ran 11 tests ... OK`（MF-01..MF-11 全绿）

| 用例 | 断言的事实 |
|---|---|
| MF-01 | `runtime=dsh` + 只选模型 → 落库 `model_provider=cli`、`api_key_encrypted=""`、`to_dict().api_key=None` |
| MF-02 | 整条模型字段都不传也能创建（`model_name=""`） |
| MF-03 | 非 CLI 运行时（`langgraph`）仍默认 `openai`（存量行为不变） |
| MF-04 | 显式 `model_provider` 仍校验：`unknown_provider` → 400；`cli` → 200 |
| MF-05 | 请求体带 `api_key` 也不落库 |
| MF-06 | 改运行时 → provider 跟随推导成 `cli` |
| MF-07 | 只改名字不动运行时 → 存量 provider（`deepseek`）原样保留 |
| MF-08 | 更新也不收凭据（`api_key_encrypted` 仍空） |
| MF-09 | `get_provider('cli', 'dsh'/'hermes')` → `CliProvider(kind=<runtime>)` |
| MF-10 | 不传 runtime → 保持旧行为（全局 `RSI_CLI_PROVIDER`） |
| MF-11 | `get_provider('cli', 'codex')` → `ValueError`（不静默换 CLI 代跑） |

## 2. 前端用例（本 change 新增）

```bash
cd /home/malizhi/ai/agentflow/frontend
npx vitest run src/__tests__/agent-model-from-runtime.test.tsx
```

结果：`Test Files 1 passed (1) · Tests 7 passed (7)`

| 用例 | 断言的事实 |
|---|---|
| AG-01 | 表单里没有「模型 Provider」「API Key」，且 `input[type=password]` 为 0 |
| AG-02 | 运行时选项来自 `/api/runtimes`；离线项 `disabled` 且文案含「离线」 |
| AG-03 | 模型选项 = 该运行时上报的 `models`，且含「留空」项 |
| AG-04 | `models_error` 非空 → 显示「模型目录不可读：<原因>」，模型选择器禁用 |
| AG-05 | 一个运行时都没发现 → 空态提示「尚未发现任何运行时」 |
| AG-06 | 切换运行时后旧模型清空（不存跑不动的模型） |
| AG-07 | 保存载荷：`runtime=dsh`、`model_name=所选项`，**不含** `model_provider` / `api_key` |

## 3. daemon 模型目录（修前恒空 → 修后真读到）

```bash
cd /home/malizhi/ai/agentflow/backend
/tmp/afvenv2/bin/python -m unittest tests.test_runtime_daemon -v
```
结果：`Ran 16 tests ... OK`（RD-01..RD-16）

```bash
cd /home/malizhi/ai/agentflow
timeout 180 python3 scripts/runtime-daemon.py --once --dry-run
```
结果（按 cli 汇总）：

| cli | models 数 | models_error | models |
|---|---|---|---|
| hermes | 2 | `''`（读到了） | `deepseek/deepseek-chat` · `deepseek/deepseek-reasoner` |
| dsh | 1 | `''`（读到了） | `deepseek-official/deepseek-v4-flash` |

> **目录会随运行时自己刷新而变**（这是设计语义，不是漂移缺陷）：第一次 fallback 跑（`--refresh-models` 之前）
> hermes 侧读到 5 个（`deepseek-v4-pro/-v4-flash/-chat/-reasoner/-flash`，来自当时 hermes 自有的模型缓存），
> 之后 hermes 自己刷新了 `~/.hermes/provider_models_cache.json`（mtime 00:50:22）只剩 2 个，
> daemon 下一轮就照着报 2 个。上表是 `--refresh-models` 后的**当前值**；平台不做任何模型白名单兜底。

修前（同一命令）：两个 CLI 都是 `models: []` + `models_error: "usage: hermes ..."` / `"error: --profile <name> is required"`。

**真上报后落库回读**（MySQL `runtime_registry`）：

```bash
mysql -h 127.0.0.1 -P 3307 -u root agentflow -e "select cli,version,models,models_error,owner_id from runtime_registry"
```

| cli | version | models（库内 JSON） | models_error |
|---|---|---|---|
| hermes | `Hermes Agent v0.18.0 (2026.7.1) · upstream 7fde19af` | `["deepseek/deepseek-chat","deepseek/deepseek-reasoner"]` | 空 |
| dsh | `0.1.3-alpha.2` | `["deepseek-official/deepseek-v4-flash"]` | 空 |

> 部署侧动作（非代码）：按 `deploy/systemd/user/af-runtime-daemon.service.in` 渲染并 `enable --now`
> `af-runtime-daemon.service`，另加 drop-in `10-path.conf` 补 PATH（systemd user 的 PATH 不含 nvm，
> dsh 以 `node <bin.js>` 形态探测）。**这一步之前 `runtime_registry` 是 0 行**，所以表单里
> 「运行时 / 模型」两栏的下拉在界面上会一直是空态。

## 4. 门禁

```bash
cd /home/malizhi/ai/agentflow/frontend
npx tsc --noEmit
npx vitest run
timeout 300 npm run build
```

真实输出：

| 门 | 命令 | 结果 |
|---|---|---|
| 类型 | `npx tsc --noEmit` | exit 0（无输出） |
| 前端用例 | `npx vitest run` | **15 files / 130 tests passed** |
| 构建 | `npm run build` | `✓ built in 1m 7s`，exit 0（含 `tsc && vite build`） |

> 注：本仓当时有**并行会话**在同一工作树里改 `App.tsx` / `Runtimes.tsx` / `stores/runtimes.ts`
> （v22 运行时发现页 T04）。中途一次 `tsc` 曾因对方的 `App.tsx` 半成品报
> `TS2552 Cannot find name 'workflowDetail'`，对方收口后本 change 的四道门复跑全绿；
> 上述数字是最终工作树上的结果。

## 4b. 真实链路（真 MySQL + 真 CLI，2026-10-25 00:58）

部署栈：`agentflow-mysql`(3307) + `agentflow-backend`(8000) + `agentflow-frontend`(5173) + `af-runtime-daemon`。
用会话 cookie 走真实 HTTP（不是 TestClient）：

```bash
# 1) 真实后端返回的运行时目录（daemon 上报 → 注册表 → 这个端点）
curl -b cookie http://127.0.0.1:8000/api/runtimes
#   dsh    | online | 1 models | '' | private
#   hermes | online | 2 models | '' | private

# 2) 只给 name + runtime + model 创建 Agent（不传 model_provider / api_key）
curl -b cookie -X POST http://127.0.0.1:8000/api/agents \
  -d '{"name":"__verify_no_provider__","runtime":"dsh","model_name":"deepseek-official/deepseek-v4-flash"}'
#   id=1 runtime=dsh provider=cli model=deepseek-official/deepseek-v4-flash api_key=None

# 3) 同一个 Agent 真聊一句（它没有任何 api_key）
curl -b cookie -X POST http://127.0.0.1:8000/api/agents/1/chat -d '{"content":"只回复四个字：通道正常"}'
#   ok=True error=None status=done content=通道正常   （real 33s，真跑 dsh CLI）
```

**这一步抓到两个既有缺陷**（都不是本 change 引入，见 REVIEW L6/L7）：

1. 首次聊天直接失败：`CLI(dsh) 退出码 1: ... SyntaxError: Unexpected token '?'` ——
   `RSI_CLI_NODE` 默认 `node`，而 systemd user 的 PATH 里只有 `/usr/bin/node`（**v12**）。
   临时按部署修：在 `~/ai/agentflow-data/agentflow.env` 里钉
   `RSI_CLI_NODE=/home/malizhi/.nvm/versions/node/v22.23.1/bin/node` → 重启后端 → 同一请求 `status=done`。
2. `DELETE /api/agents/1` 返回 **500 Internal Server Error**：`conversations` / `agent_probe_latest`
   对 `agents` 的 FK 是 `NO ACTION`，有会话/探针行时删不掉，代码里也没兜（`IntegrityError` 未处理）。
   清理测试数据只能先在库里按依赖顺序删子行。**该路由本 change 未改过**。

清理：测试 Agent 及其 `conversations/messages/agent_probes/agent_probe_latest/metrics_raw` 行已删除；
`select count(*) from agents` = **0**（创建前也是 0），库内未留测试数据。

## 5. 未做的验证（如实登记）

- **没做浏览器真实登录点检**：本机管理员口令不在我手上，`/home/malizhi/ai/agentflow-data/agentflow.env` 里也没有口令，故未用真实账户在 192.168.36.129:5173 上点开「创建 Agent」。表单行为由 jsdom 用例覆盖，真实链路只在数据库契约层（unittest + TestClient）验证。
- **没跑完整后端全量用例**（约 500 条，含真实 MySQL/CLI 的 E2E 另计）：只跑本 change 相关 11 条 + 与 provider/chat 相邻的既有用例（见下）。

```bash
cd /home/malizhi/ai/agentflow/backend
/tmp/afvenv2/bin/python -m unittest tests.test_llm_providers tests.test_chat_runtime tests.test_agent_prompt_persist tests.test_edge_cases -v
```

结果：`Ran 48 tests in 36s ... OK`
（`[tracer] 埋点失败…no such table: metrics_raw` 是 SQLite 测试库缺表的既有噪音，不影响用例结论）
