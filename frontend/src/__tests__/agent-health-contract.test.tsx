import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import {
  OverviewCards,
  AgentRow,
  CapabilityGroupRow,
  DetailPanel,
} from '../pages/AgentControlPlane';
import { isAgentHealthy, isProbeHealthy, isProbeUnhealthy } from '../lib/agentHealth';
import type { AgentStatus } from '../stores/controlPlane';
import type { Agent } from '../stores/agents';

// T-FIX-03（F10）· 契约缺口 + 两个状态词表的**行为级**判据。
//
// 为什么存在（TASK.md T-FIX-03 verify ①②③ 落成有 runner 的判据 —— 没有 runner 的行为断言等于没写）：
//
//   契约事实（today，一手实读）：`backend/routes/control_plane_api.py` 的 `list_probes` 构造的 entry
//   键集 = {agent_id, agent_name, status, probes, model_name, tokens_used, token_soft_limit,
//   token_hard_limit, last_heartbeat} —— **没有 `health`、没有 `runtime`**；
//   而 `stores/controlPlane.ts:8/:10` 声明了这两个字段（类型在撒谎，F10）。
//   真正带探针判定的是 `status`（`if p.probe_type == "health": entry["status"] = p.status`）。
//
//   ⇒ 旧代码 `OverviewCards` 读 `a.health`（幽灵字段，恒 `undefined`）：
//      · 「健康」卡恒 0（哪怕探针是 healthy）；
//      · 「异常」卡对 `unhealthy` 恒 0（只剩一个探针词表里不存在的 `status === 'dead'` 分支）。
//   这两条就是本文件 ①② 的**未修态必红**取值（RED 输出见 SUMMARY）。
//
// 断言口径（故意这么选）：
//   · 判据读的是**渲染结果**（卡片计数 / 徽标的 inline style），不是源码里出现了哪个函数名 ——
//     F27「写法判据可被同义写法绕过」的反面。
//   · 徽标用 `getAttribute('style')` 而不是 `getComputedStyle`：值本身是 CSS 变量
//     （`var(--green-bg)`），jsdom 不加载 tokens.css、也不解析 `var()`，
//     `getComputedStyle` 在这里拿不到任何有意义的东西；DOM 对 inline 声明的**忠实序列化**
//     才是"这个徽标被染成绿色"在测试环境里唯一可观测的形态。
//   · 不依赖 `data-testid`、不依赖 class（`AgentControlPlane.tsx` 的属性不是本任务的验收面）。
//
// ⚠️ 已知登记（不在本文件断言里，写在 SUMMARY）：`runtime` 那半边契约缺口**仍未收口** ——
//   后端不发 `runtime`，三处渲染恒空。③ 钉的是「三处接线会把喂进去的值显示出来」（契约形状），
//   不是「payload 已经有 runtime」（那需要改后端，与本任务「后端一字不动」的护栏互斥）。

afterEach(cleanup);

const GREEN = 'var(--green)';
const GREEN_BG = 'var(--green-bg)';
const RED = 'var(--red)';
const RED_BG = 'var(--red-bg)';

/**
 * 探针 DTO（`/api/control-plane/probes` 的 entry 形状）。唯一自变量是 `status`。
 * `health` 保留在 fixture 里不是因为后端会发它，而是因为 `AgentStatus` 今天仍把它声明为必填
 * （改成可选会让 `AgentProbePanel.tsx:318` 的 `HealthBadge({health: string})` 在 `strict` 下报错，
 * 顶破「`error TS` 恰 32」这条护栏 —— 见 SUMMARY「已知未收口」）。
 */
function probeWith(over: Partial<AgentStatus> = {}): AgentStatus {
  return {
    agent_id: 7,
    agent_name: 'probe-agent',
    status: 'healthy',
    health: '',
    last_heartbeat: '2026-09-28T09:00:00',
    runtime: 'langgraph',
    model_name: 'gpt-4',
    tokens_used: 1000,
    token_soft_limit: 10000,
    token_hard_limit: 20000,
    probes: [],
    ...over,
  };
}

/** `stores/agents.ts` 的 `Agent`（能力组展开行喂的是这一种 DTO）。 */
function agentRowFixture(over: Partial<Agent> = {}): Agent {
  return {
    id: 42,
    owner_id: 'alice',
    name: 'group-agent',
    description: '',
    runtime: 'langgraph',
    model_provider: 'ollama',
    model_name: 'qwen2:0.5b',
    model_config_json: { capabilities: ['code-review'] },
    api_key: '',
    domain_id: null,
    workflow_id: null,
    token_soft_limit: 800000,
    token_hard_limit: 1000000,
    total_tokens_used: 0,
    status: 'running',
    visibility: 'private',
    project_count: 0,
    created_at: '2026-09-28T00:00:00Z',
    updated_at: '2026-09-28T00:00:00Z',
    ...over,
  };
}

/**
 * 概览卡里「某张卡」显示的数字。
 * 结构：card 根 div > [头部 div（icon + label）, 数值 div, 副标题 div]。
 * 读的是用户看到的那个数，不是源码里的字段名。
 */
function cardValue(label: string): number {
  const labelEl = screen.getByText(label);
  const card = labelEl.parentElement!.parentElement!;
  return Number(card.children[1].textContent);
}

/** 文本等于 `text` 的元素们的 inline style 声明（徽标断言用）。 */
function stylesOfText(text: string): string[] {
  return screen.getAllByText(text).map(function (el) { return el.getAttribute('style') ?? ''; });
}

/**
 * 断言「该行恰好有 `count` 个文案为 `text` 的徽标，且配色全部是 `bg` / `color`」。
 *
 * 为什么钉**个数**（=2）：`AgentRow` 有两个都用探针词表说话的徽标 —— 「运行状态」列
 * （`getStatusConfig`）与「探针判定」列（`getHealthLabel`）。修前「运行状态」列的键集是
 * `{running,idle,blocked,dead}`（与探针词表**零交集**）→ 全部落 fallback、直接把英文
 * `healthy`/`unhealthy` 吐给用户 ⇒ 今天只有 1 个中文徽标。个数从这里变 2，就是
 * T-FIX-03 (d)「运行状态列吐英文」被修好的**行为**证据，不依赖任何源码字面。
 */
function expectBadges(styles: string[], count: number, color: string, bg: string) {
  expect(styles).toHaveLength(count);
  styles.forEach(function (s) {
    expect(s).toContain(bg);
    expect(s).toContain(color);
  });
}

describe('T-FIX-03 · 探针判定口径走 status（F10 契约缺口）', function () {
  it('① 喂 status=healthy → 行徽标绿（--green-bg/--green）且「健康」卡计数 > 0', function () {
    const probes = [probeWith({ status: 'healthy' })];

    render(<OverviewCards probes={probes} queue={[]} />);
    expect(cardValue('健康')).toBeGreaterThan(0);
    cleanup();

    render(
      <table><tbody>
        <AgentRow agent={probes[0]} isSelected={false} onClick={function () {}} />
      </tbody></table>
    );
    // 两个徽标 = 「运行状态」列 + 「探针判定」列；健康态两列都必须是绿的
    expectBadges(stylesOfText('健康'), 2, GREEN, GREEN_BG);
  });

  it('② 喂 status=unhealthy → 行徽标红且计入「异常」卡', function () {
    const probes = [probeWith({ status: 'unhealthy' })];

    render(<OverviewCards probes={probes} queue={[]} />);
    expect(cardValue('异常')).toBe(1);
    cleanup();

    render(
      <table><tbody>
        <AgentRow agent={probes[0]} isSelected={false} onClick={function () {}} />
      </tbody></table>
    );
    expectBadges(stylesOfText('异常'), 2, RED, RED_BG);
  });

  it('③ 喂 runtime=langgraph → 三处渲染点都显示该值', function () {
    const probes = [probeWith({ runtime: 'langgraph' })];

    // ③-a / ③-b：详情面板（`AgentControlPlane.tsx` 的 `DetailPanel`，头部行 + 「运行时」行）
    const detail = render(
      <DetailPanel
        agent={probes[0]}
        onClose={function () {}}
        onAction={function () {}}
        actionLoading={null}
      />
    );
    const headerLine = Array.from(detail.container.querySelectorAll('div')).find(function (el) {
      return (el.textContent ?? '').indexOf('Agent #7 ·') === 0;
    });
    expect(headerLine).toBeTruthy();
    expect(headerLine!.textContent).toContain('langgraph');
    expect(screen.getByText('运行时').parentElement!.textContent).toContain('langgraph');
    cleanup();

    // ③-c：能力组展开行（`CapabilityGroupRow` 的「运行时」列）
    render(
      <CapabilityGroupRow
        capability="code-review"
        agents={[agentRowFixture({ runtime: 'langgraph' })]}
        isExpanded
        onToggle={function () {}}
        ops={{ domainKey: 'd0', onRoute: function () {}, onScale: function () {}, routeLoading: false, scaleLoading: false }}
      />
    );
    const row = screen.getByText('group-agent').closest('tr')!;
    expect(row.textContent).toContain('langgraph');
  });
});

describe('T-FIX-03 (c) · 两个状态词表各自具名（不得共用「健康」一词）', function () {
  it('生命周期口径与探针判定口径互不覆盖：同一个值在两侧判定相反', function () {
    // 生命周期词表（`Agent.status`，DESIGN.md:97-104 是规范源）
    expect(isAgentHealthy('running')).toBe(true);
    expect(isAgentHealthy('standby')).toBe(true);
    expect(isAgentHealthy('idle')).toBe(false);

    // 探针词表（`AgentStatus.status`，agent_probe_service 的落库值）
    expect(isProbeHealthy('healthy')).toBe(true);
    expect(isProbeUnhealthy('unhealthy')).toBe(true);
    expect(isProbeHealthy('unhealthy')).toBe(false);
    expect(isProbeUnhealthy('healthy')).toBe(false);

    // 这条是 v3 那个坑的**行为锁**：生命周期谓词作用在探针词表上恒假
    // （照 v3 把「探针判定」换成 `isAgentHealthy` 会把徽标永远钉红）
    expect(isAgentHealthy('healthy')).toBe(false);
    expect(isProbeHealthy('running')).toBe(false);
  });
});
