"""L0 抽取器的 LLM 适配器（本地 ollama 或远端厂商；**未配置即返回 None**）。

口径：抽取结果只是**候选**——写入仍走 `rsi_service.propose_memory` 的三字段门 + confounded 默认。
"""
from __future__ import annotations

import json

import config
from services.llm_providers import get_provider

PROVIDERS_WITHOUT_KEY = ("ollama",)

PROMPT = (
    "你是记忆抽取器。从下面这段对话里抽取 1-3 条**可复用**的原子经验。\n"
    "只输出 JSON 数组，每项必须是**对象**，字段：cue（什么场景）、lesson（学到什么）、"
    "evidence（字符串数组，指出依据）。抽不出就输出 []。不要任何解释。\n"
    '示例：[{"cue":"构建失败时","lesson":"先看第一个类型错误，后面的多为级联",'
    '"evidence":["助手原话：先看第一个类型错误"]}]'
)


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
        raw = str(reply).strip()
        start, end = raw.find("["), raw.rfind("]")
        if start == -1 or end == -1:
            return []
        try:
            data = json.loads(raw[start:end + 1])
        except json.JSONDecodeError:
            return []
        out = []
        for item in data if isinstance(data, list) else []:
            # LLM 输出是**不可信外部输入**：除对象外，也接受 [cue, lesson, evidence] 三元组
            # （小模型常这么回；不做容错会静默丢光候选）。其它形状一律丢弃，不猜。
            if isinstance(item, dict):
                cue = str(item.get("cue", "")).strip()
                lesson = str(item.get("lesson", "")).strip()
                evidence = item.get("evidence") if isinstance(item.get("evidence"), list) else []
            elif isinstance(item, (list, tuple)) and len(item) >= 2:
                cue = str(item[0]).strip()
                lesson = str(item[1]).strip()
                evidence = item[2] if len(item) > 2 and isinstance(item[2], list) else []
            else:
                continue
            out.append({"cue": cue, "lesson": lesson, "evidence": evidence})
        return out

    return extract
