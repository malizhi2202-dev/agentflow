"""L0 抽取器的 LLM 适配器（本地 ollama 或远端厂商；**未配置即返回 None**）。

口径：抽取结果只是**候选**——写入仍走 `rsi_service.propose_memory` 的三字段门 + confounded 默认。
"""
from __future__ import annotations

import json

import config
from services.llm_providers import get_provider

PROVIDERS_WITHOUT_KEY = ("ollama", "cli")

# 实测（hermes CLI，v21 T-04）：prompt 里写「抽不出就输出 []」会被保守模型当成逃生口，
# 同一段故障复盘对话稳定回 []；改成正面界定「现象/排查顺序/结论都算可复用」后稳定抽出 1 条。
# 不要求编造：evidence 仍必须引用对话原话。
PROMPT = (
    "你是记忆抽取器。从下面这段对话里抽取 1-3 条**可复用**的原子经验："
    "故障现象、排查顺序、结论都属于可复用经验，不要因为对话短就跳过。\n"
    "只输出 JSON 数组，每项必须是**对象**，字段：cue（什么场景）、lesson（学到什么）、"
    "evidence（字符串数组，引用对话里的原话）。不要任何解释。\n"
    '示例：[{"cue":"构建失败时","lesson":"先看第一个类型错误，后面的多为级联",'
    '"evidence":["助手原话：先看第一个类型错误"]}]'
)


def _items_from(data) -> list:
    """把模型回复解析成条目列表：list 直接用；dict 取常见容器键。"""
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        for key in ("candidates", "experiences", "items", "memories", "results"):
            if isinstance(data.get(key), list):
                return data[key]
    return []


def _as_evidence(value) -> list:
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    return []


def _field(item: dict, *names: str) -> str:
    for n in names:
        v = item.get(n)
        if isinstance(v, str) and v.strip():
            return v.strip()
    return ""


def parse_reply(raw: str) -> list[dict]:
    """从（不可信）模型输出里抠出候选。

    真实 CLI（hermes/dsh）未必照 prompt 的 schema 回：可能包着 ```json 围栏、
    额外寒暄、或把字段叫 title/content/notes。这里只做**形状容错**，
    字段仍按三字段门（cue/lesson/evidence）归一，缺字段的条目不猜、直接丢。
    """
    text = (raw or "").strip()
    start, end = text.find("["), text.rfind("]")
    data = None
    if start != -1 and end > start:
        try:
            data = json.loads(text[start:end + 1])
        except json.JSONDecodeError:
            data = None
    if data is None:
        # 也可能整段是 {"experiences": [...]} 对象（围栏内 JSON 对象）
        o_start, o_end = text.find("{"), text.rfind("}")
        if o_start != -1 and o_end > o_start:
            try:
                data = json.loads(text[o_start:o_end + 1])
            except json.JSONDecodeError:
                return []
    out = []
    for item in _items_from(data):
        # 除对象外，也接受 [cue, lesson, evidence] 三元组（小模型常这么回）
        if isinstance(item, dict):
            cue = _field(item, "cue", "title", "trigger", "scene")
            lesson = _field(item, "lesson", "content", "summary")
            evidence = _as_evidence(
                item.get("evidence") or item.get("notes") or item.get("reasoning"))
        elif isinstance(item, (list, tuple)) and len(item) >= 2:
            cue = str(item[0]).strip()
            lesson = str(item[1]).strip()
            evidence = _as_evidence(item[2] if len(item) > 2 else None)
        else:
            continue
        if not cue or not lesson:
            continue  # 三字段门的前置：缺字段不猜
        out.append({"cue": cue, "lesson": lesson, "evidence": evidence})
    return out


def configured() -> bool:
    if not (config.RSI_EXTRACTOR_PROVIDER and config.RSI_EXTRACTOR_MODEL):
        return False
    if config.RSI_EXTRACTOR_PROVIDER in PROVIDERS_WITHOUT_KEY:
        return True
    return bool(config.RSI_EXTRACTOR_API_KEY)


def build_extractor(provider=None):
    """返回 `(messages: list[str]) -> list[dict]`；未配置返回 None（调用方走 dry-run）。"""
    if provider is None and not configured():
        return None
    provider = provider or get_provider(config.RSI_EXTRACTOR_PROVIDER)
    model = config.RSI_EXTRACTOR_MODEL
    key = config.RSI_EXTRACTOR_API_KEY

    def extract(messages: list[str]) -> list[dict]:
        text = "\n".join(messages)[:8000]
        reply, _usage = provider.chat(
            [{"role": "system", "content": PROMPT},
             {"role": "user", "content": text}],
            key, model,
        )
        return parse_reply(str(reply))

    return extract
