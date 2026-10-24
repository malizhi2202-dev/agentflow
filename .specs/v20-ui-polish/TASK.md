# TASK: 遗留小项收口
| id | name | write_files | verify | auto |
|---|---|---|---|---|
| T01 | 熔断手动 trip | `frontend/src/pages/Memory.tsx` | `vitest run src/__tests__/memory-page.test.tsx` | ✅ |
| T02 | Tabs 方向键 + roving | 同上 | 同上 | ✅ |
| T03 | surface 新建表单（admin） | `Memory.tsx` `stores/rsi.ts` | 同上 | ✅ |
| T04 | 小队 creator 回填脚本 | `backend/scripts/backfill_squad_creator.py` `backend/tests/test_backfill_squad_creator.py` | `unittest tests.test_backfill_squad_creator` | ✅ |
Task 门（自评）：研发 ✅ 测试 ✅ 安全 ✅（admin 门 / dry-run 默认）→ 3/3 `true`
