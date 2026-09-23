import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  capabilitiesOf,
  groupByCapability,
  groupKeyOf,
  UNGROUPED_LABEL,
  type CapabilityCarrier,
} from '../components/capability/groupByCapability';
import CapabilityGroupHeader from '../components/capability/CapabilityGroupHeader';

// T-FIX-05 · F18/REVIEW §2.1(F17) 的可执行判据：
// 「把内联代码搬进新文件」与「接上同一条具名归一规则」是两件事，
// 下面的归一用例专门用来把前者判成失败（今天 = 红）。
type Row = CapabilityCarrier & { id: number; name: string; status: string };

function row(id: number, capabilities: unknown): Row {
  return {
    id,
    name: `agent-${id}`,
    status: 'running',
    model_config_json: capabilities === undefined ? {} : { capabilities },
  };
}

describe('groupByCapability · 搬家判据（不依赖归一，锁住既有语义）', () => {
  it('按 capability 分组，多能力 Agent 落多组', () => {
    const groups = groupByCapability([row(1, ['code-review']), row(2, ['code-review', 'deploy'])]);
    expect(Object.keys(groups).sort()).toEqual(['code-review', 'deploy']);
    expect(groups['code-review'].map((a) => a.id)).toEqual([1, 2]);
    expect(groups['deploy'].map((a) => a.id)).toEqual([2]);
  });

  it('无 capabilities 的 Agent 落 未分类', () => {
    const groups = groupByCapability([row(1, []), row(2, undefined)]);
    expect(Object.keys(groups)).toEqual([UNGROUPED_LABEL]);
    expect(groups[UNGROUPED_LABEL].map((a) => a.id)).toEqual([1, 2]);
  });

  it('返回纯 Record，同一元素引用不被复制', () => {
    const a = row(1, ['x']);
    expect(groupByCapability([a])['x'][0]).toBe(a);
  });

  it('组键格式 = 域 key + ":" + 归一后能力名（折叠态与排队计数共用）', () => {
    expect(groupKeyOf('default', 'code-review')).toBe('default:code-review');
  });
});

describe('capabilitiesOf · F18 具名归一规则（今天必红：搬家版不做归一）', () => {
  it('空串能力不得自成一组，须落 未分类', () => {
    const groups = groupByCapability([row(1, [''])]);
    expect(Object.keys(groups)).not.toContain('');
    expect(groups[UNGROUPED_LABEL].map((a) => a.id)).toEqual([1]);
  });

  it('纯空白能力等同无能力', () => {
    const groups = groupByCapability([row(1, ['   ', '\t'])]);
    expect(Object.keys(groups)).toEqual([UNGROUPED_LABEL]);
  });

  it('前后空格归一后与规范值同组', () => {
    const groups = groupByCapability([row(1, ['code-review']), row(2, [' code-review '])]);
    expect(Object.keys(groups)).toEqual(['code-review']);
    expect(groups['code-review'].map((a) => a.id)).toEqual([1, 2]);
  });

  it('归一后同一 Agent 内的重复项去重（F17：不得拆成两组）', () => {
    expect(capabilitiesOf(row(1, ['code-review', ' code-review ']))).toEqual(['code-review']);
  });

  it('折叠连续空白，但不折叠大小写（与后端 capabilities_of 契约一致）', () => {
    expect(capabilitiesOf(row(1, ['  a\t\tb  ']))).toEqual(['a b']);
    expect(capabilitiesOf(row(1, ['Code-Review']))).toEqual(['Code-Review']);
  });

  it('非字符串项 / 非数组 / 缺字段一律丢弃，不抛异常', () => {
    expect(capabilitiesOf(row(1, ['ok', 7, null, undefined, {}, '']))).toEqual(['ok']);
    expect(capabilitiesOf(row(2, 'code-review'))).toEqual([]);
    expect(capabilitiesOf(row(3, null))).toEqual([]);
    expect(capabilitiesOf({})).toEqual([]);
    expect(capabilitiesOf(undefined)).toEqual([]);
    expect(capabilitiesOf(null)).toEqual([]);
  });

  it('归一后只剩空值的 Agent 落 未分类', () => {
    const groups = groupByCapability([row(1, ['', '  ', 7])]);
    expect(Object.keys(groups)).toEqual([UNGROUPED_LABEL]);
  });
});

describe('CapabilityGroupHeader · 拆分后只剩分组展示', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('渲染组名与健康概要（N healthy / M total）', () => {
    render(
      <CapabilityGroupHeader
        capability="code-review"
        healthyCount={3}
        totalCount={5}
        isExpanded={false}
        onToggle={() => {}}
      />,
    );
    expect(screen.getByText(/code-review/)).toBeInTheDocument();
    expect(screen.getByText(/3 healthy \/ 5 total/)).toBeInTheDocument();
  });

  it('点击折叠头触发 onToggle', () => {
    const onToggle = vi.fn();
    render(
      <CapabilityGroupHeader
        capability="deploy"
        healthyCount={0}
        totalCount={1}
        isExpanded={false}
        onToggle={onToggle}
      />,
    );
    fireEvent.click(screen.getByText(/deploy/));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('操作面通过 actions 插槽注入，组件自身不碰路由/扩容态', () => {
    render(
      <CapabilityGroupHeader
        capability="deploy"
        healthyCount={1}
        totalCount={1}
        isExpanded
        onToggle={() => {}}
        actions={<span data-testid="ops-slot">ops</span>}
      />,
    );
    expect(screen.getByTestId('ops-slot')).toBeInTheDocument();
  });
});
