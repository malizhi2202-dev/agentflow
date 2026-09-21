import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Settings, Save, RotateCcw, RefreshCw, Tag, Gauge, ChevronDown, ChevronRight, Play, Pause, } from 'lucide-react';
import { useControlPlane } from '../stores/controlPlane';
// ── 调度算法选项 ──
const ALGORITHM_OPTIONS = [
    { value: 'round_robin', label: '轮询 (Round Robin)' },
    { value: 'least_connections', label: '最少连接 (Least Connections)' },
    { value: 'priority_based', label: '优先级调度 (Priority-Based)' },
    { value: 'weighted_fair', label: '加权公平 (Weighted Fair Queue)' },
    { value: 'random', label: '随机 (Random)' },
];
// ── 优先级选项 ──
const PRIORITY_OPTIONS = [
    { value: 'high', label: '🔴 高', color: '#dc2626' },
    { value: 'medium', label: '🟡 中', color: '#e8a450' },
    { value: 'low', label: '🟢 低', color: '#5cb878' },
];
/**
 * SchedulerConfig — 管理调度配置面板
 * - 上半部分：全局调度参数表单（算法 / 重试次数 / 探针间隔 / 并发上限 / 超时）
 * - 下半部分：Agent 标签与优先级表格（可编辑标签、优先级下拉、并发数）
 */
export default function SchedulerConfig() {
    const { queue, loading, fetchQueue } = useControlPlane();
    // 全局配置
    const [globalConfig, setGlobalConfig] = useState({
        algorithm: 'priority_based',
        retry_count: 3,
        probe_interval: 30,
        max_concurrency: 10,
        queue_timeout: 300,
    });
    const [configDirty, setConfigDirty] = useState(false);
    // Agent 表格行（从 queue 数据推导）
    const [agentRows, setAgentRows] = useState([]);
    const [editingCell, setEditingCell] = useState(null);
    const [expanded, setExpanded] = useState(false);
    useEffect(() => {
        fetchQueue();
    }, [fetchQueue]);
    // 从 queue 推演出 agent 表格行
    useEffect(() => {
        const agentMap = new Map();
        for (const item of queue) {
            if (!agentMap.has(item.agent_id)) {
                agentMap.set(item.agent_id, {
                    agent_id: item.agent_id,
                    agent_name: item.agent_name,
                    tags: '',
                    priority: item.priority >= 7 ? 'high' : item.priority >= 4 ? 'medium' : 'low',
                    concurrency: 1,
                    enabled: item.status !== 'disabled',
                });
            }
        }
        setAgentRows([...agentMap.values()]);
    }, [queue]);
    // ── 全局配置变更处理 ──
    const updateGlobal = (field, value) => {
        setGlobalConfig((prev) => ({ ...prev, [field]: value }));
        setConfigDirty(true);
    };
    const saveGlobalConfig = () => {
        const uid = localStorage.getItem('current_user_id') || 'admin';
        fetch('/api/scheduler/config', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-User-Id': uid },
            body: JSON.stringify(globalConfig),
        })
            .then((r) => r.json())
            .then(() => setConfigDirty(false))
            .catch(() => { });
    };
    const resetGlobalConfig = () => {
        setGlobalConfig({
            algorithm: 'priority_based',
            retry_count: 3,
            probe_interval: 30,
            max_concurrency: 10,
            queue_timeout: 300,
        });
        setConfigDirty(true);
    };
    // ── Agent 行变更处理 ──
    const updateAgentRow = (idx, field, value) => {
        setAgentRows((prev) => {
            const next = [...prev];
            next[idx] = { ...next[idx], [field]: value };
            return next;
        });
    };
    const saveAgentRow = (idx) => {
        const row = agentRows[idx];
        const uid = localStorage.getItem('current_user_id') || 'admin';
        fetch(`/api/scheduler/agents/${row.agent_id}/tags`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-User-Id': uid },
            body: JSON.stringify({
                tags: row.tags.split(',').map((t) => t.trim()).filter(Boolean),
                priority: row.priority,
                concurrency: row.concurrency,
                enabled: row.enabled,
            }),
        }).catch(() => { });
    };
    const toggleAgent = (idx) => {
        updateAgentRow(idx, 'enabled', !agentRows[idx].enabled);
    };
    // ── 样式常量 ──
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
    const inp = {
        width: '100%',
        padding: '6px 10px',
        background: 'var(--bg-input, #1e2130)',
        color: 'var(--color-text)',
        border: '1px solid var(--color-border, #2a2d35)',
        borderRadius: 4,
        fontSize: 11,
        boxSizing: 'border-box',
        fontFamily: 'var(--font-mono, monospace)',
    };
    const selectStyle = { ...inp, cursor: 'pointer' };
    const lbl = {
        fontSize: 10,
        fontWeight: 500,
        color: 'var(--text-dim)',
        display: 'block',
        marginBottom: 4,
    };
    if (queue.length === 0 && loading) {
        return (_jsxs("div", { style: { padding: 20, textAlign: 'center', color: 'var(--text-dim)', fontSize: 12 }, children: [_jsx(RefreshCw, { size: 14, style: { animation: 'spin 1s linear infinite' } }), " \u52A0\u8F7D\u4E2D..."] }));
    }
    return (_jsxs("div", { children: [_jsxs("div", { style: panel, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }, children: [_jsxs("h3", { style: { ...sectionTitle, margin: 0 }, children: [_jsx(Settings, { size: 16, style: { verticalAlign: -3, marginRight: 6 } }), "\u5168\u5C40\u8C03\u5EA6\u914D\u7F6E"] }), _jsxs("div", { style: { display: 'flex', gap: 6 }, children: [_jsxs("button", { onClick: resetGlobalConfig, style: {
                                            padding: '4px 10px',
                                            fontSize: 10,
                                            background: 'none',
                                            border: '1px solid var(--color-border, #2a2d35)',
                                            borderRadius: 4,
                                            cursor: 'pointer',
                                            color: 'var(--text-dim)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4,
                                        }, children: [_jsx(RotateCcw, { size: 11 }), " \u91CD\u7F6E"] }), _jsxs("button", { onClick: saveGlobalConfig, disabled: !configDirty, style: {
                                            padding: '4px 14px',
                                            fontSize: 10,
                                            background: configDirty ? 'var(--color-primary, #3b82f6)' : 'var(--bg-input, #1e2130)',
                                            color: configDirty ? '#fff' : 'var(--text-dim)',
                                            border: 'none',
                                            borderRadius: 4,
                                            cursor: configDirty ? 'pointer' : 'default',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4,
                                        }, children: [_jsx(Save, { size: 11 }), " \u4FDD\u5B58\u914D\u7F6E"] })] })] }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }, children: [_jsxs("div", { children: [_jsxs("label", { style: lbl, children: [_jsx(Gauge, { size: 10, style: { verticalAlign: -1, marginRight: 4 } }), "\u8C03\u5EA6\u7B97\u6CD5"] }), _jsx("select", { value: globalConfig.algorithm, onChange: (e) => updateGlobal('algorithm', e.target.value), style: selectStyle, children: ALGORITHM_OPTIONS.map((opt) => (_jsx("option", { value: opt.value, children: opt.label }, opt.value))) })] }), _jsxs("div", { children: [_jsx("label", { style: lbl, children: "\u91CD\u8BD5\u6B21\u6570" }), _jsx("input", { type: "number", min: 0, max: 10, value: globalConfig.retry_count, onChange: (e) => updateGlobal('retry_count', parseInt(e.target.value) || 0), style: inp })] }), _jsxs("div", { children: [_jsx("label", { style: lbl, children: "\u63A2\u9488\u95F4\u9694 (\u79D2)" }), _jsx("input", { type: "number", min: 5, max: 600, value: globalConfig.probe_interval, onChange: (e) => updateGlobal('probe_interval', parseInt(e.target.value) || 30), style: inp })] }), _jsxs("div", { children: [_jsx("label", { style: lbl, children: "\u6700\u5927\u5E76\u53D1\u6570" }), _jsx("input", { type: "number", min: 1, max: 100, value: globalConfig.max_concurrency, onChange: (e) => updateGlobal('max_concurrency', parseInt(e.target.value) || 1), style: inp })] }), _jsxs("div", { children: [_jsx("label", { style: lbl, children: "\u961F\u5217\u8D85\u65F6 (\u79D2)" }), _jsx("input", { type: "number", min: 30, max: 3600, value: globalConfig.queue_timeout, onChange: (e) => updateGlobal('queue_timeout', parseInt(e.target.value) || 300), style: inp })] })] }), _jsxs("div", { style: {
                            display: 'flex',
                            gap: 16,
                            marginTop: 14,
                            padding: '8px 12px',
                            background: 'var(--bg-input, #1e2130)',
                            borderRadius: 6,
                            fontSize: 10,
                            color: 'var(--text-dim)',
                        }, children: [_jsxs("span", { children: ["\uD83D\uDCCB \u961F\u5217\u4EFB\u52A1\uFF1A", _jsx("b", { style: { color: 'var(--color-text)' }, children: queue.length })] }), _jsxs("span", { children: ["\uD83D\uDFE2 \u5F85\u5904\u7406\uFF1A", _jsx("b", { style: { color: '#5cb878' }, children: queue.filter((q) => q.status === 'pending').length })] }), _jsxs("span", { children: ["\uD83D\uDD35 \u5904\u7406\u4E2D\uFF1A", _jsx("b", { style: { color: '#3b82f6' }, children: queue.filter((q) => q.status === 'running').length })] }), _jsxs("span", { children: ["\uD83D\uDD34 \u5931\u8D25\uFF1A", _jsx("b", { style: { color: '#dc2626' }, children: queue.filter((q) => q.status === 'failed').length })] })] })] }), _jsxs("div", { style: panel, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }, children: [_jsxs("h3", { style: { ...sectionTitle, margin: 0 }, children: [_jsx(Tag, { size: 16, style: { verticalAlign: -3, marginRight: 6 } }), "Agent \u6807\u7B7E\u4E0E\u4F18\u5148\u7EA7"] }), _jsxs("button", { onClick: () => fetchQueue(), style: {
                                    padding: '4px 10px',
                                    fontSize: 10,
                                    background: 'none',
                                    border: '1px solid var(--color-border, #2a2d35)',
                                    borderRadius: 4,
                                    cursor: 'pointer',
                                    color: 'var(--text-secondary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                }, children: [_jsx(RefreshCw, { size: 11 }), " \u5237\u65B0"] })] }), agentRows.length === 0 ? (_jsx("div", { style: { fontSize: 11, color: 'var(--text-dim)', textAlign: 'center', padding: 20 }, children: "\u6682\u65E0 Agent \u6570\u636E\uFF08\u961F\u5217\u4E3A\u7A7A\uFF09" })) : (_jsx("div", { style: { overflowX: 'auto' }, children: _jsxs("table", { style: { width: '100%', borderCollapse: 'collapse' }, children: [_jsx("thead", { children: _jsxs("tr", { style: { borderBottom: '2px solid var(--color-border, #2a2d35)' }, children: [_jsx("th", { style: th, children: "Agent" }), _jsx("th", { style: th, children: "\u6807\u7B7E" }), _jsx("th", { style: th, children: "\u4F18\u5148\u7EA7" }), _jsx("th", { style: th, children: "\u5E76\u53D1\u6570" }), _jsx("th", { style: { ...th, textAlign: 'center' }, children: "\u542F/\u505C" }), _jsx("th", { style: { ...th, textAlign: 'center' }, children: "\u4FDD\u5B58" })] }) }), _jsx("tbody", { children: agentRows.map((row, idx) => (_jsxs("tr", { style: {
                                            borderBottom: '1px solid var(--color-border, #2a2d35)',
                                            opacity: row.enabled ? 1 : 0.5,
                                        }, children: [_jsxs("td", { style: td, children: [_jsx("span", { style: { fontWeight: 500 }, children: row.agent_name }), _jsxs("div", { style: { fontSize: 9, color: 'var(--text-dim)' }, children: ["ID: ", row.agent_id] })] }), _jsx("td", { style: td, children: editingCell?.rowIdx === idx && editingCell?.field === 'tags' ? (_jsx("input", { autoFocus: true, value: row.tags, onChange: (e) => updateAgentRow(idx, 'tags', e.target.value), onBlur: () => setEditingCell(null), onKeyDown: (e) => {
                                                        if (e.key === 'Enter')
                                                            setEditingCell(null);
                                                        if (e.key === 'Escape')
                                                            setEditingCell(null);
                                                    }, placeholder: "tag1, tag2, ...", style: {
                                                        ...inp,
                                                        width: 120,
                                                        padding: '3px 6px',
                                                        fontSize: 10,
                                                    } })) : (_jsx("div", { onClick: () => setEditingCell({ rowIdx: idx, field: 'tags' }), style: {
                                                        cursor: 'pointer',
                                                        minHeight: 24,
                                                        display: 'flex',
                                                        flexWrap: 'wrap',
                                                        gap: 4,
                                                        alignItems: 'center',
                                                    }, title: "\u70B9\u51FB\u7F16\u8F91\u6807\u7B7E", children: row.tags
                                                        ? row.tags.split(',').map((t) => t.trim()).filter(Boolean).map((tag) => (_jsx("span", { style: {
                                                                fontSize: 9,
                                                                padding: '1px 8px',
                                                                background: 'rgba(168,85,247,0.15)',
                                                                color: '#c084fc',
                                                                borderRadius: 8,
                                                            }, children: tag }, tag)))
                                                        : (_jsx("span", { style: { fontSize: 10, color: 'var(--text-dim)', fontStyle: 'italic' }, children: "\u65E0\u6807\u7B7E\uFF08\u70B9\u51FB\u7F16\u8F91\uFF09" })) })) }), _jsx("td", { style: td, children: _jsx("select", { value: row.priority, onChange: (e) => updateAgentRow(idx, 'priority', e.target.value), style: {
                                                        ...selectStyle,
                                                        width: 100,
                                                        padding: '3px 6px',
                                                        fontSize: 10,
                                                        color: row.priority === 'high'
                                                            ? '#dc2626'
                                                            : row.priority === 'medium'
                                                                ? '#e8a450'
                                                                : '#5cb878',
                                                    }, children: PRIORITY_OPTIONS.map((p) => (_jsx("option", { value: p.value, children: p.label }, p.value))) }) }), _jsx("td", { style: td, children: _jsx("input", { type: "number", min: 1, max: 20, value: row.concurrency, onChange: (e) => updateAgentRow(idx, 'concurrency', parseInt(e.target.value) || 1), style: {
                                                        ...inp,
                                                        width: 60,
                                                        padding: '3px 6px',
                                                        fontSize: 10,
                                                        textAlign: 'center',
                                                    } }) }), _jsx("td", { style: { ...td, textAlign: 'center' }, children: _jsxs("button", { onClick: () => toggleAgent(idx), title: row.enabled ? '点击停用' : '点击启用', style: {
                                                        padding: '3px 8px',
                                                        fontSize: 10,
                                                        border: 'none',
                                                        borderRadius: 3,
                                                        cursor: 'pointer',
                                                        background: row.enabled
                                                            ? 'rgba(92,184,120,0.12)'
                                                            : 'rgba(107,114,128,0.15)',
                                                        color: row.enabled ? '#5cb878' : '#6b7280',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 3,
                                                    }, children: [row.enabled ? _jsx(Play, { size: 10 }) : _jsx(Pause, { size: 10 }), row.enabled ? '运行中' : '已停用'] }) }), _jsx("td", { style: { ...td, textAlign: 'center' }, children: _jsxs("button", { onClick: () => saveAgentRow(idx), style: {
                                                        padding: '3px 10px',
                                                        fontSize: 10,
                                                        background: 'var(--color-primary, #3b82f6)',
                                                        color: '#fff',
                                                        border: 'none',
                                                        borderRadius: 3,
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 3,
                                                    }, children: [_jsx(Save, { size: 10 }), " \u4FDD\u5B58"] }) })] }, row.agent_id))) })] }) })), _jsxs("div", { onClick: () => setExpanded(!expanded), style: {
                            marginTop: 10,
                            padding: '6px 10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                            color: 'var(--text-dim)',
                            background: 'var(--bg-input, #1e2130)',
                            borderRadius: 4,
                        }, children: [expanded ? _jsx(ChevronDown, { size: 12 }) : _jsx(ChevronRight, { size: 12 }), "\u961F\u5217\u8BE6\u60C5\uFF08", queue.length, " \u9879\uFF09"] }), expanded && queue.length > 0 && (_jsx("div", { style: { marginTop: 8, maxHeight: 200, overflowY: 'auto' }, children: queue.map((item) => (_jsxs("div", { style: {
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '6px 10px',
                                borderBottom: '1px solid var(--color-border, #2a2d35)',
                                fontSize: 10,
                            }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("span", { style: {
                                                width: 8,
                                                height: 8,
                                                borderRadius: '50%',
                                                display: 'inline-block',
                                                background: item.status === 'pending'
                                                    ? '#9ca3af'
                                                    : item.status === 'running'
                                                        ? '#3b82f6'
                                                        : item.status === 'completed'
                                                            ? '#5cb878'
                                                            : '#dc2626',
                                            } }), _jsx("span", { style: { color: 'var(--color-text)' }, children: item.orchestration_name }), _jsxs("span", { style: { color: 'var(--text-dim)' }, children: ["\u2192 ", item.agent_name] })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsxs("span", { style: { color: 'var(--text-dim)' }, children: ["\u4F18\u5148\u7EA7: ", item.priority] }), _jsx("span", { style: {
                                                fontSize: 9,
                                                fontFamily: 'var(--font-mono, monospace)',
                                                color: 'var(--text-dim)',
                                            }, children: item.created_at || '-' })] })] }, item.id))) }))] })] }));
}
// ── 表格样式 ──
const th = {
    padding: '8px 10px',
    fontSize: 10,
    color: 'var(--text-dim)',
    fontWeight: 500,
    textTransform: 'uppercase',
    textAlign: 'left',
    whiteSpace: 'nowrap',
};
const td = {
    padding: '8px 10px',
    fontSize: 11,
    color: 'var(--color-text)',
    verticalAlign: 'middle',
};
