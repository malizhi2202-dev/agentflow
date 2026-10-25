/**
 * Agent 详情/创建 · tab 与分区映射的唯一事实源（change: v26-agent-ui）
 *
 * 为什么单独一份：详情六栏/创建两栏、能力 5 子栏、设置 7 子栏、创建态隐藏探活与危险区、
 * 默认落栏——这些形态口径散在壳层、渲染面与验收用例三处，写三份必然漂移（与 meta.ts 同思路）。
 * 顶层标签集只在这里定义；壳层与测试都从这张表要数组。
 *
 * 原型基线：`.specs/product-design/prototype/agent-detail.html`
 * - 一级四标签 概览/工作/能力/设置 + 能力 5 子栏（指令/技能/MCP/集成/知识源与编排）
 *   + 设置 7 子栏（通用/Access/环境/CLI 参数/闸门/探活/危险区）；
 * - 实现侧差异（RULINGS §五点六 R26-2）：既有「记忆/对话」两栏真功能暂保留为顶层栏，监控并入概览；
 * - 创建态（主档 §6.4）：**探活与危险区不进创建页**；默认落「设置·通用」——名称(sec1)+运行时模型(sec4)
 *   两项必填的所在栏，藏进不可见栏会让「必填 2 项即可创建」变死锁。
 */
import { SECTIONS } from '../agent-config/meta';

/** 顶层栏 id（详情全集；创建态只含 cap/set） */
export type TopTabId = 'overview' | 'work' | 'cap' | 'set' | 'memory' | 'chat';

export interface TopTabDef { id: TopTabId; label: string }

/** 详情六栏（v26 裁定 B：原型四栏 + 既有记忆/对话两栏；监控并入概览） */
export const TOP_TABS_DETAIL: TopTabDef[] = [
  { id: 'overview', label: '概览' },
  { id: 'work', label: '工作' },
  { id: 'cap', label: '能力' },
  { id: 'set', label: '设置' },
  { id: 'memory', label: '记忆' },
  { id: 'chat', label: '对话' },
];

/** 创建两栏（同骨架 tab 化——「两种入口一份配置」按最强形态落地） */
export const TOP_TABS_CREATE: TopTabDef[] = [
  { id: 'cap', label: '能力' },
  { id: 'set', label: '设置' },
];

export type CapPaneId = 'instr' | 'skill' | 'mcp' | 'int' | 'know';
export type SetPaneId = 'gen' | 'acc' | 'env' | 'cli' | 'gate' | 'probe' | 'danger';
export type PaneId = CapPaneId | SetPaneId;

export interface PaneDef {
  id: PaneId;
  label: string;
  /** 该子栏承载的分区锚点 id（对 meta.ts SECTIONS 的引用，深链 #secN 仍有效） */
  sections: string[];
}

/** 能力 5 子栏（名对齐主档 §6.4；「知识源与编排」按原型并为一栏两节） */
export const CAP_PANES: PaneDef[] = [
  { id: 'instr', label: '指令', sections: ['sec3'] },
  { id: 'skill', label: '技能', sections: ['sec10'] },
  { id: 'mcp', label: 'MCP', sections: ['sec8'] },
  { id: 'int', label: '集成', sections: ['sec9', 'sec-im'] },
  { id: 'know', label: '知识源与编排', sections: ['sec11', 'sec12'] },
];

/** 设置 7 子栏 */
export const SET_PANES: PaneDef[] = [
  { id: 'gen', label: '通用', sections: ['sec1', 'sec2', 'sec4', 'sec5'] },
  { id: 'acc', label: 'Access', sections: ['sec13'] },
  { id: 'env', label: '环境', sections: ['sec6'] },
  { id: 'cli', label: 'CLI 参数', sections: ['sec7'] },
  { id: 'gate', label: '闸门', sections: ['sec14'] },
  { id: 'probe', label: '探活', sections: ['sec15'] },
  { id: 'danger', label: '危险区', sections: ['sec16'] },
];

/** 创建态设置子栏：**探活与危险区不进创建页**（主档 §6.4 口径，非本批自造） */
export const SET_PANES_CREATE: PaneDef[] = SET_PANES.filter(
  (p) => p.id !== 'probe' && p.id !== 'danger',
);

export const DEFAULT_TOP_DETAIL: TopTabId = 'overview';
/** 创建默认栏 = 含两项必填的「设置」（其默认子栏为通用） */
export const DEFAULT_TOP_CREATE: TopTabId = 'set';
export const DEFAULT_CAP_PANE: CapPaneId = 'instr';
/** 通用栏含 sec1 名称 + sec4 运行时模型——必填 2 项的落点，必须默认可见 */
export const DEFAULT_SET_PANE: SetPaneId = 'gen';

/** 分区 id → 「N · 标题」（供栏头/测试引用；与 meta.ts 同源） */
export function sectionTitle(id: string): string | undefined {
  const s = SECTIONS.find((x) => x.id === id);
  return s ? s.no + ' · ' + s.title : undefined;
}
