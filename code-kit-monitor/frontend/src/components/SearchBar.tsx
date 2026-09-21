import { useChanges } from '../stores/changes';

const STATUSES = ['all', 'normal', 'interrupted', 'blocked'];
const PHASES = ['all', '0-change', '1-requirement', '2-design', '2a-ui-design', '3-task', '4-dev', '5-test', '6-review', '7-integration'];

export default function SearchBar() {
  const { filter, setFilter } = useChanges();

  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
      <input
        type="text" placeholder="搜索 change-id / 关键词..." value={filter.q}
        onChange={(e) => setFilter({ q: e.target.value })}
        style={{ flex: 1, minWidth: 240, padding: '6px 12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)', fontFamily: 'var(--font-display)', fontSize: 13, outline: 'none' }}
      />
      <select value={filter.status} onChange={(e) => setFilter({ status: e.target.value })}
        style={{ padding: '6px 12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)', fontFamily: 'var(--font-body)', fontSize: 13 }}>
        {STATUSES.map((s) => <option key={s} value={s}>{s === 'all' ? '状态: 全部' : s}</option>)}
      </select>
      <select value={filter.phase} onChange={(e) => setFilter({ phase: e.target.value })}
        style={{ padding: '6px 12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)', fontFamily: 'var(--font-body)', fontSize: 13 }}>
        {PHASES.map((p) => <option key={p} value={p}>{p === 'all' ? '阶段: 全部' : p}</option>)}
      </select>
    </div>
  );
}
