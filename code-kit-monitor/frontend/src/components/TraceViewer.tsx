import React, { useEffect, useState } from 'react';
import { useOrchestration } from '../stores/orchestration';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface Props {
  instanceId: number;
}

export default function TraceViewer({ instanceId }: Props) {
  const { traceSpans, fetchTrace } = useOrchestration();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    fetchTrace(instanceId);
  }, [instanceId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (traceSpans.length === 0) {
    return <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: 16, textAlign: 'center' }}>暂无调用链数据</p>;
  }

  const maxDuration = Math.max(...traceSpans.map((s: any) => s.duration_ms), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 12 }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>调用链追踪</div>
      {traceSpans.map((span: any) => {
        const widthPct = Math.max((span.duration_ms / maxDuration) * 100, 3);
        const isExpanded = expandedId === span.id;
        return (
          <div key={span.id}>
            <div
              onClick={() => setExpandedId(isExpanded ? null : span.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 0' }}
            >
              {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
              <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", minWidth: 28 }}>
                A{span.from_agent_id || 'in'}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>→</span>
              <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", minWidth: 28 }}>
                A{span.to_agent_id}
              </span>
              <div
                style={{
                  width: `${widthPct}%`,
                  minWidth: 20,
                  height: 18,
                  background: 'rgba(84,140,240,0.2)',
                  border: '1px solid rgba(84,140,240,0.5)',
                  borderRadius: 'var(--r-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: 4,
                  fontSize: 10,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: 'var(--blue)',
                }}
              >
                {span.duration_ms}ms
              </div>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
                {span.tokens?.toLocaleString()} tk
              </span>
              <span style={{
                fontSize: 9, padding: '1px 4px', borderRadius: 3,
                background: span.span_type === 'retry' ? 'var(--orange-bg)' : 'var(--blue-bg)',
                color: span.span_type === 'retry' ? 'var(--orange)' : 'var(--blue)',
              }}>
                {span.span_type || 'call'}
              </span>
            </div>
            {isExpanded && (
              <div style={{ marginLeft: 36, padding: '6px 8px', background: 'var(--bg-input)', borderRadius: 'var(--r-sm)', fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-secondary)', maxHeight: 80, overflow: 'auto', marginBottom: 4 }}>
                <div>duration: {span.duration_ms}ms</div>
                <div>tokens: {span.tokens}</div>
                <div>input_hash: {span.input_hash || '-'}</div>
                <div>output_hash: {span.output_hash || '-'}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
