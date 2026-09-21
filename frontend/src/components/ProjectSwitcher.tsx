import { useState, useEffect } from 'react';
import { Layers, Check } from 'lucide-react';
import { useAuth } from '../stores/auth';

interface Project { name: string; root: string; has_specs: boolean; is_current: boolean; }

export default function ProjectSwitcher({ collapsed }: { collapsed: boolean }) {
  const { isAdmin, rolePermissions } = useAuth();
  const canRead = isAdmin || rolePermissions.includes('project:read');
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);

  const fetchProjects = () => {
    fetch('/api/admin/projects').then(r => r.json()).then(d => {
      setProjects(d.projects || []);
    });
  };

  useEffect(() => { if (canRead) fetchProjects(); }, [canRead]);

  // 无 project:read 权限 → 不展示
  if (!canRead) return null;

  const switchProject = async (root: string) => {
    await fetch('/api/admin/projects/switch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ root }) });
    setOpen(false);
    window.location.reload();
  };

  const currentProject = projects.find(p => p.is_current);
  const curName = currentProject?.name || (projects[0]?.name || '无项目');

  // 无可见项目 → 只展示文字，不可展开
  if (projects.length === 0) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px',
        color: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)',
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        <Layers size={13} style={{ color: 'var(--text-muted)' }} />
        {!collapsed && <span>无项目</span>}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        className="btn btn-ghost btn-sm"
        style={{ width: '100%', justifyContent: collapsed ? 'center' : 'flex-start', gap: 6 }}
        aria-label="切换项目"
      >
        <Layers size={13} style={{ color: 'var(--text-muted)' }} />
        {!collapsed && <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{curName}</span>}
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 100,
            background: 'var(--bg-card)', border: '1px solid var(--border-strong)',
            borderRadius: 'var(--r-md)', minWidth: 180,
            boxShadow: 'var(--shadow-md)', padding: 4,
          }}>
            <div style={{ padding: '4px 8px', fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.04 }}>项目</div>
            {projects.map(p => (
              <button
                key={p.root}
                onClick={() => switchProject(p.root)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                  padding: '5px 8px', border: 'none', borderRadius: 'var(--r-sm)',
                  background: p.is_current ? 'var(--bg-selected)' : 'transparent',
                  color: p.is_current ? 'var(--blue)' : 'var(--text-secondary)',
                  cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font)',
                }}
              >
                <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                {p.has_specs && <span className="dot dot-green" title="含 .specs/" />}
                {p.is_current && <Check size={12} style={{ color: 'var(--blue)' }} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
