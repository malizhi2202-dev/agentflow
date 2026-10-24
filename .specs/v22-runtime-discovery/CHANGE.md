# CHANGE: 运行时发现（daemon 注册外部 AI 编码 CLI）

- **Change ID**: `v22-runtime-discovery`
- **创建日期**: 2026-10-24
- **路径建议**: 完整（跨前后端 + 新表 + 独立 daemon 进程）
- **状态**: active

---

## Why（为什么做）

设计档 §6.28「运行时发现」定义的是：**机器上的 daemon 每 15s 心跳，扫本机探测外部 AI 编码 CLI 并注册为运行时**
（一台机器 × 一个 CLI × 一个协议族 = 一个运行时），模型目录由运行时暴露，凭据留本机。

现状（本轮实测取证）：

| 事实 | 证据 |
|---|---|
| 后端没有探测代码 | 全仓 grep `discover/daemon/shutil.which` 只命中 `discover_projects`（扫项目目录） |
| 没有注册表 | `SHOW TABLES LIKE '%runtime%'` 只有 `runtime_watcher_offsets` |
| 没有接口 | `GET /api/runtimes` → 404、`GET /api/runtime/discover` → 404 |
| 现在的「运行时」页只是观测 | `pages/Runtimes.tsx` 用 summary/stats/sessions（§6.10 口径） |
| 未立项 | ROADMAP/TOPICS grep「运行时发现」零命中 |

用户裁定（2026-10-24）：「运行时没有自动发现」→ 按**完整 §6.28（daemon 多机版）** 做。

## What（做什么）

一条完整链路：**daemon（成员机器）→ 平台注册表 → 界面**。

1. **daemon 探测**（`scripts/runtime-daemon.py`，独立进程）：扫三处来源找 CLI（`AF_RUNTIME_CLI_<NAME>` 覆盖 → `PATH` → 已知安装位置），
   取版本与模型目录，每 15s 向平台 `POST /api/daemon/report` 上报（幂等 upsert，重启不重复建）。
2. **注册表**（MySQL `runtime_registry`，迁移 019）：`(machine_id, cli, protocol_family)` 唯一；
   在线/离线按 `last_seen ≤ 180s` 计算；`visibility ∈ private|public` 默认 private。
3. **接口**：`POST /api/daemon/report`（daemon 专用，token 鉴权、未配置即 fail-closed）、
   `GET /api/runtimes`（本人全部 + 任何 public）、`PUT /api/runtimes/{id}/visibility`（仅 owner，服务层判定）。
4. **界面**：「运行时」页新增「执行环境 · 自动发现」区：注册表表（机器·CLI / 协议族 / 状态·心跳 / 模型目录 / 可见性 / 绑定 Agent）、
   空态说明 daemon 未上报、刷新按钮。

**明确不做**：不接收 CLI 登录凭据（账号/OAuth/Key 留本机）；不改调度（心跳丢失**不**取消/失败 run，只改注册表状态）；
不解析 `--list-models` 之外的私有协议；不做站点间 mesh。

## 视觉调性

- **选定**：沿用既有（v20 已定调，复用 `var(--*)` tokens 与既有 panel/chip 形态）
- **理由**：本页只加一张表 + 状态 chip，不引入新视觉语言
- **参考产品**：Multica daemon/runtimes 注册表、Linear 的「machine × agent」列表
- **明确排除**：拓扑图、实时火花线、按机器分组的树——表 + chip 足够

## 影响面

- [x] 影响 `REQUIREMENT.md`（新能力，AC 见该文件）
- [x] 影响 `DESIGN.md`（新 ADR：D1–D9）
- [ ] 影响现有 AC
- [x] 影响数据模型 / 迁移（新增 `019_runtime_registry`）
- [x] 影响外部 API 兼容性（**新增**端点，不动既有 `/api/runtime/*`）
- [ ] 仅修复 bug

## 范围排除（这次不做）

- 多平台联邦 / 跨站点 mesh
- daemon 自动安装（只提供脚本 + systemd 模板，由用户显式 `enable`）
- 运行时目录锁与并发配额的实际调度执行（§6.3，属调度底座）
- 模型目录的「账号动态项」猜测（只解析 CLI 真实输出，解析不出就留空 + 原因）

## 验收线（粗粒度）

- 本机起 daemon 后，界面出现 `workstation-* · hermes / dsh` 两行（在线 + 版本 + 模型目录）
- 停 daemon ≤3 分钟后变「离线」，不删除记录
- 另一个账号看不到我的 private 运行时；置为 public 后可见
- 未配 `AF_DAEMON_TOKEN` 时上报被拒（fail-closed），不静默接收

## 风险与未知

- **CLI 探测的现实坑**：本机 `dsh` / `hermes` 都不在 PATH 上，靠配置绝对路径才存在 → 只扫 PATH 会「一个都发现不了」；daemon 必须支持已知路径与环境变量覆盖
- `--list-models` 并非所有 CLI 都支持（失败要显式「不可读」，不能假装空目录=没模型）
- daemon 是长期运行进程：需要 systemd 模板 + 重启幂等（同一机器重复上报只更新不新建）
