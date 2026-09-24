import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import AgentBuilder from '../pages/AgentBuilder';
import { useAgents, type Agent } from '../stores/agents';

// T-FIX-15（O-16 处置 / F27 规程）· `T-FIX-14` 的**接线级行为判据**。
//
// 为什么存在：`T-FIX-14` 把 `AgentBuilder` 的内联取值换成了 `capabilitiesOf`，行为确实变了
// （4 类可见差异 + 1 类不再抛 `TypeError`），而当时钉住它的只有两条 `grep -c` 计数判据 —— 那两条
// 实测可被同义写法绕过（`model_config_json?.capabilities` 等 5 种等价形状里只命中 1 种），
// 且本文件此前**不被任何测试引用**。本文件把判据从「写法」升级为「行为」：
// 断言的是渲染结果，不是源码里出现了哪个函数名。
//
// 未修态取值（`0e8ee534`，即接线之前）两条**必红**：
//   ① `["   "]` → 旧内联不过滤空白 → 渲染 1 个空白 chip + 「加载记忆」按钮（两者共用同一个 `length > 0` 门）；
//   ② `["a", " a "]` → 旧内联不去重不归一 → 渲染 2 个 chip（文本 `'a'` 与 `' a '`）。
// 判据原文见 `.specs/capability-groups/TASK.md` T-FIX-15 与 `TEST.md` §1.9.4 裁决 A。
//
// ⚠️ 断言① 里「chip 与记忆入口共用同一个门」这个联动本身是 **O-18（待人工裁定）**：
// 若人拍「分门」（空白能力仍给记忆入口），改的是这条断言与 `AgentBuilder.tsx` 的门，本文件的
// 存在价值不变（它锁的就是"谁共用谁"这件事）。不静默改，改判须留痕。

/** 只喂最小必要字段；`model_config_json.capabilities` 是本文件唯一的自变量。 */
function agentWith(capabilities: unknown): Agent {
  return {
    id: 1,
    owner_id: 'alice',
    name: 'wiring-agent',
    description: '',
    runtime: 'langgraph',
    model_provider: 'ollama',
    model_name: 'qwen2:0.5b',
    model_config_json: { capabilities },
    api_key: '',
    domain_id: null,
    workflow_id: null,
    token_soft_limit: 800000,
    token_hard_limit: 1000000,
    total_tokens_used: 0,
    status: 'standby',
    visibility: 'private',
    project_count: 0,
    created_at: '2026-09-24T00:00:00Z',
    updated_at: '2026-09-24T00:00:00Z',
  };
}

/**
 * 用 store 种子渲染整页（不起服务、不加依赖）。
 * `fetchAgents` 替成 no-op：组件 `useEffect` 里会调它，真实实现会打 `/api/agents`。
 */
function renderBuilder(capabilities: unknown) {
  useAgents.setState({ agents: [agentWith(capabilities)], loading: false, fetchAgents: async () => undefined });
  return render(<AgentBuilder />);
}

/**
 * 卡片里所有「文本恰好是某个 capability 值」的 span = chip。
 * 刻意**不依赖内联样式 / 不依赖 class**（改配色不该让行为判据变红），
 * 也不依赖 `data-testid`（`AgentBuilder.tsx` 不在本任务 `write_files` 里，不能为了测试往里加属性）。
 */
function chipTextsOf(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('span'))
    .map(function (el) { return el.textContent ?? ''; })
    .filter(function (text) { return text.trim() === 'a'; });
}

function blankOnlyChipCount(container: HTMLElement): number {
  return Array.from(container.querySelectorAll('span'))
    .filter(function (el) { return (el.textContent ?? '').length > 0 && (el.textContent ?? '').trim() === ''; })
    .length;
}

describe('AgentBuilder · capability 接线行为（T-FIX-15 · 从 grep 判据升级为行为判据）', () => {
  afterEach(() => {
    cleanup();
    useAgents.setState({ agents: [], loading: false });
  });

  it('given capabilities = ["   "]（纯空白）· when 渲染卡片 · then 不出现空白 chip，且「加载记忆」按钮一并消失（共用 length>0 门 = O-18）', () => {
    const { container } = renderBuilder(['   ']);

    // 正向锚点：先证明卡片真的渲染了，否则「按钮不存在」可以是空渲染造成的假绿
    expect(screen.getByText('wiring-agent')).toBeTruthy();

    expect(blankOnlyChipCount(container)).toBe(0);
    expect(screen.queryByText('加载记忆')).toBeNull();
  });

  it('given capabilities = ["a", " a "]（归一后重复）· when 渲染卡片 · then 只剩 1 个 chip 且文本已归一（未修态 = 2 个：\'a\' 与 \' a \'）', () => {
    const { container } = renderBuilder(['a', ' a ']);

    expect(screen.getByText('wiring-agent')).toBeTruthy();
    expect(chipTextsOf(container)).toEqual(['a']);
  });
});
