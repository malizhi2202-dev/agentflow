/**
 * 阶段模型配置（原型 6.19 · `/admin/stage-model`）
 *
 * 真实数据：`GET /api/admin/workflow`（P0-6 单一事实源），保存走 `PUT`（带 If-Match/ETag，冲突 412 不盲覆盖）。
 * 口径：阶段表是**全平台唯一事实源**（后端 stage_config）；本页只改名称，不改「语义锚」行为
 * （原型：自定义阶段只继承生命周期，禁止继承停车/评审/失败恢复行为）。
 */
import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, RefreshCw, Save } from 'lucide-react';
import { safeFetch, dedupedFetch, invalidateCache } from '../utils/requestDedup';

interface Stage { id: string; name: string; gate: string; prompt: string; order: number }

export default function StageModel() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [etag, setEtag] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [canWrite, setCanWrite] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const res = await dedupedFetch('/api/admin/workflow');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(data?.detail || `读取失败 (${res.status})`); return; }
      setStages(data?.workflow?.stages || []);
      setEtag(res.headers.get('ETag'));
      setEdits({});
    } catch (e: any) {
      setErr(e?.message || '网络错误');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const rename = (id: string, name: string) => setEdits((m) => ({ ...m, [id]: name }));

  const save = async () => {
    setErr(null); setSaved(null);
    const next = stages.map((s) => (s.id in edits ? { ...s, name: edits[s.id] } : s));
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (etag) headers['If-Match'] = etag;
      const res = await dedupedFetch('/api/admin/workflow', {
        method: 'PUT', headers, body: JSON.stringify({ apiVersion: 'agentflow/v1', kind: 'WorkflowConfig', spec: { stages: next } }),
      });
      invalidateCache();
      const data = await res.json().catch(() => ({}));
      if (res.status === 403) { setCanWrite(false); setErr(data?.detail || '需要 project:write 权限'); return; }
      if (!res.ok) { setErr(data?.detail || `保存失败 (${res.status})`); return; }
      setSaved('已保存（阶段表已热更新）');
      await load();
    } catch (e: any) {
      setErr(e?.message || '网络错误');
    }
  };

  return (
    <div className="panel">
      <div className="toolbar" style={{ marginBottom: 8 }}>
        <span className="section-title">阶段表（唯一事实源）</span>
        <span className="chip mono">{stages.length} 个阶段</span>
        <span className="grow" />
        {saved && <span className="chip ok" role="status">{saved}</span>}
        <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
          <RefreshCw size={13} /> 刷新
        </button>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={!canWrite || Object.keys(edits).length === 0}>
          <Save size={13} /> 保存
        </button>
      </div>

      <p className="page-note">
        语义锚（unstarted / started / done / closed）由生命周期固定；自定义阶段只继承生命周期，
        不能继承「停车 / 评审 / 失败恢复」行为。保存带 If-Match：磁盘上的配置被别人改过会 412 拒绝，不盲覆盖。
      </p>

      {err && (
        <div role="alert" style={{ color: 'var(--red)', fontSize: 12, margin: '8px 0', display: 'flex', gap: 6 }}>
          <AlertCircle size={14} /> {err}
        </div>
      )}

      <table className="tbl compact" aria-label="阶段表">
        <thead>
          <tr><th>#</th><th>阶段 id</th><th>名称（可改）</th><th>门禁</th><th>提示词</th></tr>
        </thead>
        <tbody>
          {stages.map((s) => (
            <tr key={s.id}>
              <td style={{ fontFamily: 'var(--font-mono)' }}>{s.order}</td>
              <td style={{ fontFamily: 'var(--font-mono)' }}>{s.id}</td>
              <td>
                <input aria-label={`阶段名称 ${s.id}`} className="input"
                       value={edits[s.id] ?? s.name}
                       onChange={(e) => rename(s.id, e.target.value)}
                       style={{ width: '100%', padding: '3px 6px', fontSize: 12, background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4 }} />
              </td>
              <td><span className="chip mono">{s.gate || '—'}</span></td>
              <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{s.prompt}</td>
            </tr>
          ))}
          {!loading && stages.length === 0 && !err && (
            <tr><td colSpan={5} style={{ color: 'var(--text-muted)' }}>没有读到阶段表（后端未初始化？）</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
