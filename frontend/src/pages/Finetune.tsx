/**
 * 微调工厂与三指标自测（原型 6.24）—— P4 后接**真后端** `/api/decision-models/finetune/batches`。
 *
 * 门禁由服务端判定（准确率门 + ECE 门 + 硬件预检），前端只展示 verdict 与原因，不本地算结论。
 */
import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { dedupedFetch, invalidateCache } from '../utils/requestDedup';

interface Batch {
  id: number; task_name: string; base_model: string; data_sessions: number; data_memories: number;
  fingerprint: string; engine: string; hw_ok: boolean; status: string;
  acc: number | null; ece: number | null; agree: number | null;
  gate_verdict: string; gate_reason: string;
}

export default function Finetune() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ task_name: '', base_model: '', hw_ok: true, acc: '', ece: '', agree: '' });

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const res = await dedupedFetch('/api/decision-models/finetune/batches');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(data?.detail || `读取失败 (${res.status})`); return; }
      setBatches(data.batches || []);
    } catch (e: any) { setErr(e?.message || '网络错误'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    setErr(null);
    if (!form.task_name.trim()) { setErr('任务名不能为空'); return; }
    const payload: any = {
      task_name: form.task_name.trim(), base_model: form.base_model, hw_ok: form.hw_ok,
      acc: form.acc === '' ? null : Number(form.acc),
      ece: form.ece === '' ? null : Number(form.ece),
      agree: form.agree === '' ? null : Number(form.agree),
    };
    const res = await dedupedFetch('/api/decision-models/finetune/batches', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    invalidateCache();
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setErr(data?.detail || `创建失败 (${res.status})`); return; }
    setForm({ task_name: '', base_model: '', hw_ok: true, acc: '', ece: '', agree: '' });
    await load();
  };

  return (
    <div className="panel">
      <div className="toolbar" style={{ marginBottom: 8 }}>
        <span className="section-title">训练批次</span>
        <span className="chip mono">{batches.length} 批</span>
        <span className="grow" />
        <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}><RefreshCw size={13} /> 刷新</button>
      </div>
      <p className="page-note">
        双门 + 硬件预检由服务端判定：硬件不过 → 不允许开跑；缺三指标 → 不切产；准确率 &lt; 70% 或 ECE &gt; 0.05 → 拒绝切产。
        平台只登记与编排，不代装引擎。
      </p>
      {err && <div role="alert" style={{ color: 'var(--red)', fontSize: 12, margin: '6px 0', display: 'flex', gap: 6 }}><AlertCircle size={14} />{err}</div>}

      <div className="toolbar" style={{ margin: '8px 0' }}>
        <input aria-label="任务名" className="input" placeholder="任务名" value={form.task_name} onChange={(e) => setForm({ ...form, task_name: e.target.value })} />
        <input aria-label="基座" className="input" placeholder="基座（如 Qwen3.5-2B · LoRA r16）" value={form.base_model} onChange={(e) => setForm({ ...form, base_model: e.target.value })} />
        <label style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
          <input type="checkbox" aria-label="硬件预检通过" checked={form.hw_ok} onChange={(e) => setForm({ ...form, hw_ok: e.target.checked })} /> 硬件预检通过
        </label>
        <input aria-label="准确率" className="input" placeholder="准确率 %" value={form.acc} onChange={(e) => setForm({ ...form, acc: e.target.value })} />
        <input aria-label="ECE" className="input" placeholder="ECE（如 0.023）" value={form.ece} onChange={(e) => setForm({ ...form, ece: e.target.value })} />
        <input aria-label="一致率" className="input" placeholder="一致率 %" value={form.agree} onChange={(e) => setForm({ ...form, agree: e.target.value })} />
        <button className="btn btn-primary btn-sm" onClick={create}>登记批次</button>
      </div>

      <table className="tbl compact" aria-label="微调批次">
        <thead>
          <tr><th>任务 / 基座</th><th>数据台账</th><th>引擎</th><th>硬件预检</th><th>状态</th><th>准确 / ECE / 一致率</th><th>生产门禁</th></tr>
        </thead>
        <tbody>
          {batches.map((b) => (
            <tr key={b.id}>
              <td><div style={{ fontWeight: 600 }}>{b.task_name}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b.base_model || '—'}</div></td>
              <td style={{ fontSize: 11 }}>会话 {b.data_sessions} · 记忆 {b.data_memories}{b.fingerprint ? ` · 指纹 ${b.fingerprint}` : ''}</td>
              <td style={{ fontSize: 11 }}>{b.engine || '—'}</td>
              <td>{b.hw_ok ? <span className="chip ok">通过</span> : <span className="chip bad">未通过</span>}</td>
              <td><span className="chip">{b.status}</span></td>
              <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                {b.acc == null ? '—' : `${b.acc}%`} / <span style={{ color: b.ece != null && b.ece > 0.05 ? 'var(--red)' : 'var(--green)' }}>{b.ece ?? '—'}</span> / {b.agree == null ? '—' : `${b.agree}%`}
              </td>
              <td>
                <span className={`chip ${b.gate_verdict === 'promote' ? 'ok' : 'bad'}`}>{b.gate_verdict === 'promote' ? '切生产' : '禁止切产'}</span>
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>{b.gate_reason}</div>
              </td>
            </tr>
          ))}
          {batches.length === 0 && !loading && !err && (
            <tr><td colSpan={7} style={{ color: 'var(--text-muted)' }}>还没有训练批次。</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
