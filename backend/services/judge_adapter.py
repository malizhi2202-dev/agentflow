"""真实 judge 适配器（影子重放的异厂系评审）——**默认未配置即拒绝**。

治理口径（RULINGS R7-1）：
- judge 必须异厂系；本模块不判断厂商，只要求**显式配置**（provider/model/key/budget 四件齐）；
- **预算帽**：`RSI_JUDGE_MAX_CALLS` 次/作业，超限抛 `BudgetExceeded`（不静默降级）；
- 不做任何默认 provider 回退：没配置就报错，绝不偷偷花钱。
"""
from __future__ import annotations

import config
from services.llm_providers import get_provider

PROMPT = (
    "你是独立的评测者。下面给出【期望】与【实际输出】，请判断两者是否等价。"
    "只回一个字符：1（等价）或 0（不等价）。不要解释。"
)


class JudgeError(ValueError):
    """judge 不可用或调用失败（路由 400/409）。"""


class BudgetExceeded(JudgeError):
    """超出调用预算（不重试、不降级）。"""


def configured() -> bool:
    return bool(config.RSI_JUDGE_PROVIDER and config.RSI_JUDGE_MODEL
                and config.RSI_JUDGE_API_KEY and config.RSI_JUDGE_MAX_CALLS > 0)


def judge_cases(cases: list[dict], *, provider=None, max_calls: int | None = None) -> float:
    """逐条让 judge 判「equivalent?」，返回 pass_rate（0..1）。

    `provider` 可注入（测试用假 provider）；不注入则按 config 构真实 provider。
    """
    if not cases:
        raise JudgeError("cases 不能为空")
    budget = config.RSI_JUDGE_MAX_CALLS if max_calls is None else int(max_calls)
    if provider is None and not configured():
        raise JudgeError(
            "judge 未配置：需要 RSI_JUDGE_PROVIDER / RSI_JUDGE_MODEL / "
            "RSI_JUDGE_API_KEY / RSI_JUDGE_MAX_CALLS>0（不默认回退、不偷偷花钱）"
        )
    if budget <= 0:
        raise JudgeError("judge 预算帽 RSI_JUDGE_MAX_CALLS 必须 >0")
    if provider is None:
        provider = get_provider(config.RSI_JUDGE_PROVIDER)

    hit = 0
    for i, case in enumerate(cases):
        if i >= budget:
            raise BudgetExceeded(f"judge 调用超预算（上限 {budget} 次）")
        prompt = str(case.get("prompt") or case.get("input") or "")
        expected = str(case.get("expected", ""))
        actual = str(case.get("actual", ""))
        if not prompt and not expected:
            raise JudgeError(f"cases[{i}] 缺 prompt/expected")
        messages = [{"role": "system", "content": PROMPT},
                    {"role": "user", "content": f"【期望】{expected}\n【实际】{actual}"}]
        try:
            reply, _usage = provider.chat(messages, config.RSI_JUDGE_API_KEY, config.RSI_JUDGE_MODEL)
        except Exception as e:  # noqa: BLE001 — 外部调用失败要响亮
            raise JudgeError(f"judge 调用失败: {e}") from e
        if str(reply).strip().startswith("1"):
            hit += 1
    return round(hit / len(cases), 4)
