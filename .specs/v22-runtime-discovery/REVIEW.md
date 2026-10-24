# REVIEW: 运行时发现（daemon 多机版）

- **Change ID**: `v22-runtime-discovery`
- **审查时间**: 2026-10-24
- **审查者**: AI（Reviewer，完整链 5-test → 6-review）
- **总体结论**: **通过**（含 2 条遗留登记，不阻塞）

---

## 第一轮 · Spec 合规

| 检查项 | 结果 | 证据 |
|---|---|---|
| AC-1…AC-10 全部实现 | ✅ | `TEST.md` F1–F10 逐条对应 |
| 每条 AC 有测试 | ✅ | `backend/tests/test_runtime_registry.py`（17）+ `frontend/src/__tests__/runtime-discovery.test.tsx`（7） |
| 未越出 DESIGN 触碰清单 | ✅ | 实际改动 = DESIGN §0.5.1 列举的文件；未触碰禁动清单（调度/引擎/runtime_exec/adapters 有用例守） |
| 未范围蔓延 | ✅ | 未做多机 mesh、daemon 自动安装、目录锁调度 |

## 第二轮 · 质量 6 维

| 编号 | 风险 | 结论 | 说明 |
|---|---|---|---|
| R1 | 认知过载 | 🟢 | 一条链路三段（daemon → 注册表 → 界面），每段职责单一；端点只有 3 个 |
| R2 | 变更传播 | 🟢 | 判定单点在 `services/runtime_registry.py`；路由不复制规则 |
| R3 | 知识重复 | 🟢 | 离线阈值/可见性/白名单各只一处；前端只渲染不判定 |
| R4 | 偶然复杂 | 🟢 | 无新依赖；daemon 单文件；`single report endpoint` 避免 register/heartbeat 两阶段 |
| R5 | 隐式契约 | 🟡 已记 | `AF_DAEMON_OWNER` 决定归属（不接受上报体自称 owner）——README 与 config 注释都写了；若将来要「一台机器多用户」需改协议 |
| R6 | 不可逆 | 🟢 | 迁移 019 可 down（drop table）；表为空时前端空态 |

## 第三轮 · 安全专项

- ✅ daemon token 未配置 → 503；错 token → 401；`hmac.compare_digest`
- ✅ 凭据键（token/api_key/password/account）被忽略且无对应列（用例把整行序列化后 grep 断言）
- ✅ 越权改可见性 → 404（与「不存在」同码）
- ✅ daemon 只读 `--version` / `--list-models` stdout，不经 shell
- ⚠ **部署面提醒**：`AF_DAEMON_TOKEN` 目前写在 `agentflow-data/agentflow.env`（600 权限、未被 git 跟踪）；**不要**写进仓库或 README 示例

## 遗留（不阻塞）

1. **多机未验证**：本机单机跑通；「3 台机器在线 / 离线 ≤3 分钟」的多机场景需要第二台机器才能实测（协议已按 machine_id 设计，用例用不同 machine_id 覆盖了分组合并）。
2. **模型目录**：本机 hermes/dsh 都不支持 `--list-models`，因此界面显示「不可读 + 原因」（符合 AC-5）；具体可读模型的解析路径尚未被真实 CLI 验证过。
3. **daemon 未装成常驻服务**：`deploy/systemd/user/af-runtime-daemon.service.in` 已提供模板，但本轮只做了 `--once` 真上报（未 `enable`），需要用户显式安装。

## 结论

通过。建议提交；上述 3 条遗留建议进 `TOPICS.md`（多机联调 / 模型目录真实解析 / daemon 安装引导）。
