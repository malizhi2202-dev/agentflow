# TEST · v20-wave3（P1-16 部分）

## 1. 告警落表（5 条）

```
$ cd backend && /tmp/afvenv2/bin/python -m unittest tests.test_alerts_and_queue -v
test_add_and_list           写入即可查、metadata 原样
test_dedupe_open_alerts     未确认同题去重；确认后允许再记
test_ack_single_and_all     单条/全部确认、记录操作人、未知 id 返回 False
test_filters                按 type / severity / acknowledged 过滤
test_detection_dedupes_against_db  检测第二轮不再重复写（查库去重）
Ran 6 tests — OK
```

## 2. 并表迁移（1 条，含幂等）

```
旧库 scheduling_queue 六行（queued/scheduled/executing/completed/evicted/failed）
→ scheduler_queue: kind=orchestration_instance, instance_id/priority 保留
→ 状态: queued, queued, leased, done, failed, failed
→ scheduling_queue 已删；alerts 表已建；apply_migrations 第二次返回 []
```

## 3. 全量回归

```
$ cd backend && /tmp/afvenv2/bin/python -m unittest discover -s tests -p 'test_*.py'
Ran 270 tests — FAILED (failures=29, errors=12, skipped=6)   # 与基线同红
```
