# REQUIREMENT: 运行时发现

- **Change ID**: `v22-runtime-discovery`
- **来源**: `.specs/product-design/PRODUCT-DESIGN.html` §6.28（设计唯一权威）、CHANGE 的用户裁定

---

## 用户故事

1. **作为 Agent 开发者**，我希望平台自动列出我这台机器上装了哪些 AI 编码 CLI、各自版本与模型目录，
   这样我配置 Agent 时不用手填运行时名字，也不用猜本机到底能不能跑。
2. **作为平台管理员**，我希望看到所有机器的运行时注册表与在线状态，这样「Agent 掉线」时我能分清是
   运行时不可达还是 Agent 本身没跑（Agent 不是长驻进程）。
3. **作为运行时 owner**，我希望运行时默认私有，需要时**由我**置为公开，这样别人只能复用路由权、
   我的 CLI 凭据仍留在我本机。

---

## 域语言（本 change 内的严格定义）

| 词 | 定义（本 change 只认这个） |
|---|---|
| **daemon** | 每台机器上的扫描与上报进程。≠ 运行时 |
| **运行时** | 注册记录 = `(machine_id, cli, protocol_family)` 三元组唯一 |
| **online / offline** | `last_seen` 在 180s 内 = online；超时 = offline（**不删记录**） |
| **private / public** | private = 仅 owner 可见；public = 他人可见，**只共享路由权，不含凭据** |
| **模型目录** | 由 CLI 自己暴露的模型清单（daemon 解析 CLI 真实输出）；解析不出 → 空列表 + `models_error` |

---

## 验收标准

### AC-1 · daemon 上报幂等
`POST /api/daemon/report` 连续调用两次（同一 machine × cli × protocol）→ 注册表仍只有 **1** 行，字段更新为最后一次。

### AC-2 · daemon 鉴权 fail-closed
- 未配置 `AF_DAEMON_TOKEN` → 上报返回 **503**（「未配置即拒绝」，绝不静默接收）
- 配置了但 token 不匹配 → **401**；使用 `hmac.compare_digest` 比较，不做字符串 `==`

### AC-3 · 在线/离线判定
`last_seen` 距今 ≤ 180s → `online`；> 180s → `offline`；两者都保留记录，`offline` 不删除。

### AC-4 · 可见性
- 默认 `private`；`GET /api/runtimes` 对他人**不返回** private 行
- `PUT /api/runtimes/{id}/visibility` 仅 **owner** 可改（admin 不旁路）；非 owner → **404**（不用 403 泄露存在性）

### AC-5 · 模型目录不可读要显式
CLI 不支持/失败 `--list-models` → `models=[]` 且 `models_error` 非空；界面显示「不可读」而不是「0 个模型」。

### AC-6 · 绑定 Agent 数
`GET /api/runtimes` 每行带 `bound_agents` = `agents.runtime == cli` 的行数（只读聚合，不新建表）。

### AC-7 · 凭据不上报
上报体**不含**任何 token / 账号 / 密钥字段；服务端模型无对应列；测试断言字段白名单（多传的键被忽略而非落库）。

### AC-8 · capability 协商 fail-closed
上报体 `capabilities` 缺失或为空 → 该运行时 capability 记为空数组，界面相关列显示 `—`（按最老客户端处理，不据版本推断）。

### AC-9 · 界面
「运行时」页出现「执行环境 · 自动发现」区：表列 = 机器 · CLI / 协议族 / 状态 · 心跳 / 模型目录 / 可见性 / 绑定 Agent；
无记录时空态文案说明「daemon 未上报」；刷新按钮重新拉取。

### AC-10 · 调度不受影响
心跳丢失**不**改变任何 run 状态（不取消、不判失败）——本 change 不触碰调度代码，用例断言 registry 服务不调用 run/task 相关服务。

---

## 非功能

- 上报体 < 64KB；单次请求 ≤ 200ms（不含 CLI 探测，探测在 daemon 侧）
- 表索引：`UNIQUE(machine_id, cli, protocol_family)`、`INDEX(owner_id)`、`INDEX(last_seen)`
- 迁移可逆：`019_runtime_registry` 提供 down（drop table）
