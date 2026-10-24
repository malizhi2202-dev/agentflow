/**
 * 决策模型目录（原型 6.23）—— P4 后接**真后端** `/api/decision-models`。
 *
 * 口径：登记 ≠ 在用（未绑定 ⇒ 直通）；绑定是每行独立开关，默认全关；
 * 健康态只由探测得出，没配探测适配器时重探返回 `unprobed`（fail-closed，不假装健康）。
 */
import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Plus, RefreshCw } from 'lucide-react';
import { dedupedFetch, invalidateCache } from '../utils/requestDedup';

interface Model {
  id: number; name: string; track: string; kind: string; health: string;
  latency_p95_ms: number | null; threshold: number; escalated: number; fallback: number;
  bindings: string[]; enabled: boolean;
}

const BINDINGS: { key: string; label: string }[] = [
  { key: 'route', label: '路由决策' },
  { key: 'chat_triage', label: '对话分诊' },
  { key: 'simple_task', label: '简单任务' },
];
const HEALTH_LABEL: Record<string, string> = { healthy: 'healthy', degraded: 'degraded', unprobed: '未探测' };

export default function DecisionModels() {
  const [models, setModels] = useState<Model[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', track: 'local', kind: '' });

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const res = await dedupedFetch('/api/decision-models');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(data?.detail || `读取失败 (${res.status})`); return; }
      setModels(data.models || []);
    } catch (e: any) { setErr(e?.message || '网络错误'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const write = async (url: string, body: any) => {
    setErr(null); setNote(null);
    const res = await dedupedFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    invalidateCache();
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setErr(data?.detail || `请求失败 (${res.status})`); return null; }
    await load();
    return data;
  };

  const register = async () => {
    if (!form.name.trim()) { setErr('模型名称不能为空'); return; }
    const data = await write('/api/decision-models', { name: form.name.trim(), track: form.track, kind: form.kind });
    if (data) { setForm({ name: '', track: 'local', kind: '' }); setNote('已登记（默认未绑定、未探测）'); }
  };

  const toggleBinding = async (m: Model, binding: string) => {
    const on = m.bindings.includes(binding);
    await write(`/api/decision-models/${m.id}/bindings`, { binding, enabled: !on });
  };

  const reprobe = async (m: Model) => {
    const data = await write(`/api/decision-models/${m.id}/reprobe`, {});
    if (data) setNote(data.detail);
  };

  return (
    <div className="panel">
      <div className="toolbar" style={{ marginBottom: 8 }}>
        <span className="section-title">决策模型目录</span>
        <span className="chip mono">{models.length} 个</span>
        <span className="grow" />
        {note && <span className="chip ok" role="status">{note}</span>}
        <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}><RefreshCw size={13} /> 刷新</button>
      </div>
      <p className="page-note">
        未绑定 ⇒ 直通（标签匹配 + 最小连接数）：登记不等于在用。健康态由探测决定，无探测适配器时为「未探测」。
      </p>
      {err && <div role="alert" style={{ color: 'var(--red)', fontSize: 12, margin: '6px 0', display: 'flex', gap: 6 }}><AlertCircle size={14} />{err}</div>}

      <div className="toolbar" style={{ margin: '8px 0' }}>
        <input aria-label="模型名称" className="input" placeholder="模型名称"
               value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <select aria-label="轨道" className="input" value={form.track} onChange={(e) => setForm({ ...form, track: e.target.value })}>
          <option value="local">local</option>
          <option value="cloud">cloud</option>
        </select>
        <input aria-label="类型/量化" className="input" placeholder="类型/量化（如 Q4_K_M · 1.3GB）"
               value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} />
        <button className="btn btn-primary btn-sm" onClick={register}><Plus size={13} /> 登记模型</button>
      </div>

      <table className="tbl compact" aria-label="决策模型目录">
        <thead>
          <tr><th>模型 / 轨道</th><th>类型</th><th>健康态</th><th>延迟 P95</th><th>用途绑定（独立开关 · 默认全关）</th><th>阈值 · 统计</th><th>操作</th></tr>
        </thead>
        <tbody>
          {models.map((m) => (
            <tr key={m.id}>
              <td><div style={{ fontWeight: 600 }}>{m.name}</div><div className="chip mono" style={{ marginTop: 2 }}>{m.track}</div></td>
              <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{m.kind || '—'}</td>
              <td><span className={`chip ${m.health === 'healthy' ? 'ok' : m.health === 'unprobed' ? 'warn' : 'bad'}`}>{HEALTH_LABEL[m.health] || m.health}</span></td>
              <td style={{ fontFamily: 'var(--font-mono)' }}>{m.latency_p95_ms == null ? '—' : `${m.latency_p95_ms}ms`}</td>
              <td>
                {BINDINGS.map((b) => (
                  <label key={b.key} style={{ marginRight: 10, fontSize: 11.5, color: 'var(--text-secondary)' }}>
                    <input type="checkbox" aria-label={`${m.name} ${b.label}`} checked={m.bindings.includes(b.key)}
                           onChange={() => toggleBinding(m, b.key)} />{' '}{m.bindings.includes(b.key) ? '开' : '关'} · {b.label}
                  </label>
                ))}
              </td>
              <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>阈值 {m.threshold} · escalated {m.escalated} · fallback {m.fallback}</td>
              <td><button className="btn btn-ghost btn-sm" onClick={() => reprobe(m)}>重探</button></td>
            </tr>
          ))}
          {models.length === 0 && !loading && !err && (
            <tr><td colSpan={7} style={{ color: 'var(--text-muted)' }}>还没有登记模型。登记后先保持「未绑定」，绑定开关决定它是否真的参与路由。</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
