import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useChanges } from '../stores/changes';

export default function TopBar() {
  const { summary: s } = useChanges();
  const [tokenToday, setTokenToday] = useState(0);
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    fetch('/api/token-usage').then(r => r.json()).then(d => setTokenToday(d.total_today || 0)).catch(() => {});
    const t = setInterval(() => { fetch('/api/token-usage').then(r => r.json()).then(d => setTokenToday(d.total_today || 0)).catch(() => {}); }, 30000);
    return () => clearInterval(t);
  }, []);

  const alarms = s ? s.alerts + s.blocked : 0;

  return (
    <header style={{ height: 44, background: 'var(--bg-panel)', borderBottom: '1px solid var(--border-weak)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', fontSize: 13, position: 'sticky', top: 0, zIndex: 100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          <span style={{ color: 'var(--blue)' }}>code-kit</span> monitor
        </span>
        {s && (
          <div style={{ display: 'flex', gap: 16, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-weak)' }}>
            <span><span className="status-dot status-dot-green" style={{ marginRight: 4 }} />{s.active_changes} active</span>
            <span><span className="status-dot status-dot-blue" style={{ marginRight: 4 }} />{s.done_tasks}/{s.total_tasks} tasks</span>
            <span><span className="status-dot" style={{ background: s.gates_passed === '0/0' ? 'var(--text-weak)' : 'var(--green)', marginRight: 4 }} />{s.gates_passed} gates</span>
            {alarms > 0 && <span style={{ color: 'var(--red)' }}><span className="status-dot status-dot-red" style={{ marginRight: 4 }} />{alarms}</span>}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ color: 'var(--text-weak)', fontSize: 12 }}>Token <b style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{tokenToday.toLocaleString()}</b></span>
        <button onClick={() => { const n = theme === 'dark' ? 'light' : 'dark'; setTheme(n); document.documentElement.setAttribute('data-theme', n); }} className="btn btn-ghost btn-sm">
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>
    </header>
  );
}
