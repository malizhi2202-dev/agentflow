/**
 * 环境参谋（原型 6.25）—— P4 后接**真后端** `/api/decision-models/advisor`。
 *
 * 命名消歧（原型页首）：L1/L2/L3 = **部署方案档位**；数据出域分级是 D0-D3；记忆四层是 L0-L3。
 * 诚实边界：画像只读本机、默认不上传；平台零执行（命令可复制，不代跑）。
 */
import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { dedupedFetch } from '../utils/requestDedup';

interface Plan {
  layer: string; engine: string; model: string;
  ability: { inference: boolean; finetune: boolean };
  disk_gb: number; latency_hint: string; why: string; steps: string[];
}
interface Advisor {
  profile: { platform: string; arch: string; cpu_count: number; mem_total_gb: number;
    disk_free_gb: number; accelerator: Record<string, boolean>; note: string };
  plans: Plan[];
}

export default function EnvAdvisor() {
  const [data, setData] = useState<Advisor | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const res = await dedupedFetch('/api/decision-models/advisor');
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(body?.detail || `读取失败 (${res.status})`); return; }
      setData(body as Advisor);
    } catch (e: any) { setErr(e?.message || '网络错误'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const p = data?.profile;

  return (
    <div>
      <div className="panel">
        <div className="toolbar" style={{ marginBottom: 6 }}>
          <span className="section-title">机器画像（只读 · 默认不上传）</span>
          {p && <span className="chip mono">{p.platform} · {p.arch}</span>}
          {p && <span className="chip mono">{p.mem_total_gb}GB 内存 · 磁盘余 {p.disk_free_gb}GB · CPU {p.cpu_count}</span>}
          <span className="grow" />
          <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}><RefreshCw size={13} /> 重新画像</button>
        </div>
        {p && (
          <div className="toolbar">
            {Object.entries(p.accelerator).map(([k, v]) => (
              <span key={k} className={`chip ${v ? 'ok' : ''}`}>{k} {v ? '✓' : '✗'}</span>
            ))}
            <span className="chip">{p.note}</span>
          </div>
        )}
        {err && <div role="alert" style={{ color: 'var(--red)', fontSize: 12, marginTop: 6, display: 'flex', gap: 6 }}><AlertCircle size={14} />{err}</div>}
      </div>

      <div className="panel" style={{ marginTop: 8 }}>
        <span className="section-title">方案层（按画像给出，含「为什么」与逐项步骤）</span>
        <table className="tbl compact" aria-label="部署方案">
          <thead>
            <tr><th>方案层</th><th>引擎</th><th>推荐模型 · 量化</th><th>能 / 不能</th><th>磁盘 · 延迟估算</th><th>推荐依据</th><th>缺失步骤（逐项确认）</th></tr>
          </thead>
          <tbody>
            {(data?.plans || []).map((r) => (
              <tr key={r.layer}>
                <td style={{ fontWeight: 600 }}>{r.layer}</td>
                <td>{r.engine}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{r.model}</td>
                <td style={{ fontSize: 11.5 }}>推理 {r.ability.inference ? '✓' : '✗'} · 微调 {r.ability.finetune ? '✓' : '✗'}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{r.disk_gb}GB · {r.latency_hint}</td>
                <td style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>{r.why}</td>
                <td>
                  {r.steps.map((s) => (
                    <label key={s} style={{ display: 'block', fontSize: 11.5, color: 'var(--text-secondary)' }}>
                      <input type="checkbox" readOnly disabled aria-label={`已确认 ${s}`} /> {s}
                    </label>
                  ))}
                </td>
              </tr>
            ))}
            {!loading && !data && !err && <tr><td colSpan={7} style={{ color: 'var(--text-muted)' }}>读取画像中…</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
