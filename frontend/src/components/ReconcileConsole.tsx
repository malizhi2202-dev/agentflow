import { useEffect, useState, useMemo } from 'react';
import {
  ScrollText,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  ChevronDown,
  ChevronRight,
  XCircle,
} from 'lucide-react';
import { useControlPlane, type ReconcileEntry } from '../stores/controlPlane';

/**
 * 对账条目严重级别
 * - safe (绿色)  ：无漂移、状态正常
 * - caution (黄色) ：有漂移但已自动修复，或状态警告
 * - dangerous (红色) ：严重漂移、状态异常
 */
type Level = 'safe' | 'caution' | 'dangerous';

interface LevelMeta {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
}

const LEVEL_MAP: Record<Level, LevelMeta> = {
  safe: {
    label: '正常',
    color: '#5cb878',
    bg: 'rgba(92,184,120,0.08)',
    border: 'rgba(92,184,120,0.3)',
    icon: <CheckCircle2 size={14} />,
  },
  caution: {
    label: '注意',
    color: '#e8a450',
    bg: 'rgba(232,164,80,0.08)',
    border: 'rgba(232,164,80,0.3)',
    icon: <AlertTriangle size={14} />,
  },
  dangerous: {
    label: '危险',
    color: '#dc2626',
    bg: 'rgba(220,38,38,0.08)',
    border: 'rgba(220,38,38,0.3)',
    icon: <XCircle size={14} />,
  },
};

/**
 * 根据对账条目判断严重级别
 */
function classifyEntry(entry: ReconcileEntry): Level {
  if (!entry.drift_detected && entry.status === 'ok') return 'safe';
  if (entry.drift_detected && entry.status === 'reconciled') return 'caution';
  if (entry.status === 'error' || entry.status === 'failed') return 'dangerous';
  if (entry.drift_detected) return 'caution';
  return 'safe';
}

/**
 * ReconcileConsole — 对账控制台
 * - 时间线列表，每条记录按严重程度着色
 * - 绿色 = 安全，黄色 = 注意，红色 = 危险
 * - 支持筛选（级别、编排名称搜索）
 * - 统计摘要条
 */
export default function ReconcileConsole() {
  const { reconcile, loading, fetchReconcile } = useControlPlane();

  const [filterLevel, setFilterLevel] = useState<'all' | Level>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    fetchReconcile();
  }, [fetchReconcile]);

  // ── 筛选+排序 ──
  const filteredEntries = useMemo(() => {
    let list = [...reconcile];

    // 按级别筛选
    if (filterLevel !== 'all') {
      list = list.filter((e) => classifyEntry(e) === filterLevel);
    }

    // 按搜索词筛选
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.orchestration_name.toLowerCase().includes(q) ||
          (e.message || '').toLowerCase().includes(q) ||
          e.status.toLowerCase().includes(q)
      );
    }

    // 排序
    list.sort((a, b) => {
      const cmp = (a.created_at || '').localeCompare(b.created_at || '');
      return sortOrder === 'desc' ? -cmp : cmp;
    });

    return list;
  }, [reconcile, filterLevel, searchQuery, sortOrder]);

  // ── 统计 ──
  const stats = useMemo(() => {
    const counts = { safe: 0, caution: 0, dangerous: 0, total: reconcile.length };
    for (const e of reconcile) {
      counts[classifyEntry(e)]++;
    }
    return counts;
  }, [reconcile]);

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── 样式 ──
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

  // ── 加载态 ──
  if (reconcile.length === 0 && loading) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)', fontSize: 12 }}>
        <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> 对账数据加载中...
      </div>
    );
  }

  return (
    <div>
      {/* ─── 统计摘要卡 ─── */}
      <div
        style={{
          ...panel,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <h3 style={{ ...sectionTitle, margin: 0 }}>
          <ScrollText size={16} style={{ verticalAlign: -3, marginRight: 6 }} />
          对账控制台
        </h3>
        <div style={{ display: 'flex', gap: 12 }}>
          <StatPill
            icon={<CheckCircle2 size={12} />}
            label="安全"
            count={stats.safe}
            color="#5cb878"
          />
          <StatPill
            icon={<AlertTriangle size={12} />}
            label="注意"
            count={stats.caution}
            color="#e8a450"
          />
          <StatPill
            icon={<XCircle size={12} />}
            label="危险"
            count={stats.dangerous}
            color="#dc2626"
          />
          <StatPill icon={null} label="总计" count={stats.total} color="var(--text-dim)" />
        </div>
      </div>

      {/* ─── 筛选栏 ─── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 12,
          flexWrap: 'wrap',
        }}
      >
        {/* 搜索 */}
        <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 320 }}>
          <Search
            size={12}
            style={{
              position: 'absolute',
              left: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-dim)',
            }}
          />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索编排名称或消息..."
            style={{
              width: '100%',
              padding: '6px 8px 6px 28px',
              background: 'var(--bg-input, #1e2130)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border, #2a2d35)',
              borderRadius: 4,
              fontSize: 11,
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* 级别筛选 */}
        <select
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value as 'all' | Level)}
          style={{
            padding: '6px 10px',
            background: 'var(--bg-input, #1e2130)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border, #2a2d35)',
            borderRadius: 4,
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          <option value="all">🟢🟡🔴 全部级别</option>
          <option value="safe">🟢 安全</option>
          <option value="caution">🟡 注意</option>
          <option value="dangerous">🔴 危险</option>
        </select>

        {/* 排序 */}
        <button
          onClick={() => setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'))}
          style={{
            padding: '6px 10px',
            fontSize: 10,
            background: 'var(--bg-input, #1e2130)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--color-border, #2a2d35)',
            borderRadius: 4,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Clock size={12} />
          {sortOrder === 'desc' ? '最新优先' : '最早优先'}
        </button>

        {/* 刷新 */}
        <button
          onClick={() => fetchReconcile()}
          style={{
            padding: '6px 10px',
            fontSize: 10,
            background: 'none',
            border: '1px solid var(--color-border, #2a2d35)',
            borderRadius: 4,
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <RefreshCw size={12} /> 刷新
        </button>
      </div>

      {/* ─── 时间线日志列表 ─── */}
      <div style={panel}>
        {filteredEntries.length === 0 ? (
          <div
            style={{
              padding: 30,
              textAlign: 'center',
              color: 'var(--text-dim)',
              fontSize: 12,
            }}
          >
            <Filter size={20} style={{ marginBottom: 8, display: 'block', margin: '0 auto 8px auto' }} />
            暂无符合条件的对账记录
          </div>
        ) : (
          <div
            style={{
              position: 'relative',
              paddingLeft: 28,
              borderLeft: '2px solid var(--color-border, #2a2d35)',
              marginLeft: 6,
            }}
          >
            {filteredEntries.map((entry, idx) => {
              const level = classifyEntry(entry);
              const meta = LEVEL_MAP[level];
              const isExpanded = expandedIds.has(entry.id);
              const isLast = idx === filteredEntries.length - 1;

              return (
                <div
                  key={entry.id}
                  style={{
                    position: 'relative',
                    marginBottom: isLast ? 0 : 12,
                    padding: '10px 14px',
                    background: meta.bg,
                    border: `1px solid ${meta.border}`,
                    borderRadius: 6,
                  }}
                >
                  {/* 时间线圆点 */}
                  <div
                    style={{
                      position: 'absolute',
                      left: -36,
                      top: 14,
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      background: meta.color,
                      border: '2px solid var(--bg-card, #181a1f)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  />

                  {/* 头部行 */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                    }}
                    onClick={() => toggleExpand(entry.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {/* 级别标记 */}
                      <span style={{ color: meta.color }}>{meta.icon}</span>

                      {/* 编排名称 */}
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: 'var(--color-text)',
                        }}
                      >
                        {entry.orchestration_name}
                      </span>

                      {/* 状态标签 */}
                      <span
                        style={{
                          fontSize: 9,
                          padding: '1px 8px',
                          borderRadius: 8,
                          background: meta.bg,
                          color: meta.color,
                          border: `1px solid ${meta.border}`,
                          fontWeight: 500,
                        }}
                      >
                        {meta.label}
                      </span>

                      {/* 漂移标记 */}
                      {entry.drift_detected && (
                        <span
                          style={{
                            fontSize: 9,
                            padding: '1px 6px',
                            borderRadius: 4,
                            background: 'rgba(232,164,80,0.12)',
                            color: '#e8a450',
                          }}
                        >
                          <AlertTriangle size={9} style={{ verticalAlign: -1 }} /> 漂移
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          fontSize: 9,
                          fontFamily: 'var(--font-mono, monospace)',
                          color: 'var(--text-dim)',
                        }}
                      >
                        {entry.created_at || '-'}
                      </span>
                      {isExpanded ? <ChevronDown size={12} color="var(--text-dim)" /> : <ChevronRight size={12} color="var(--text-dim)" />}
                    </div>
                  </div>

                  {/* 展开详情 */}
                  {isExpanded && (
                    <div
                      style={{
                        marginTop: 8,
                        paddingTop: 8,
                        borderTop: `1px solid ${meta.border}`,
                      }}
                    >
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: 8,
                          fontSize: 10,
                        }}
                      >
                        <div>
                          <span style={{ color: 'var(--text-dim)' }}>编排 ID：</span>
                          <span style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono, monospace)' }}>
                            {entry.orchestration_id}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-dim)' }}>状态：</span>
                          <span style={{ color: meta.color, fontWeight: 500 }}>{entry.status}</span>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-dim)' }}>漂移检测：</span>
                          <span
                            style={{
                              color: entry.drift_detected ? '#e8a450' : '#5cb878',
                              fontWeight: 500,
                            }}
                          >
                            {entry.drift_detected ? '⚠ 检测到漂移' : '✓ 无漂移'}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-dim)' }}>记录 ID：</span>
                          <span style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono, monospace)' }}>
                            {entry.id}
                          </span>
                        </div>
                      </div>

                      {/* 消息内容 */}
                      {entry.message && (
                        <div
                          style={{
                            marginTop: 8,
                            padding: '8px 10px',
                            background: 'var(--bg-input, #1e2130)',
                            borderRadius: 4,
                            fontSize: 10,
                            color: 'var(--text-secondary)',
                            fontFamily: 'var(--font-mono, monospace)',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            maxHeight: 120,
                            overflowY: 'auto',
                          }}
                        >
                          {entry.message}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/** 统计小药丸 */
function StatPill({
  icon,
  label,
  count,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '4px 10px',
        borderRadius: 14,
        background: 'var(--bg-input, #1e2130)',
        border: `1px solid ${color}`,
      }}
    >
      {icon && <span style={{ color }}>{icon}</span>}
      <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{label}</span>
      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          color,
          fontFamily: 'var(--font-mono, monospace)',
        }}
      >
        {count}
      </span>
    </div>
  );
}
