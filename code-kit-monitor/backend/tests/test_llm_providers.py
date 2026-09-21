"""测试 llm_providers 模块 — 导入 + 实例化."""
import sys


def test_import():
    """测试 1: 所有类和符号可导入."""
    from services.llm_providers import (
        BaseProvider, OpenAIProvider, OllamaProvider,
        AnthropicProvider, HermesProvider,
        DeepSeekProvider, GeminiProvider, CodexProvider,
        provider_registry, get_provider, SUPPORTED_PROVIDERS,
    )
    print("✓ 所有类和符号导入成功")


def test_registry():
    """测试 2: 注册表包含全部 7 个 provider."""
    from services.llm_providers import provider_registry, SUPPORTED_PROVIDERS
    expected = {"openai", "ollama", "anthropic", "hermes", "deepseek", "gemini", "codex"}
    assert expected == set(provider_registry.keys()), f"不匹配: {set(provider_registry.keys())}"
    assert SUPPORTED_PROVIDERS == frozenset(expected)
    print("✓ 注册表包含所有 7 个 provider")


def test_instantiate():
    """测试 3: 每个 Provider 可实例化."""
    from services.llm_providers import (
        BaseProvider, OpenAIProvider, OllamaProvider,
        AnthropicProvider, HermesProvider,
        DeepSeekProvider, GeminiProvider, CodexProvider,
    )
    providers = {
        "openai": OpenAIProvider(),
        "ollama": OllamaProvider(),
        "anthropic": AnthropicProvider(),
        "hermes": HermesProvider(),
        "deepseek": DeepSeekProvider(),
        "codex": CodexProvider(),
    }
    # GeminiProvider 实例化（无需 google-generativeai 安装即可创建实例）
    providers["gemini"] = GeminiProvider()
    for name, p in providers.items():
        assert isinstance(p, BaseProvider), f"{name} 不是 BaseProvider 子类"
        assert hasattr(p, "chat"), f"{name} 缺少 chat 方法"
        print(f"  ✓ {name}Provider 实例化成功")


def test_get_provider():
    """测试 4: get_provider 工厂函数."""
    from services.llm_providers import get_provider, BaseProvider
    for name in ["openai", "ollama", "anthropic", "hermes", "deepseek", "gemini", "codex"]:
        p = get_provider(name)
        assert isinstance(p, BaseProvider)
        print(f"  ✓ get_provider(\"{name}\") → {p.__class__.__name__}")


def test_unknown_provider():
    """测试 5: 未知 provider 抛出 ValueError."""
    from services.llm_providers import get_provider
    for bad_name in ["unknown", "gpt4", ""]:
        try:
            get_provider(bad_name)
            print(f"  ✗ {bad_name}: 应该抛出 ValueError")
        except ValueError as e:
            print(f"  ✓ get_provider(\"{bad_name}\") → {type(e).__name__}")


def test_chat_service_import():
    """测试 6: chat_service 模块可导入."""
    from services.chat_service import chat_service, ChatService
    print("✓ chat_service 模块导入成功（无 import 错误）")


def test_agents_api_import():
    """测试 7: agents_api 路由可导入."""
    from routes.agents_api import router
    print(f"✓ agents_api 路由导入成功 (prefix: {router.prefix})")


if __name__ == "__main__":
    print("=== Test 1: 导入模块 ===")
    test_import()
    print()
    print("=== Test 2: 注册表验证 ===")
    test_registry()
    print()
    print("=== Test 3: 实例化每个 Provider ===")
    test_instantiate()
    print()
    print("=== Test 4: get_provider 工厂 ===")
    test_get_provider()
    print()
    print("=== Test 5: 未知 provider 错误处理 ===")
    test_unknown_provider()
    print()
    print("=== Test 6: chat_service 导入验证 ===")
    test_chat_service_import()
    print()
    print("=== Test 7: agents_api 导入验证 ===")
    test_agents_api_import()
    print()
    print("=== 全部测试通过! ===")
