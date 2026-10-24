# TEST · v20-wave7

## 1. A2A M0 静态卡（6 条，全绿）

```
$ cd backend && ENCRYPTION_KEY=test-key-for-ci-32bytes!! /tmp/afvenv2/bin/python -m unittest tests.test_a2a_card -v
TestCardShape: M0 形状 + capabilities 三项全 false（M2 冻结如实）· 白名单无凭据/无提示词/无 model_config ·
               归档态 status 如实
TestCardRoute: 未认证 401 · owner 可读自己的卡 · 他人 Agent 与不存在同 404
Ran 6 tests — OK
```

## 2. RSI 补列与开关（16 条，全绿；老 18 条不回归）

```
$ /tmp/afvenv2/bin/python -m unittest tests.test_rsi_governance tests.test_rsi -v
TestCausalPrefix: cites_seq=5/source_seq=5 拒绝（因果前缀）· cites<source 通过 · 双方 0 不校验
TestPromotionReview: no_entry 也落评审账（fields_complete=false, note 含缺字段）· promoted→verdict=helped ·
                     reviewer 落库 · 可按 memory 查评审历史
TestPollutionScan: 金标标记 → 强制 confounded + pollution_flagged + post_ingest_scan · 干净证据不标记
TestCategorySwitches: 缺行=运行中 · memory 暂停后 propose 409 · orchestration 暂停后提案与发布 409 ·
                     恢复后可再提 · 四类之外（code）无开关可开
TestSwitchRoute: 非管理员 403 · 管理员暂停写审计「自动体已暂停」· 列表暴露四类
Ran 34 tests — OK
```

## 3. 归因双列（15 条，全绿）

```
$ /tmp/afvenv2/bin/python -m unittest tests.test_attribution -v
TestWaterfall: member 自身即 originator · agent 沿任务找 creator · 子任务优先自身 creator（不跨父） ·
               任务不存在 fail-closed · agent 无任务上下文拒绝 · 动作者空拒绝 · 未知类型拒绝
TestTaskColumns: 双列落库 · accountable 可不同于 originator · 空创建者拒绝 · 运行继承任务归因 ·
                 存量行两列为空串（零回填）
TestTaskRoute: 成员代他人记 accountability 403 · 管理员可且响应含双列 · 缺省 accountable=自己
Ran 15 tests — OK
```

## 4. 迁移（全新库）

```
[migrate] 已应用 15 个迁移: 001…015
tables: 49
applied: 15 ['013_…', '014_rsi_review_and_switches', '015_attribution_columns']
memories      -> ['source_seq', 'cites_seq', 'pollution_flagged', 'post_ingest_scan']
promotion_reviews -> ['verdict', 'pollution_scan']
rsi_switches  -> ['enabled']
work_items    -> ['originator_id', 'accountable_id']
work_item_runs-> ['originator_id', 'accountable_id']
[migrate] 无待应用迁移        # 二次 init_db 追加 0 个
```

## 5. 全量回归

```
$ cd backend && /tmp/afvenv2/bin/python -m unittest discover -s tests
Ran 391 tests in 59.181s
FAILED (failures=29, errors=12, skipped=6)
```

与基线 **29F/12E/6S 逐条同名同数**（`diff` 失败清单为空）→ **0 新增红**。新增 37 条用例全部绿。

## 6. 顺带修掉的既有红

- `test_auth_sessions` 曾在「仓库里没有已迁移库」时 2 errors（`/api/admin/workflow` 读 `change_log` 而该用例没接自己的内存库）。
  修法：把该用例的 DB 也覆盖到内存库（与 `users.json` / `audit.jsonl` 同一隔离强度），不改产品代码、不掩盖错误。
  修后 `Ran 27 tests — OK`。
