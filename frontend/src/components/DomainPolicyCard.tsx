/**
 * 域归因策略卡（v21 T-08）
 *
 * 口径：accountable 三档 `member`（指定成员）/ `team_owner`（团队负责人）/ `originator`（任务发起人，缺省）。
 * 读写都走后端 `/api/domains/{id}/attribution-policy`；后端 fail-closed——未配置即 originator。
 */
import { useEffect, useState } from 'react';
import { safeFetch, dedupedFetch, invalidateCache } from '../utils/requestDedup';

export default function DomainPolicyCard({ domainId }: { domainId: number }) {
  const [policy, setPolicy] = useState<string>('');
  const [saved, setSaved] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const out = await safeFetch(`/api/domains/${domainId}/attribution-policy`);
      if (!alive) return;
      if (!out.ok) { setErr(out.error || '读取策略失败'); return; }
      setPolicy(out.data?.policy?.accountable ?? '');
    })();
    return () => { alive = false; };
  }, [domainId]);

  const save = async (value: string) => {
    setErr(null); setLoading(true);
    try {
      const res = await dedupedFetch(`/api/domains/${domainId}/attribution-policy`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountable: value }),
      });
      invalidateCache();
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(data?.detail || `保存失败 (${res.status})`); return; }
      setSaved(value);
    } catch (e: any) {
      setErr(e?.message || '网络错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div aria-label="归因策略" style={{
      border: '1px solid var(--border)', borderRadius: 5, padding: '8px 10px',
      marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>归因策略（accountable）</span>
      <select aria-label="accountable 策略" value={policy} disabled={loading}
              onChange={(e) => { setPolicy(e.target.value); save(e.target.value); }}
              style={{ padding: '3px 8px', fontSize: 12, background: 'var(--bg)',
                       color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4 }}>
        <option value="">默认（originator）</option>
        <option value="member">member · 指定成员</option>
        <option value="team_owner">team_owner · 团队负责人</option>
        <option value="originator">originator · 任务发起人</option>
      </select>
      {saved && <span role="status" style={{ fontSize: 11, color: 'var(--green)' }}>已保存：{saved}</span>}
      {err && <span role="alert" style={{ fontSize: 11, color: 'var(--red)' }}>{err}</span>}
    </div>
  );
}
