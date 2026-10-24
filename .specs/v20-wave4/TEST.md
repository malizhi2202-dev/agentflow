# TEST · v20-wave4

## 1. 团队与小队（19 条，全绿）

```
$ cd backend && /tmp/afvenv2/bin/python -m unittest tests.test_teams -v
TestTeamMembers: 创建即建 owner 成员行 / slug 规则与冲突(409) / 成员生命周期与配额 /
                 owner 不可移除、role=owner 只能转让 / 转让需 confirm 且新 owner 须为成员 /
                 非成员 404（管理员可过）/ 归档后拒绝加成员
TestAssets: 挂载改 team_id+owner_kind 而 owner_id 不动 / 幂等重挂 / 释放回个人 /
            不能挂他人资产 / 不能挂已属别团队的资产 / max_agents 配额 /
            未知类型与不存在资产 / 五类清单与计数
TestSquad: leader 必须存在且未归档(409) / slug 冲突 / 成员池去重与 kind 校验 /
           归档语义（leader_bound 409、归档后拒加成员）/ 指派生成 leader 任务并去重 /
           指派门（任务不存在 404、小队归档后拒绝）/ Squad 无 team_id
TestTeamRoutes: 非成员 404 + 成员/管理员 200 / 归档 leader → 创建小队 409
Ran 19 tests — OK
```

## 2. 迁移 010（老库 + 裸库 + 幂等）

```
applied tail: ['008_alerts_and_queue_merge', '009_collab_layer', '010_teams_and_squads']
teams: True  squads: True
agents 新列: ['team_id', 'owner_kind']
存量行: [('alice', 'a1', 'personal')]      ← 零回填，team_id 为空
idempotent: []
```

## 3. 全新库 init_db

```
[migrate] 已应用 10 个迁移: 001…010
[migrate] 无待应用迁移        ← 幂等
tables: 41
```

## 4. 全量回归

```
$ cd backend && /tmp/afvenv2/bin/python -m unittest discover -s tests -p 'test_*.py'
Ran 312 tests — FAILED (failures=29, errors=12, skipped=6)   # 与基线同红，0 新增红
```

> 过程中抓到并修掉一个真实问题：`create_index_if_missing` 在「表不存在/列不齐」时会抛
> `no such column`，导致 `test_migrations` 的裸库用例与并表迁移用例报错（6 个新红）。
> 修法：索引创建前先检查表与列，半截 schema 跳过而不是炸迁移。
