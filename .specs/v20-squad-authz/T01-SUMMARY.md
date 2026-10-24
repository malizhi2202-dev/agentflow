# SUMMARY: T01 — 服务层判定（SquadForbidden + assert_can_manage_squad）

- **Change ID**: v20-squad-authz · **Task ID**: T01 · **完成时间**: 2026-10-24

## 做了什么

`team_service` 新增 `SquadForbidden`（**不**继承 `TeamError`，避免被映射成 400）与
`assert_can_manage_squad(db, squad, user)`：`_is_admin` 放行；`squad.created_by == user.id` 放行；其余拒绝。

**实现中发现的更深一层缺口**：`create_squad` 从来没有写 `created_by` → 所有小队都是"没人建的"，
按新判定只有平台管理员能动。所以本 task 一并给 `create_squad` 加 `created_by` 参数并在创建时落库
（否则"creator 可写"这条 AC 永远不可能成立）。

## 改动文件

| 文件 | 性质 | 说明 |
|---|---|---|
| `backend/services/team_service.py` | 修改 | 异常 + 判定函数 + `create_squad(created_by=...)` |

## verify 输出

```text
$ /tmp/afvenv2/bin/python -m unittest tests.test_squad_authz -v
 TestServiceGate: creator/admin/其他人被拒/空 creator 只管理员/创建记 creator/读不加门 ✔
 Ran 11 tests — OK
```
