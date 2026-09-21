export default function TabNav({ tabs, active, onSelect }: { tabs: string[]; active: string; onSelect: (t: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--color-grid)' }}>
      {tabs.map((t) => (
        <button
          key={t} onClick={() => onSelect(t)}
          style={{
            padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer',
            color: t === active ? 'var(--color-text)' : 'var(--color-text-dim)',
            fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: t === active ? 600 : 400,
            borderBottom: t === active ? '2px solid var(--color-primary)' : '2px solid transparent',
            transition: 'color var(--duration-micro), border-color var(--duration-micro)',
          }}
        >{t}</button>
      ))}
    </div>
  );
}
