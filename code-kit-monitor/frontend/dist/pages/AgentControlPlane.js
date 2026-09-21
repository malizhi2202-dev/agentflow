import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState, useCallback, useRef } from 'react';
import { Radio, Activity, RefreshCw, Clock, XCircle, Pause, RotateCcw, X, Server, Cpu, BarChart3, Link2, Layers, Plus, Trash2, ChevronRight, GitBranch, CopyPlus, AlertTriangle, } from 'lucide-react';
import { useControlPlane } from '../stores/controlPlane';
import { useDomains } from '../stores/domains';
import { useAgents } from '../stores/agents';
const STATUS_PRIORITY = {
    dead: 0,
    blocked: 1,
    running: 2,
    idle: 3,
};
const STATUS_CONFIG = {
    running: { color: 'var(--green)', bg: 'var(--green-bg)', label: '运行中' },
    idle: { color: 'var(--green)', bg: 'var(--green-bg)', label: '空闲' },
    blocked: { color: 'var(--orange)', bg: 'var(--orange-bg)', label: '阻塞' },
    dead: { color: 'var(--red)', bg: 'var(--red-bg)', label: '停止' },
};
function getStatusConfig(status) {
    return STATUS_CONFIG[status] || { color: 'var(--text-muted)', bg: 'var(--bg-input)', label: status || '未知' };
}
function getHealthLabel(status) {
    if (status === 'healthy' || status === 'pass')
        return '健康';
    if (status === 'degraded' || status === 'fail')
        return '降级';
    if (status === 'unhealthy')
        return '异常';
    if (status === 'error')
        return '错误';
    if (status === 'skipped')
        return '未探测';
    return status || '未知';
}
// ── 样式片段 ──
const cardBase = {
    background: 'var(--bg-card)', borderRadius: 8, padding: 20,
    border: '1px solid var(--border)', textAlign: 'center',
};
const cardValue = {
    fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700,
};
const cardLabel = {
    fontSize: 11, color: 'var(--text-muted)', marginBottom: 4,
};
const cardSub = {
    fontSize: 10, color: 'var(--text-muted)', marginTop: 4,
};
const th = {
    padding: '6px 8px', textAlign: 'left', color: 'var(--text-muted)',
    fontWeight: 500, fontSize: 10, whiteSpace: 'nowrap',
};
const td = {
    padding: '6px 8px', fontSize: 12, color: 'var(--text)',
    whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)',
};
// ── 组件 ──
function OverviewCards({ probes, queue }) {
    const totalAgents = probes.length;
    const healthyCount = probes.filter(function (a) { return a.health === 'healthy'; }).length;
    const deadCount = probes.filter(function (a) { return a.status === 'dead' || a.health === 'unhealthy'; }).length;
    const queueCount = queue.length;
    var cards = [
        { label: 'Agent 总数', value: totalAgents, color: 'var(--blue)', icon: _jsx(Server, { size: 16 }), sub: '全部注册 Agent' },
        { label: '健康', value: healthyCount, color: 'var(--green)', icon: _jsx(Activity, { size: 16 }), sub: 'healthy 状态' },
        { label: '异常', value: deadCount, color: deadCount > 0 ? 'var(--red)' : 'var(--text-muted)', icon: _jsx(XCircle, { size: 16 }), sub: 'dead / unhealthy' },
        { label: '队列任务', value: queueCount, color: 'var(--orange)', icon: _jsx(Clock, { size: 16 }), sub: '待调度 / 执行中' },
    ];
    return (_jsx("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }, children: cards.map(function (c) {
            return (_jsxs("div", { style: cardBase, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 8, color: c.color }, children: [c.icon, _jsx("div", { style: cardLabel, children: c.label })] }), _jsx("div", { style: { ...cardValue, color: c.color }, children: c.value }), _jsx("div", { style: cardSub, children: c.sub })] }, `card-${c.label}`));
        }) }));
}
function AgentRow({ agent, isSelected, onClick, }) {
    const sc = getStatusConfig(agent.status);
    const tokenPct = agent.token_hard_limit > 0
        ? Math.min(100, Math.round(agent.tokens_used / agent.token_hard_limit * 100))
        : 0;
    return (_jsxs("tr", { onClick: onClick, style: {
            cursor: 'pointer',
            background: isSelected ? 'var(--bg-selected)' : 'transparent',
            borderBottom: '1px solid var(--border)',
            transition: 'background 0.1s',
        }, onMouseEnter: function (e) {
            if (!isSelected)
                e.currentTarget.style.background = 'var(--bg-card-hover)';
        }, onMouseLeave: function (e) {
            if (!isSelected)
                e.currentTarget.style.background = 'transparent';
        }, children: [_jsx("td", { style: td, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("span", { style: {
                                width: 8, height: 8, borderRadius: '50%', display: 'inline-block', flexShrink: 0,
                                background: sc.color,
                            } }), _jsx("span", { style: { fontWeight: 500 }, children: agent.agent_name })] }) }), _jsx("td", { style: td, children: _jsxs("span", { style: {
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 8px', borderRadius: 3, fontSize: 10,
                        background: sc.bg, color: sc.color, fontWeight: 500,
                    }, children: [_jsx("span", { style: { width: 5, height: 5, borderRadius: '50%', background: sc.color, display: 'inline-block' } }), sc.label] }) }), _jsx("td", { style: td, children: _jsx("span", { style: {
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 8px', borderRadius: 3, fontSize: 10,
                        background: agent.status === 'healthy' ? 'var(--green-bg)' : 'var(--red-bg)',
                        color: agent.status === 'healthy' ? 'var(--green)' : 'var(--red)',
                        fontWeight: 500,
                    }, children: getHealthLabel(agent.status) }) }), _jsx("td", { style: td, children: _jsx("span", { style: { fontFamily: 'var(--font-mono)', fontSize: 11 }, children: agent.model_name }) }), _jsx("td", { style: td, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 6 }, children: [_jsx("div", { style: { width: 60, height: 4, background: 'var(--bg-input)', borderRadius: 2, overflow: 'hidden' }, children: _jsx("div", { style: {
                                    height: '100%', width: tokenPct + '%',
                                    background: tokenPct > 80 ? 'var(--red)' : tokenPct > 50 ? 'var(--orange)' : 'var(--green)',
                                    borderRadius: 2, transition: 'width 0.3s',
                                } }) }), _jsxs("span", { style: { fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)' }, children: [((agent.tokens_used ?? 0) / 1000).toFixed(0), "k / ", ((agent.token_hard_limit ?? 0) / 1000).toFixed(0), "k"] })] }) }), _jsx("td", { style: { ...td, fontSize: 10, color: 'var(--text-muted)' }, children: agent.last_heartbeat ? new Date(agent.last_heartbeat).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-' })] }));
}
function AgentListTab({ probes, selectedAgent, onSelectAgent, }) {
    const sorted = probes.slice().sort(function (a, b) {
        const pa = STATUS_PRIORITY[a.status] ?? 99;
        const pb = STATUS_PRIORITY[b.status] ?? 99;
        return pa - pb;
    });
    if (sorted.length === 0) {
        return (_jsxs("div", { style: { textAlign: 'center', padding: 60, color: 'var(--text-muted)' }, children: [_jsx(Server, { size: 32, style: { opacity: 0.3, marginBottom: 12 } }), _jsx("p", { style: { fontSize: 13, margin: 0 }, children: "\u6682\u65E0 Agent \u6570\u636E" }), _jsx("p", { style: { fontSize: 11, margin: '4px 0' }, children: "\u542F\u52A8\u63A2\u9488\u540E\u5C06\u5728\u6B64\u5904\u663E\u793A Agent \u72B6\u6001" })] }));
    }
    return (_jsx("div", { style: { overflowX: 'auto' }, children: _jsxs("table", { style: { width: '100%', borderCollapse: 'collapse', fontSize: 12 }, children: [_jsx("thead", { children: _jsxs("tr", { style: { borderBottom: '1px solid var(--border-strong)', background: 'var(--bg-input)' }, children: [_jsx("th", { style: th, children: "Agent \u540D\u79F0" }), _jsx("th", { style: th, children: "\u8FD0\u884C\u72B6\u6001" }), _jsx("th", { style: th, children: "\u5065\u5EB7\u68C0\u67E5" }), _jsx("th", { style: th, children: "\u6A21\u578B" }), _jsx("th", { style: th, children: "Token \u7528\u91CF" }), _jsx("th", { style: th, children: "\u6700\u540E\u5FC3\u8DF3" })] }) }), _jsx("tbody", { children: sorted.map(function (agent) {
                        return (_jsx(AgentRow, { agent: agent, isSelected: selectedAgent === agent.agent_id, onClick: function () { onSelectAgent(agent.agent_id); } }, `agent-${agent.agent_id}`));
                    }) })] }) }));
}
function QueueTab({ queue }) {
    if (queue.length === 0) {
        return (_jsxs("div", { style: { textAlign: 'center', padding: 60, color: 'var(--text-muted)' }, children: [_jsx(Clock, { size: 32, style: { opacity: 0.3, marginBottom: 12 } }), _jsx("p", { style: { fontSize: 13, margin: 0 }, children: "\u8C03\u5EA6\u961F\u5217\u4E3A\u7A7A" }), _jsx("p", { style: { fontSize: 11, margin: '4px 0' }, children: "\u6682\u65E0\u5F85\u8C03\u5EA6\u6216\u6267\u884C\u4E2D\u7684\u4EFB\u52A1" })] }));
    }
    const statusStyle = function (st) {
        const map = {
            pending: { c: 'var(--orange)', bg: 'var(--orange-bg)' },
            running: { c: 'var(--blue)', bg: 'var(--blue-bg)' },
            completed: { c: 'var(--green)', bg: 'var(--green-bg)' },
            failed: { c: 'var(--red)', bg: 'var(--red-bg)' },
        };
        const m = map[st] || { c: 'var(--text-muted)', bg: 'var(--bg-input)' };
        return { padding: '2px 8px', borderRadius: 3, fontSize: 10, background: m.bg, color: m.c, fontWeight: 500 };
    };
    return (_jsx("div", { style: { overflowX: 'auto' }, children: _jsxs("table", { style: { width: '100%', borderCollapse: 'collapse', fontSize: 12 }, children: [_jsx("thead", { children: _jsxs("tr", { style: { borderBottom: '1px solid var(--border-strong)', background: 'var(--bg-input)' }, children: [_jsx("th", { style: th, children: "\u4EFB\u52A1 ID" }), _jsx("th", { style: th, children: "\u7F16\u6392\u540D\u79F0" }), _jsx("th", { style: th, children: "\u76EE\u6807 Agent" }), _jsx("th", { style: th, children: "\u72B6\u6001" }), _jsx("th", { style: th, children: "\u4F18\u5148\u7EA7" }), _jsx("th", { style: th, children: "\u521B\u5EFA\u65F6\u95F4" })] }) }), _jsx("tbody", { children: queue.map(function (item) {
                        return (_jsxs("tr", { style: { borderBottom: '1px solid var(--border)' }, children: [_jsxs("td", { style: { ...td, fontFamily: 'var(--font-mono)', fontSize: 10 }, children: ["#", item.id] }), _jsx("td", { style: td, children: item.orchestration_name }), _jsx("td", { style: td, children: item.agent_name || 'Agent #' + item.agent_id }), _jsx("td", { style: td, children: _jsx("span", { style: statusStyle(item.status), children: item.status }) }), _jsx("td", { style: { ...td, fontFamily: 'var(--font-mono)' }, children: _jsxs("span", { style: {
                                            padding: '2px 6px', borderRadius: 3, fontSize: 10,
                                            background: item.priority >= 8 ? 'var(--red-bg)' : item.priority >= 5 ? 'var(--orange-bg)' : 'var(--bg-input)',
                                            color: item.priority >= 8 ? 'var(--red)' : item.priority >= 5 ? 'var(--orange)' : 'var(--text-secondary)',
                                        }, children: ["P", item.priority] }) }), _jsx("td", { style: { ...td, fontSize: 10, color: 'var(--text-muted)' }, children: item.created_at ? new Date(item.created_at).toLocaleString('zh-CN') : '-' })] }, `queue-${item.id}`));
                    }) })] }) }));
}
function ReconcileTab({ entries }) {
    if (entries.length === 0) {
        return (_jsxs("div", { style: { textAlign: 'center', padding: 60, color: 'var(--text-muted)' }, children: [_jsx(RotateCcw, { size: 32, style: { opacity: 0.3, marginBottom: 12 } }), _jsx("p", { style: { fontSize: 13, margin: 0 }, children: "\u6682\u65E0 Reconcile \u65E5\u5FD7" }), _jsx("p", { style: { fontSize: 11, margin: '4px 0' }, children: "\u7CFB\u7EDF\u672A\u68C0\u6D4B\u5230\u6F02\u79FB\u6216\u5C1A\u672A\u6267\u884C reconcile" })] }));
    }
    return (_jsx("div", { style: { overflowX: 'auto' }, children: _jsxs("table", { style: { width: '100%', borderCollapse: 'collapse', fontSize: 12 }, children: [_jsx("thead", { children: _jsxs("tr", { style: { borderBottom: '1px solid var(--border-strong)', background: 'var(--bg-input)' }, children: [_jsx("th", { style: th, children: "ID" }), _jsx("th", { style: th, children: "\u7F16\u6392" }), _jsx("th", { style: th, children: "\u72B6\u6001" }), _jsx("th", { style: th, children: "\u6F02\u79FB\u68C0\u6D4B" }), _jsx("th", { style: th, children: "\u6D88\u606F" }), _jsx("th", { style: th, children: "\u65F6\u95F4" })] }) }), _jsx("tbody", { children: entries.map(function (entry) {
                        const driftStyle = entry.drift_detected
                            ? { color: 'var(--red)', background: 'var(--red-bg)', padding: '2px 8px', borderRadius: 3, fontSize: 10 }
                            : { color: 'var(--green)', background: 'var(--green-bg)', padding: '2px 8px', borderRadius: 3, fontSize: 10 };
                        return (_jsxs("tr", { style: { borderBottom: '1px solid var(--border)' }, children: [_jsxs("td", { style: { ...td, fontFamily: 'var(--font-mono)', fontSize: 10 }, children: ["#", entry.id] }), _jsx("td", { style: td, children: entry.orchestration_name }), _jsx("td", { style: td, children: _jsx("span", { style: {
                                            padding: '2px 8px', borderRadius: 3, fontSize: 10,
                                            background: entry.status === 'resolved' ? 'var(--green-bg)' : entry.status === 'failed' ? 'var(--red-bg)' : 'var(--orange-bg)',
                                            color: entry.status === 'resolved' ? 'var(--green)' : entry.status === 'failed' ? 'var(--red)' : 'var(--orange)',
                                        }, children: entry.status }) }), _jsx("td", { style: td, children: _jsx("span", { style: driftStyle, children: entry.drift_detected ? '⚠ 检测到' : '✓ 无漂移' }) }), _jsx("td", { style: { ...td, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }, children: entry.message || '-' }), _jsx("td", { style: { ...td, fontSize: 10, color: 'var(--text-muted)' }, children: entry.created_at ? new Date(entry.created_at).toLocaleString('zh-CN') : '-' })] }, `reconcile-${entry.id}`));
                    }) })] }) }));
}
// ── 域树 Tab ──
function isAgentHealthy(status) {
    return status === 'running' || status === 'standby';
}
function CapabilityGroupRow({ groupKey, capability, agents, isExpanded, onToggle, domainId, autoRouteEnabled, queueCount, onRoute, onScale, routeLoading, scaleLoading, }) {
    const healthyCount = agents.filter(function (a) { return isAgentHealthy(a.status); }).length;
    const totalCount = agents.length;
    const th = {
        textAlign: 'left', padding: '6px 8px', fontSize: 10, fontWeight: 600,
        color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em',
        borderBottom: '1px solid var(--border)',
    };
    const td = {
        padding: '6px 8px', borderBottom: '1px solid var(--border)',
        fontSize: 11, color: 'var(--text)',
    };
    return (_jsxs("div", { style: { marginBottom: 4, border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }, children: [_jsxs("div", { onClick: onToggle, style: {
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', cursor: 'pointer',
                    background: isExpanded ? 'var(--bg-selected)' : 'var(--bg-input)',
                    transition: 'background 0.15s', userSelect: 'none',
                    borderBottom: isExpanded ? '1px solid var(--border)' : 'none',
                }, children: [_jsx("span", { style: {
                            color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
                            transition: 'transform 0.2s', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        }, children: _jsx(ChevronRight, { size: 14 }) }), _jsxs("span", { style: { fontWeight: 600, fontSize: 12, flex: 1, color: 'var(--text)' }, children: ["\uD83D\uDCE6 ", capability] }), _jsxs("span", { style: {
                            fontSize: 10, color: healthyCount === totalCount ? 'var(--green)' : 'var(--orange)',
                            background: 'var(--bg-card)', padding: '1px 6px', borderRadius: 8,
                            fontWeight: 500,
                        }, children: [healthyCount, " healthy / ", totalCount, " total"] }), queueCount > 0 && (_jsxs("span", { style: {
                            fontSize: 10, color: 'var(--orange)',
                            background: 'var(--orange-bg)', padding: '1px 6px', borderRadius: 8,
                            fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3,
                        }, children: [_jsx(AlertTriangle, { size: 10 }), "\u6392\u961F: ", queueCount] })), autoRouteEnabled && (_jsxs("button", { onClick: function (e) { e.stopPropagation(); onRoute(capability); }, disabled: routeLoading, title: "\u81EA\u52A8\u8DEF\u7531 - \u9009\u62E9\u8D1F\u8F7D\u6700\u4F4E\u7684 Agent", style: {
                            padding: '4px 10px', background: 'var(--blue)', color: '#fff',
                            border: 'none', borderRadius: 4, cursor: routeLoading ? 'wait' : 'pointer',
                            fontSize: 10, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 3,
                        }, children: [_jsx(GitBranch, { size: 11 }), routeLoading ? '路由中...' : '路由'] })), autoRouteEnabled && (_jsxs("button", { onClick: function (e) { e.stopPropagation(); onScale(capability); }, disabled: scaleLoading, title: "\u5F39\u6027\u7F29\u653E - \u521B\u5EFA Agent \u526F\u672C", style: {
                            padding: '4px 10px', background: 'var(--green)', color: '#fff',
                            border: 'none', borderRadius: 4, cursor: scaleLoading ? 'wait' : 'pointer',
                            fontSize: 10, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 3,
                        }, children: [_jsx(CopyPlus, { size: 11 }), scaleLoading ? '扩容中...' : '扩容'] }))] }), isExpanded && (_jsx("div", { style: { padding: '4px 8px 8px' }, children: agents.length === 0 ? (_jsx("div", { style: { textAlign: 'center', padding: 12, color: 'var(--text-muted)', fontSize: 11 }, children: "\u65E0 Agent" })) : (_jsx("div", { style: { overflowX: 'auto' }, children: _jsxs("table", { style: { width: '100%', borderCollapse: 'collapse', fontSize: 11 }, children: [_jsx("thead", { children: _jsxs("tr", { style: { background: 'var(--bg-input)' }, children: [_jsx("th", { style: { ...th, paddingLeft: 10 }, children: "Agent \u540D\u79F0" }), _jsx("th", { style: th, children: "\u72B6\u6001" }), _jsx("th", { style: th, children: "\u6A21\u578B" }), _jsx("th", { style: th, children: "\u8FD0\u884C\u65F6" })] }) }), _jsx("tbody", { children: agents.map(function (agent) {
                                    const statusStyle = agent.status === 'running'
                                        ? { color: 'var(--green)', bg: 'var(--green-bg)', label: '运行中' }
                                        : agent.status === 'standby'
                                            ? { color: 'var(--text-muted)', bg: 'var(--bg-input)', label: '待机' }
                                            : { color: 'var(--orange)', bg: 'var(--orange-bg)', label: agent.status || '未知' };
                                    return (_jsxs("tr", { style: { borderBottom: '1px solid var(--border)' }, children: [_jsx("td", { style: { ...td, fontWeight: 500, paddingLeft: 10, fontSize: 11 }, children: agent.name }), _jsx("td", { style: td, children: _jsxs("span", { style: {
                                                        display: 'inline-flex', alignItems: 'center', gap: 4,
                                                        padding: '2px 6px', borderRadius: 3, fontSize: 9,
                                                        background: statusStyle.bg, color: statusStyle.color, fontWeight: 500,
                                                    }, children: [_jsx("span", { style: { width: 5, height: 5, borderRadius: '50%', background: statusStyle.color, display: 'inline-block' } }), statusStyle.label] }) }), _jsx("td", { style: { ...td, fontFamily: 'var(--font-mono)', fontSize: 10 }, children: agent.model_name }), _jsx("td", { style: { ...td, fontSize: 10, color: 'var(--text-secondary)' }, children: agent.runtime })] }, `cap-agent-${agent.id}`));
                                }) })] }) })) }))] }));
}
function DomainAccordionRow({ domainKey, name, agentCount, isExpanded, onToggle, isDefault, onDelete, agents, agentsLoading, expandedGroups, onToggleGroup, domainId, autoRouteEnabled, queueCounts, onRoute, onScale, routeLoading, scaleLoading, }) {
    // 按 capability 分组 agents
    const capabilityGroups = (function () {
        const groups = {};
        for (const agent of agents) {
            const cfg = agent.model_config_json || {};
            const caps = (cfg && typeof cfg === 'object' && Array.isArray(cfg.capabilities))
                ? cfg.capabilities
                : [];
            if (caps.length === 0) {
                // 无 capability → "未分类"
                if (!groups['未分类'])
                    groups['未分类'] = [];
                groups['未分类'].push(agent);
            }
            else {
                for (const cap of caps) {
                    if (!groups[cap])
                        groups[cap] = [];
                    groups[cap].push(agent);
                }
            }
        }
        return groups;
    })();
    return (_jsxs("div", { style: {
            border: '1px solid var(--border)',
            borderRadius: 8,
            marginBottom: 8,
            overflow: 'hidden',
            background: 'var(--bg-card)',
        }, children: [_jsxs("div", { onClick: onToggle, style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 16px',
                    cursor: 'pointer',
                    background: isExpanded ? 'var(--bg-selected)' : 'var(--bg-card)',
                    borderBottom: isExpanded ? '1px solid var(--border)' : 'none',
                    transition: 'background 0.15s',
                    userSelect: 'none',
                }, children: [_jsx("span", { style: { color: 'var(--text-muted)', display: 'flex', alignItems: 'center', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }, children: _jsx(ChevronRight, { size: 16 }) }), _jsx(Layers, { size: 16, style: { color: isDefault ? 'var(--text-muted)' : 'var(--blue)' } }), _jsx("span", { style: { fontWeight: 600, fontSize: 13, flex: 1, color: isDefault ? 'var(--text-muted)' : 'var(--text)' }, children: name }), _jsxs("span", { style: {
                            fontSize: 11, color: 'var(--text-muted)',
                            background: 'var(--bg-input)', padding: '2px 8px', borderRadius: 10,
                            fontWeight: 500,
                        }, children: [agentCount, " \u4E2A Agent"] }), !isDefault && onDelete && (_jsxs("button", { onClick: function (e) { e.stopPropagation(); onDelete(); }, title: "\u5220\u9664\u57DF", style: {
                            padding: '4px 8px', background: 'none', border: '1px solid var(--border)',
                            borderRadius: 4, cursor: 'pointer', color: 'var(--text-muted)',
                            fontSize: 10, display: 'flex', alignItems: 'center', gap: 3,
                        }, children: [_jsx(Trash2, { size: 12 }), "\u5220\u9664"] }))] }), isExpanded && (_jsx("div", { style: { padding: '8px 16px 12px' }, children: agentsLoading ? (_jsx("div", { style: { textAlign: 'center', padding: 16, color: 'var(--text-muted)', fontSize: 12 }, children: "\u52A0\u8F7D\u4E2D..." })) : Object.keys(capabilityGroups).length === 0 ? (_jsx("div", { style: { textAlign: 'center', padding: 16, color: 'var(--text-muted)', fontSize: 12 }, children: "\u6B64\u57DF\u6682\u65E0 Agent" })) : (Object.keys(capabilityGroups).sort().map(function (cap) {
                    var groupAgents = capabilityGroups[cap];
                    var groupKey = domainKey + ':' + cap;
                    var capQueueCount = queueCounts[groupKey] || 0;
                    return (_jsx(CapabilityGroupRow, { groupKey: groupKey, capability: cap, agents: groupAgents, isExpanded: expandedGroups.has(groupKey), onToggle: function () { onToggleGroup(groupKey); }, domainId: domainId, autoRouteEnabled: autoRouteEnabled, queueCount: capQueueCount, onRoute: onRoute, onScale: onScale, routeLoading: routeLoading, scaleLoading: scaleLoading }, groupKey));
                })) }))] }));
}
function DomainTreeTab() {
    const { domains, fetchDomains, createDomain, deleteDomain, autoRoute, queueCounts, toggleAutoRoute, routeToAgent, scaleAgents, fetchQueueCounts } = useDomains();
    const { fetchAgentsByDomain } = useAgents();
    const [expandedKeys, setExpandedKeys] = useState(new Set());
    const [expandedGroups, setExpandedGroups] = useState(new Set());
    const [domainAgents, setDomainAgents] = useState({});
    const [agentsLoading, setAgentsLoading] = useState({});
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newDomainName, setNewDomainName] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [defaultAgentCount, setDefaultAgentCount] = useState(0);
    const [routeResult, setRouteResult] = useState(null);
    const [scaleResult, setScaleResult] = useState(null);
    const [routeLoading, setRouteLoading] = useState(false);
    const [scaleLoading, setScaleLoading] = useState(false);
    // Track which domain gets the toggle (null = disabled state)
    const [activeDomainId] = useState(null);
    const [activeDomainKey] = useState('');
    // Route handler
    const handleRoute = async function (capability) {
        setRouteLoading(true);
        try {
            const result = await routeToAgent(activeDomainId, capability);
            setRouteResult(result);
            if (result) {
                // Refresh queue counts
                if (activeDomainId !== null) {
                    fetchQueueCounts(activeDomainId);
                }
            }
        }
        catch (_e) {
            // ignore
        }
        finally {
            setRouteLoading(false);
        }
    };
    // Scale handler
    const handleScale = async function (capability) {
        if (activeDomainId === null)
            return;
        setScaleLoading(true);
        try {
            const result = await scaleAgents(activeDomainId, capability, 5);
            setScaleResult(result);
            // Refresh agents
            if (result && result.status === 'scaled') {
                const updatedAgents = await fetchAgentsByDomain(activeDomainId);
                setDomainAgents(function (prev) { return { ...prev, [String(activeDomainId)]: updatedAgents }; });
            }
        }
        catch (_e) {
            // ignore
        }
        finally {
            setScaleLoading(false);
        }
    };
    // 初始加载域列表 + 默认域 agent 数量
    useEffect(function () {
        fetchDomains();
        // 获取默认域 agent 数量
        fetchAgentsByDomain(null).then(function (agents) {
            setDefaultAgentCount(agents.length);
        }).catch(function () { });
    }, []);
    const toggleGroup = function (groupKey) {
        setExpandedGroups(function (prev) {
            const next = new Set(prev);
            if (next.has(groupKey)) {
                next.delete(groupKey);
            }
            else {
                next.add(groupKey);
            }
            return next;
        });
    };
    const toggleDomain = async function (key) {
        const newKeys = new Set(expandedKeys);
        if (newKeys.has(key)) {
            newKeys.delete(key);
        }
        else {
            newKeys.add(key);
            // 缓存未加载则拉取
            if (!domainAgents[key]) {
                setAgentsLoading(function (prev) { return { ...prev, [key]: true }; });
                const domainId = key === 'default' ? null : parseInt(key, 10);
                try {
                    const agents = await fetchAgentsByDomain(domainId);
                    setDomainAgents(function (prev) { return { ...prev, [key]: agents }; });
                    if (key === 'default')
                        setDefaultAgentCount(agents.length);
                }
                catch (_e) {
                    // ignore
                }
                finally {
                    setAgentsLoading(function (prev) { return { ...prev, [key]: false }; });
                }
            }
        }
        setExpandedKeys(newKeys);
    };
    const handleCreate = async function () {
        const name = newDomainName.trim();
        if (!name)
            return;
        try {
            await createDomain(name);
            setNewDomainName('');
            setShowCreateModal(false);
            fetchDomains();
        }
        catch (e) {
            alert(e.message || '创建失败');
        }
    };
    const handleDelete = async function (id) {
        await deleteDomain(id);
        setDeleteConfirm(null);
        // 从展开集合中移除
        const newKeys = new Set(expandedKeys);
        newKeys.delete(String(id));
        setExpandedKeys(newKeys);
        // 清除缓存
        setDomainAgents(function (prev) {
            const next = { ...prev };
            delete next[String(id)];
            return next;
        });
        fetchDomains();
    };
    // 按 id 排序域
    const sortedDomains = domains.slice().sort(function (a, b) { return a.id - b.id; });
    return (_jsxs("div", { children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }, children: [_jsxs("div", { style: { fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx(Layers, { size: 16, style: { color: 'var(--blue)' } }), "\u9694\u79BB\u57DF\u7BA1\u7406"] }), _jsxs("button", { onClick: function () { setShowCreateModal(true); }, style: {
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '7px 14px', background: 'var(--blue)', color: '#fff',
                            border: 'none', borderRadius: 5, cursor: 'pointer',
                            fontSize: 12, fontWeight: 500,
                        }, children: [_jsx(Plus, { size: 14 }), "\u65B0\u5EFA\u57DF"] })] }), _jsx(DomainAccordionRow, { domainKey: "default", name: "\u9ED8\u8BA4\u57DF", agentCount: defaultAgentCount, isExpanded: expandedKeys.has('default'), onToggle: function () { toggleDomain('default'); }, isDefault: true, agents: domainAgents['default'] || [], agentsLoading: agentsLoading['default'] || false, expandedGroups: expandedGroups, onToggleGroup: toggleGroup, domainId: null, autoRouteEnabled: autoRoute['default'] || false, queueCounts: queueCounts, onRoute: handleRoute, onScale: handleScale, routeLoading: routeLoading, scaleLoading: scaleLoading }), sortedDomains.length === 0 ? (_jsx("div", { style: { textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }, children: "\u6682\u65E0\u9694\u79BB\u57DF\uFF0C\u70B9\u51FB\u300C\u65B0\u5EFA\u57DF\u300D\u521B\u5EFA" })) : (sortedDomains.map(function (domain) {
                const key = String(domain.id);
                return (_jsx(DomainAccordionRow, { domainKey: key, name: domain.name, agentCount: domain.agent_count ?? 0, isExpanded: expandedKeys.has(key), onToggle: function () { toggleDomain(key); }, onDelete: function () { setDeleteConfirm(domain.id); }, agents: domainAgents[key] || [], agentsLoading: agentsLoading[key] || false, expandedGroups: expandedGroups, onToggleGroup: toggleGroup, domainId: domain.id, autoRouteEnabled: autoRoute[key] || false, queueCounts: queueCounts, onRoute: handleRoute, onScale: handleScale, routeLoading: routeLoading, scaleLoading: scaleLoading }, `domain-${domain.id}`));
            })), showCreateModal && (_jsx("div", { onClick: function () { setShowCreateModal(false); }, style: {
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 100,
                }, children: _jsxs("div", { onClick: function (e) { e.stopPropagation(); }, style: {
                        background: 'var(--bg-card)', borderRadius: 8, padding: 24,
                        width: 360, border: '1px solid var(--border)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    }, children: [_jsx("h4", { style: { fontSize: 15, fontWeight: 600, margin: '0 0 16px' }, children: "\u65B0\u5EFA\u9694\u79BB\u57DF" }), _jsx("input", { autoFocus: true, value: newDomainName, onChange: function (e) { setNewDomainName(e.target.value); }, onKeyDown: function (e) { if (e.key === 'Enter')
                                handleCreate(); }, placeholder: "\u8F93\u5165\u57DF\u540D\u79F0", style: {
                                width: '100%', padding: '8px 12px',
                                border: '1px solid var(--border)', borderRadius: 4,
                                background: 'var(--bg-input)', color: 'var(--text)',
                                fontSize: 13, outline: 'none', boxSizing: 'border-box',
                            } }), _jsxs("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }, children: [_jsx("button", { onClick: function () { setShowCreateModal(false); }, style: {
                                        padding: '7px 16px', background: 'var(--bg-input)',
                                        border: '1px solid var(--border)', borderRadius: 4,
                                        cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 12,
                                    }, children: "\u53D6\u6D88" }), _jsx("button", { onClick: handleCreate, style: {
                                        padding: '7px 16px', background: 'var(--blue)', color: '#fff',
                                        border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12,
                                    }, children: "\u521B\u5EFA" })] })] }) })), deleteConfirm !== null && (_jsx("div", { onClick: function () { setDeleteConfirm(null); }, style: {
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 100,
                }, children: _jsxs("div", { onClick: function (e) { e.stopPropagation(); }, style: {
                        background: 'var(--bg-card)', borderRadius: 8, padding: 24,
                        width: 360, border: '1px solid var(--border)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    }, children: [_jsx("h4", { style: { fontSize: 15, fontWeight: 600, margin: '0 0 8px', color: 'var(--red)' }, children: "\u26A0 \u786E\u8BA4\u5220\u9664" }), _jsx("p", { style: { fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 16px', lineHeight: 1.6 }, children: "\u5220\u9664\u8BE5\u57DF\u540E\uFF0C\u57DF\u5185\u6240\u6709 Agent \u5C06\u81EA\u52A8\u56DE\u5F52\u9ED8\u8BA4\u57DF\uFF08domain_id \u7F6E\u4E3A NULL\uFF09\u3002 \u6B64\u64CD\u4F5C\u4E0D\u53EF\u64A4\u9500\u3002" }), _jsxs("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: 8 }, children: [_jsx("button", { onClick: function () { setDeleteConfirm(null); }, style: {
                                        padding: '7px 16px', background: 'var(--bg-input)',
                                        border: '1px solid var(--border)', borderRadius: 4,
                                        cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 12,
                                    }, children: "\u53D6\u6D88" }), _jsx("button", { onClick: function () { handleDelete(deleteConfirm); }, style: {
                                        padding: '7px 16px', background: 'var(--red)', color: '#fff',
                                        border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12,
                                    }, children: "\u786E\u8BA4\u5220\u9664" })] })] }) }))] }));
}
// ── 详情面板 ──
function DetailPanel({ agent, onClose, onAction, actionLoading, }) {
    const tokenHardPct = agent.token_hard_limit > 0
        ? Math.min(100, Math.round(agent.tokens_used / agent.token_hard_limit * 100))
        : 0;
    const tokenSoftPct = agent.token_soft_limit > 0
        ? Math.min(100, Math.round(agent.tokens_used / agent.token_soft_limit * 100))
        : 0;
    // Heartbeat timeline: simulate recent beats
    const heartbeatHistory = (function () {
        const now = Date.now();
        const points = [];
        for (var i = 9; i >= 0; i--) {
            // Simulate — real would come from backend
            const t = now - i * 15000; // every 15s
            const time = new Date(t).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            // If agent last heartbeat is recent, show green; otherwise show gaps
            const lastHb = agent.last_heartbeat ? new Date(agent.last_heartbeat).getTime() : 0;
            const alive = agent.status !== 'dead' && Math.abs(t - lastHb) < 60000;
            points.push({ time, alive, ts: t });
        }
        return points;
    })();
    return (_jsxs("div", { style: {
            position: 'absolute', top: 0, right: 0, bottom: 0, width: 420,
            background: 'var(--bg-sidebar)', borderLeft: '1px solid var(--border)',
            overflow: 'auto', zIndex: 10, padding: 20,
            display: 'flex', flexDirection: 'column', gap: 16,
            boxShadow: '-4px 0 20px rgba(0,0,0,0.3)',
        }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsxs("div", { children: [_jsxs("h3", { style: { fontSize: 16, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("span", { style: { width: 10, height: 10, borderRadius: '50%', background: getStatusConfig(agent.status).color, display: 'inline-block' } }), agent.agent_name] }), _jsxs("div", { style: { fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }, children: ["Agent #", agent.agent_id, " \u00B7 ", agent.runtime] })] }), _jsx("button", { onClick: onClose, style: { padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', borderRadius: 4 }, children: _jsx(X, { size: 18 }) })] }), _jsx("div", { style: { height: 1, background: 'var(--border)' } }), _jsxs("div", { className: "card", style: { padding: 12 }, children: [_jsxs("div", { style: { fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }, children: [_jsx(Activity, { size: 14, color: "var(--green)" }), "\u5FC3\u8DF3\u65F6\u95F4\u7EBF", _jsx("span", { style: { fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }, children: agent.last_heartbeat ? new Date(agent.last_heartbeat).toLocaleTimeString('zh-CN') : '无记录' })] }), _jsx("div", { style: { display: 'flex', alignItems: 'flex-end', height: 40, gap: 3 }, children: heartbeatHistory.map(function (hb, i) {
                            return (_jsx("div", { title: hb.time, style: {
                                    flex: 1, height: hb.alive ? 32 : 8,
                                    background: hb.alive ? 'var(--green)' : 'var(--bg-input)',
                                    borderRadius: '2px 2px 0 0',
                                    opacity: hb.alive ? 1 : 0.4,
                                    transition: 'height 0.3s',
                                    minWidth: 4,
                                } }, i));
                        }) }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 8, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }, children: [_jsx("span", { children: heartbeatHistory[0]?.time }), _jsx("span", { children: heartbeatHistory[heartbeatHistory.length - 1]?.time })] })] }), _jsxs("div", { className: "card", style: { padding: 12 }, children: [_jsxs("div", { style: { fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }, children: [_jsx(Cpu, { size: 14, color: "var(--blue)" }), "\u80FD\u529B\u68C0\u67E5"] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11 }, children: [_jsx("span", { style: { color: 'var(--text-secondary)' }, children: "\u6A21\u578B" }), _jsx("span", { style: { fontFamily: 'var(--font-mono)', color: 'var(--blue)' }, children: agent.model_name })] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11 }, children: [_jsx("span", { style: { color: 'var(--text-secondary)' }, children: "\u8FD0\u884C\u65F6" }), _jsx("span", { style: { fontFamily: 'var(--font-mono)' }, children: agent.runtime })] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11 }, children: [_jsx("span", { style: { color: 'var(--text-secondary)' }, children: "\u8FD0\u884C\u72B6\u6001" }), _jsx("span", { style: { color: getStatusConfig(agent.status).color }, children: getStatusConfig(agent.status).label })] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11 }, children: [_jsx("span", { style: { color: 'var(--text-secondary)' }, children: "\u5065\u5EB7\u72B6\u6001" }), _jsx("span", { style: { color: agent.status === 'healthy' ? 'var(--green)' : 'var(--red)' }, children: getHealthLabel(agent.status) })] })] })] }), _jsxs("div", { className: "card", style: { padding: 12 }, children: [_jsxs("div", { style: { fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }, children: [_jsx(Link2, { size: 14, color: "var(--purple)" }), "\u4F9D\u8D56\u72B6\u6001"] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11 }, children: [_jsx("span", { style: { color: 'var(--text-secondary)' }, children: "Agent \u6CE8\u518C" }), _jsx("span", { style: { color: 'var(--green)' }, children: "\u2713 \u5DF2\u8FDE\u63A5" })] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11 }, children: [_jsx("span", { style: { color: 'var(--text-secondary)' }, children: "API \u7AEF\u70B9" }), _jsx("span", { style: { color: 'var(--green)' }, children: "\u2713 \u53EF\u8FBE" })] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11 }, children: [_jsx("span", { style: { color: 'var(--text-secondary)' }, children: "\u5DE5\u4F5C\u6D41\u7ED1\u5B9A" }), _jsx("span", { style: { color: 'var(--text-muted)' }, children: "\u2014" })] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11 }, children: [_jsx("span", { style: { color: 'var(--text-secondary)' }, children: "\u77E5\u8BC6\u5E93\u8FDE\u63A5" }), _jsx("span", { style: { color: 'var(--text-muted)' }, children: "\u2014" })] })] })] }), _jsxs("div", { className: "card", style: { padding: 12 }, children: [_jsxs("div", { style: { fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }, children: [_jsx(BarChart3, { size: 14, color: "var(--orange)" }), "\u8D1F\u8F7D\u76D1\u63A7"] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 10 }, children: [_jsxs("div", { children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 4 }, children: [_jsx("span", { style: { color: 'var(--text-secondary)' }, children: "Token \u7528\u91CF" }), _jsxs("span", { style: { fontFamily: 'var(--font-mono)', color: 'var(--text)' }, children: [(agent.tokens_used ?? 0).toLocaleString(), " / ", (agent.token_hard_limit ?? 0).toLocaleString()] })] }), _jsx("div", { style: { height: 6, background: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden' }, children: _jsx("div", { style: {
                                                height: '100%', width: tokenHardPct + '%',
                                                background: tokenHardPct > 80 ? 'var(--red)' : tokenHardPct > 50 ? 'var(--orange)' : 'var(--green)',
                                                borderRadius: 3, transition: 'width 0.4s',
                                            } }) }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }, children: [_jsxs("span", { children: ["\u8F6F\u9650\u5236: ", (agent.token_soft_limit ?? 0).toLocaleString()] }), _jsxs("span", { children: [tokenHardPct, "% \u786C\u9650\u5236"] })] })] }), _jsxs("div", { children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 4 }, children: [_jsx("span", { style: { color: 'var(--text-secondary)' }, children: "\u8F6F\u9650\u5236\u4F7F\u7528\u7387" }), _jsxs("span", { style: { fontFamily: 'var(--font-mono)', color: 'var(--text)' }, children: [tokenSoftPct, "%"] })] }), _jsx("div", { style: { height: 6, background: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden' }, children: _jsx("div", { style: {
                                                height: '100%', width: tokenSoftPct + '%',
                                                background: tokenSoftPct > 90 ? 'var(--red)' : tokenSoftPct > 60 ? 'var(--orange)' : 'var(--blue)',
                                                borderRadius: 3, transition: 'width 0.4s',
                                            } }) })] })] })] }), _jsx("div", { style: { height: 1, background: 'var(--border)' } }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: [_jsx("div", { style: { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }, children: "\u64CD\u4F5C" }), _jsx("button", { onClick: function () { onAction('reschedule'); }, disabled: actionLoading !== null, style: {
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            padding: '10px 14px', background: 'var(--blue)', color: '#fff',
                            border: 'none', borderRadius: 6, cursor: actionLoading ? 'wait' : 'pointer',
                            fontSize: 13, fontWeight: 500, opacity: actionLoading ? 0.7 : 1,
                            transition: 'opacity 0.2s',
                        }, children: actionLoading === 'reschedule' ? (_jsxs(_Fragment, { children: [_jsx(RefreshCw, { size: 14, style: { animation: 'spin 1s linear infinite' } }), " \u91CD\u65B0\u8C03\u5EA6\u4E2D..."] })) : (_jsxs(_Fragment, { children: [_jsx(RotateCcw, { size: 14 }), " \u91CD\u65B0\u8C03\u5EA6"] })) }), _jsx("button", { onClick: function () { onAction('restart'); }, disabled: actionLoading !== null, style: {
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            padding: '10px 14px', background: 'var(--bg-card)',
                            color: 'var(--orange)', border: '1px solid var(--orange)',
                            borderRadius: 6, cursor: actionLoading ? 'wait' : 'pointer',
                            fontSize: 13, fontWeight: 500, opacity: actionLoading ? 0.7 : 1,
                            transition: 'opacity 0.2s',
                        }, children: actionLoading === 'restart' ? (_jsxs(_Fragment, { children: [_jsx(RefreshCw, { size: 14, style: { animation: 'spin 1s linear infinite' } }), " \u5F3A\u5236\u91CD\u542F\u4E2D..."] })) : (_jsxs(_Fragment, { children: [_jsx(RefreshCw, { size: 14 }), " \u5F3A\u5236\u91CD\u542F"] })) }), _jsx("button", { onClick: function () { onAction('pause'); }, disabled: actionLoading !== null, style: {
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            padding: '10px 14px', background: 'var(--bg-card)',
                            color: 'var(--text-secondary)', border: '1px solid var(--border)',
                            borderRadius: 6, cursor: actionLoading ? 'wait' : 'pointer',
                            fontSize: 13, fontWeight: 500, opacity: actionLoading ? 0.7 : 1,
                            transition: 'opacity 0.2s',
                        }, children: actionLoading === 'pause' ? (_jsxs(_Fragment, { children: [_jsx(RefreshCw, { size: 14, style: { animation: 'spin 1s linear infinite' } }), " \u6682\u505C\u4E2D..."] })) : (_jsxs(_Fragment, { children: [_jsx(Pause, { size: 14 }), " \u6682\u505C\u63A5\u6536"] })) })] })] }));
}
// ── 主页面 ──
export default function AgentControlPlane() {
    const { probes, queue, reconcile, selectedAgent, loading, fetchProbes, fetchQueue, fetchReconcile, restartAgent, setSelectedAgent, } = useControlPlane();
    const [activeTab, setActiveTab] = useState('agents');
    const [actionLoading, setActionLoading] = useState(null);
    // 初始加载 + 3 秒轮询（useRef 防泄漏）
    const intervalRef = useRef(null);
    useEffect(function () {
        fetchProbes();
        fetchQueue();
        fetchReconcile();
        intervalRef.current = setInterval(function () {
            fetchProbes();
            fetchQueue();
            fetchReconcile();
        }, 3000);
        return function () {
            if (intervalRef.current)
                clearInterval(intervalRef.current);
        };
    }, [fetchProbes, fetchQueue, fetchReconcile]);
    const selectedAgentData = selectedAgent !== null
        ? probes.find(function (a) { return a.agent_id === selectedAgent; }) || null
        : null;
    const handleAction = useCallback(async function (action) {
        if (!selectedAgentData)
            return;
        setActionLoading(action);
        try {
            if (action === 'restart') {
                await restartAgent(selectedAgentData.agent_id);
            }
            else if (action === 'reschedule') {
                await fetch('/api/control-plane/agent/' + selectedAgentData.agent_id + '/reschedule', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            else if (action === 'pause') {
                await fetch('/api/control-plane/agent/' + selectedAgentData.agent_id + '/pause', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            // 操作完成后刷新数据
            await fetchProbes();
        }
        catch (_e) {
            // silently handled
        }
        finally {
            setActionLoading(null);
        }
    }, [selectedAgentData, restartAgent, fetchProbes]);
    const tabs = [
        { key: 'agents', label: 'Agent 列表', icon: _jsx(Server, { size: 13 }), count: probes.length },
        { key: 'domains', label: '隔离域', icon: _jsx(Layers, { size: 13 }), count: 0 },
        { key: 'queue', label: '调度队列', icon: _jsx(Clock, { size: 13 }), count: queue.length },
        { key: 'reconcile', label: 'Reconcile 日志', icon: _jsx(RotateCcw, { size: 13 }), count: reconcile.length },
    ];
    return (_jsxs("div", { style: { padding: 24, height: '100%', overflow: 'auto', position: 'relative' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }, children: [_jsxs("h1", { style: { fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }, children: [_jsx(Radio, { size: 24, style: { color: 'var(--blue)' } }), "Agent \u63A7\u5236\u9762\u677F"] }), _jsxs("button", { onClick: function () { fetchProbes(); fetchQueue(); fetchReconcile(); }, style: {
                            padding: '6px 14px', background: 'var(--bg-card)',
                            border: '1px solid var(--border)', borderRadius: 4,
                            cursor: 'pointer', color: 'var(--text-secondary)',
                            fontSize: 12, display: 'flex', alignItems: 'center', gap: 5,
                        }, children: [_jsx(RefreshCw, { size: 13, style: loading ? { animation: 'spin 1s linear infinite' } : undefined }), "\u5237\u65B0"] })] }), _jsx(OverviewCards, { probes: probes, queue: queue }), _jsx("div", { className: "tab-bar", children: tabs.map(function (t) {
                    return (_jsxs("button", { onClick: function () { setActiveTab(t.key); }, className: 'tab' + (activeTab === t.key ? ' active' : ''), style: { display: 'flex', alignItems: 'center', gap: 5 }, children: [t.icon, _jsx("span", { children: t.label }), t.count > 0 && (_jsx("span", { style: {
                                    marginLeft: 2, padding: '0 5px', borderRadius: 8,
                                    fontSize: 10, fontWeight: 600,
                                    background: activeTab === t.key ? 'var(--blue-bg)' : 'var(--bg-input)',
                                    color: activeTab === t.key ? 'var(--blue)' : 'var(--text-muted)',
                                    lineHeight: '18px', minWidth: 18, textAlign: 'center',
                                }, children: t.count }))] }, `tab-${t.key}`));
                }) }), _jsxs("div", { style: { display: 'flex', position: 'relative' }, children: [_jsxs("div", { style: {
                            flex: 1, minWidth: 0,
                            transition: 'margin-right 0.25s var(--ease)',
                            marginRight: selectedAgentData ? 436 : 0,
                        }, children: [activeTab === 'agents' && (_jsx(AgentListTab, { probes: probes, selectedAgent: selectedAgent, onSelectAgent: function (id) { setSelectedAgent(id); } })), activeTab === 'domains' && _jsx(DomainTreeTab, {}), activeTab === 'queue' && _jsx(QueueTab, { queue: queue }), activeTab === 'reconcile' && _jsx(ReconcileTab, { entries: reconcile })] }), selectedAgentData && (_jsx(DetailPanel, { agent: selectedAgentData, onClose: function () { setSelectedAgent(null); }, onAction: handleAction, actionLoading: actionLoading }))] })] }));
}
