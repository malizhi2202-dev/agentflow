# CHANGE · v20-wave7 —— 设计遗留项收口（P1-15 / R7-4 补列 / R8-2）

> 来源：`RULINGS.md` 中仍标「未实施」的现行口径 —— **R4-2**（A2A 只做 M0 静态 AgentCard，M2 冻结）、
> **R7-4**（晋升三字段 + `confounded` 默认 + `NO_ENTRY` 合法 + **因果前缀 `source_seq`**）、
> **R7-5**（防腐四件：金标防污染闸，晋升前 + 入库后各一次）、**R8-2**（归因 `originator` ⟂ `accountable` 双列 + 归属瀑布 + 域策略 fail-closed）。
> 主档落点：§1.6.2 P1-15 · §6.30 A/B · §7 归因瀑布段 · §3.3 列级注。
> 路由：**压缩路径**（0→3→4→6）。
> 前置：波 4 团队（归属）、波 6 RSI 治理（晋升门与提案制已落地）。

## 一句话

波 0–6 把 §1.6.0 的六个波次做完了，但 `RULINGS.md` 里还有三条现行口径只有设计、没有代码：
**A2A 静态卡**（对外发现面）、**因果前缀与防污染双扫**（经验不许回灌未来信息）、
**归因双列 originator⟂accountable**（谁鉴权 / 谁记账分开）。本波把这三条补齐并验收。

## T-01 A2A M0 静态 AgentCard（R4-2 / P1-15）

| AC | 判据 |
|---|---|
| AC-7.1 | `GET /api/a2a/agents/{id}/card` 返回 `apiVersion/kind/maturity=M0`；**只做发现，不做 A2A 握手**（M2 冻结） |
| AC-7.2 | 卡片**白名单字段**：name / description / runtime / skills / capabilities / endpoints；**绝不含 api_key、model_config 凭据、gate 提示词** |
| AC-7.3 | 越权与不存在统一 **404**（不泄漏他人 Agent 是否存在） |
| AC-7.4 | 归档/停用 Agent 仍可读卡片但 `status` 如实（发现面不隐藏状态，也不因状态改变可用性判断） |

## T-02 R7-4/R7-5 补列：因果前缀 + 晋升评审账 + 防污染双扫

| AC | 判据 |
|---|---|
| AC-7.5 | `memories` 补 `source_seq`（本条经验所属任务序号）/ `cites_seq`（引用到的最大任务序号）/ `pollution_flagged` / `post_ingest_scan` 四列（迁移 014） |
| AC-7.6 | **因果前缀**：`cites_seq >= source_seq` 且两者非 0 → 拒绝（`因果前缀` 冲突），防未来信息回灌 |
| AC-7.7 | **晋升评审账** `promotion_reviews`：每次 propose 都落一行（`verdict / fields_complete / causal_check / pollution_scan / reviewer`），`no_entry` 也记（记统计不记失败） |
| AC-7.8 | **防污染双扫**：晋升前扫（命中金标/评测标记 → `pollution_flagged=1` 且强制 `confounded`）；入库后再扫一次并写 `post_ingest_scan=1` |
| AC-7.9 | `verdict` 词表封闭 `helped\|hurt\|no_effect\|confounded\|no_entry`；非法值 400 |

## T-03 治理开关 `rsi_switches`（R6-4 · §6.30 E）

| AC | 判据 |
|---|---|
| AC-7.10 | 四类产物 `memory\|skill\|orchestration\|model` 各一个开关；**关闭=「自动体已暂停」**：该类的自动写入/提案/发布一律 409 |
| AC-7.11 | 开关校验在**状态转换层**（`propose_memory` / `create_proposal` / `publish` 三处独立判定），不靠提示词 |
| AC-7.12 | 关闭/开启都写审计（`rsi:switch` + 目标类目 + 「自动体已暂停」/「恢复」），admin 才可操作 |
| AC-7.13 | 四类之外（含代码层、门禁本体）**没有开关**——只有白名单四类可自动化（R6-4） |

## T-04 R8-2 归因双列 originator ⟂ accountable（§7 归因瀑布）

| AC | 判据 |
|---|---|
| AC-7.14 | `work_items` / `work_item_runs` 加 `originator_id`（**只鉴权**）+ `accountable_id`（**只审计/成本**）两列（迁移 015）；存量零回填 |
| AC-7.15 | 归属瀑布：member 动作 → originator=自己；agent 动作 → 沿 `parent_id` 找链顶人类；**读不出人类 → fail-closed 拒绝**（不猜测、不回退 admin） |
| AC-7.16 | accountable 缺省 = originator；显式传入需是任务成员或管理员，否则 403 |
| AC-7.17 | 两列语义不混：API 响应分别给 `originator_id` / `accountable_id`，不再用一个 owner 兼两职 |

## 最小设计与触碰模块

- 新 `backend/services/agent_card.py`：卡片白名单构造（无凭据面）。
- 新 `backend/routes/a2a_api.py`：`GET /api/a2a/agents/{id}/card`；`main.py` 注册。
- `backend/models/rsi.py` + `backend/services/rsi_service.py` + `backend/routes/rsi_api.py`：四列、`PromotionReview`、`RsiSwitch` + 三处开关判定 + 因果前缀 + 双扫。
- 新 `backend/services/attribution.py` + `backend/routes/tasks_api.py` 接线：瀑布 + 双列落库。
- 迁移 014（RSI 补列 + 两表）· 015（归因双列）。
- 测试：`backend/tests/test_a2a_card.py` · `backend/tests/test_rsi_governance.py` · `backend/tests/test_attribution.py`。

## 明确不做（记账）

- A2A M1/M2（任务协商、流式、推通知）：**M2 冻结**（R4-2），只做 M0 静态卡。
- 金标数据集本体与 judge 调用：治理契约已足够（波 6 已定），本波不加执行器。
- 归因的域策略表：域策略当前无落库位，本波按「显式传入或 =originator」+ 读不出 fail-closed 实现，策略表待域能力落地。
