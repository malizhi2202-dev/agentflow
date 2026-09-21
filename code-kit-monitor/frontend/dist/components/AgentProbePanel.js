import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Circle, Heart, Cpu, Clock, BarChart3, ChevronDown, ChevronRight, RefreshCw, RotateCw, Zap, AlertTriangle, CheckCircle2, XCircle, } from 'lucide-react';
import { useControlPlane } from '../stores/controlPlane';
const ZONE_META = {
    health: { label: '💚 健康状态', icon: _jsx(Heart, { size: 14 }) },
    tokens: { label: '🪙 Token 用量', icon: _jsx(BarChart3, { size: 14 }) },
    heartbeat: { label: '📡 心跳时间线', icon: _jsx(Clock, { size: 14 }) },
    models: { label: '🧠 模型分布', icon: _jsx(Cpu, { size: 14 }) },
};
/**
 * AgentProbePanel — 探针状态面板
 * - 顶部彩色圆点时间线（绿色=通过，红色=失败）
 * - 4 个可展开区域：健康状态 / Token 用量 / 心跳时间线 / 模型分布
 */
export default function AgentProbePanel() {
    const { probes, loading, fetchProbes, restartAgent, setSelectedAgent, selectedAgent } = useControlPlane();
    const [expanded, setExpanded] = useState(new Set(['health']));
    const [restarting, setRestarting] = useState(null);
    useEffect(() => {
        fetchProbes();
    }, [fetchProbes]);
    const toggleZone = (zone) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            next.has(zone) ? next.delete(zone) : next.add(zone);
            return next;
        });
    };
    const handleRestart = async (agentId) => {
        setRestarting(agentId);
        try {
            await restartAgent(agentId);
            await fetchProbes();
        }
        finally {
            setRestarting(null);
        }
    };
    // 计算各状态统计
    const activeCount = probes.filter((p) => p.status === 'active').length;
    const errorCount = probes.filter((p) => p.health === 'error' || p.status === 'error').length;
    const idleCount = probes.filter((p) => p.status === 'idle').length;
    // ---- 样式常量 ----
    const panel = {
        background: 'var(--bg-card, #181a1f)',
        borderRadius: 8,
        padding: 16,
        border: '1px solid var(--border-normal, #2a2d35)',
        marginBottom: 12,
    };
    const sectionTitle = {
        fontSize: 13,
        fontWeight: 600,
        margin: '0 0 12px 0',
        color: 'var(--color-text)',
    };
    const rowStyle = {
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
    const badgeBase = {
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
        return (_jsxs("div", { style: { padding: 20, textAlign: 'center', color: 'var(--text-dim)', fontSize: 12 }, children: [_jsx(RefreshCw, { size: 14, style: { animation: 'spin 1s linear infinite' } }), " \u63A2\u9488\u6570\u636E\u52A0\u8F7D\u4E2D..."] }));
    }
    return (_jsxs("div", { children: [_jsxs("div", { style: panel, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }, children: [_jsxs("h3", { style: { ...sectionTitle, margin: 0 }, children: [_jsx(Zap, { size: 16, style: { verticalAlign: -3, marginRight: 6 } }), "\u63A2\u9488\u72B6\u6001"] }), _jsxs("button", { onClick: () => fetchProbes(), style: {
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
                                }, children: [_jsx(RefreshCw, { size: 12 }), " \u5237\u65B0"] })] }), _jsxs("div", { style: { display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }, children: [_jsxs("div", { style: { ...badgeBase, background: 'rgba(92,184,120,0.12)', color: '#5cb878' }, children: [_jsx(CheckCircle2, { size: 12 }), " \u6D3B\u8DC3 ", activeCount] }), _jsxs("div", { style: { ...badgeBase, background: 'rgba(220,38,38,0.12)', color: '#dc2626' }, children: [_jsx(XCircle, { size: 12 }), " \u5F02\u5E38 ", errorCount] }), _jsxs("div", { style: { ...badgeBase, background: 'rgba(156,163,175,0.12)', color: '#9ca3af' }, children: ["\u7A7A\u95F2 ", idleCount] }), _jsxs("div", { style: { ...badgeBase, background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }, children: ["\u5171 ", probes.length, " \u63A2\u9488"] })] }), _jsxs("div", { style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            flexWrap: 'wrap',
                            padding: '8px 0',
                            borderTop: '1px solid var(--color-border, #2a2d35)',
                            borderBottom: '1px solid var(--color-border, #2a2d35)',
                        }, children: [probes.map((probe) => {
                                const isHealthy = probe.health === 'healthy' || probe.status === 'active';
                                const isError = probe.health === 'error' || probe.status === 'error';
                                const isSelected = selectedAgent === probe.agent_id;
                                return (_jsxs("div", { onClick: () => setSelectedAgent(isSelected ? null : probe.agent_id), title: `${probe.agent_name} — ${probe.status} — ${probe.last_heartbeat || 'N/A'}`, style: {
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
                                    }, children: [_jsx(Circle, { size: 14, fill: isHealthy ? '#5cb878' : isError ? '#dc2626' : '#9ca3af', stroke: isHealthy ? '#5cb878' : isError ? '#dc2626' : '#9ca3af' }), _jsx("span", { style: {
                                                fontSize: 9,
                                                color: 'var(--text-dim)',
                                                maxWidth: 60,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }, children: probe.agent_name })] }, probe.agent_id));
                            }), probes.length === 0 && (_jsx("span", { style: { fontSize: 11, color: 'var(--text-dim)' }, children: "\u6682\u65E0\u63A2\u9488\u6570\u636E" }))] })] }), ['health', 'tokens', 'heartbeat', 'models'].map((zone) => (_jsxs("div", { style: panel, children: [_jsxs("div", { onClick: () => toggleZone(zone), style: { ...rowStyle, marginBottom: 0 }, children: [_jsx("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: _jsx("span", { style: { fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }, children: ZONE_META[zone].label }) }), _jsx("div", { style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    fontSize: 11,
                                    color: 'var(--text-dim)',
                                }, children: expanded.has(zone) ? (_jsxs(_Fragment, { children: [_jsx(ChevronDown, { size: 14 }), " \u6536\u8D77"] })) : (_jsxs(_Fragment, { children: [_jsx(ChevronRight, { size: 14 }), " \u5C55\u5F00"] })) })] }), expanded.has(zone) && (_jsxs("div", { style: { marginTop: 10 }, children: [zone === 'health' && _jsx(HealthZone, { probes: probes, onRestart: handleRestart, restarting: restarting }), zone === 'tokens' && _jsx(TokensZone, { probes: probes }), zone === 'heartbeat' && _jsx(HeartbeatZone, { probes: probes }), zone === 'models' && _jsx(ModelsZone, { probes: probes })] }))] }, zone)))] }));
}
/* ═══════════════════════════════════════════
   区域 1：健康状态
   ═══════════════════════════════════════════ */
function HealthZone({ probes, onRestart, restarting, }) {
    if (probes.length === 0) {
        return (_jsx("div", { style: { fontSize: 11, color: 'var(--text-dim)', textAlign: 'center', padding: 16 }, children: "\u6682\u65E0\u63A2\u9488\u6570\u636E" }));
    }
    const tr = { borderBottom: '1px solid var(--color-border, #2a2d35)' };
    const td = { padding: '8px 10px', fontSize: 11, color: 'var(--color-text)' };
    const th = {
        ...td,
        fontSize: 10,
        color: 'var(--text-dim)',
        fontWeight: 500,
        textTransform: 'uppercase',
    };
    return (_jsx("div", { style: { overflowX: 'auto' }, children: _jsxs("table", { style: { width: '100%', borderCollapse: 'collapse' }, children: [_jsx("thead", { children: _jsxs("tr", { style: tr, children: [_jsx("th", { style: { ...th, textAlign: 'left' }, children: "\u63A2\u9488\u540D\u79F0" }), _jsx("th", { style: { ...th, textAlign: 'left' }, children: "\u72B6\u6001" }), _jsx("th", { style: { ...th, textAlign: 'left' }, children: "\u5065\u5EB7\u5EA6" }), _jsx("th", { style: { ...th, textAlign: 'left' }, children: "\u8FD0\u884C\u65F6" }), _jsx("th", { style: { ...th, textAlign: 'left' }, children: "\u4E0A\u6B21\u5FC3\u8DF3" }), _jsx("th", { style: { ...th, textAlign: 'center' }, children: "\u64CD\u4F5C" })] }) }), _jsx("tbody", { children: probes.map((probe) => (_jsxs("tr", { style: tr, children: [_jsx("td", { style: td, children: _jsx("span", { style: { fontWeight: 600 }, children: probe.agent_name }) }), _jsx("td", { style: td, children: _jsx(StatusBadge, { status: probe.status }) }), _jsx("td", { style: td, children: _jsx(HealthBadge, { health: probe.health }) }), _jsx("td", { style: { ...td, fontFamily: 'var(--font-mono, monospace)', fontSize: 10 }, children: probe.runtime || '-' }), _jsx("td", { style: { ...td, fontFamily: 'var(--font-mono, monospace)', fontSize: 10, color: 'var(--text-dim)' }, children: probe.last_heartbeat || '-' }), _jsx("td", { style: { ...td, textAlign: 'center' }, children: _jsxs("button", { onClick: () => onRestart(probe.agent_id), disabled: restarting === probe.agent_id, style: {
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
                                    }, children: [_jsx(RotateCw, { size: 10, style: {
                                                animation: restarting === probe.agent_id ? 'spin 1s linear infinite' : undefined,
                                            } }), "\u91CD\u542F"] }) })] }, probe.agent_id))) })] }) }));
}
/* ═══════════════════════════════════════════
   区域 2：Token 用量
   ═══════════════════════════════════════════ */
function TokensZone({ probes }) {
    if (probes.length === 0) {
        return (_jsx("div", { style: { fontSize: 11, color: 'var(--text-dim)', textAlign: 'center', padding: 16 }, children: "\u6682\u65E0 Token \u6570\u636E" }));
    }
    const totalTokens = probes.reduce((sum, p) => sum + (p.tokens_used || 0), 0);
    return (_jsxs("div", { children: [_jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }, children: [_jsx(MiniStat, { label: "\u603B Token \u6D88\u8017", value: totalTokens.toLocaleString(), color: "#5cb878" }), _jsx(MiniStat, { label: "\u5E73\u5747\u6BCF\u63A2\u9488", value: probes.length ? Math.round(totalTokens / probes.length).toLocaleString() : '0', color: "#3b82f6" }), _jsx(MiniStat, { label: "\u6D3B\u8DC3\u63A2\u9488", value: probes.filter((p) => p.status === 'active').length.toString(), color: "#a855f7" })] }), probes.map((probe) => {
                const pct = probe.token_hard_limit > 0
                    ? Math.round((probe.tokens_used / probe.token_hard_limit) * 100)
                    : 0;
                const barColor = pct >= 90 ? '#dc2626' : pct >= 70 ? '#e8a450' : '#5cb878';
                return (_jsxs("div", { style: {
                        padding: '8px 0',
                        borderBottom: '1px solid var(--color-border, #2a2d35)',
                    }, children: [_jsxs("div", { style: {
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 4,
                            }, children: [_jsx("span", { style: { fontSize: 11, fontWeight: 500, color: 'var(--color-text)' }, children: probe.agent_name }), _jsxs("span", { style: { fontSize: 10, fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-dim)' }, children: [(probe.tokens_used || 0).toLocaleString(), " / ", (probe.token_soft_limit || 0).toLocaleString(), (probe.token_hard_limit || 0) > 0 && (_jsxs("span", { style: { color: '#9ca3af' }, children: [' ', "\uFF08\u786C\u9650\u5236 ", (probe.token_hard_limit || 0).toLocaleString(), "\uFF09"] }))] })] }), _jsx("div", { style: {
                                height: 6,
                                background: 'var(--bg-input, #1e2130)',
                                borderRadius: 3,
                                overflow: 'hidden',
                            }, children: _jsx("div", { style: {
                                    height: '100%',
                                    width: `${Math.min(pct, 100)}%`,
                                    background: barColor,
                                    borderRadius: 3,
                                    transition: 'width 0.3s ease',
                                } }) }), _jsxs("div", { style: { textAlign: 'right', fontSize: 9, color: barColor, marginTop: 2 }, children: [pct, "%"] })] }, probe.agent_id));
            })] }));
}
/* ═══════════════════════════════════════════
   区域 3：心跳时间线
   ═══════════════════════════════════════════ */
function HeartbeatZone({ probes }) {
    if (probes.length === 0) {
        return (_jsx("div", { style: { fontSize: 11, color: 'var(--text-dim)', textAlign: 'center', padding: 16 }, children: "\u6682\u65E0\u5FC3\u8DF3\u6570\u636E" }));
    }
    return (_jsx("div", { style: {
            position: 'relative',
            paddingLeft: 24,
            borderLeft: '2px solid var(--color-border, #2a2d35)',
            marginLeft: 8,
        }, children: [...probes]
            .sort((a, b) => (b.last_heartbeat || '').localeCompare(a.last_heartbeat || ''))
            .map((probe, idx) => {
            const isHealthy = probe.health === 'healthy' || probe.status === 'active';
            const dotColor = isHealthy ? '#5cb878' : '#dc2626';
            return (_jsxs("div", { style: {
                    position: 'relative',
                    marginBottom: idx === probes.length - 1 ? 0 : 16,
                }, children: [_jsx("div", { style: {
                            position: 'absolute',
                            left: -30,
                            top: 4,
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            background: dotColor,
                            border: '2px solid var(--bg-card, #181a1f)',
                        } }), _jsx("div", { style: { fontSize: 9, color: 'var(--text-dim)', marginBottom: 2, fontFamily: 'var(--font-mono, monospace)' }, children: probe.last_heartbeat || 'N/A' }), _jsx("div", { style: { fontSize: 11, color: 'var(--color-text)', fontWeight: 500 }, children: probe.agent_name }), _jsxs("div", { style: { display: 'flex', gap: 8, marginTop: 2 }, children: [_jsx(StatusBadge, { status: probe.status }), _jsx("span", { style: { fontSize: 10, color: 'var(--text-dim)' }, children: probe.runtime || 'unknown' })] })] }, probe.agent_id));
        }) }));
}
/* ═══════════════════════════════════════════
   区域 4：模型分布
   ═══════════════════════════════════════════ */
function ModelsZone({ probes }) {
    // 按 model_name 聚合
    const modelMap = new Map();
    for (const p of probes) {
        const key = p.model_name || 'unknown';
        const entry = modelMap.get(key) || { count: 0, agents: [] };
        entry.count += 1;
        entry.agents.push(p.agent_name);
        modelMap.set(key, entry);
    }
    const entries = [...modelMap.entries()].sort((a, b) => b[1].count - a[1].count);
    if (entries.length === 0) {
        return (_jsx("div", { style: { fontSize: 11, color: 'var(--text-dim)', textAlign: 'center', padding: 16 }, children: "\u6682\u65E0\u6A21\u578B\u6570\u636E" }));
    }
    const MODEL_COLORS = [
        '#5cb878', '#3b82f6', '#a855f7', '#f59e0b', '#ec4899',
        '#06b6d4', '#84cc16', '#f97316',
    ];
    return (_jsx("div", { children: _jsx("div", { style: { display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }, children: entries.map(([model, info], i) => (_jsxs("div", { style: {
                    padding: '8px 14px',
                    background: 'var(--bg-input, #1e2130)',
                    borderRadius: 8,
                    border: `2px solid ${MODEL_COLORS[i % MODEL_COLORS.length]}`,
                    minWidth: 120,
                }, children: [_jsx("div", { style: {
                            fontSize: 10,
                            color: 'var(--text-dim)',
                            marginBottom: 4,
                            fontFamily: 'var(--font-mono, monospace)',
                        }, children: model }), _jsx("div", { style: { fontSize: 18, fontWeight: 700, color: MODEL_COLORS[i % MODEL_COLORS.length] }, children: info.count }), _jsx("div", { style: { fontSize: 9, color: 'var(--text-dim)', marginTop: 2 }, children: info.agents.length > 3
                            ? `${info.agents.slice(0, 3).join(', ')} +${info.agents.length - 3}`
                            : info.agents.join(', ') })] }, model))) }) }));
}
/* ═══════════════════════════════════════════
   通用小部件
   ═══════════════════════════════════════════ */
function StatusBadge({ status }) {
    const map = {
        active: { bg: 'rgba(92,184,120,0.12)', color: '#5cb878', label: '活跃' },
        idle: { bg: 'rgba(156,163,175,0.12)', color: '#9ca3af', label: '空闲' },
        error: { bg: 'rgba(220,38,38,0.12)', color: '#dc2626', label: '异常' },
        stopped: { bg: 'rgba(107,114,128,0.15)', color: '#6b7280', label: '已停' },
    };
    const m = map[status] || { bg: 'rgba(156,163,175,0.12)', color: '#9ca3af', label: status };
    return (_jsxs("span", { style: {
            fontSize: 10,
            padding: '2px 8px',
            borderRadius: 10,
            background: m.bg,
            color: m.color,
            fontWeight: 500,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
        }, children: [_jsx(Circle, { size: 8, fill: m.color, stroke: m.color }), m.label] }));
}
function HealthBadge({ health }) {
    const map = {
        healthy: { bg: 'rgba(92,184,120,0.12)', color: '#5cb878', icon: _jsx(CheckCircle2, { size: 10 }), label: '健康' },
        warning: { bg: 'rgba(232,164,80,0.12)', color: '#e8a450', icon: _jsx(AlertTriangle, { size: 10 }), label: '警告' },
        error: { bg: 'rgba(220,38,38,0.12)', color: '#dc2626', icon: _jsx(XCircle, { size: 10 }), label: '异常' },
        unknown: { bg: 'rgba(156,163,175,0.12)', color: '#9ca3af', icon: _jsx(Circle, { size: 10 }), label: '未知' },
    };
    const m = map[health] || map['unknown'];
    return (_jsxs("span", { style: {
            fontSize: 10,
            padding: '2px 8px',
            borderRadius: 10,
            background: m.bg,
            color: m.color,
            fontWeight: 500,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
        }, children: [m.icon, m.label] }));
}
function MiniStat({ label, value, color, }) {
    return (_jsxs("div", { style: {
            padding: '10px 12px',
            background: 'var(--bg-input, #1e2130)',
            borderRadius: 6,
            borderLeft: `3px solid ${color}`,
        }, children: [_jsx("div", { style: { fontSize: 10, color: 'var(--text-dim)', marginBottom: 4 }, children: label }), _jsx("div", { style: {
                    fontSize: 18,
                    fontWeight: 700,
                    color,
                    fontFamily: 'var(--font-mono, monospace)',
                }, children: value })] }));
}
