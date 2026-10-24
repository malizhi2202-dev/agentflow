/**
 * 执行隔离策略（原型 6.26 · `/admin/isolation`）
 *
 * 真实数据：`GET /api/runtime/execution-contract`（P2-3 契约先行）。
 * 三铁律（原型原文）：①档位**探测开放**（装不出来的档不显示可选）②**fail-closed**（选档探测失败=拒绝执行）
 * ③降级**三处显式**（界面徽章 + 审计 + API 响应同标 isolation:none）。
 */
import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, RefreshCw, ShieldCheck, ShieldOff } from 'lucide-react';
import { dedupedFetch } from '../utils/requestDedup';

interface Contract {
  tiers: string[];
  available: string[];
  egress_enforced_tiers: string[];
  defaults: { tier: string; ttl_seconds: number; retain: boolean; egress_allowlist: string[] };
  notes: string[];
}

const TIER_LABEL: Record<string, string> = {
  inproc: 'T0 · 平台进程内',
  process: 'T1 · 独立进程',
  container: 'T2 · 容器',
  microvm: 'T3 · 微虚拟机',
  remote: 'T4 · 远端',
};

export default function Isolation() {
  const [c, setC] = useState<Contract | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [probe, setProbe] = useState<{ tier: string; ok: boolean; detail: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const res = await dedupedFetch('/api/runtime/execution-contract');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(data?.detail || `读取失败 (${res.status})`); return; }
      setC(data as Contract);
    } catch (e: any) {
      setErr(e?.message || '网络错误');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const validate = async (tier: string) => {
    setProbe(null); setErr(null);
    try {
      const res = await dedupedFetch('/api/runtime/execution-contract/validate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setProbe({ tier, ok: false, detail: data?.detail || `拒绝 (${res.status})` }); return; }
      setProbe({ tier, ok: true, detail: '契约校验通过（未真正执行）' });
    } catch (e: any) {
      setProbe({ tier, ok: false, detail: e?.message || '网络错误' });
    }
  };

  return (
    <div>
      <div className="panel">
        <div className="toolbar" style={{ marginBottom: 8 }}>
          <span className="section-title">当前默认档</span>
          <span className="chip info mono">{c ? (TIER_LABEL[c.defaults.tier] || c.defaults.tier) : '—'}</span>
          {c && <span className="chip mono">TTL {c.defaults.ttl_seconds}s</span>}
          {c && <span className="chip mono">egress {c.defaults.egress_allowlist.length} 条</span>}
          <span className="grow" />
          <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
            <RefreshCw size={13} /> 重探契约
          </button>
        </div>
        <p className="page-note">
          fail-closed：本版只实现 <code>inproc</code>（同进程调用，无网络围栏，egress_enforced=false 如实声明）；
          其它档位「已声明未实现」，选择即启动失败，不静默回退。
        </p>
        {err && (
          <div role="alert" style={{ color: 'var(--red)', fontSize: 12, marginTop: 8, display: 'flex', gap: 6 }}>
            <AlertCircle size={14} /> {err}
          </div>
        )}
      </div>

      <div className="panel" style={{ marginTop: 8 }}>
        <span className="section-title">档位清单</span>
        <table className="tbl compact" aria-label="隔离档位">
          <thead>
            <tr><th>档位</th><th>可用</th><th>网络围栏</th><th>校验</th></tr>
          </thead>
          <tbody>
            {(c?.tiers || []).map((t) => {
              const available = (c?.available || []).includes(t);
              const egress = (c?.egress_enforced_tiers || []).includes(t);
              return (
                <tr key={t}>
                  <td>{TIER_LABEL[t] || t}<div className="chip mono" style={{ marginTop: 2 }}>{t}</div></td>
                  <td>{available
                    ? <span className="chip ok"><ShieldCheck size={11} /> 可用</span>
                    : <span className="chip bad"><ShieldOff size={11} /> 未实现（选即失败）</span>}</td>
                  <td>{egress ? <span className="chip ok">enforced</span> : <span className="chip warn">none</span>}</td>
                  <td>
                    <button className="btn btn-ghost btn-sm" disabled={!available} onClick={() => validate(t)}>
                      预检契约
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {probe && (
          <div role="status" style={{ marginTop: 8, fontSize: 12, color: probe.ok ? 'var(--green)' : 'var(--red)' }}>
            {probe.tier}：{probe.detail}
          </div>
        )}
      </div>

      <div className="panel" style={{ marginTop: 8 }}>
        <span className="section-title">口径（后端同文）</span>
        <ul style={{ margin: '4px 0 0', paddingLeft: 18, fontSize: 12, color: 'var(--text-secondary)' }}>
          {(c?.notes || []).map((n) => <li key={n}>{n}</li>)}
        </ul>
      </div>
    </div>
  );
}
