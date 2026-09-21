/** Agent 节点池侧边栏 — 可拖拽 Agent 到画布，可折叠. */
import { useState } from 'react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import type { AgentPoolItem } from '../stores/orchestration';

interface Props {
  agents: AgentPoolItem[];
  existingNames: string[];
  onDragStart: (agent: AgentPoolItem) => void;
  onAddAgent: () => void;
}

export default function AgentNodePool({ agents, existingNames, onDragStart, onAddAgent }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  const available = agents.filter((a) => !existingNames.includes(a.name));

  if (collapsed) {
    return (
      <div style={{
        width: 32, background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 8,
      }}>
        <button onClick={() => setCollapsed(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
          <ChevronRight size={14} />
        </button>
      </div>
    );
  }

  return (
    <div style={{
      width: 220, background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', height: '100%',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 10px', borderBottom: '1px solid var(--border)',
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Agent 节点池
        </span>
        <button onClick={() => setCollapsed(true)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}>
          <ChevronLeft size={14} />
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 6 }}>
        {available.length === 0 && (
          <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>
            所有 Agent 已在画布上
          </p>
        )}
        {available.map((agent) => (
          <div
            key={agent.id}
            draggable
            onDragStart={(e) => { e.dataTransfer.setData('application/json', JSON.stringify(agent)); onDragStart(agent); }}
            style={{
              padding: '8px 10px', marginBottom: 4, borderRadius: 'var(--r-sm)',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              cursor: 'grab', transition: 'background var(--fast), border-color var(--fast)',
              borderLeft: '2px solid var(--blue)',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)'; }}
          >
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600 }}>{agent.name}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
              <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 2, background: 'var(--blue-bg)', color: 'var(--blue)' }}>{agent.runtime}</span>
              <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{agent.model_name}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: 8, borderTop: '1px solid var(--border)' }}>
        <button onClick={onAddAgent} style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          padding: '8px', background: 'var(--bg-card)', color: 'var(--text-secondary)',
          border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', cursor: 'pointer', fontSize: 11,
        }}>
          <Plus size={12} /> 添加 Agent
        </button>
      </div>
    </div>
  );
}
