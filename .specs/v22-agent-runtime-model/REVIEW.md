# REVIEW: 创建 Agent 不再选模型 Provider / API Key

- **Change ID**: `v22-agent-runtime-model`
- **审的方式**：先看 diff 与调用点，再按「正确性 / 边界 / 安全 / 生命周期 / 错误处理 / 可读性 / 测试分级」过一遍；发现即改，改不了的登记。

---

## 1. 实现中自己抓到并已修的缺陷

| # | 缺陷 | 怎么发现的 | 修法 |
|---|---|---|---|
| R1 | 表单里出现**两个**运行时选择点：顶部 `名称 / 运行时` 网格的旧 `<select>`（`langgraph…custom`）没删，新「运行时 + 模型」区块又加了一个 → 两个控件改同一个字段，用户改上面那个不影响模型目录 | 替换 Provider 行后 grep `select value={data.runtime` 命中两处 | 删旧下拉，把「描述」并进顶部网格；运行时只在「运行时 + 模型」区块选（`aria-label="运行时"` 唯一） |
| R2 | 编辑存量 Agent（provider 原为 `openai`）切运行时到 `dsh` 时，`data.model_provider` 仍带着旧值 → 后端「显式 provider 优先」会把通道钉死在 openai | 写 `chooseRuntime` 时意识到保存会把旧 provider 一起发出去 | `chooseRuntime` 里把 `model_provider` 置 `undefined`（`JSON.stringify` 丢弃该键）→ 服务端按新运行时推导 |
| R3 | 一开始新建了 `stores/runtimeRegistry.ts`，与并行会话在 `stores/runtimes.ts` 加的 `registry/fetchRegistry` 重复（同一端点两份状态） | 跑全量 vitest 时看到 `runtime-discovery.test.tsx`（7 例）已在用 `useRuntimes().registry` | 删掉自己的 store，改成 `utils/runtimeOptions.ts` 纯派生函数 + 复用 `useRuntimes()`；不新增第二个注册表缓存 |

## 2. 发现但**不在本 change 范围**（如实挂账，不悄悄改）

| # | 事实（有证据） | 影响 | 建议 |
|---|---|---|---|
| L1 | `services/chat_service.py:15 _generate()` 里「RUNTIME_EXEC 优先、否则 provider」的分支**没有任何生产调用点**：`grep -rn "_generate(" backend` 只命中定义与 `tests/test_chat_runtime.py`；真正的聊天走 `send_message` 内联的 `get_provider(...).chat(...)` | `RUNTIME_CMD_DEPLOY` 那套「按次跑 CLI 命令模板」实际不生效；聊天里的模型通道 = provider 通道。本 change 让 provider 跟随运行时后，CLI 运行时仍会落到对应 CLI（`CliProvider`），但走的是另一条实现（`RSI_*` 配置），不是 `RUNTIME_CMD_*` | 另立 change：把 `send_message` 的模型调用统一到 `_generate`（含时延、超时、E2E 双通道复跑），并把 `RUNTIME_CMD_*` 与 `CliProvider` 两条 CLI 通道收口成一条 |
| L2 | **模型字段目前不能真正按次生效**：`dsh --profile headless --help` 无 `--model`/`-m`；`hermes` 有 `-m MODEL --provider PROVIDER`。本 change 未给 `runtime_exec` 加 `{model_args}` 占位 | 「创建时选的模型」= 声明 + 落库值；实际用哪个模型由运行时自身配置决定。对 dsh 这是**能力边界**，对 hermes 是**未接线** | 若要做「按次指定模型」：只在运行时的 `capabilities` 里声明支持时才允许选（否则选择器禁用并显示「由运行时托管」），后端 `runtime_exec` 增加 `{model_args}` 占位（空模型时整段消失），并补「CLI 真的收到该参数」的用例 |
| L3 | 运行时的 `models` 目录本机实测是**空的**（两个 CLI 都不支持 `--list-models`） | 修前：模型下拉恒空、「不可读」提示恒亮。本 change 的 T03 补了 daemon 侧的读法，目录才有内容 | 已在本 change 内处理；若某运行时两条路都读不到，界面按 AC-5 显示「不可读」而不是「0 个模型」 |
| L4 | `Agent.to_dict()` 仍返回 `api_key`（掩码）字段 | 前端已不展示；A2A 卡片等契约仍按「有该键」写用例（`test_a2a_card` 断言不泄露明文） | 保持不动（删字段会破坏既有契约），等接口版本化时一并清 |
| L6 | **`DELETE /api/agents/{id}` 在真库上直接 500**：`conversations` / `agent_probe_latest` / `agent_probes` / `channel_configs` / `knowledge_sources` / `scheduler_queue` 对 `agents` 的外键都是 `NO ACTION`，只要有一行子数据，`db.delete(a); db.commit()` 就抛 `IntegrityError`，路由没有捕获（真链路实测 `DELETE /api/agents/1` → `500 Internal Server Error`，清理只能先在库里删子行）。**该路由本 change 未改过，是既有缺陷** | 用户在界面上删有对话/探针记录的 Agent 会看到 500；数据反而删不掉 | 需要产品裁定语义：①级联删（会话/消息/探针一并删）②软删（`archived` 态，列表过滤）③前置检查返回 **409 + 明确文案**（「该 Agent 还有 N 个会话，先解绑/删除」）。我倾向 ③ 起步（无损、可解释），再按需加级联开关 |
| L7 | **dsh 通道依赖 `node` 版本，但没人校验**：`RSI_CLI_NODE` 默认 `node`，systemd user 的 PATH 只到 `/usr/bin/node`（**v12**），`bin.js` 用了 `??` → `SyntaxError`，表现为「Agent 暂时无法回复，请稍后重试」+ 后端错误 `CLI(dsh) 退出码 1` | 任何新装机器上，provider 被推导成 `cli` 的 Agent 一聊天就失败；错误只在 agent_message.error 里，用户看不到根因 | 部署已临时修（env 钉 `RSI_CLI_NODE` 到 v22）。代码侧建议：`cli_provider` 在**首次构建 argv 前**跑一次 `node --version` 并 fail-closed 报「node <18 不能跑 dsh CLI」，把这类环境错提前暴露 |
| L5 | `POST /api/agents` 的 `model_name` **不做目录校验** | 目录会漂移（daemon 10 分钟刷新一次），平台白名单式校验会误杀 | 维持不校验：选错由运行时自己报错；不在平台侧假装知道模型目录 |

## 3. 安全复核

- **不落凭据**：创建/更新都不再读 `api_key`，`api_key_encrypted` 落空串；测试 MF-05/MF-08 锁死。
- **fail-closed**：`get_provider('cli', <非 dsh/hermes>)` 直接 `ValueError`，不静默回退全局 CLI（MF-11）。
- **不静默换通道**：更新路由只在 **runtime 变化时** 重推 provider（MF-07 锁死「只改名不动运行时」的存量行不被改写）。
- **外部输入**：模型名/运行时名都只作为字符串落库或进 `argv` 单个参数，不经 shell（`runtime_exec`/`cli_provider` 既有纪律未变）。
- **不扩大读权**：`/api/runtimes` 仍是「本人全部 + 任何 public」，表单只是消费它。

## 4. 测试分级

- **新增 18 条**：后端 MF-01..MF-11（11）+ 前端 AG-01..AG-07（7）。
- **相邻既有**：`test_llm_providers / test_chat_runtime / test_agent_prompt_persist / test_edge_cases` 48 条 OK（provider 工厂与聊天路径没被打坏）。
- **真实链路**（真 MySQL + 真 CLI）：`/api/runtimes` 有 2 行在线运行时 → 只给 name/runtime/model 创建 Agent（provider 自动 `cli`、无 api_key）→ 同一 Agent 真聊一句拿到「通道正常」（33s，真跑 dsh CLI）。证据与两个既有缺陷见 TEST.md §4b。
- **没有做的**：真实浏览器登录点检（未用无头浏览器点开创建页，表单行为靠 jsdom 7 例覆盖）、完整后端全量（原因见 TEST.md §5）。

## 5. 结论

- **已实施**：表单形态、后端凭据撤除、provider 推导、cli 通道跟随运行时、daemon 模型读法。
- **部分实施**：模型字段的「按次生效」只到「落库 + 声明」，未接到 CLI 参数（L2）。
- **未实施（挂账）**：`_generate` 接线（L1）。
