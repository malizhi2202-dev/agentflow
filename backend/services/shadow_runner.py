"""影子重放 runner（R7-1 第二拍的**执行入口**，不是新的门禁）。

口径：
- 发布权仍在人；本模块只把「金标用例」跑出 pass_rate，再交给既有
  `rsi_service.record_shadow`（金标冻结 / 异厂 judge / NOISE FLOOR 全部沿用，不复制规则）。
- 本版打分是**确定性精确比对**（`judge_kind=exact_match`），**不调外部模型**、不冒充异厂 judge；
  真实 LLM judge 以后走可注入的适配器（`judge` 参数留位但本版不接受外部模型）。
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from services import rsi_service


class RunnerError(ValueError):
    """用例/入参非法（路由 400）。"""


def score_cases(cases: list[dict]) -> float:
    """确定性打分：expected == actual 记命中（去首尾空白后精确比较）。"""
    if not cases:
        raise RunnerError("cases 不能为空（金标用例是影子重放的最小输入）")
    hit = 0
    for i, case in enumerate(cases):
        if not isinstance(case, dict):
            raise RunnerError(f"cases[{i}] 必须是对象，含 expected/actual")
        expected = case.get("expected")
        actual = case.get("actual")
        if expected is None or actual is None:
            raise RunnerError(f"cases[{i}] 缺 expected 或 actual")
        if str(expected).strip() == str(actual).strip():
            hit += 1
    return round(hit / len(cases), 4)


def run_shadow(db: Session, proposal, *, cases: list[dict], judge_model: str,
               golden_set_frozen: bool, cross_vendor: bool,
               baseline: float = 0.0) -> dict:
    if not (judge_model or "").strip():
        raise RunnerError("judge_model 不能为空（影子门要求标明评审模型）")
    pass_rate = score_cases(cases)
    # 门禁全部沿用 rsi_service：缺金标/异厂 → GateError(409)；低于 NOISE FLOOR → collapsed
    rsi_service.record_shadow(
        db, proposal,
        judge_model=judge_model.strip(), golden_set_frozen=golden_set_frozen,
        cross_vendor=cross_vendor, pass_rate=pass_rate, baseline=float(baseline or 0.0),
    )
    return {
        "pass_rate": pass_rate,
        "baseline": float(baseline or 0.0),
        "delta": round(pass_rate - float(baseline or 0.0), 4),
        "cases": len(cases),
        "judge_kind": "exact_match",   # 不冒充异厂模型评审
        "dry_run": True,               # 本版不调外部模型
        "proposal": proposal.to_dict(),
    }
