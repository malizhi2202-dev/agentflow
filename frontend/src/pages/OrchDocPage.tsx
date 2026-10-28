/** 编排文档全页查看/编辑 — MD/YAML 双格式. */
import { useEffect, useState } from 'react';
import { ChevronLeft, Save, FileText, FileCode, RotateCcw, AlertCircle } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Toolbar from '../components/ui/Toolbar';

export default function OrchDocPage() {
  const path = window.location.pathname; // /orchestration/:id/md or /orchestration/:id/yaml
  const match = path.match(/\/orchestration\/(\d+)\/(md|yaml)/);
  const id = match ? parseInt(match[1], 10) : 0;
  const mode = match ? match[2] : 'yaml';

  const [name, setName] = useState('编排文档');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const loadDocument = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await fetch(`/api/orchestration/${id}`);
      if (!response.ok) throw new Error('load failed');
      const detail = await response.json();
      setName(detail.name || '编排文档');
      if (mode === 'md') {
        const markdownResponse = await fetch(`/api/orchestration/${id}/md`);
        if (!markdownResponse.ok) throw new Error('markdown load failed');
        setContent(await markdownResponse.text());
      } else {
        setContent(detail.yaml_raw || '');
      }
    } catch {
      setLoadError('文档加载失败，请重试。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadDocument(); }, [id, mode]);

  const handleSave = async () => {
    setSaveState('saving');
    try {
      const response = await fetch(`/api/orchestration/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        // 保留既有 API 合同：文档编辑最终写回 yaml_raw。
        body: JSON.stringify({ yaml_raw: content }),
      });
      if (!response.ok) throw new Error('save failed');
      setSaveState('saved');
      window.setTimeout(() => setSaveState('idle'), 2000);
    } catch {
      setSaveState('error');
    }
  };

  const saveLabel = saveState === 'saving' ? '保存中…' : saveState === 'saved' ? '已保存' : '保存';

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title={name}
        context={`编排文档 · ${mode === 'md' ? 'Markdown' : 'YAML'}`}
        summary={loading ? '正在读取文档…' : loadError ? '文档暂时不可用' : `编排实例 #${id}`}
        autoFocus
        action={(
          <button className="btn btn-primary" onClick={handleSave} disabled={loading || !!loadError || saveState === 'saving'}>
            <Save size={13} /> {saveLabel}
          </button>
        )}
      />

      <div className="app-body" style={{ flex: 1, minHeight: 0 }}>
        <Toolbar>
          <a href="/orchestration" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>
            <ChevronLeft size={14} /> 返回列表
          </a>
          {mode === 'yaml' ? (
            <a href={`/orchestration/${id}/md`} className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>
              <FileText size={13} /> 查看 Markdown
            </a>
          ) : (
            <a href={`/orchestration/${id}/yaml`} className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>
              <FileCode size={13} /> 查看 YAML
            </a>
          )}
          <a href={`/orchestration/${id}/edit`} className="btn btn-sm" style={{ textDecoration: 'none', color: 'var(--color-brand)' }}>
            <RotateCcw size={13} /> 编辑画布
          </a>
          <span className="grow" />
          <span className="chip mono">{mode === 'md' ? 'Markdown' : 'YAML'}</span>
        </Toolbar>

        {loadError && (
          <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--red)', fontSize: 12 }}>
            <AlertCircle size={14} />
            <span>{loadError}</span>
            <button className="btn btn-ghost btn-xs" onClick={() => void loadDocument()}>重试</button>
          </div>
        )}

        {saveState === 'saved' && <div role="status" aria-live="polite" className="chip ok">文档已保存。</div>}
        {saveState === 'error' && (
          <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--red)', fontSize: 12 }}>
            <AlertCircle size={14} /> 保存失败，已保留当前输入。
            <button className="btn btn-ghost btn-xs" onClick={handleSave}>重试保存</button>
          </div>
        )}

        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 220px', gap: 'var(--space-3)' }}>
          <main aria-label="文档编辑区" style={{ minHeight: 320 }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                正在加载文档…
              </div>
            ) : (
              <textarea
                aria-label={`${mode === 'md' ? 'Markdown' : 'YAML'} 文档内容`}
                value={content}
                onChange={(event) => { setContent(event.target.value); setSaveState('idle'); }}
                style={{
                  width: '100%', height: '100%', minHeight: 360,
                  background: 'var(--color-surface)', color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-md)',
                  padding: 16, fontSize: mode === 'md' ? 13 : 12,
                  fontFamily: mode === 'md' ? 'var(--font-body)' : 'var(--font-mono)',
                  lineHeight: 1.7, resize: 'none', tabSize: 2,
                }}
              />
            )}
          </main>
          <aside aria-label="文档辅助信息" className="panel" style={{ alignSelf: 'start' }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>文档信息</h2>
            <dl style={{ display: 'grid', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
              <div><dt style={{ color: 'var(--text-muted)' }}>格式</dt><dd>{mode === 'md' ? 'Markdown' : 'YAML'}</dd></div>
              <div><dt style={{ color: 'var(--text-muted)' }}>实例 ID</dt><dd className="mono">#{id}</dd></div>
            </dl>
            <p className="page-note" style={{ marginTop: 16 }}>保存失败时会保留当前输入，可直接重试。</p>
          </aside>
        </div>
      </div>
    </div>
  );
}
