/**
 * 看板视图过滤（原型 board.html「视图 = 筛选快照」卡 + 变体 board__af-109 / af-116）
 *
 * 两条要落的口径：
 * 1. **需我处理** = 与我有关（创建者 / 派给我）且**已受理**（triage=triaged）；
 *    原型写作「creator/复核人=我 · triage=accepted」——复核人字段后端未接入，故按现有两列推导。
 * 2. **负责人含 Agent** = `assignee_kind=agent`（负责人轨过滤，与状态轴无关）。
 *
 * 过滤都真打端点（`GET /api/tasks?mine=…&triage_state=…&assignee_kind=…`），
 * 不做纯前端假筛；且**状态可见可清**：生效中的过滤逐条列在下面，带 ✕ 与「清除全部」。
 */

export interface BoardFiltersState {
  /** 需我处理：与我有关 且 已受理 */
  urgent: boolean;
  /** 负责人含 Agent */
  agentAssignee: boolean;
}

export const EMPTY_FILTERS: BoardFiltersState = { urgent: false, agentAssignee: false };

export interface ActiveFilter {
  key: keyof BoardFiltersState;
  label: string;
  hint: string;
}

export const FILTER_DEFS: (ActiveFilter & { title: string })[] = [
  {
    key: 'urgent',
    label: '需我处理',
    hint: '与我有关（我建的 / 派给我的）· 已受理',
    title: '需我处理：creator/复核人=我 · 受理=已受理（复核人字段后端未接入，按现有两列推导）',
  },
  {
    key: 'agentAssignee',
    label: '负责人含 Agent',
    hint: 'assignee_kind=agent',
    title: '负责人含 Agent：负责人轨过滤（只筛负责人是 Agent 的任务，不改状态）',
  },
];

/** 当前生效的过滤（顺序稳定，供「已生效」行与请求参数共用）。 */
export function activeFilters(state: BoardFiltersState): ActiveFilter[] {
  return FILTER_DEFS.filter((f) => state[f.key]);
}

/** 翻转一项（显式分支，避免 `{...state, [key]: v}` 在联合键上丢类型）。 */
export function toggleFilter(state: BoardFiltersState, key: keyof BoardFiltersState): BoardFiltersState {
  if (key === 'urgent') return { ...state, urgent: !state.urgent };
  return { ...state, agentAssignee: !state.agentAssignee };
}

/** 清掉一项。 */
export function clearFilter(state: BoardFiltersState, key: keyof BoardFiltersState): BoardFiltersState {
  if (key === 'urgent') return { ...state, urgent: false };
  return { ...state, agentAssignee: false };
}

export default function BoardFilters({
  value, onChange, total,
}: {
  value: BoardFiltersState;
  onChange: (next: BoardFiltersState) => void;
  total: number;
}) {
  const active = activeFilters(value);
  return (
    <div className="toolbar" role="toolbar" aria-label="看板视图过滤">
      {FILTER_DEFS.map((f) => (
        <button
          key={f.key}
          type="button"
          className={`chip${value[f.key] ? ' info' : ''}`}
          style={{ cursor: 'pointer' }}
          aria-pressed={value[f.key]}
          title={f.title}
          onClick={() => onChange(toggleFilter(value, f.key))}
        >
          {f.label}
        </button>
      ))}

      <span className="chip mono" role="status" title="当前返回条数（受生效过滤影响）">共 {total} 条</span>

      {active.length > 0 && (
        <>
          <span className="chip warn" title="生效中的过滤（逐条可清）">
            视图已收窄 · {active.length} 项
          </span>
          {active.map((f) => (
            <span key={f.key} className="chip info" title={f.hint}>
              {f.label}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ marginLeft: 4, padding: '0 4px' }}
                aria-label={`清除过滤：${f.label}`}
                onClick={() => onChange(clearFilter(value, f.key))}
              >
                ✕
              </button>
            </span>
          ))}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onChange({ ...EMPTY_FILTERS })}
          >
            清除全部过滤
          </button>
        </>
      )}
    </div>
  );
}
