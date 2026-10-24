# TASK: RSI 适配器
| id | name | write_files | verify | auto |
|---|---|---|---|---|
| T01 | judge 适配器 | `services/judge_adapter.py` `config.py` | `unittest tests.test_judge_adapter` | ✅ |
| T02 | runner 支持 scorer + 路由 judge 模式 + 错误映射 | `services/shadow_runner.py` `routes/rsi_api.py` | `unittest tests.test_shadow_runner` | ✅ |
| T03 | L0 定时作业 + 循环 | `services/l0_job.py` `main.py` | `unittest tests.test_l0_job` | ✅ |
| T04 | 全量回归 | — | `unittest discover` 与基线同红 | ✅ |
Task 门：研发 ✅ 测试 ✅ 安全 ✅（默认关闭/预算帽）→ 3/3
