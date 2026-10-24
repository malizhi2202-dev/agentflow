# DESIGN: 运行时发现（daemon 注册外部 CLI）

- **Change ID**: `v22-runtime-discovery`
- **关联**: `@.specs/v22-runtime-discovery/{CHANGE,REQUIREMENT}.md`、`PRODUCT-DESIGN.html` §6.28

---

## 0. 架构对齐（0.5）

| 既有层 | 本 change 怎么接 | 不做什么 |
|---|---|---|
| `runtime/adapters/*`（解析 CLI 日志） | **不动**：发现 ≠ 解析 | 不合并两者 |
| `services/runtime_exec.py`（执行通道，3 CLI，默认关） | **不动**：发现结果不自动开启执行 | 不改 fail-closed 语义 |
| `routes/runtime_api.py`（会话观测） | **不动**：新端点独立挂 `/api/daemon/*`、`/api/runtimes` | 不与观测数据混表 |
| `models/agent.py: runtime` | **只读聚合**：`bound_agents` 按 `cli` 计数 | 不改 Agent 模型/表单 |
| 调度（scheduler/reconcile） | **零触碰** | 心跳丢失不取消/失败 run（AC-10） |

## 0.5.1 触碰模块 + 新增模块

**新增**
- `backend/models/runtime_registry.py` — ORM
- `backend/services/runtime_registry.py` — 唯一判定层（upsert/list/visibility/offline/bound_agents）
- `backend/routes/daemon_api.py` — `POST /api/daemon/report`
- `backend/routes/runtimes_api.py` — `GET /api/runtimes`、`PUT /api/runtimes/{id}/visibility`
- `scripts/runtime-daemon.py` — daemon（探测 + 15s 上报）
- `deploy/systemd/user/af-runtime-daemon.service.in` — 单元模板
- 测试：`backend/tests/test_runtime_registry.py`、`frontend/src/__tests__/runtime-discovery.test.tsx`

**修改**
- `backend/migrations.py` — 追加 `019_runtime_registry`（up/down）
- `backend/main.py` — 挂两个 router
- `backend/config.py` — `AF_DAEMON_TOKEN`、`RUNTIME_OFFLINE_AFTER_SECONDS=180`
- `frontend/src/stores/runtimes.ts` — 加 registry 状态与动作
- `frontend/src/pages/Runtimes.tsx` — 新增「执行环境 · 自动发现」区
- `README.md` — 配置表 + daemon 用法

**禁动清单**：`backend/services/scheduler_service.py`、`backend/engine/*`、`backend/services/runtime_exec.py`、`backend/runtime/adapters/*`、`frontend/src/pages/Agents.tsx`。

---

## 决策

| # | 决策 | 备选 | 理由 |
|---|---|---|---|
| **D1** | 注册键 = `UNIQUE(machine_id, cli, protocol_family)` | 用 daemon 实例 id / 每次新建 | 设计原话「一台机器 × 一个 CLI × 一个协议族 = 一个运行时」；重启只更新不新建（AC-1） |
| **D2** | 报告端点做成**单一** `POST /api/daemon/report`（同时 upsert + 心跳） | register + heartbeat 两个端点 | 两个端点要维护「先注册后心跳」顺序与中间态，是本类功能最常见的 bug 源；一个幂等端点即可满足 15s 心跳语义 |
| **D3** | daemon 鉴权 = `X-Daemon-Token` ↔ `AF_DAEMON_TOKEN`，`hmac.compare_digest`；**未配置即 503** | 复用用户会话 / 不鉴权 | daemon 是机器级凭据，不该借用户会话；未配置时接收等于开放写入口 |
| **D4** | 源文件（`source_file`）字段记录 CLI 从哪条路径被发现，用于排障 | 只存最终路径 | 本机 `dsh`/`hermes` 都不在 PATH，必须知道命中哪条来源（env/PATH/known） |
| **D5** | 离线判定在读侧计算（`last_seen` vs now），不落 `status` 列 | daemon 上报 status / 后台任务改状态 | 避免「状态列过期」与额外写放大；离线阈值改了也不用回填历史 |
| **D6** | `models_error` 与 `models` 分开存 | 空数组兜底 | AC-5：「不可读」≠「没有模型」；界面文案不同 |
| **D7** | capability = 字符串数组，缺失即空 | 从版本号推断 | v19 D-S22 R8-7：版本够新 ≠ 实现存在；缺声明按最老处理 |
| **D8** | 可见性判定在服务层，单点函数；非 owner 返回 404 | 路由层各写一份 / 403 | 与既有 `team_service` 口径一致（越权与不存在统一 404，避免探测） |
| **D9** | `bound_agents` 读侧聚合 `agents.runtime == cli` | 新增绑定表 / 冗余计数列 | 只读、无写路径、不会与 Agent 编辑产生双写不一致 |

---

## 数据模型（`019_runtime_registry`）

```
runtime_registry(
  id INTEGER PK,
  machine_id VARCHAR(64) NOT NULL,      -- daemon 稳定标识（hostname#随机后缀，落盘复用）
  machine_name VARCHAR(128),            -- 展示名
  cli VARCHAR(32) NOT NULL,             -- hermes / dsh / codex / claude / ...
  protocol_family VARCHAR(16) NOT NULL, -- stdio / exec / jsonrpc
  binary_path VARCHAR(512),             -- 可执行体或 "node /path/x.js"
  source_file VARCHAR(64),              -- env / path / known（D4）
  version VARCHAR(64),
  models JSON,                          -- 字符串数组
  models_error VARCHAR(200),            -- 不可读原因（D6）
  capabilities JSON,                    -- 字符串数组（D7）
  owner_id VARCHAR(64) NOT NULL,        -- 上报者（daemon token 归属的平台用户）
  visibility VARCHAR(16) DEFAULT 'private',
  last_seen DATETIME NOT NULL,
  created_at DATETIME, updated_at DATETIME,
  UNIQUE(machine_id, cli, protocol_family),
  INDEX(owner_id), INDEX(last_seen)
)
```

## 接口契约

| 端点 | 鉴权 | 入参 | 出参 |
|---|---|---|---|
| `POST /api/daemon/report` | `X-Daemon-Token`（503 未配 / 401 不符） | `{machine:{id,name}, owner_id?, runtimes:[{cli, protocol_family, binary_path, source_file, version, models[], models_error?, capabilities[]}]}` | `{ok, registered:N, machine_id}` |
| `GET /api/runtimes` | 会话 | — | `{runtimes:[{id, machine_id, machine_name, cli, protocol_family, binary_path, source_file, version, models, models_error, capabilities, status:'online'|'offline', last_seen, visibility, bound_agents, mine:bool}]}` |
| `PUT /api/runtimes/{id}/visibility` | 会话 | `{public: bool}` | `{ok, visibility}`；非 owner → 404 |

**上报体字段白名单**：只取上表列出的键；出现 `token`/`api_key`/`password`/`account` 等键**直接忽略不落库**（AC-7）。

## daemon 协议

- 身份：首次运行生成 `machine_id = <hostname>#<8 hex>`，写入 `~/.agentflow/daemon.json`（重启复用 → AC-1 幂等）
- 探测顺序（D4）：`AF_RUNTIME_CLI_<CLI>_BIN` 环境变量 → `PATH` 同名命令 → 已知安装位置（含 `node <js>` 形态）
- 上报周期 15s；失败退避 1s→2s→4s→8s→15s 封顶，日志一行/次，不重试风暴
- 模型目录：`<argv...> --list-models`（timeout 8s）→ 解析成字符串数组；非零退出/超时/无该子命令 → `models_error`
- **不上报任何凭据**：只读 `--version` 与 `--list-models` 的 stdout

## 风险

| 风险 | 缓解 |
|---|---|
| 每次 report 都 `--list-models` 会把 CLI 拉起来 15s 一次 | daemon 本地缓存模型目录 10min，心跳只报缓存值 |
| 注册表被无关系户灌脏数据 | token 单点 + 字段白名单 + 唯一键 upsert |
| 离线误判（机器休眠） | 180s 阈值 + 页面显示 `last_seen` 绝对值，不只显示状态 |
