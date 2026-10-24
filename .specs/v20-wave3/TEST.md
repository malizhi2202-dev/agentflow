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

## 3. 协作层（23 条，全绿）

```
$ cd backend && /tmp/afvenv2/bin/python -m unittest tests.test_collab -v
TestWorkItem: 默认状态/类别、创建者订阅、非法参数、合法路径全链、越级/终态拒绝、
              done 无证据=警告不拦、有证据无警告、triage 正交
TestAssignAndSubscription: member 指派进箱 + 创建者自己不被打扰、agent 指派不产生成员箱、
                           退订后普通评论不进箱但 @ 穿透、退订未知用户 False
TestInboxRules: 合并键=任务（merged_count≥3）、需决策事件复活已读条目、
                规则③ in_review/done 归档失败通知且 blocked 例外、规则② 读失败上抛、
                所有权 404 与批量已读/归档、运行注册与失败通知
TestTaskRoutes: 未登录 401、创建/按 mine 列表/状态机 400、收件箱计数、
               他人任务 404（管理员 200）
Ran 23 tests — OK
```

## 4. 全量回归

```
$ cd backend && /tmp/afvenv2/bin/python -m unittest discover -s tests -p 'test_*.py'
Ran 270 tests — FAILED (failures=29, errors=12, skipped=6)   # 与基线同红
```
