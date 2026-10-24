# CHANGE · v20-release —— v20 升级波次集成收口（7-integration）

> 来源：`prompts/7-integration.md`（R15.1 强制前置 S-align）+ `STATE.md`（波 0–7 已收口）
> 路由：**7-integration**（八阶段最后一关）。
> 前置：`doc-align-v20`、`v20-wave0…7` 全部已提交（HEAD `13faefbe`）。

## 一句话

波 0–7 的代码都进了主干，但**交付闭环一段是空的**：没有 SUMMARY / ALIGNMENT / UAT / LESSONS / CHANGELOG。
本 change 只做「验证 + 留痕 + 收口」，**不改产品行为**（唯一例外是 UAT 暴露的两个已上线 bug，见 T-FIX）。

## 范围

| 项 | 判据 |
|---|---|
| R15.1 前置 | `.specs/ALIGNMENT.md` 存在且基线覆盖 HEAD（`4ac819bf..13faefbe`，45 提交） |
| 自动化四门 | 后端全量 / 前端 tsc / vitest / build，全部贴真实输出 |
| UAT | 8 条脚本化 UAT（health / 登录+改密 / ETag-412 / metrics 门 / 任务双列 / RSI 开关 / A2A 卡 / watch SSE），人工确认后在 `UAT.md` 标通过/失败 |
| 失败诊断 | 任何红 → 追加 `T-FIX-NN`（含 verify）→ 修 → 重跑（R2.6 自动重试 ≤3 轮） |
| LESSONS | 按提名条件筛，落 `.specs/LESSONS.md`（L-001…L-004） |
| CHANGELOG | `.specs/CHANGELOG.md` 补波 0–7 八行 |
| 归档 | 按 S-align 裁决 V4 决定（本轮默认**不归档**，与项目既有惯例一致） |

## 本轮实测发现（UAT 的价值）

1. `GET /api/health` 在真实启动下 **500**：`scanner._phase_order` 写裸 `STAGES`（wave 0 收口到 `stage_config.STAGES` 时漏改这一行，`NameError` 不被 `except ValueError` 捕获）→ **探活面全挂**，而单测没覆盖到 → `T-FIX-01`。
2. `routes/metrics_api._owner_filter` 引用未导入的 `SessionMetric`（该函数已是死代码）→ 潜在 `NameError` → `T-FIX-02`（按 ponytail 直接删除）。

## 不做的

- 不改任何产品行为（除 T-FIX 两个 bug）。
- 不把 8 个 change 目录移进 `archive/`（默认保留；如需归档按 V4 裁决执行）。
- 不在本阶段改 `CONTEXT.md`（架构沉淀统一走 A-evolve）。
