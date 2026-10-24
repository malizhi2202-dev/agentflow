# TEST: 运行时发现（daemon 多机版）

- **Change ID**: `v22-runtime-discovery`
- **测试日期**: 2026-10-24
- **手段**: 单元（服务层+端点）· 前端用例 · 真机 daemon 实跑 · 真实 MySQL · 无头浏览器

---

## 1. 功能轮

| # | 断言 | 手段 | 结果 | 证据 |
|---|---|---|---|---|
| F1 | 幂等 upsert：同 machine×cli×protocol 只有 1 行 | 服务层双击 | ✅ | `test_report_is_idempotent` |
| F2 | 未配 token → 503；错 token → 401 | 端点 | ✅ | `test_report_without_configured_token_is_503` / `..._wrong_token_is_401` |
| F3 | 离线：`last_seen` > 180s = offline 且不删行 | 服务层改时间 | ✅ | `test_offline_after_threshold_keeps_row` |
| F4 | private 仅 owner；public 他人可见；非 owner 改 → 404 | 服务层 + HTTP | ✅ | `test_private_hidden_from_others_public_visible`、`test_visibility_non_owner_is_not_found`、`test_registry_visibility_over_http` |
| F5 | admin 不旁路 ownership | 服务层 | ✅ | `test_admin_does_not_bypass_ownership` |
| F6 | 模型目录不可读 → `models=[]` + `models_error` | 服务层 | ✅ | `test_models_error_is_explicit` |
| F7 | `bound_agents` = `agents.runtime == cli` 计数 | 服务层 | ✅ | `test_bound_agents_counts_by_cli`（hermes 2 / dsh 1） |
| F8 | 凭据类键被忽略，不落库 | HTTP + 列白名单 | ✅ | `test_credentials_are_ignored` |
| F9 | capabilities 缺失 = 空数组（按最老客户端） | HTTP | ✅ | `test_capabilities_missing_is_empty` |
| F10 | 不触调度（不 import scheduler/engine） | 源码断言 | ✅ | `test_does_not_touch_scheduling` |
| F11 | 迁移 019 幂等应用、表建立 | 真 MySQL | ✅ | `schema_migrations` 出现 `019_runtime_registry`；`SHOW TABLES LIKE 'runtime_registry'` 命中 |
| F12 | 真机 daemon 探测到本机 CLI | `scripts/runtime-daemon.py --once --dry-run` | ✅ | `探测到 2 个运行时：hermes(Hermes Agent v0.18.0 …), dsh(0.1.3-alpha.2)` |
| F13 | daemon 真上报 → 注册表 2 行、online | 真 HTTP + MySQL | ✅ | `上报成功：registered=2`；`runtime_registry` 2 行（private / owner=admin） |
| F14 | 界面区块渲染 + 可见性切换 | 无头浏览器 | ✅ | 2 行「● 在线 / 不可读：… / 私有 · 仅我」；`置为公开 → 公开 · 只共享路由权 → 收回私有`；5xx 无 |

## 2. 门禁

| 门 | 命令 | 结果 |
|---|---|---|
| 后端全量 | `python -m unittest discover -s tests` | **Ran 560 tests · OK (skipped=6)** · 0 FAIL/ERROR |
| 本 change 用例 | `python -m unittest tests.test_runtime_registry` | **17 passed** |
| 前端全量 | `npx vitest run` | **15 files / 130 tests passed** |
| 类型 | `npx tsc --noEmit` | **exit 0** |
| 构建 | `npm run build` | **✓ built in 21.33s** |

## 3. 性能 / 安全 / 兼容 / 可观测

| 轮次 | 结论 |
|---|---|
| 性能 | 上报体小（本机 2 条 CLI ≈ 1KB）；`GET /api/runtimes` 单表 + 一次 `count`（按 cli 缓存）；模型探测在 daemon 侧且 10min 缓存，不压平台 |
| 安全 | daemon 只能写注册表、不能读他人数据；token 用 `hmac.compare_digest`；未配置即 503；凭据键白名单忽略；非 owner 404；未开 shell（daemon 只读 stdout） |
| 兼容 | 只**新增**端点与表，既有 `/api/runtime/*` 与前端旧区块零改动 |
| 可观测 | 每轮一行日志（探测数 / 上报结果 / 退避秒数）；注册表带 `last_seen` 绝对时间 |

## 4. 回归登记

- 本 change 触碰文件：`migrations.py`(019) · `models/runtime_registry.py` · `services/runtime_registry.py` · `routes/{daemon,runtimes}_api.py` · `main.py`（放行+挂载）· `config.py` · `scripts/runtime-daemon.py` · `deploy/systemd/user/af-runtime-daemon.service.in` · `README.md` · `frontend/src/{stores/runtimes.ts,pages/Runtimes.tsx}` · 两份新用例
- 未触碰：调度/引擎/`runtime_exec`/`runtime/adapters`（AC-10 有用例守）
- 环境：`agentflow-data/agentflow.env` 追加 `AF_DAEMON_TOKEN`（随机生成，**未写入仓库**）
