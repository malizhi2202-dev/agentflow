import { useEffect, useState } from 'react';
import { AlertTriangle, Shield } from 'lucide-react';

interface Issue { change_id: string; type: string; detail: string }

export default function HealthTab({ changeId: _changeId }: { changeId: string }) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [securityAlerts, setSecurityAlerts] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/health').then((r) => r.json()).then((d) => {
      setIssues(d.issues || []);
    }).catch(() => {});
    // 安全告警模拟（扫描 TEST.md 安全轮次）
    fetch(`/api/changes/${_changeId}/TEST`).then((r) => r.json()).then((d) => {
      if (d.content && (d.content.includes('trufflehog') || d.content.includes('gitleaks'))) {
        setSecurityAlerts(['安全扫描命中，请检查 TEST.md 第 3 轮详情']);
      }
    }).catch(() => {});
  }, [_changeId]);

  const changeIssues = issues.filter((i) => i.change_id === _changeId);
  const allGood = changeIssues.length === 0 && securityAlerts.length === 0;

  return (
    <div aria-live="polite">
      {allGood && (
        <div style={{ background: 'var(--color-surface)', border: '2px solid var(--color-success)', borderRadius: 'var(--radius-md)', padding: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--color-success)', fontSize: 20 }}>✅</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>数据一致性校验通过，无安全告警</span>
        </div>
      )}
      {securityAlerts.map((a, i) => (
        <div key={`sec-${i}`} style={{ background: 'var(--color-surface)', borderLeft: '3px solid var(--color-danger)', borderRadius: 'var(--radius-md)', padding: 12, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={16} color="var(--color-danger)" />
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--color-text)' }}>🔴 {a}</span>
        </div>
      ))}
      {changeIssues.map((issue, i) => {
        const icon = issue.type === 'missing_summary' ? '📄' : issue.type === 'missing_ui_design' ? '🎨' : '📋';
        return (
          <div key={i} style={{ background: 'var(--color-surface)', borderLeft: '3px solid var(--color-warning)', borderRadius: 'var(--radius-md)', padding: 12, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={14} color="var(--color-warning)" />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, color: 'var(--color-primary)', cursor: 'pointer' }} onClick={() => window.open(`/api/changes/${issue.change_id}`, '_blank')}>{issue.change_id}</span>
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{icon} {issue.type}: {issue.detail}</span>
          </div>
        );
      })}
    </div>
  );
}
