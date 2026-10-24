# TEST: 小队写操作授权

- **Change ID**: v20-squad-authz
- **阶段**: 5-test（2026-10-24）

## 1. 功能轮（AC 逐条）

| AC | 结论 | 覆盖 |
|---|---|---|
| AC-1 creator 可写 | ✅ | 服务层 `test_creator_can_manage`；路由层 `test_creator_can_add_member`（**用普通成员 carol 建队**后加人 200） |
| AC-2 平台管理员可写 | ✅ | `test_platform_admin_can_manage` + `test_admin_can_manage_someone_elses_squad` |
| AC-3 其他人 403 + 文案 | ✅ | `test_other_member_is_rejected`（异常类型 + 文案）；路由 `test_non_creator_gets_403_with_detail`（403 + `detail` 含"创建者或平台管理员"） |
| AC-4 读不受影响 | ✅ | `test_read_paths_are_not_gated` + `test_read_still_public`（bob 列表/详情 200） |
| AC-5 无回归 | ✅ | 见 §2 |

补充用例：「建队必须记录 creator」（`test_create_records_creator`）——实现中发现 `create_squad` 从不写
`created_by`，不修这条，AC-1 永远不可能成立。

## 2. 全量回归（真实输出）

```text
$ cd backend && ENCRYPTION_KEY=test-key-for-ci-32bytes!! /tmp/afvenv2/bin/python -m unittest discover -s tests
Ran 405 tests in 65.147s
FAILED (failures=29, errors=12, skipped=6)
$ diff 基线失败清单 / 本次失败清单
（无差异）→ 与基线 29F/12E/6S 逐条同名，0 新增红
```

## 3. 安全轮

- **拒绝面**：非 creator 的 4 个写动作全部 403（加人/移人/归档/指派）；文案统一，不泄漏额外内幕。
- **读公开**：列表/详情仍对全员可读——这是**有意**的（组织公开信息），与 Team 的"非成员 404"不同源，已在 DESIGN D2/R3 说明。
- **空白 creator**：历史数据 `created_by=""` → 仅平台管理员可写（从严），不会出现"所有人都能改"。
- **枚举面**：403 不额外暴露小队内部结构。

## 4. 兼容轮

- 无 schema / 无迁移 / 无新依赖；响应形状不变（仅多一种 403 状态）。
- **前端**：`v20-ui-teams` 已把后端 `detail` 原样显示 → 403 文案自动可见，无需改前端（本次 `git diff` 无 frontend 文件）。

## 5. 可观测轮

- 拒绝路径无新增日志/审计（与既有 403 一致）；如需审计另立 change。
- 失败信号可复现：一条命令 `unittest tests.test_squad_authz`。

## 6. 未覆盖（如实记账）

- 未做真实服务 + curl 的手工验证（路由层用 TestClient 已覆盖中间件与会话链）。
- 未做并发/压测（本 change 只加一次内存判定）。

## 🛡️ 测试门（自评轮）

```
🗳️ 测试门: TEST.md 是否通过？

   🧪 资深测试工程师: ✅ AC-1…AC-5 全有落点；creator 路径用普通成员身份验证（避免 admin 假绿）；全量 diff 为空。
   🟫 研发负责人: ✅ 两条命令可复现（目标用例 + 全量）；0 新增红有 diff 证据。
   🧑‍💼 高级产品经理: ✅ 三类角色（creator/admin/其他人）行为与故事一致。
   🧑‍🎨 资深用户体验官: ✅ 被拒有明确文案；读不被误伤。

   结果: 4/4 → 全票通过 ✅ 进入 6-review
```
