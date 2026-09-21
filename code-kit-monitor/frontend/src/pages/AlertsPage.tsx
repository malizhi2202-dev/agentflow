import { useEffect, useState } from 'react';
import { Bell, BellOff, AlertTriangle, XCircle, AlertCircle } from 'lucide-react';

interface Alert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  entity_type: string;
  entity_id: number;
  metadata: Record<string, any>;
  timestamp: string;
  acknowledged: boolean;
}

const SEVERITY_ICONS: Record<string, React.ReactNode> = {
  critical: <XCircle size={14} style={{ color: 'var(--red)' }} />,
  warning: <AlertTriangle size={14} style={{ color: 'var(--orange)' }} />,
  info: <AlertCircle size={14} style={{ color: 'var(--blue)' }} />,
};

const ALERT_TYPE_NAMES: Record<string, string> = {
  token_exceeded: 'Token 超限',
  agent_dead: 'Agent 宕机',
  execution_failed: '执行失败',
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unackCount, setUnackCount] = useState(0);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const fetchAlerts = () => {
    var url = '/api/alerts?limit=100';
    if (typeFilter !== 'all') url += '&alert_type=' + typeFilter;
    fetch(url)
      .then(r => r.json())
      .then(d => {
        setAlerts(d.alerts || []);
        setUnackCount(d.unacknowledged_count || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchAlerts();
    var t = setInterval(fetchAlerts, 15000);
    return () => clearInterval(t);
  }, [typeFilter]);

  const acknowledgeOne = (id: string) => {
    fetch('/api/alerts/' + id + '/acknowledge', { method: 'POST' })
      .then(r => r.json())
      .then(() => fetchAlerts());
  };

  const acknowledgeAll = () => {
    fetch('/api/alerts/acknowledge-all', { method: 'POST' })
      .then(r => r.json())
      .then(() => fetchAlerts());
  };

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
        <Bell size={36} style={{ marginBottom: 12, opacity: 0.2 }} />
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 24px', height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bell size={18} /> 告警中心
          {unackCount > 0 && (
            <span style={{
              background: 'var(--red)', color: '#fff', borderRadius: 10, padding: '1px 8px',
              fontSize: 11, fontWeight: 700, marginLeft: 4,
            }}>{unackCount}</span>
          )}
        </h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            style={{
              padding: '4px 8px', fontSize: 12, borderRadius: 4,
              border: '1px solid var(--border)', background: 'var(--bg-card)',
              color: 'var(--text)', cursor: 'pointer',
            }}
          >
            <option value="all">全部类型</option>
            <option value="token_exceeded">Token 超限</option>
            <option value="agent_dead">Agent 宕机</option>
            <option value="execution_failed">执行失败</option>
          </select>
          {unackCount > 0 && (
            <button
              className="btn btn-sm btn-ghost"
              onClick={acknowledgeAll}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <BellOff size={12} /> 全部确认
            </button>
          )}
        </div>
      </div>

      {alerts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          <Bell size={36} style={{ marginBottom: 12, opacity: 0.1 }} />
          <p>暂无告警</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>系统运行正常 🎉</p>
        </div>
      ) : (
        alerts.map(a => (
          <div key={a.id}
            style={{
              background: a.acknowledged ? 'var(--bg-card)' : 'var(--bg-selected)',
              borderRadius: 8, padding: '14px 16px', marginBottom: 8,
              border: '1px solid ' + (a.acknowledged ? 'var(--border)' : a.severity === 'critical' ? 'var(--red)' : 'var(--orange)'),
              opacity: a.acknowledged ? 0.7 : 1,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ marginTop: 2 }}>
                {SEVERITY_ICONS[a.severity] || <AlertCircle size={14} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{
                    padding: '1px 6px', borderRadius: 2, fontSize: 9, fontWeight: 600,
                    background: a.severity === 'critical' ? 'var(--red-bg)' : a.severity === 'warning' ? 'var(--orange-bg)' : 'var(--blue-bg)',
                    color: a.severity === 'critical' ? 'var(--red)' : a.severity === 'warning' ? 'var(--orange)' : 'var(--blue)',
                  }}>
                    {a.severity === 'critical' ? '严重' : a.severity === 'warning' ? '警告' : '信息'}
                  </span>
                  <span className="badge badge-purple" style={{ fontSize: 9 }}>
                    {ALERT_TYPE_NAMES[a.alert_type] || a.alert_type}
                  </span>
                  <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {a.timestamp ? new Date(a.timestamp).toLocaleString('zh-CN') : ''}
                  </span>
                </div>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{a.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>{a.message}</div>
                {a.metadata && Object.keys(a.metadata).length > 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 10, color: 'var(--text-dim)' }}>
                    {Object.entries(a.metadata).slice(0, 4).map(([k, v]) => (
                      <span key={k}>{k}: <strong>{String(v)}</strong></span>
                    ))}
                  </div>
                )}
              </div>
              {!a.acknowledged && (
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => acknowledgeOne(a.id)}
                  style={{ whiteSpace: 'nowrap', fontSize: 10 }}
                >
                  确认
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
