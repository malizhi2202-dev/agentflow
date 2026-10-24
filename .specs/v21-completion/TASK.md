# TASK: v21 收口程序

## 波次
```
Wave 1: T-01（已完成）
Wave 2: T-02 → T-03（真实执行 + 修基线红）        ← 代码质量优先
Wave 3: T-04（测试基建）→ T-06（a11y/多用户/多副本/down）
Wave 4: T-05（前端四页补齐）→ T-08（小项）
Wave 5: T-07（users/audit 表化）→ 收口（S-align/UAT）
```

## 任务台账（进度即事实，每完成一项就地更新）
| # | 项 | 状态 | verify（命令） |
|---|---|---|---|
| T-01 | 人设三件落库 | ✅ done | `unittest tests.test_agent_prompt_persist` 4 绿；SQLite/MySQL 迁移 017 各一次 |
| T-02 | Agent 真实运行时执行 | ✅ done | `unittest tests.test_runtime_exec tests.test_chat_runtime` 12 绿；hermes 7.4s / dsh 3.7s 真跑回 '1' |
| T-03 | 修 41 条基线红 | ✅ done | `unittest discover` → **Ran 477 — OK (skipped=6)**（基线 29F/12E） |
| T-04 | 测试基建（CI/覆盖率/E2E 接脚本/hermes/L0 循环） | ✅ done | `bash scripts/ci.sh --with-coverage` 全绿；E2E dsh/hermes 各 13/13；`T-04-SUMMARY.md` |
| T-05 | 前端四页（automations/runtimes/replay/board） | ✅ done | 三新页 + 看板核实已有；后端 488 OK / 前端 104 例 / E2E 16/16（`T-05-SUMMARY.md`） |
| T-06 | a11y/多用户/多副本/down 迁移 | pending | axe + 双实例 + down 用例 |
| T-07 | users/audit 表化 | pending | 迁移 + 兼容用例 |
| T-08 | 小项五条 | ✅ done | 后端 499 OK（+11）/ 前端 109 例（+5）；3 条是行为修正（`T-08-SUMMARY.md`） |
