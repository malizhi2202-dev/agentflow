# TASK: 后端遗留三项收口

## 波次
```
Wave 1: T01 域策略（迁移 016 + 模型 + 解析）
Wave 2: T02 影子重放 runner
Wave 3: T03 L0 抽取器
Wave 4: T04 用例 + 全量回归
```

## 任务
| id | name | write_files | verify | auto |
|---|---|---|---|---|
| T01 | 域策略表 + resolve_accountable + API | `models/attribution.py` `models/__init__.py` `services/attribution.py` `routes/domain_api.py` `migrations.py` | `unittest tests.test_domain_policy` | ✅ |
| T02 | shadow_runner + 端点 | `services/shadow_runner.py` `routes/rsi_api.py` | `unittest tests.test_shadow_runner` | ✅ |
| T03 | l0_extractor + 端点 | `services/l0_extractor.py` `routes/rsi_api.py` | `unittest tests.test_l0_extractor` | ✅ |
| T04 | 三组用例 + 全量 | `tests/test_{domain_policy,shadow_runner,l0_extractor}.py` | `unittest discover` 与基线同红 | ✅ |

## Task 门（自评轮）
| task | 研发 | 测试 | 安全 | 结论 |
|---|---|---|---|---|
| T01 | ✅ | ✅ 6 例 | ✅ fail-closed + admin 门 | 3/3 `true` |
| T02 | ✅ | ✅ 5 例 | ✅ 标 exact_match 不冒充 | 3/3 `true` |
| T03 | ✅ | ✅ 5 例 | ✅ 默认 dry_run / 越权 404 | 3/3 `true` |
| T04 | ✅ | ✅ 全量 diff | ✅ 无新增外调 | 3/3 `true` |
