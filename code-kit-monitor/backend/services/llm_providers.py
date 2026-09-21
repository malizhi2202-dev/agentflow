"""LLM 提供者适配器模块 — 多 Provider 支持.

支持: openai, ollama, anthropic, hermes, deepseek, gemini, codex
扩展: 新增 provider 只需实现 BaseProvider 并注册到 provider_registry.
"""

from __future__ import annotations

import json
import os
from abc import ABC, abstractmethod
from typing import Any

import httpx


class BaseProvider(ABC):
    """LLM 提供者抽象基类."""

    @abstractmethod
    def chat(
        self,
        messages: list[dict[str, str]],
        api_key: str,
        model_name: str,
    ) -> tuple[str, dict[str, Any]]:
        """调用 LLM 并返回 (reply_text, usage_dict).

        usage_dict 格式: {"prompt_tokens": int, "completion_tokens": int, "total_tokens": int}
        """
        ...


# ──────────────────────────────────────────────
# 内置提供者
# ──────────────────────────────────────────────


class OpenAIProvider(BaseProvider):
    """OpenAI / 兼容 API 提供者 (httpx 同步)."""

    BASE_URL = "https://api.openai.com/v1"

    def chat(
        self,
        messages: list[dict[str, str]],
        api_key: str,
        model_name: str,
    ) -> tuple[str, dict[str, Any]]:
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        with httpx.Client(timeout=httpx.Timeout(60.0)) as client:
            resp = client.post(
                f"{self.BASE_URL}/chat/completions",
                json={"model": model_name, "messages": messages},
                headers=headers,
            )
            resp.raise_for_status()
            data = resp.json()

        reply = data["choices"][0]["message"]["content"]
        usage = data.get("usage", {})
        return reply, usage


class OllamaProvider(BaseProvider):
    """Ollama 本地提供者 (OpenAI 兼容 API)."""

    BASE_URL = "http://localhost:11434/v1"

    def chat(
        self,
        messages: list[dict[str, str]],
        api_key: str,
        model_name: str,
    ) -> tuple[str, dict[str, Any]]:
        with httpx.Client(timeout=httpx.Timeout(120.0)) as client:
            resp = client.post(
                f"{self.BASE_URL}/chat/completions",
                json={"model": model_name, "messages": messages},
            )
            resp.raise_for_status()
            data = resp.json()

        reply = data["choices"][0]["message"]["content"]
        usage = data.get("usage", {})
        return reply, usage


class AnthropicProvider(BaseProvider):
    """Anthropic Claude 提供者 (anthropic SDK).

    依赖: pip install anthropic
    注意: Anthropic Messages API 不支持 system role 在 messages 中，
          需通过 system 参数单独传入。
    """

    def chat(
        self,
        messages: list[dict[str, str]],
        api_key: str,
        model_name: str,
    ) -> tuple[str, dict[str, Any]]:
        try:
            from anthropic import Anthropic
        except ImportError:
            raise RuntimeError(
                "anthropic 库未安装，请执行: pip install anthropic"
            )

        # 分离 system 消息
        system_prompt = None
        chat_messages: list[dict[str, Any]] = []
        for m in messages:
            if m["role"] == "system":
                # 多条 system 合并
                if system_prompt is None:
                    system_prompt = m["content"]
                else:
                    system_prompt += "\n\n" + m["content"]
            else:
                chat_messages.append({"role": m["role"], "content": m["content"]})

        client = Anthropic(api_key=api_key)
        kwargs: dict[str, Any] = {
            "model": model_name,
            "messages": chat_messages,
            "max_tokens": 4096,
        }
        if system_prompt:
            kwargs["system"] = system_prompt

        response = client.messages.create(**kwargs)

        # Anthropic 返回的 content 是 TextBlock 列表
        reply = ""
        for block in response.content:
            if hasattr(block, "text"):
                reply += block.text

        usage = {
            "prompt_tokens": response.usage.input_tokens,
            "completion_tokens": response.usage.output_tokens,
            "total_tokens": response.usage.input_tokens + response.usage.output_tokens,
        }
        return reply, usage


class HermesProvider(BaseProvider):
    """本地 Hermes Agent 端点提供者.

    默认端点: http://localhost:8080/v1/chat/completions
    可通过环境变量 HERMES_ENDPOINT 覆盖。
    """

    def chat(
        self,
        messages: list[dict[str, str]],
        api_key: str,
        model_name: str,
    ) -> tuple[str, dict[str, Any]]:
        base_url = os.environ.get("HERMES_ENDPOINT", "http://localhost:8080")
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        with httpx.Client(timeout=httpx.Timeout(120.0)) as client:
            resp = client.post(
                f"{base_url}/v1/chat/completions",
                json={"model": model_name, "messages": messages},
                headers=headers,
            )
            resp.raise_for_status()
            data = resp.json()

        reply = data["choices"][0]["message"]["content"]
        usage = data.get("usage", {})
        return reply, usage


class DeepSeekProvider(BaseProvider):
    """DeepSeek 提供者 (OpenAI 兼容 API).

    端点: https://api.deepseek.com/v1
    """

    BASE_URL = "https://api.deepseek.com/v1"

    def chat(
        self,
        messages: list[dict[str, str]],
        api_key: str,
        model_name: str,
    ) -> tuple[str, dict[str, Any]]:
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        with httpx.Client(timeout=httpx.Timeout(120.0)) as client:
            resp = client.post(
                f"{self.BASE_URL}/chat/completions",
                json={"model": model_name, "messages": messages},
                headers=headers,
            )
            resp.raise_for_status()
            data = resp.json()

        reply = data["choices"][0]["message"]["content"]
        usage = data.get("usage", {})
        return reply, usage


class GeminiProvider(BaseProvider):
    """Google Gemini 提供者 (google-generativeai SDK).

    依赖: pip install google-generativeai
    注意: Gemini 的 system_instruction 通过 GenerationConfig 传入。
    """

    def chat(
        self,
        messages: list[dict[str, str]],
        api_key: str,
        model_name: str,
    ) -> tuple[str, dict[str, Any]]:
        try:
            import google.generativeai as genai
        except ImportError:
            raise RuntimeError(
                "google-generativeai 库未安装，请执行: pip install google-generativeai"
            )

        genai.configure(api_key=api_key)

        # 分离 system 消息
        system_prompt: str | None = None
        history: list[dict[str, Any]] = []
        for m in messages:
            if m["role"] == "system":
                if system_prompt is None:
                    system_prompt = m["content"]
                else:
                    system_prompt += "\n\n" + m["content"]
            else:
                # Gemini 使用 "user" / "model" 角色
                role = "model" if m["role"] == "assistant" else m["role"]
                history.append({"role": role, "parts": [m["content"]]})

        # 最后一条作为当前消息
        current_message = ""
        if history:
            current_message = history.pop()["parts"][0]

        model = genai.GenerativeModel(
            model_name=model_name,
            system_instruction=system_prompt,
        )

        chat_session = model.start_chat(history=history)
        response = chat_session.send_message(current_message)

        reply = response.text
        usage = {
            "prompt_tokens": response.usage_metadata.prompt_token_count,
            "completion_tokens": response.usage_metadata.candidates_token_count,
            "total_tokens": response.usage_metadata.total_token_count,
        }
        return reply, usage


class CodexProvider(BaseProvider):
    """OpenAI Codex CLI 提供者 (OpenAI 兼容 API).

    端点: 可通过 CODEX_BASE_URL 环境变量覆盖。
    默认: https://api.openai.com/v1
    """

    BASE_URL = os.environ.get("CODEX_BASE_URL", "https://api.openai.com/v1")

    def chat(
        self,
        messages: list[dict[str, str]],
        api_key: str,
        model_name: str,
    ) -> tuple[str, dict[str, Any]]:
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        with httpx.Client(timeout=httpx.Timeout(180.0)) as client:
            resp = client.post(
                f"{self.BASE_URL}/chat/completions",
                json={"model": model_name, "messages": messages},
                headers=headers,
            )
            resp.raise_for_status()
            data = resp.json()

        reply = data["choices"][0]["message"]["content"]
        usage = data.get("usage", {})
        return reply, usage


# ──────────────────────────────────────────────
# 注册表 & 工厂函数
# ──────────────────────────────────────────────

provider_registry: dict[str, type[BaseProvider]] = {
    "openai": OpenAIProvider,
    "ollama": OllamaProvider,
    "anthropic": AnthropicProvider,
    "hermes": HermesProvider,
    "deepseek": DeepSeekProvider,
    "gemini": GeminiProvider,
    "codex": CodexProvider,
}

SUPPORTED_PROVIDERS = frozenset(provider_registry.keys())


def get_provider(name: str) -> BaseProvider:
    """根据名称获取提供者实例.

    Raises:
        ValueError: 未知的 provider 名称.
    """
    cls = provider_registry.get(name)
    if cls is None:
        raise ValueError(
            f"不支持的模型提供者: '{name}'。"
            f"支持的提供者: {sorted(SUPPORTED_PROVIDERS)}"
        )
    return cls()
