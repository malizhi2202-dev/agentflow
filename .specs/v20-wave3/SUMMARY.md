# SUMMARY: v20-wave3 — 波 3 协作层最小集（P1-16 / P1-4）

- **Change ID**: v20-wave3
- **Task ID**: T-01（P1-16 告警落表 + 双队列并表）/ T-02（P1-4 任务与收件箱）
- **完成时间**: 2026-10-24（提交 `57945f50` `67420190`）
- **AI 角色**: Dev
- **补记说明**: 7-integration 阶段补落（漂移 D4-1）

## 做了什么

① **P1-16**：告警从「进程内环形 500 条」改为落 `alerts` 表（去重查库、确认记人、不再裁剪）；`scheduling_queue` 与 `scheduler_queue` 并表（六状态映射搬入，`kind='orchestration_instance'`，旧表删除）。
② **P1-4**：`work_items`（`status` 四类 + `blocked` 与 `triage_state` 正交 / 负责人三轨 / done 证据建议层）+ `work_item_runs` 连接表 + 订阅（只增不减、@ 穿透）+ 收件箱三规则（action_required 分组 / 读失败上抛 / 交还给人自愈归档，`blocked` 例外，合并键=任务本身）。API：`/api/tasks` 8 端点 + `/api/inbox` 6 端点，越权统一 404。

## 改动文件（关键）

| 文件 | 性质 | 说明 |
|---|---|---|
| `backend/models/alert.py`、`backend/services/alert_service.py` | 新增/改写 | 告警落表 + 去重/确认 |
| `backend/models/collab.py` | 新增 | `work_items` / `work_item_runs` / 订阅 / 收件箱 |
| `backend/services/collab_service.py` | 新增 | 状态机、指派、订阅、收件箱三规则 |
| `backend/routes/tasks_api.py`、`inbox_api.py` | 新增 | 14 个端点 |
| `backend/migrations.py` | 修改 | 008 并表 / 009 协作四表 |
| `backend/tests/test_alerts_and_queue.py`、`test_collab.py` | 新增 | 6 + 23 用例 |

## verify 输出（本轮复跑）

```text
$ 16 个波次相关模块同批：Ran 217 tests in 39.809s — OK（含 test_alerts_and_queue / test_collab）
```

## 已知接受 + 理由

- **任务评论正文未落表**：评论仍走会话/消息既有链路，未单独建表 → `@` 穿透与合并键目前只对收件箱生效。
- **看板/收件箱前端页面未做**：按「先表与校验，再上界面」策略延后（见 STATE 下一步 ①）。
