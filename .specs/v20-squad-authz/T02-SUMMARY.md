# SUMMARY: T02 — 路由接线（4 个写端点 + 建队记 creator）

- **Change ID**: v20-squad-authz · **Task ID**: T02 · **完成时间**: 2026-10-24

## 做了什么

`routes/teams_api.py`：

1. `_map_error` 追加 `SquadForbidden → 403`（在 `TeamError → 400` 之前判断，否则会被 400 吃掉语义）。
2. 四个写端点接入判定：加成员、移成员、归档、指派任务。
3. `create_squad` 传 `created_by=user["id"]`（授权来源落库）。
4. **读端点不动**（列表/详情对全员可见）。

## 改动文件

| 文件 | 性质 | 说明 |
|---|---|---|
| `backend/routes/teams_api.py` | 修改 | 映射 + 5 处调用（4 写 + 建队记 creator） |

## verify 输出

```text
$ /tmp/afvenv2/bin/python -m unittest tests.test_squad_authz -v
 TestRouteGate: 非 creator 403+detail / creator 200 / 管理员 200 / 读仍 200 / 归档与指派 403 ✔
 Ran 11 tests — OK
```
