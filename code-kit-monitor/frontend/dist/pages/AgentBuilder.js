import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Plus, Trash2, Bot, Play, Square, Brain } from 'lucide-react';
import { useAgents } from '../stores/agents';
import ConfirmDialog from '../components/ConfirmDialog';
export default function AgentBuilder({ onSelect }) {
    var { agents, fetchAgents, deleteAgent, runAgent, stopAgent, loading } = useAgents();
    var [deleteId, setDeleteId] = useState(null);
    var [memoryLoading, setMemoryLoading] = useState({});
    var [loadedMemories, setLoadedMemories] = useState({});
    useEffect(function () { fetchAgents(); }, []);
    var loadMemories = async function (agentId) {
        setMemoryLoading(function (prev) { return { ...prev, [agentId]: true }; });
        try {
            var uid = localStorage.getItem('current_user_id') || 'admin';
            var res = await fetch('/api/agents/' + agentId + '/load-memory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-User-Id': uid },
                body: JSON.stringify({ limit: 20, days: 7 }),
            });
            var data = await res.json();
            setLoadedMemories(function (prev) { return { ...prev, [agentId]: data.memories || [] }; });
        }
        catch (e) {
            console.error('加载记忆失败:', e);
        }
        finally {
            setMemoryLoading(function (prev) { return { ...prev, [agentId]: false }; });
        }
    };
    var statusColor = function (s) { return s === 'standby' ? 'var(--color-success)' : s === 'running' ? 'var(--color-warning)' : s === 'error' ? 'var(--color-danger)' : 'var(--text-dim)'; };
    var statusLabel = function (s) { var m = { standby: '待命', running: '运行中', completed: '已完成', error: '错误', disabled: '已禁用' }; return m[s] || s; };
    return (_jsxs("div", { style: { padding: 24, height: '100%', overflow: 'auto' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }, children: [_jsx("h1", { style: { fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, margin: 0 }, children: "Agent" }), _jsxs("button", { onClick: function () { if (onSelect)
                            onSelect({ name: '', description: '', runtime: 'langgraph', model_provider: 'ollama', model_name: 'qwen2:0.5b', api_key: '', workflow_id: 0, token_soft_limit: 800000, token_hard_limit: 1000000, gate_pre: '', gate_post: '', io_filter: 'none', system_prompt: '', role_def: '', sop: '' }); }, style: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }, children: [_jsx(Plus, { size: 14 }), " \u521B\u5EFA Agent"] })] }), loading ? _jsx("p", { style: { color: 'var(--text-dim)' }, children: "\u52A0\u8F7D\u4E2D..." }) : (_jsxs("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }, children: [agents.map(function (a) {
                        var capabilities = (a.model_config_json && a.model_config_json.capabilities) || [];
                        var mems = loadedMemories[a.id] || [];
                        return (_jsxs("div", { onClick: function () { if (onSelect)
                                onSelect(a); }, style: { background: 'var(--color-surface)', borderRadius: 8, padding: 16, border: '1px solid var(--color-border)', cursor: onSelect ? 'pointer' : 'default' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx(Bot, { size: 18, color: "var(--color-primary)" }), _jsx("span", { style: { fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600 }, children: a.name }), _jsx("span", { style: { fontSize: 10, padding: '1px 6px', borderRadius: 3, background: statusColor(a.status), color: '#fff' }, children: statusLabel(a.status) }), capabilities.length > 0 && (_jsxs("button", { onClick: function (e) { e.stopPropagation(); loadMemories(a.id); }, disabled: memoryLoading[a.id], title: "\u52A0\u8F7D\u8BB0\u5FC6", style: {
                                                        fontSize: 10, padding: '2px 8px', borderRadius: 3,
                                                        border: '1px solid var(--border)',
                                                        background: mems.length > 0 ? 'var(--blue-bg)' : 'var(--bg-input)',
                                                        color: mems.length > 0 ? 'var(--blue)' : 'var(--text-dim)',
                                                        cursor: memoryLoading[a.id] ? 'wait' : 'pointer',
                                                        display: 'inline-flex', alignItems: 'center', gap: 4,
                                                    }, children: [_jsx(Brain, { size: 10 }), memoryLoading[a.id] ? '加载中...' : mems.length > 0 ? '记忆 ' + mems.length : '加载记忆'] }))] }), _jsxs("div", { style: { display: 'flex', gap: 4 }, onClick: function (e) { e.stopPropagation(); }, children: [a.status === 'standby' && _jsx("button", { onClick: function () { runAgent(a.id); }, style: { padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-success)' }, title: "\u8FD0\u884C", children: _jsx(Play, { size: 14 }) }), a.status === 'running' && _jsx("button", { onClick: function () { stopAgent(a.id); }, style: { padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)' }, title: "\u505C\u6B62", children: _jsx(Square, { size: 14 }) }), a.status !== 'running' && _jsx("button", { onClick: function () { setDeleteId(a.id); }, style: { padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)' }, title: "\u5220\u9664", children: _jsx(Trash2, { size: 14 }) })] })] }), mems.length > 0 && (_jsxs("div", { style: { fontSize: 10, color: 'var(--text-dim)', marginBottom: 6, maxHeight: 60, overflow: 'auto', background: 'var(--bg-input)', borderRadius: 4, padding: '4px 8px' }, children: [mems.slice(0, 3).map(function (m, i) {
                                            return _jsxs("div", { style: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, children: ["\uD83D\uDCDD ", m.key] }, i);
                                        }), mems.length > 3 && _jsxs("div", { style: { color: 'var(--blue)' }, children: ["...\u8FD8\u6709 ", mems.length - 3, " \u6761"] })] })), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginBottom: 8 }, children: [_jsxs("span", { children: ["\u8FD0\u884C\u65F6: ", a.runtime] }), _jsxs("span", { children: ["\u6A21\u578B: ", a.model_name] }), _jsxs("span", { children: ["\u8F6F\u9650\u5236: ", a.token_soft_limit?.toLocaleString()] }), _jsxs("span", { children: ["\u786C\u9650\u5236: ", a.token_hard_limit?.toLocaleString()] })] }), _jsxs("div", { style: { fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }, children: ["Token \u5DF2\u7528: ", a.total_tokens_used?.toLocaleString(), " | \u9879\u76EE: ", a.project_count] }), capabilities.length > 0 && (_jsx("div", { style: { marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }, children: capabilities.map(function (cap) { return _jsx("span", { style: { fontSize: 9, padding: '1px 6px', borderRadius: 2, background: 'var(--purple-bg)', color: 'var(--purple)' }, children: cap }, cap); }) }))] }, a.id));
                    }), agents.length === 0 && _jsx("p", { style: { color: 'var(--text-dim)', gridColumn: '1/-1', textAlign: 'center', padding: 40 }, children: "\u6682\u65E0 Agent\uFF0C\u70B9\u51FB\u300C\u521B\u5EFA Agent\u300D\u5F00\u59CB" })] })), deleteId && _jsx(ConfirmDialog, { open: true, title: "\u786E\u8BA4\u5220\u9664", message: "\u786E\u5B9A\u5220\u9664\u6B64 Agent\uFF1F", onConfirm: async function () { await deleteAgent(deleteId); setDeleteId(null); }, onCancel: function () { setDeleteId(null); } })] }));
}
