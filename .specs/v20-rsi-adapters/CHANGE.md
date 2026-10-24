# CHANGE: RSI 适配器（真实 judge + L0 定时作业）

- **Change ID**: v20-rsi-adapters · 2026-10-24 · 后端（非 UI，跳 2a）· 规模 small（~260 行）

## Why
`v20-residual` 只做到"确定性 runner / 手动 L0 / 默认 dry_run"。用户 10-24「同意你开始吧」批准接真实适配器，
但**没有指定模型与预算**——所以本 change 按最保守口径落地：**显式配置才启用，否则 fail-closed**。

## What / AC
| AC | 判据 |
|---|---|
| AC-1 | judge 四件齐（`RSI_JUDGE_PROVIDER/MODEL/API_KEY/MAX_CALLS>0`）才可用；缺任一 → `JudgeError`（端点 400，文案说明缺什么） |
| AC-2 | judge 逐条调用、按 `1/0` 累计 pass_rate；**预算帽**超限即抛 `BudgetExceeded` 并停止（不继续调用） |
| AC-3 | provider 可注入（测试不真调外部）；provider 异常 → 响亮失败（不吞） |
| AC-4 | `/proposals/{id}/shadow/run` 支持 `judge: exact_match \| llm`；未知值 400；`llm` 未配置 400；响应 `judge_kind` 如实（llm 时 `dry_run=false`） |
| AC-5 | L0 定时作业：`L0_EXTRACT_INTERVAL_SECONDS>0` 才启动；单例租约；每轮最多 `L0_EXTRACT_MAX_CONVERSATIONS` 个会话；默认无抽取器=只统计（dry-run） |
| AC-6 | 全量回归 0 新增红；新用例覆盖 judge 预算/未配置、job 上限/注入、路由 400 |

## 设计要点
- `services/judge_adapter.py`：`configured()` + `judge_cases(cases, provider=None, max_calls=None)`；**无默认 provider 回退**。
- `services/l0_job.py`：`run_once(db, extractor=None, max_conversations=None)`；只挑**有消息**的会话（join + distinct + limit）。
- `shadow_runner.run_shadow(..., scorer=None, judge_kind=...)`：不复制门禁，只替换打分器。
- `main.py`：`_l0_extract_loop`（照 cron 的单例租约模式），interval=0 不创建任务。
- `routes/rsi_api._map`：runner/judge/抽取三类错统一 400（原来会 500）。

## 本地试运行（用户 10-24「使用本地的 hermes 和 dsh 都可以」）

`hermes proxy` 两个上游未登录 → 改用本机 **Ollama qwen2.5:3b** 做真实调用试运行，产出见 `LOCAL-TRIAL.md`：
L0 抽取 1 条入库（confounded）、judge 2 例判 1/0 → pass_rate 0.5 → 提案 `awaiting_approval`。
试运行中修掉两处：judge prompt 加 few-shot；抽取器输出形状容错（数组三元组也接受）。
**ollama 免 key**（`PROVIDERS_WITHOUT_KEY`），远程厂商仍需 key。

## 范围排除
- 不设默认 judge 模型/厂商（需用户给预算与厂商口径）。
- 不做的：judge 结果缓存、L0 抽取器的 LLM prompt 调优、抽取质量评估。
- 前端不加"选 judge 模式"的开关（本波 API 先行）。

## 🛡️ G1（自评）🟫✅ 🟦✅ 🟩✅ 🔴✅（默认关闭 + 预算帽 + 不偷偷花钱）
