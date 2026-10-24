# CHANGE: 创建 Agent 不再选模型 Provider / API Key（模型随运行时）

- **Change ID**: `v22-agent-runtime-model`
- **提出**: 2026-10-25 用户原话
  > 创建agent里边不用有模型有关的选择了 比如模型provider apikey这些不需要了 可以作用的模型还是从运行时里边获取到的读取到的模型
- **口径依据（不是新裁定，是既有裁定的代码落地）**：
  `.specs/platform-evolution/RULINGS.md` 第 89 行「Provider / Base URL / Agent 级 API Key（旧宇宙）」= **已裁撤**（10-15 裁定：「模型档位=运行时绑定；凭据在运行时 CLI 机器」）；原型 `.specs/product-design/prototype/agents__new.html` §3「运行时 + 模型」已按此形态画好（运行时由 daemon 探测注册、模型「随运行时获取」）。
- **澄清（用户单选）**：保留「模型」下拉，只是选项改由运行时提供（不是把整块删掉）。

## 问题（代码落后于口径）

`frontend/src/pages/AgentDetail.tsx` 的创建/编辑表单仍有旧宇宙三件套：

| 字段 | 证据（改前） |
|---|---|
| 模型 Provider（Ollama/OpenAI/Anthropic/DeepSeek/Gemini/Codex/Hermes） | `AgentDetail.tsx:287` |
| 模型名称（自由文本输入） | `AgentDetail.tsx:288` |
| API Key（password 输入） | `AgentDetail.tsx:289` |

后端配套：`POST /api/agents` 收 `api_key` 并 `encrypt()` 落库、默认 provider `openai`（`routes/agents_api.py`）。

同时 `v22-runtime-discovery` 已经把「运行时发现」的注册表打通（`GET /api/runtimes` 带 `models` / `models_error`，daemon 上报），但**前端一个调用点都没有**（`grep -rn "api/runtimes" frontend/src` 改前 0 命中）——所以「模型从运行时读」这条路在界面上根本不存在。

## 改法（一次一个面）

1. **前端表单**（`pages/AgentDetail.tsx`）：删 Provider / API Key；运行时下拉改为「已发现的运行时」（离线置灰）；模型下拉选项 = 该运行时上报的 `models`，带「⟳ 刷新模型列表」与「留空 = 用运行时自身默认」；`models_error` 非空显式显示「模型目录不可读」而不是「0 个模型」（对齐 v22 AC-5）。
2. **新建入口**（`pages/AgentBuilder.tsx`）：不再预置 `runtime/model_provider/model_name/api_key` 默认值；卡片上模型留空显示「随运行时默认」。
3. **新 store**（`stores/runtimeRegistry.ts`）：`GET /api/runtimes` 只读封装 + 按 cli 归并（在线优先）+ 取模型目录 / 不可读原因。
4. **后端不再收凭据**（`routes/agents_api.py`）：`api_key` 不再读、不再 `encrypt()`；provider 由运行时推导（CLI 运行时 → `cli`），显式传入仍校验；更新时只有**运行时变了**才跟随推导（不静默改写存量行的模型通道）。
5. **cli 通道跟随运行时**（`services/llm_providers.py` + `services/cli_provider.py` + `services/chat_service.py`）：`get_provider('cli', runtime)` 用**这个 Agent 的**运行时 CLI；落不到就报错，不静默换另一个 CLI 代跑。
6. **daemon 模型探测**（`scripts/runtime-daemon.py`）：`--list-models` 两个本机 CLI 都不支持（实测 hermes 报 usage 错、dsh 报 `--profile is required`），导致 `models` 恒空；补「读运行时自己的模型来源」兜底（hermes 自有 provider 模型缓存 + dsh 组合配置里的 `agent-default-model`），目录真读不到才写 `models_error`。

## 明确不做

- **不改聊天执行通道**：`chat_service.send_message` 的模型调用仍是「provider 通道」（provider 由运行时推导后即落到对应 CLI），`_generate()` 里那条「RUNTIME_EXEC 优先」的路径至今**没有生产调用点**——这是既有缺陷，本 change 只登记不改（见 REVIEW 遗留）。
- **不做「按次指定模型」给 CLI**：`dsh --profile headless` 实测没有 `--model` 参数，平台传不了；hermes 有 `-m` 但本 change 不加模板占位，避免同一字段在两种运行时上语义不同还悄悄生效。
- **不做 v22 的「运行时发现」页面区块**（那是 `v22-runtime-discovery` T04 的范围）；本 change 只新增只读 store 供表单使用。
- **不动存量数据**：旧 Agent 的 `model_provider` / `api_key_encrypted` 原样保留，不批量改写、不清空。
- **不新增模型白名单校验**：`model_name` 不校验是否在目录内（目录会漂移；选错由运行时自己报错，平台不假装知道）。
