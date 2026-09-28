import { useEffect, useState } from 'react';
import {
  Circle,
  Heart,
  Cpu,
  Clock,
  BarChart3,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  RotateCw,
  Zap,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useControlPlane, type AgentStatus } from '../stores/controlPlane';
// 探针词表的唯一来源（T-FIX-16 (a)(b)）：判定走具名谓词、文案与配色走 `getStatusConfig`，
// 本文件**不得**再自带任何 `{status → 文案/颜色}` 的表。
import { isProbeErrored, isProbeHealthy, isProbeUnhealthy, getStatusConfig } from '../lib/agentHealth';

type ZoneKey = 'health' | 'tokens' | 'heartbeat' | 'models';

const ZONE_META: Record<ZoneKey, { label: string; icon: React.ReactNode }> = {
  health: { label: '💚 健康状态', icon: <Heart size={14} /> },
  tokens: { label: '🪙 Token 用量', icon: <BarChart3 size={14} /> },
  heartbeat: { label: '📡 心跳时间线', icon: <Clock size={14} /> },
  models: { label: '🧠 模型分布', icon: <Cpu size={14} /> },
};

/**
 * AgentProbePanel — 探针状态面板
 * - 顶部彩色圆点时间线（绿色=通过，红色=失败）
 * - 4 个可展开区域：健康状态 / Token 用量 / 心跳时间线 / 模型分布
 */
export default function AgentProbePanel() {
  const { probes, loading, fetchProbes, restartAgent, setSelectedAgent, selectedAgent } =
    useControlPlane();

  const [expanded, setExpanded] = useState<Set<ZoneKey>>(new Set(['health']));
  const [restarting, setRestarting] = useState<number | null>(null);

  useEffect(() => {
    fetchProbes();
  }, [fetchProbes]);

  const toggleZone = (zone: ZoneKey) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(zone) ? next.delete(zone) : next.add(zone);
      return next;
    });
  };

  const handleRestart = async (agentId: number) => {
    setRestarting(agentId);
    try {
      await restartAgent(agentId);
      await fetchProbes();
    } finally {
      setRestarting(null);
    }
  };

  // 计算各状态统计
  // ⚠️ `:63` / `:65` 两条 `status === 'active' | 'idle'` 计数**不是本卡的活**：`active`/`idle`
  // 不在后端探针词表里（只有 healthy/degraded/unhealthy/error/skipped/unknown），归 `T-FIX-17`
  // 等人拍 (甲) 换词表内状态 / (乙) 删除。本卡（T-FIX-16）**不许顺手改**（R7.1）。
  const activeCount = probes.filter((p) => p.status === 'active').length;
  // 「异常」= 探针判 `unhealthy` 或 `error`（原式左半支读 DTO 上的幽灵 `health` 字段、恒假，
  // 而 `unhealthy` 从未被计入 —— 两处都由 T-FIX-16 (a) 收口；`error` 那一支原样保留，避免把
  // 已经在「异常」里显示的 error 行挤掉）。
  const errorCount = probes.filter((p) => isProbeUnhealthy(p.status) || isProbeErrored(p.status)).length;
  const idleCount = probes.filter((p) => p.status === 'idle').length;

  // ---- 样式常量 ----
  const panel: React.CSSProperties = {
    background: 'var(--bg-card, #181a1f)',
    borderRadius: 8,
    padding: 16,
    border: '1px solid var(--border-normal, #2a2d35)',
    marginBottom: 12,
  };
  const sectionTitle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    margin: '0 0 12px 0',
    color: 'var(--color-text)',
  };
  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    background: 'var(--bg-input, #1e2130)',
    borderRadius: 6,
    cursor: 'pointer',
    border: '1px solid var(--color-border, #2a2d35)',
    marginBottom: 6,
  };
  const badgeBase: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 500,
    padding: '2px 8px',
    borderRadius: 10,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  };

  // ---- 加载态 ----
  if (probes.length === 0 && loading) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)', fontSize: 12 }}>
        <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> 探针数据加载中...
      </div>
    );
  }

  return (
    <div>
      {/* ─── 顶部摘要卡 ─── */}
      <div style={panel}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ ...sectionTitle, margin: 0 }}>
            <Zap size={16} style={{ verticalAlign: -3, marginRight: 6 }} />
            探针状态
          </h3>
          <button
            onClick={() => fetchProbes()}
            style={{
              background: 'none',
              border: '1px solid var(--color-border, #2a2d35)',
              borderRadius: 4,
              padding: '4px 10px',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <RefreshCw size={12} /> 刷新
          </button>
        </div>

        {/* 统计条 */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
          <div style={{ ...badgeBase, background: 'rgba(92,184,120,0.12)', color: '#5cb878' }}>
            <CheckCircle2 size={12} /> 活跃 {activeCount}
          </div>
          <div style={{ ...badgeBase, background: 'rgba(220,38,38,0.12)', color: '#dc2626' }}>
            <XCircle size={12} /> 异常 {errorCount}
          </div>
          <div style={{ ...badgeBase, background: 'rgba(156,163,175,0.12)', color: '#9ca3af' }}>
            空闲 {idleCount}
          </div>
          <div style={{ ...badgeBase, background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
            共 {probes.length} 探针
          </div>
        </div>

        {/* 探针彩色圆点时间线 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexWrap: 'wrap',
            padding: '8px 0',
            borderTop: '1px solid var(--color-border, #2a2d35)',
            borderBottom: '1px solid var(--color-border, #2a2d35)',
          }}
        >
          {probes.map((probe) => {
            // T-FIX-16 (a)：原式左半支读 DTO 上的幽灵 `health` 字段（后端从不发），已摘掉；
            // 改读真正带探针判定的 `status` + 具名谓词。
            // ⚠️ `|| probe.status === 'active'` 这一支不动 —— 它是 T-FIX-17 的面（见 :63 注释）。
            const isHealthy = isProbeHealthy(probe.status) || probe.status === 'active';
            const isError = isProbeErrored(probe.status);
            const isSelected = selectedAgent === probe.agent_id;
            return (
              <div
                key={probe.agent_id}
                onClick={() =>
                  setSelectedAgent(isSelected ? null : probe.agent_id)
                }
                title={`${probe.agent_name} — ${probe.status} — ${probe.last_heartbeat || 'N/A'}`}
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  padding: '4px 6px',
                  borderRadius: 6,
                  border: isSelected
                    ? '1px solid var(--color-primary, #3b82f6)'
                    : '1px solid transparent',
                  background: isSelected
                    ? 'rgba(59,130,246,0.08)'
                    : 'transparent',
                  transition: 'background 0.15s',
                }}
              >
                <Circle
                  size={14}
                  fill={isHealthy ? '#5cb878' : isError ? '#dc2626' : '#9ca3af'}
                  stroke={isHealthy ? '#5cb878' : isError ? '#dc2626' : '#9ca3af'}
                />
                <span
                  style={{
                    fontSize: 9,
                    color: 'var(--text-dim)',
                    maxWidth: 60,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {probe.agent_name}
                </span>
              </div>
            );
          })}
          {probes.length === 0 && (
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>暂无探针数据</span>
          )}
        </div>
      </div>

      {/* ─── 4 个可展开区域 ─── */}
      {(['health', 'tokens', 'heartbeat', 'models'] as ZoneKey[]).map((zone) => (
        <div key={zone} style={panel}>
          <div onClick={() => toggleZone(zone)} style={{ ...rowStyle, marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
                {ZONE_META[zone].label}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                color: 'var(--text-dim)',
              }}
            >
              {expanded.has(zone) ? (
                <>
                  <ChevronDown size={14} /> 收起
                </>
              ) : (
                <>
                  <ChevronRight size={14} /> 展开
                </>
              )}
            </div>
          </div>

          {expanded.has(zone) && (
            <div style={{ marginTop: 10 }}>
              {zone === 'health' && <HealthZone probes={probes} onRestart={handleRestart} restarting={restarting} />}
              {zone === 'tokens' && <TokensZone probes={probes} />}
              {zone === 'heartbeat' && <HeartbeatZone probes={probes} />}
              {zone === 'models' && <ModelsZone probes={probes} />}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   区域 1：健康状态
   ═══════════════════════════════════════════ */
function HealthZone({
  probes,
  onRestart,
  restarting,
}: {
  probes: AgentStatus[];
  onRestart: (id: number) => void;
  restarting: number | null;
}) {
  if (probes.length === 0) {
    return (
      <div style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'center', padding: 16 }}>
        暂无探针数据
      </div>
    );
  }

  const tr: React.CSSProperties = { borderBottom: '1px solid var(--color-border, #2a2d35)' };
  const td: React.CSSProperties = { padding: '8px 10px', fontSize: 11, color: 'var(--color-text)' };
  const th: React.CSSProperties = {
    ...td,
    fontSize: 10,
    color: 'var(--text-dim)',
    fontWeight: 500,
    textTransform: 'uppercase',
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={tr}>
            <th style={{ ...th, textAlign: 'left' }}>探针名称</th>
            <th style={{ ...th, textAlign: 'left' }}>状态</th>
            <th style={{ ...th, textAlign: 'left' }}>健康度</th>
            <th style={{ ...th, textAlign: 'left' }}>运行时</th>
            <th style={{ ...th, textAlign: 'left' }}>上次心跳</th>
            <th style={{ ...th, textAlign: 'center' }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {probes.map((probe) => (
            <tr key={probe.agent_id} style={tr}>
              <td style={td}>
                <span style={{ fontWeight: 600 }}>{probe.agent_name}</span>
              </td>
              <td style={td}>
                <StatusBadge status={probe.status} />
              </td>
              <td style={td}>
                <HealthBadge status={probe.status} />
              </td>
              <td style={{ ...td, fontFamily: 'var(--font-mono, monospace)', fontSize: 10 }}>
                {probe.runtime || '-'}
              </td>
              <td style={{ ...td, fontFamily: 'var(--font-mono, monospace)', fontSize: 10, color: 'var(--text-dim)' }}>
                {probe.last_heartbeat || '-'}
              </td>
              <td style={{ ...td, textAlign: 'center' }}>
                <button
                  onClick={() => onRestart(probe.agent_id)}
                  disabled={restarting === probe.agent_id}
                  style={{
                    padding: '3px 10px',
                    fontSize: 10,
                    background: 'none',
                    border: '1px solid var(--color-border, #2a2d35)',
                    borderRadius: 3,
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <RotateCw
                    size={10}
                    style={{
                      animation:
                        restarting === probe.agent_id ? 'spin 1s linear infinite' : undefined,
                    }}
                  />
                  重启
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ═══════════════════════════════════════════
   区域 2：Token 用量
   ═══════════════════════════════════════════ */
function TokensZone({ probes }: { probes: AgentStatus[] }) {
  if (probes.length === 0) {
    return (
      <div style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'center', padding: 16 }}>
        暂无 Token 数据
      </div>
    );
  }

  const totalTokens = probes.reduce((sum, p) => sum + (p.tokens_used || 0), 0);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
        <MiniStat label="总 Token 消耗" value={totalTokens.toLocaleString()} color="#5cb878" />
        <MiniStat
          label="平均每探针"
          value={probes.length ? Math.round(totalTokens / probes.length).toLocaleString() : '0'}
          color="#3b82f6"
        />
        <MiniStat
          label="活跃探针"
          value={probes.filter((p) => p.status === 'active').length.toString()}
          color="#a855f7"
        />
      </div>

      {probes.map((probe) => {
        const pct = probe.token_hard_limit > 0
          ? Math.round((probe.tokens_used / probe.token_hard_limit) * 100)
          : 0;
        const barColor = pct >= 90 ? '#dc2626' : pct >= 70 ? '#e8a450' : '#5cb878';

        return (
          <div
            key={probe.agent_id}
            style={{
              padding: '8px 0',
              borderBottom: '1px solid var(--color-border, #2a2d35)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 4,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text)' }}>
                {probe.agent_name}
              </span>
              <span style={{ fontSize: 10, fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-dim)' }}>
                {(probe.tokens_used || 0).toLocaleString()} / {(probe.token_soft_limit || 0).toLocaleString()}
                {(probe.token_hard_limit || 0) > 0 && (
                  <span style={{ color: '#9ca3af' }}>
                    {' '}（硬限制 {(probe.token_hard_limit || 0).toLocaleString()}）
                  </span>
                )}
              </span>
            </div>
            {/* 进度条 */}
            <div
              style={{
                height: 6,
                background: 'var(--bg-input, #1e2130)',
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(pct, 100)}%`,
                  background: barColor,
                  borderRadius: 3,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <div style={{ textAlign: 'right', fontSize: 9, color: barColor, marginTop: 2 }}>
              {pct}%
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════
   区域 3：心跳时间线
   ═══════════════════════════════════════════ */
function HeartbeatZone({ probes }: { probes: AgentStatus[] }) {
  if (probes.length === 0) {
    return (
      <div style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'center', padding: 16 }}>
        暂无心跳数据
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        paddingLeft: 24,
        borderLeft: '2px solid var(--color-border, #2a2d35)',
        marginLeft: 8,
      }}
    >
      {[...probes]
        .sort((a, b) => (b.last_heartbeat || '').localeCompare(a.last_heartbeat || ''))
        .map((probe, idx) => {
          // T-FIX-16 (a)：同上 —— 幽灵 `health` 字段那半支摘掉；`|| probe.status === 'active'`
          // 那一支归 T-FIX-17，不动。
          const isHealthy = isProbeHealthy(probe.status) || probe.status === 'active';
          const dotColor = isHealthy ? '#5cb878' : '#dc2626';
          return (
            <div
              key={probe.agent_id}
              style={{
                position: 'relative',
                marginBottom: idx === probes.length - 1 ? 0 : 16,
              }}
            >
              {/* 时间线圆点 */}
              <div
                style={{
                  position: 'absolute',
                  left: -30,
                  top: 4,
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: dotColor,
                  border: '2px solid var(--bg-card, #181a1f)',
                }}
              />
              <div style={{ fontSize: 9, color: 'var(--text-dim)', marginBottom: 2, fontFamily: 'var(--font-mono, monospace)' }}>
                {probe.last_heartbeat || 'N/A'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text)', fontWeight: 500 }}>
                {probe.agent_name}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                <StatusBadge status={probe.status} />
                <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                  {probe.runtime || 'unknown'}
                </span>
              </div>
            </div>
          );
        })}
    </div>
  );
}

/* ═══════════════════════════════════════════
   区域 4：模型分布
   ═══════════════════════════════════════════ */
function ModelsZone({ probes }: { probes: AgentStatus[] }) {
  // 按 model_name 聚合
  const modelMap = new Map<string, { count: number; agents: string[] }>();
  for (const p of probes) {
    const key = p.model_name || 'unknown';
    const entry = modelMap.get(key) || { count: 0, agents: [] };
    entry.count += 1;
    entry.agents.push(p.agent_name);
    modelMap.set(key, entry);
  }

  const entries = [...modelMap.entries()].sort((a, b) => b[1].count - a[1].count);

  if (entries.length === 0) {
    return (
      <div style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'center', padding: 16 }}>
        暂无模型数据
      </div>
    );
  }

  const MODEL_COLORS = [
    '#5cb878', '#3b82f6', '#a855f7', '#f59e0b', '#ec4899',
    '#06b6d4', '#84cc16', '#f97316',
  ];

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        {entries.map(([model, info], i) => (
          <div
            key={model}
            style={{
              padding: '8px 14px',
              background: 'var(--bg-input, #1e2130)',
              borderRadius: 8,
              border: `2px solid ${MODEL_COLORS[i % MODEL_COLORS.length]}`,
              minWidth: 120,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: 'var(--text-dim)',
                marginBottom: 4,
                fontFamily: 'var(--font-mono, monospace)',
              }}
            >
              {model}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: MODEL_COLORS[i % MODEL_COLORS.length] }}>
              {info.count}
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 2 }}>
              {info.agents.length > 3
                ? `${info.agents.slice(0, 3).join(', ')} +${info.agents.length - 3}`
                : info.agents.join(', ')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   通用小部件
   ═══════════════════════════════════════════ */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    active: { bg: 'rgba(92,184,120,0.12)', color: '#5cb878', label: '活跃' },
    idle: { bg: 'rgba(156,163,175,0.12)', color: '#9ca3af', label: '空闲' },
    error: { bg: 'rgba(220,38,38,0.12)', color: '#dc2626', label: '异常' },
    stopped: { bg: 'rgba(107,114,128,0.15)', color: '#6b7280', label: '已停' },
  };
  const m = map[status] || { bg: 'rgba(156,163,175,0.12)', color: '#9ca3af', label: status };
  return (
    <span
      style={{
        fontSize: 10,
        padding: '2px 8px',
        borderRadius: 10,
        background: m.bg,
        color: m.color,
        fontWeight: 500,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <Circle size={8} fill={m.color} stroke={m.color} />
      {m.label}
    </span>
  );
}

/**
 * 「健康度」徽标（T-FIX-16 (b)）。
 *
 * 原来自带第 3 张词表：键集只有 4 个值（`healthy` / 一个**后端从不产出的告警态** / `error` /
 * `unknown`），而 `degraded` / `unhealthy` / `skipped` 一格都没有 ⇒ 绝大多数行只能显示「未知」。
 * 现在文案与配色全部走 `lib/agentHealth.ts` 的 `getStatusConfig`（= `PROBE_STATUS` + `getHealthLabel`），
 * 与 `AgentControlPlane` 的「运行状态」列**同一份**来源。
 *
 * ⚠️ 视觉差异（登记在 SUMMARY，不静默）：原来每个状态有自己的图标（✓ / ⚠ / ✕ / ○），
 * 现在统一为中性 `<Circle/>`。理由：保图标就得在组件里再枚举一遍词表（第 4 张表），
 * 正是本卡要消灭的形状；若要恢复分状态图标，正确落点是往 `PROBE_STATUS` 一处加 `icon` 字段。
 */
function HealthBadge({ status }: { status: string }) {
  const sc = getStatusConfig(status);
  return (
    <span
      style={{
        fontSize: 10,
        padding: '2px 8px',
        borderRadius: 10,
        background: sc.bg,
        color: sc.color,
        fontWeight: 500,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <Circle size={10} />
      {sc.label}
    </span>
  );
}

function MiniStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      style={{
        padding: '10px 12px',
        background: 'var(--bg-input, #1e2130)',
        borderRadius: 6,
        borderLeft: `3px solid ${color}`,
      }}
    >
      <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 4 }}>{label}</div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          color,
          fontFamily: 'var(--font-mono, monospace)',
        }}
      >
        {value}
      </div>
    </div>
  );
}
