import { useEffect, useState } from 'react';
import { Save, FileText, RefreshCw, Edit3 } from 'lucide-react';
import { cn, useFileNames } from '../hooks/useFileNames';
import { useAuth } from '../stores/auth';

interface FileInfo { path: string; size: number; type: string; }

export default function DocEditor() {
  const { isAdmin, rolePermissions } = useAuth();
  const canWrite = isAdmin || rolePermissions.includes('project:write');
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [selected, setSelected] = useState('');
  const [content, setContent] = useState('');
  const [original, setOriginal] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [customName, setCustomName] = useState('');
  const { map: nameMap, fetch: fetchNames } = useFileNames();

  useEffect(() => {
    fetchNames();
    fetch('/api/admin/files').then(r => r.json()).then(d => setFiles(d.files || []));
  }, []);

  const displayName = (path: string) => cn(path, nameMap);

  const openFile = async (path: string) => {
    setLoading(true); setSelected(path); setEditingName(false);
    setCustomName(nameMap[path] || '');
    const res = await fetch(`/api/admin/files/${encodeURIComponent(path)}`);
    const data = await res.json();
    setContent(data.content); setOriginal(data.content); setLoading(false); setSaved(false);
  };

  const saveFile = async () => {
    await fetch(`/api/admin/files/${encodeURIComponent(selected)}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }),
    });
    setOriginal(content); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const saveCustomName = async () => {
    const updated = { ...nameMap, [selected]: customName || selected.split('/').pop() || selected };
    useFileNames.setState({ map: updated });
    await fetch('/api/admin/file-names', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
    setEditingName(false);
  };

  const isModified = content !== original;
  const groups: Record<string, FileInfo[]> = {};
  const GROUP_NAMES: Record<string, string> = { prompts: '阶段流程', templates: '工件模板', reference: '参考文档', root: '核心文件' };
  files.forEach(f => {
    const dir = f.path.includes('/') ? f.path.split('/')[0] : 'root';
    if (!groups[dir]) groups[dir] = [];
    groups[dir].push(f);
  });

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* 文件树 */}
      <div style={{ width: 280, flexShrink: 0, borderRight: '1px solid var(--border)', overflow: 'auto', padding: 10 }}>
        {Object.entries(groups).map(([group, items]) => (
          <div key={group} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', padding: '4px 8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {GROUP_NAMES[group] || group}
              <span style={{ fontWeight: 400, marginLeft: 6, fontSize: 10 }}>{items.length}</span>
            </div>
            {items.map(f => {
              const name = displayName(f.path);
              const isEng = f.path.endsWith('.md') && !nameMap[f.path];
              return (
                <div key={f.path} onClick={() => openFile(f.path)}
                  style={{
                    padding: '5px 8px 5px 16px', cursor: 'pointer', borderRadius: 'var(--r-sm)',
                    fontSize: 12, color: selected === f.path ? 'var(--blue)' : isEng ? 'var(--text-muted)' : 'var(--text-secondary)',
                    background: selected === f.path ? 'var(--bg-selected)' : 'transparent',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                  <FileText size={11} style={{ flexShrink: 0, opacity: 0.5 }} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: isEng ? 'var(--font-mono)' : 'var(--font)' }}>
                    {name}
                  </span>
                  {isEng && <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>EN</span>}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* 编辑器 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {selected ? (
          <>
            <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                {editingName ? (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <input value={customName} onChange={e => setCustomName(e.target.value)} style={{ width: 160, padding: '3px 8px', fontSize: 12 }} placeholder="中文名" />
                    <button className="btn btn-primary btn-xs" onClick={saveCustomName}>保存</button>
                    <button className="btn btn-ghost btn-xs" onClick={() => setEditingName(false)}>取消</button>
                  </div>
                ) : (
                  <>
                    <span style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName(selected)}</span>
                    <button className="btn btn-ghost btn-xs" onClick={() => { setCustomName(nameMap[selected] || ''); setEditingName(true); }} title="设置中文名"><Edit3 size={10} /></button>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{selected}</span>
                  </>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{content.length.toLocaleString()} 字符</span>
                {isModified && <span style={{ fontSize: 11, color: 'var(--orange)' }}>已修改</span>}
                {saved && <span className="badge badge-green">已保存</span>}
                {canWrite && <button className="btn btn-sm" onClick={() => openFile(selected)} disabled={loading}><RefreshCw size={12} /></button>}
                {canWrite && <button className="btn btn-primary btn-sm" onClick={saveFile} disabled={!isModified}><Save size={12} /> 保存</button>}
                {!canWrite && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>只读</span>}
              </div>
            </div>
            <textarea
              value={content} onChange={e => canWrite && setContent(e.target.value)}
              readOnly={!canWrite}
              style={{ flex: 1, width: '100%', resize: 'none', border: 'none', borderRadius: 0, background: 'var(--bg-input)', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 1.7, padding: '12px 16px', outline: 'none', tabSize: 2, cursor: canWrite ? 'text' : 'default' }}
              spellCheck={false}
            />
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <div style={{ textAlign: 'center' }}>
              <FileText size={40} style={{ marginBottom: 12, opacity: 0.1 }} />
              <p>← 选择文件开始编辑</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>可直接编辑 code-kit 的 prompts / templates / rules</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>点击文件名旁的 ✏️ 可设置中文展示名</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
