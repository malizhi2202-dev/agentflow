import { useEffect, useState, useCallback } from 'react';
import { FileSearch, Shield, Filter, RefreshCw } from 'lucide-react';
import { useAuth, authHeaders } from '../stores/auth';

interface AuditEntry {
  timestamp: string; user_id: string; user_name: string;
  action: string; target: string; target_type: string;
  detail: string; ip: string; result: string;
}

interface AuditStats {
  total: number; today: number;
  by_action: { action: string; count: number }[];
  by_user: { user: string; count: number }[];
}

const ACTION_LABELS: Record<string, string> = {
  'user:create': '创建用户', 'user:update': '更新用户', 'user:delete': '删除用户',
  'permission:grant': '授予权限', 'permission:revoke': '撤销权限',
  'project:delete': '删除项目', 'project:write': '修改配置', 'project:read': '切换项目',
  'workflow:stop': '停止流程',
};

export default function AuditLog() {
  const { isAdmin } = useAuth();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ userId: '', action: '', days: '7' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const h = authHeaders();
    const params = new URLSearchParams();
    if (filter.userId) params.set('user_id', filter.userId);
    if (filter.action) params.set('action', filter.action);
    if (filter.days) params.set('days', filter.days);
    params.set('limit', '200');

    try {
      const [resEntries, resStats] = await Promise.all([
        fetch(`/api/audit?${params}`, { headers: h }),
        fetch(`/api/audit/stats?days=${filter.days}`, { headers: h }),
      ]);
      const d1 = await resEntries.json();
      const d2 = await resStats.json();
      setEntries(d1.entries || []);
      setStats(d2);
    } catch { /* ignore */ }
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!isAdmin) {
    return (
      <div style={{ padding: 80, textAlign: 'center', color: 'var(--text-muted)' }}>
        <Shield size={48} style={{ marginBottom: 16, opacity: 0.2 }} />
        <p style={{ fontSize: 14 }}>需要管理员权限</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, margin: 0 }}>审计日志</h1>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{entries.length} 条记录</span>
        </div>
        <button onClick={fetchData} className="btn btn-ghost btn-sm" disabled={loading}>
          <RefreshCw size={14} style={{ animation: loading ? 'spin 0.7s linear infinite' : 'none' }} />
          <span style={{ marginLeft: 4 }}>刷新</span>
        </button>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 20 }}>
          <div className="stat" style={{ borderTop: '3px solid var(--blue)' }}>
            <div className="stat-value" style={{ color: 'var(--blue)' }}>{stats.total}</div>
            <div className="stat-label">总操作数</div>
          </div>
          <div className="stat" style={{ borderTop: '3px solid var(--green)' }}>
            <div className="stat-value" style={{ color: 'var(--green)' }}>{stats.today}</div>
            <div className="stat-label">今日操作</div>
          </div>
          <div className="stat" style={{ borderTop: '3px solid var(--red)' }}>
            <div className="stat-value" style={{ color: 'var(--red)' }}>
              {stats.by_action.filter(a => ['user:delete', 'project:delete', 'workflow:stop'].includes(a.action))
                .reduce((sum, a) => sum + a.count, 0)}
            </div>
            <div className="stat-label">危险操作</div>
          </div>
        </div>
      )}

      {/* 过滤栏 */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <Filter size={14} style={{ color: 'var(--text-muted)' }} />
        <select value={filter.action} onChange={e => setFilter({ ...filter, action: e.target.value })}
          style={{ minWidth: 120 }}>
          <option value="">全部操作</option>
          {Object.entries(ACTION_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select value={filter.days} onChange={e => setFilter({ ...filter, days: e.target.value })}
          style={{ minWidth: 100 }}>
          <option value="1">今天</option>
          <option value="7">最近 7 天</option>
          <option value="30">最近 30 天</option>
          <option value="90">最近 90 天</option>
        </select>
      </div>

      {/* 日志表格 */}
      {entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
          <FileSearch size={40} style={{ marginBottom: 16, opacity: 0.1 }} />
          <p style={{ fontSize: 14, marginBottom: 4, color: 'var(--text-secondary)' }}>暂无审计记录</p>
          <p style={{ fontSize: 12 }}>危险操作将自动记录到审计日志</p>
        </div>
      ) : (
        <div style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>时间</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>用户</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>操作</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>目标</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>详情</th>
                <th style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>结果</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'var(--bg-card)' : 'transparent' }}>
                  <td style={{ padding: '6px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                    {e.timestamp?.replace('T', ' ').substring(0, 19) || '-'}
                  </td>
                  <td style={{ padding: '6px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, whiteSpace: 'nowrap' }}>
                    {e.user_name}
                  </td>
                  <td style={{ padding: '6px 12px', whiteSpace: 'nowrap' }}>
                    <span className={`badge ${e.action.includes('delete') || e.action === 'workflow:stop' ? 'badge-red' : e.action.includes('permission') ? 'badge-orange' : 'badge-blue'}`}>
                      {ACTION_LABELS[e.action] || e.action}
                    </span>
                  </td>
                  <td style={{ padding: '6px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.target}
                  </td>
                  <td style={{ padding: '6px 12px', fontSize: 11, color: 'var(--text-secondary)', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.detail}
                  </td>
                  <td style={{ padding: '6px 12px', textAlign: 'center' }}>
                    <span className={`dot ${e.result === 'success' ? 'dot-green' : 'dot-red'}`}
                      title={e.result === 'success' ? '成功' : '失败'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
