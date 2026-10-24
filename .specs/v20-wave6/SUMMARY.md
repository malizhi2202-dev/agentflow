# SUMMARY: v20-wave6 — 波 6 RSI 产物治理（R6 / R7）

- **Change ID**: v20-wave6
- **Task ID**: T-01（记忆四层晋升门）/ T-02（提案制三权分离）/ T-03（可改面）/ T-04（四熔断）
- **完成时间**: 2026-10-24（提交 `64e44de6`）
- **AI 角色**: Dev（并行会话交付，本轮由主 agent 复核并补列补扫）
- **补记说明**: 7-integration 阶段补落（漂移 D4-1）

## 做了什么

把 RSI 设计结论从「文档」变「状态转换层门禁」：记忆四层（L1/L2/L3，L0 由会话表承载）+ 三字段（cue/lesson/evidence）缺一即 `no_entry` + `confounded` 为拿不准默认 + 检疫/衰减；提案三权分离（生成限步限钱 → 探针**永不作发布依据** → 影子重放要求冻结金标 + 异厂 judge → **人批**发布，领域类需会签）；可改面声明对象（`scripts/plugins/hooks` 永久禁改、代码层 RSI 禁止、路径穿越拒绝）；四熔断 + NOISE FLOOR。迁移 013。

## 改动文件（关键）

| 文件 | 性质 | 说明 |
|---|---|---|
| `backend/models/rsi.py` | 新增 | `memories` / `orchestration_proposals` / `surface_manifests` / `breaker_states` + 常量 |
| `backend/services/rsi_service.py` | 新增 | 晋升门、检疫、衰减、可改面、提案状态机、熔断 |
| `backend/routes/rsi_api.py` | 新增 | 记忆 / 提案 / 可改面 / 熔断；publish 与熔断限管理员 |
| `backend/migrations.py` | 修改 | 013 四表 + 索引 |
| `backend/tests/test_rsi.py` | 新增 | 18 用例 |

## verify 输出（本轮复跑）

```text
$ 16 个波次相关模块同批：Ran 217 tests in 39.809s — OK（含 test_rsi 18）
$ 全新库 init_db()：含 013 · tables: 49
```

## 已知接受 + 理由

- **执行器未做**：金标数据集本体、judge 模型调用、影子重放跑批都不在治理契约内 → 数据由调用方传入（ALIGNMENT 记为需裁决/后续 change）。
- **模型权重类 RSI（S19）**：无训练面，只留治理位。
- **记忆中心 / 提案抽屉前端未做**：先表与校验。
- 波 7 已补齐本波遗留的三列/两表（`source_seq`/`cites_seq`/`pollution_flagged`/`post_ingest_scan` + `promotion_reviews`/`rsi_switches`）。
