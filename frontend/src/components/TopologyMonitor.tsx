import React, { useEffect } from 'react';
import { useOrchestration } from '../stores/orchestration';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  instanceId: number;
  collapsed?: boolean;
}

export default function TopologyMonitor({ instanceId, collapsed }: Props) {
  const { metricData, reconcileStatus, fetchMetrics, fetchDetail } = useOrchestration();

  useEffect(() => {
    fetchMetrics(instanceId, 60);
    const interval = setInterval(() => fetchMetrics(instanceId, 60), 5000);
    return () => clearInterval(interval);
  }, [instanceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const m = metricData || {};
  const healthy = m.total_calls ? Math.round(m.total_calls * (m.success_rate || 0) / 100) : 0;
  const failed = (m.total_calls || 0) - healthy;

  if (collapsed) {
    return (
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
        <span style={{ color: '#5cb878' }}>🟢 {healthy}</span>
        <span style={{ color: '#e05555' }}>🔴 {failed}</span>
        <span style={{ color: 'var(--text-muted)' }}>{m.total_tokens?.toLocaleString() || 0} tokens</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <div className="stat" style={{ flex: 1 }}>
          <span className="stat-value" style={{ color: '#5cb878', fontSize: 20 }}>{healthy}</span>
          <span className="stat-label">健康</span>
        </div>
        <div className="stat" style={{ flex: 1 }}>
          <span className="stat-value" style={{ color: '#e05555', fontSize: 20 }}>{failed}</span>
          <span className="stat-label">异常</span>
        </div>
        <div className="stat" style={{ flex: 1 }}>
          <span className="stat-value" style={{ color: '#e8a450', fontSize: 20 }}>{m.total_calls || 0}</span>
          <span className="stat-label">总调用</span>
        </div>
        <div className="stat" style={{ flex: 1 }}>
          <span className="stat-value" style={{ color: 'var(--text)', fontSize: 20 }}>{(m.total_tokens || 0).toLocaleString()}</span>
          <span className="stat-label">Tokens</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#5cb878', display: 'inline-block' }} />
          健康
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#e05555', display: 'inline-block' }} />
          异常
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#e8a450', display: 'inline-block' }} />
          等待
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#5d6068', display: 'inline-block' }} />
          未启动
        </span>
      </div>
    </div>
  );
}
