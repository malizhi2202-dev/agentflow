/** 编排文档全页查看/编辑 — MD/YAML 双格式. */
import { useEffect, useState } from 'react';
import { ChevronLeft, Save, FileText, FileCode, RotateCcw } from 'lucide-react';

const uid = () => localStorage.getItem('current_user_id') || 'admin';

export default function OrchDocPage() {
  const path = window.location.pathname; // /orchestration/:id/md or /orchestration/:id/yaml
  const match = path.match(/\/orchestration\/(\d+)\/(md|yaml)/);
  const id = match ? parseInt(match[1]) : 0;
  const mode = match ? match[2] : 'yaml';

  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/orchestration/${id}`, { headers: { 'X-User-Id': uid() } })
      .then((r) => r.json())
      .then((d) => {
        setName(d.name || '');
        // Load appropriate format
        if (mode === 'md') {
          fetch(`/api/orchestration/${id}/md`, { headers: { 'X-User-Id': uid() } })
            .then((r) => r.text())
            .then((t) => { setContent(t); setLoading(false); });
        } else {
          setContent(d.yaml_raw || '');
          setLoading(false);
        }
      });
  }, [id, mode]);

  const handleSave = async () => {
    const mdContent = mode === 'md' ? content : '';
    await fetch(`/api/orchestration/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-User-Id': uid() },
      body: JSON.stringify(mode === 'yaml' ? { yaml_raw: content } : { yaml_raw: content }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
        borderBottom: '1px solid var(--border)', background: 'var(--bg-card)',
      }}>
        <a href="/orchestration" style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 11 }}>
          <ChevronLeft size={14} /> 列表
        </a>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 14 }}>
          {name}
        </span>
        <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, background: 'var(--blue-bg)', color: 'var(--blue)', fontWeight: 500 }}>
          {mode === 'md' ? 'Markdown' : 'YAML'}
        </span>
        <div style={{ flex: 1 }} />
        {mode === 'yaml' ? (
          <a href={`/orchestration/${id}/md`} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 11 }}>
            <FileText size={12} /> 查看 MD
          </a>
        ) : (
          <a href={`/orchestration/${id}/yaml`} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 11 }}>
            <FileCode size={12} /> 查看 YAML
          </a>
        )}
        <a href={`/orchestration/${id}/edit`} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: 'var(--bg-card)', border: '1px solid var(--color-primary)', borderRadius: 'var(--r-sm)', color: 'var(--color-primary)', textDecoration: 'none', fontSize: 11 }}>
          <RotateCcw size={12} /> 编辑画布
        </a>
        <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', background: saved ? 'var(--green)' : 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer', fontSize: 11, transition: 'background var(--fast)' }}>
          <Save size={12} /> {saved ? '已保存' : '保存'}
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', padding: 16 }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
            ⏳ 加载中...
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{
              width: '100%', height: '100%',
              background: '#0b0c10',
              color: '#e1e2e5',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)',
              padding: 16,
              fontSize: mode === 'md' ? 13 : 12,
              fontFamily: mode === 'md' ? 'var(--font)' : "'JetBrains Mono', 'Fira Code', monospace",
              lineHeight: 1.7,
              resize: 'none',
              boxSizing: 'border-box',
              tabSize: 2,
            }}
          />
        )}
      </div>
    </div>
  );
}
