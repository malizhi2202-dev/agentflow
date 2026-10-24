# SUMMARY: T03 — 用例 + 全量回归

- **Change ID**: v20-squad-authz · **Task ID**: T03 · **完成时间**: 2026-10-24

## 做了什么

新增 `backend/tests/test_squad_authz.py`（11 条）：6 条服务层 + 5 条路由层（真实 app + 登录）。
路由层特意用**普通成员 carol 建队**再验证，避免"用 admin 测 creator 路径"这种假绿。

## 改动文件

| 文件 | 性质 | 说明 |
|---|---|---|
| `backend/tests/test_squad_authz.py` | 新增 | 11 条用例 |

## verify 输出（真实粘贴）

```text
$ /tmp/afvenv2/bin/python -m unittest tests.test_squad_authz tests.test_teams
Ran 29 tests — OK

全量（见 TEST.md §2）：与基线同红，0 新增红
```
