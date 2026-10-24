# T-08 · 五条小项 —— 完成

- **Change**: v21-completion · 2026-10-24
- **结论**：五条全部落地，每条都有可跑用例；其中 **3 条是行为修正（不是补界面）**，见下表「实质变化」。

## 逐项

| # | 项 | 实质变化 | 证据 |
|---|---|---|---|
| 1 | 域策略界面 | 新组件 `components/DomainPolicyCard.tsx`（从控制面页抽出可单测）：读 `GET /api/domains/{id}/attribution-policy`、选三档 → `PUT`；后端拒绝时 detail 原样回显。挂在隔离域展开区（具名域才显示，默认域无策略） | 前端 3 例（读回显 / PUT 打对值 / 400 不谎报成功） |
| 2 | surface 编辑/删除 | 新增 `PUT /api/rsi/surfaces/{id}`、`DELETE /api/rsi/surfaces/{id}`（仅管理员；不存在 **404** 而不是混进 400）+ 服务层 `update_surface/delete_surface`；记忆中心提案 tab 增加「已有可改面」表格（编辑白名单/删除） | 后端 4 例（非管理员 403 / 更新白名单 / 非数组 400 / 删除后 404）+ 前端 1 例（PUT 与 DELETE 各打对端点） |
| 3 | trip 审计 | 手动熔断/复位此前**不落审计**（有后果的动作为 0 留痕）。补 `_audit()`（审计失败不阻断业务），并把 `audit_service._audit_file()` 改为复用 `auth._audit_file()`——原来两处各算一遍路径，打桩只影响一处 | 后端 2 例（trip+reset 均入审计 / 非管理员 403 且不留痕） |
| 4 | squad 指派任务 | **行为修正**：`POST /api/tasks/{id}/assign` 收到 `assignee_kind=squad` 以前只是把负责人字段写成 squad（任务落到小队就没人接）。现改为走 `team_service.assign_task_to_squad`：给 leader 入队一条 leader 任务（重复指派去重、归档小队 400、不存在 404） | 后端 5 例（创建 leader 任务 / 去重 / 归档拒 / 不存在 404 / member 指派不产生 leader 任务） |
| 5 | 团队页 Tabs 方向键 | 团队/小队两个 tab 加 roving tabindex + ←/→/Home/End 切换并聚焦（与记忆中心一致） | 前端 1 例（初始 tabindex、→ 切到小队、Home 回到团队） |

## 实测

```text
$ cd backend && /tmp/afvenv2/bin/python -m unittest discover -s tests
Ran 499 tests in 134.848s          （T-05 基线 488 → +11）
OK (skipped=6)

$ cd frontend && npx tsc --noEmit && npx vitest run
Test Files 12 passed (12)          （T-05 基线 11 → +1）
Tests 109 passed (109)             （T-05 基线 104 → +5）
```

## 教训

- `audit_service` 与 `auth` 各算一遍审计路径 → 测试打桩只影响一半，写出来的审计"看起来有、其实在别处"。
  **落盘路径要有单一来源**，否则测试与生产会分叉。
