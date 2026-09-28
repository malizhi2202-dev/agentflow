import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import AgentProbePanel from '../components/AgentProbePanel';
import { useControlPlane, type AgentStatus } from '../stores/controlPlane';

// T-FIX-16 · F10 剩余面（`AgentProbePanel`）的**行为级**判据。
//
// 为什么存在（卡面 verify ①②③ —— 「行为判据为准，不许只交 grep」）：
//
//   `AgentProbePanel` 的健康度徽标原来自带**第 3 张词表** `{healthy, warning, error, unknown}`：
//     · `warning` 后端从不产出（`agent_probe_service.py` 只写 healthy/degraded/unhealthy/error/
//       skipped/unknown），而 `degraded` / `unhealthy` / `skipped` **一格都没有** ⇒ 除 healthy 外
//       一律落到 `map['unknown']` = 「未知」；
//     · 更糟的是它吃的 `probe.health` 是**幽灵字段** —— `control_plane_api.py` 的 entry 从不发这个键
//       ⇒ 连 healthy 那一格也拿不到，`map[undefined] → 未知`，**整列永远是「未知」**。
//
//   未修态（起点 `da1bf959`）的取值：① 的四格里 healthy/degraded/unhealthy **必红**（都渲染「未知」）、
//   unknown 那格恰好为真；② 的 `unhealthy` 那一格必红（异常计数恒 0，因为 `p.health === 'error'`
//   是死支、而 `p.status === 'error'` 对 'unhealthy' 为假）。RED 原文见 `T-FIX-16-SUMMARY.md`。
//
// 断言口径：
//   · 读的是**渲染结果**（「健康度」列的文案 / 统计条上的数字），不是源码里出现了哪个函数名；
//   · 不依赖 class、不依赖 `data-testid`（不给生产代码加测试钩子）；
//   · 定位方式说明：`agent_name` 在面板里出现多处（时间线 :222 + 健康区表格 :324），
//     所以用「文本恰等于名称的 `<td>`」定位那一行，再取第 3 列（探针名称 / 状态 / **健康度**）。

afterEach(cleanup);

/** 探针 DTO（`/api/control-plane/probes` 的 entry 形状）。唯一自变量是 `status`。 */
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

/**
 * 渲染整块探针面板（探针种进 store，不起服务）。
 * `fetchProbes` 替成 no-op：组件 `useEffect` 里会调它，真实实现会打 `/api/control-plane/probes`。
 */
function renderPanel(probes: AgentStatus[]) {
  useControlPlane.setState({ probes, loading: false, fetchProbes: async () => undefined });
  return render(<AgentProbePanel />);
}

/** 该探针行在「健康度」列（第 3 列）显示出来的文案。 */
function healthCellTextOf(agentName: string): string {
  const nameCell = Array.from(document.querySelectorAll('td')).find(
    function (td) { return (td.textContent ?? '').trim() === agentName; }
  );
  expect(nameCell, `找不到探针行：${agentName}`).toBeTruthy();
  const row = nameCell!.closest('tr')!;
  expect(row.children.length, '探针表列数变了，本判据的列索引要跟着改').toBeGreaterThan(2);
  return (row.children[2].textContent ?? '').trim();
}

/**
 * 统计条上「异常 N」那一枚徽标的 N。
 * 正则收尾的数字把统计徽标（文本形如 `异常 1`）与表格里健康度徽标（文本只有 `异常`）区分开。
 */
function statCount(label: string): number {
  const el = Array.from(document.querySelectorAll('div')).find(function (d) {
    return new RegExp('^' + label + '\\s*\\d+$').test((d.textContent ?? '').replace(/\s+/g, ' ').trim());
  });
  expect(el, `找不到统计徽标「${label} N」`).toBeTruthy();
  return Number(((el!.textContent ?? '').match(/(\d+)\s*$/) ?? [])[1]);
}

describe('T-FIX-16 (b) · 健康度徽标消费唯一词表（不是第 3 张表）', function () {
  // 四格 = 后端真实词表里能用「一个词」判定的四个状态（pass/fail 是后端不产出的历史别名，
  // skipped/error 另有文案，本卡不把它们拉进判据以免把「未知」的语义搅混）。
  const cases: Array<[string, string]> = [
    ['healthy', '健康'],
    ['degraded', '降级'],
    ['unhealthy', '异常'],
    ['unknown', '未知'],
  ];

  cases.forEach(function (pair) {
    const status = pair[0];
    const expected = pair[1];
    it('① 喂 status=' + status + ' → 「健康度」列文案为「' + expected + '」', function () {
      renderPanel([probeWith({ status: status })]);
      expect(healthCellTextOf('probe-agent')).toBe(expected);
    });
  });
});

describe('T-FIX-16 (a) · 异常计数按真实 status 判定（幽灵字段那半支已摘掉）', function () {
  it('② 喂 status=healthy 一条 → 「异常」计数不含它', function () {
    renderPanel([probeWith({ status: 'healthy' })]);
    expect(statCount('异常')).toBe(0);
  });

  it('② 喂 status=unhealthy 一条 → 「异常」计数含它', function () {
    renderPanel([probeWith({ status: 'unhealthy' })]);
    expect(statCount('异常')).toBe(1);
  });

  it('② 补一条守恒断言：healthy + unhealthy 两条 → 「异常」计数恰为 1（不是全算、也不是全不算）', function () {
    renderPanel([
      probeWith({ agent_id: 1, agent_name: 'a-healthy', status: 'healthy' }),
      probeWith({ agent_id: 2, agent_name: 'a-unhealthy', status: 'unhealthy' }),
    ]);
    expect(statCount('异常')).toBe(1);
  });
});

describe('T-FIX-16 (a) · 面板不再读幽灵字段（行为锚，非 grep）', function () {
  it('喂 runtime 空串时「运行时」列退化为占位符 `-`（说明该列读的是 DTO 的真实键）', function () {
    renderPanel([probeWith({ status: 'healthy', runtime: '' })]);
    const nameCell = Array.from(document.querySelectorAll('td')).find(
      function (td) { return (td.textContent ?? '').trim() === 'probe-agent'; }
    );
    const row = nameCell!.closest('tr')!;
    expect((row.children[3].textContent ?? '').trim()).toBe('-');
  });

  it('喂 runtime="langgraph" 时「运行时」列显示该值（T-FIX-16 (c) 补键后这一列才有内容）', function () {
    renderPanel([probeWith({ status: 'healthy', runtime: 'langgraph' })]);
    const nameCell = Array.from(document.querySelectorAll('td')).find(
      function (td) { return (td.textContent ?? '').trim() === 'probe-agent'; }
    );
    const row = nameCell!.closest('tr')!;
    expect((row.children[3].textContent ?? '').trim()).toBe('langgraph');
  });
});
