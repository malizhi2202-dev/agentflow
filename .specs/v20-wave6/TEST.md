# TEST · v20-wave6

## 1. RSI 治理（18 条，全绿）

```
$ cd backend && /tmp/afvenv2/bin/python -m unittest tests.test_rsi -v
TestMemoryPromotion: 三字段缺一 → no_entry（行留档）/ 拿不准默认 confounded /
                     弱证据强制 confounded / 层级与 kind 校验 / 负知识合法 /
                     来源撤回检疫且不进衰减队列
TestSurfaceGate: scripts·plugins·hooks 永久禁改 / backend 与 frontend/src 代码层禁止 /
                 白名单命中、路径穿越拒绝、未知 surface 拒绝
TestProposalThreeWay: 预算上下界 / Probe 后 publish 被拒（409 语义）/ 探针超步 →
                     blocked + steps 熔断 open + 新建提案被拒 / 影子缺金标或异厂拒绝 /
                     低于噪声地板 → collapsed + collapse 熔断 /
                     非管理员 publish 拒绝、管理员通过并记 approved_by /
                     domain 维度缺会签拒绝、会签后通过 / 维度校验 / 熔断复位 half_open
Ran 18 tests — OK
```

## 2. 全新库迁移

```
[migrate] 已应用 13 个迁移: 001…013
[migrate] 无待应用迁移
tables: 47
```

## 3. 全量回归

```
$ cd backend && /tmp/afvenv2/bin/python -m unittest discover -s tests -p 'test_*.py'
Ran 354 tests — FAILED (failures=29, errors=12, skipped=6)   # 与基线同红，0 新增红
```
