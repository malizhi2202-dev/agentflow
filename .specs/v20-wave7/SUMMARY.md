# SUMMARY: v20-wave7 — 波 7 设计遗留项收口（R4-2 / R6-4 / R7-4 / R7-5 / R8-2）

- **Change ID**: v20-wave7
- **Task ID**: T-01（A2A M0 静态卡）/ T-02（RSI 补列与开关）/ T-03（归因双列）/ T-04（收口）
- **完成时间**: 2026-10-24（提交 `13faefbe`）
- **AI 角色**: Dev（主 agent）

## 做了什么

把 `RULINGS.md` 里仍标「未实施」的四条现行口径补成代码：
① **A2A M0 静态 AgentCard**：`GET /api/a2a/agents/{id}/card`，白名单字段（无 api_key / 无 gate 提示词 / 无 model_config），capabilities 三项 false 表示 **M2 冻结**，越权与不存在同 404。
② **R7-4 因果前缀**：`memories` 补 `source_seq` / `cites_seq`，`cites_seq >= source_seq` 即拒（防未来信息回灌）；新增 `promotion_reviews` 晋升评审账（`no_entry` 也记）。
③ **R7-5 防污染双扫**：晋升前扫命中金标/评测标记 → 强制 `confounded` + `pollution_flagged`；入库后记 `post_ingest_scan`。
④ **R6-4 四类开关**：`rsi_switches`（memory/skill/orchestration/model），关闭即「自动体已暂停」，在 `propose_memory` / `create_proposal` / `publish` **三处状态转换层**独立判定 + 审计；四类之外没有开关。
⑤ **R8-2 归因双列**：任务/运行各加 `originator_id`（只鉴权）/ `accountable_id`（只审计成本），归属瀑布沿 `parent_id` 找链顶人类，读不出即 fail-closed；代记账需管理员。迁移 014/015。

## 改动文件（关键）

| 文件 | 性质 | 说明 |
|---|---|---|
| `backend/services/agent_card.py`、`routes/a2a_api.py` | 新增 | M0 静态卡 + 只读端点 |
| `backend/services/attribution.py` | 新增 | 归属瀑布 + fail-closed |
| `backend/models/rsi.py`、`services/rsi_service.py`、`routes/rsi_api.py` | 修改 | 四列 + 两表 + 三处开关判定 + 双扫 |
| `backend/models/collab.py`、`services/collab_service.py`、`routes/tasks_api.py` | 修改 | 双列 + 创建/运行落归因 + 代记账权限 |
| `backend/migrations.py` | 修改 | 014（RSI）/ 015（归因） |
| `backend/tests/{test_a2a_card,test_rsi_governance,test_attribution}.py` | 新增 | 6 + 16 + 15 用例 |
| `backend/tests/test_auth_sessions.py` | 修改 | 修掉「依赖环境恰好有已迁移库」的隐式依赖 |

## verify 输出（必填 · 真实粘贴）

```text
$ /tmp/afvenv2/bin/python -m unittest tests.test_a2a_card tests.test_rsi_governance tests.test_rsi tests.test_attribution -v
Ran 55 tests in 11.310s — OK

$ 16 个波次相关模块同批：Ran 217 tests in 39.809s — OK
$ 全量 discover：Ran 391 tests in 76.433s — FAILED (failures=29, errors=12, skipped=6)
  → 与登记基线 29F/12E/6S 逐条同名（diff 为空），0 新增红
$ 全新库 init_db()：[migrate] 已应用 15 个迁移 · tables: 49 · 二次「无待应用迁移」
```

## 已知接受 + 理由

- **A2A M1/M2 未做**：R4-2 明确冻结任务协商/流式/推通知。
- **域策略表未做**：归因的「域策略 fail-closed」当前=「显式传入或 =originator，读不出即拒」，策略存储待域能力。
- **卡片 `endpoints.invoke` 指向站内 `/api/agents/{id}/run`**：M0 不提供 A2A 协议端点，写明而不冒充。
