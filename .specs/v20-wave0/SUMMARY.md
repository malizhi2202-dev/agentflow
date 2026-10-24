# SUMMARY: v20-wave0 — 波 0 止血（P0-4 / P0-6 / P0-7 / P0-8）

- **Change ID**: v20-wave0
- **Task ID**: T-01…T-04（本文件按 change 归并，逐任务明细见 `TASK.md`）
- **完成时间**: 2026-10-24（提交 `d2ee8d96` `8d3fdc1d` `24c38aa1`）
- **AI 角色**: Dev
- **补记说明**: 本 SUMMARY 在 7-integration 阶段补齐（原 4-dev 未落盘 · 漂移 D4-1）

## 做了什么

三件事把项目从「没有生产构建、无迁移账本、阶段模型散落 12 文件」拉回可交付态：
① 清零 32 个 TS 错误，`npm run build` 首次通过；② `backend/migrations.py` 版本化迁移账本（一行一版、幂等、失败即抛）替换 `init_db` 里 5 段内联静默 ALTER；③ `backend/stage_config.py` 成为阶段模型单一事实源，两份 scanner 合一，`/api/admin/workflow` 加校验与热更新，前端 `stores/stageConfig.ts` 接 6 个消费者。P0-5（node_modules 跟踪）按用户决定只记账不做。

## 改动文件（关键）

| 文件 | 性质 | 说明 |
|---|---|---|
| `backend/migrations.py`、`backend/database.py` | 改写 | 迁移账本 + `init_db` 走账本 |
| `backend/tests/test_migrations.py` | 新增 | 迁移幂等/失败即抛 |
| `backend/stage_config.py`、`backend/scanner.py`、`backend/runtime/scanner.py` | 新增/改写 | 阶段单一事实源 + 扫描器合一 |
| `backend/routes/admin_api.py`、`change_detail.py` | 修改 | PUT 校验 + 热更新 |
| `frontend/src/stores/stageConfig.ts` + 6 个消费组件 | 新增/修改 | 前端接同一真源 |
| `frontend/src/{ChatWindow,AgentBuilder,ProjectDetail,ToolMarket,WorkflowCreate,...}` | 修改 | 32 个 TS 错误清零 |

## verify 输出（本轮 7-integration 复跑）

```text
$ cd backend && /tmp/afvenv2/bin/python -m unittest tests.test_migrations tests.test_stage_config -v
（含在上句 217 用例批次中，全部 OK）

$ 16 个波次相关模块同批：Ran 217 tests in 39.809s — OK
$ cd frontend && npm run build → ✓ built in 15.08s
$ cd frontend && npx vitest run → Test Files 6 passed, Tests 57 passed
```

## 已知接受 + 理由

- **T-05 `system_prompt/role_def/sop` 后端不落库**：只在创建时传给 LLM，未落库 → 编辑后丢失。**未修**，登记在 STATE「下一步」；理由：属功能缺口而非止血项，需产品确认字段归属（Agent 还是 CustomRole）。
- **P0-5 仓库卫生**：用户 10-24 明确「只记账不做」。
