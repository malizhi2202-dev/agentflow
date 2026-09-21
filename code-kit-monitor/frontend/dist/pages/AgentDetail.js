import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Trash2, ShieldAlert, Plus, X, Database, Wifi, WifiOff, ExternalLink, Upload, Loader2, Clock } from 'lucide-react';
import ChatWindow from '../components/ChatWindow';
import ChannelConfigComponent from '../components/ChannelConfig';
import EntityBreakdownPanel from '../components/EntityBreakdownPanel';
var lbl = { fontSize: 11, fontWeight: 500, color: 'var(--text-dim)', display: 'block', marginBottom: 4 };
var inp = { width: '100%', padding: '8px', background: 'var(--bg-input)', color: 'var(--color-text)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, boxSizing: 'border-box' };
var th = { padding: '6px 8px', textAlign: 'left', color: 'var(--text-dim)', fontWeight: 500, fontSize: 10, whiteSpace: 'nowrap' };
var td = { padding: '4px 8px', fontSize: 11, color: 'var(--color-text)', whiteSpace: 'nowrap' };
export default function AgentDetail({ agent, onBack, onSave, onDelete, saveError }) {
    var isNew = !agent || !agent.id;
    var [data, setData] = useState(Object.assign({
        name: '', description: '', runtime: 'langgraph', model_provider: 'ollama', model_name: 'qwen2:0.5b',
        api_key: '', workflow_ids: [], token_soft_limit: 800000, token_hard_limit: 1000000,
        gate_pre: '', gate_post: '', io_filter: 'none', system_prompt: '', role_def: '', sop: '',
    }, agent || {}));
    var [saved, setSaved] = useState(false);
    var [workflows, setWorkflows] = useState([]);
    var [monData, setMonData] = useState(null);
    var [tab, setTab] = useState('edit');
    // 资料源
    var [knowledgeSources, setKnowledgeSources] = useState([]);
    var [showSourceForm, setShowSourceForm] = useState(false);
    var [sourceForm, setSourceForm] = useState({ source_type: 'http_api', url: '', name: '', description: '', config_json: {} });
    // 文件上传
    var [uploading, setUploading] = useState(false);
    // 记忆
    var [memories, setMemories] = useState([]);
    var [memoryChannels, setMemoryChannels] = useState({});
    var [showMemForm, setShowMemForm] = useState(false);
    var [memForm, setMemForm] = useState({ channel: 'web', key: '', value: '', memory_type: 'fact', priority: 5 });
    // 对话
    var [chatMessages, setChatMessages] = useState([]);
    var [chatLoading, setChatLoading] = useState(false);
    var [chatError, setChatError] = useState(null);
    var [chatConversationId, setChatConversationId] = useState(null);
    // 定时任务
    var [scheduledTasks, setScheduledTasks] = useState([]);
    var [showTaskForm, setShowTaskForm] = useState(false);
    var [taskForm, setTaskForm] = useState({ name: '', cron_expr: '0 9 * * *', capability: '', enabled: true });
    var uid = function () { return localStorage.getItem('current_user_id') || 'admin'; };
    useEffect(function () {
        fetch('/api/workflows', { headers: { 'X-User-Id': uid() } }).then(function (r) { return r.json(); }).then(function (d) { setWorkflows(d.workflows || []); });
        // 加载资料源 + 记忆
        if (agent?.id) {
            fetch('/api/agents/' + agent.id + '/knowledge-sources', { headers: { 'X-User-Id': uid() } }).then(function (r) { return r.json(); }).then(function (d) { if (Array.isArray(d))
                setKnowledgeSources(d); });
            loadMemories();
            loadMemoryStats();
            // 加载定时任务
            fetch('/api/agents/' + agent.id + '/scheduled-tasks', { headers: { 'X-User-Id': uid() } }).then(function (r) { return r.json(); }).then(function (d) { if (Array.isArray(d))
                setScheduledTasks(d); });
        }
        if (agent?.id) {
            fetch('/api/metrics/sessions?limit=500&entity_type=agent', { headers: { 'X-User-Id': uid() } }).then(function (r) { return r.json(); }).then(function (d) {
                var all = (d.sessions || []).filter(function (s) { return s.entity_id === agent.id || s.entity_type === 'agent'; });
                // 时间分桶
                var bm = {};
                all.forEach(function (s) {
                    var dt = new Date(s.timestamp);
                    var ts = Math.floor(dt.getTime() / 1000 / 300) * 300;
                    if (!bm[ts])
                        bm[ts] = { ts, time: dt.getHours().toString().padStart(2, '0') + ':' + dt.getMinutes().toString().padStart(2, '0'), tokens: 0, count: 0 };
                    bm[ts].tokens += s.total_tokens || 0;
                    bm[ts].count += 1;
                });
                setMonData({ sessions: all.slice(0, 50), buckets: Object.values(bm).sort(function (a, b) { return a.ts - b.ts; }) });
            });
        }
    }, [agent]);
    var handleSave = function () { onSave(Object.assign({}, data, { knowledge_sources: knowledgeSources })); setSaved(true); setTimeout(function () { setSaved(false); }, 1500); };
    // 资料源 CRUD
    var saveSource = function () {
        if (!agent?.id)
            return; // 需要先保存 Agent
        var url = '/api/agents/' + agent.id + '/knowledge-sources';
        var method = sourceForm.id ? 'PUT' : 'POST';
        var apiUrl = sourceForm.id ? url + '/' + sourceForm.id : url;
        fetch(apiUrl, { method: method, headers: { 'Content-Type': 'application/json', 'X-User-Id': uid() }, body: JSON.stringify(sourceForm) })
            .then(function (r) { return r.json(); })
            .then(function (d) {
            if (d.ok || d.source) {
                var ks = d.source || sourceForm;
                if (sourceForm.id) {
                    setKnowledgeSources(knowledgeSources.map(function (s) { return s.id === ks.id ? ks : s; }));
                }
                else {
                    setKnowledgeSources([ks].concat(knowledgeSources));
                }
                setShowSourceForm(false);
                setSourceForm({ source_type: 'http_api', url: '', name: '', description: '', config_json: {} });
            }
        });
    };
    var deleteSource = function (sourceId) {
        if (!agent?.id)
            return;
        fetch('/api/agents/' + agent.id + '/knowledge-sources/' + sourceId, { method: 'DELETE', headers: { 'X-User-Id': uid() } })
            .then(function () { setKnowledgeSources(knowledgeSources.filter(function (s) { return s.id !== sourceId; })); });
    };
    // 记忆 CRUD
    var loadMemories = function () {
        if (!agent?.id)
            return;
        fetch('/api/agents/' + agent.id + '/memory?limit=100', { headers: { 'X-User-Id': uid() } })
            .then(function (r) { return r.json(); }).then(function (d) { if (Array.isArray(d))
            setMemories(d); });
    };
    var loadMemoryStats = function () {
        if (!agent?.id)
            return;
        fetch('/api/agents/' + agent.id + '/memory/channels', { headers: { 'X-User-Id': uid() } })
            .then(function (r) { return r.json(); }).then(function (d) { setMemoryChannels(d.channels || {}); });
    };
    var saveMemory = function () {
        if (!agent?.id)
            return;
        fetch('/api/agents/' + agent.id + '/memory', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'X-User-Id': uid() },
            body: JSON.stringify(Object.assign({}, memForm, { value: (function () { try {
                    return JSON.parse(memForm.value);
                }
                catch (e) {
                    return memForm.value;
                } })() })),
        }).then(function (r) { return r.json(); }).then(function (d) {
            if (d.ok) {
                setShowMemForm(false);
                setMemForm({ channel: 'web', key: '', value: '', memory_type: 'fact', priority: 5 });
                loadMemories();
                loadMemoryStats();
            }
        });
    };
    var deleteMemory = function (mid) {
        if (!agent?.id)
            return;
        fetch('/api/agents/' + agent.id + '/memory/' + mid, { method: 'DELETE', headers: { 'X-User-Id': uid() } })
            .then(function () { loadMemories(); loadMemoryStats(); });
    };
    // 定时任务 CRUD
    var saveTask = function () {
        if (!agent?.id)
            return;
        var url = '/api/agents/' + agent.id + '/scheduled-tasks';
        var method = taskForm.id ? 'PUT' : 'POST';
        var apiUrl = taskForm.id ? url + '/' + taskForm.id : url;
        fetch(apiUrl, { method: method, headers: { 'Content-Type': 'application/json', 'X-User-Id': uid() }, body: JSON.stringify(taskForm) })
            .then(function (r) { return r.json(); })
            .then(function (d) {
            if (d.ok || d.task) {
                var t = d.task || taskForm;
                if (taskForm.id) {
                    setScheduledTasks(scheduledTasks.map(function (st) { return st.id === t.id ? t : st; }));
                }
                else {
                    setScheduledTasks([t].concat(scheduledTasks));
                }
                setShowTaskForm(false);
                setTaskForm({ name: '', cron_expr: '0 9 * * *', capability: '', enabled: true });
            }
        });
    };
    var deleteTask = function (taskId) {
        if (!agent?.id)
            return;
        fetch('/api/agents/' + agent.id + '/scheduled-tasks/' + taskId, { method: 'DELETE', headers: { 'X-User-Id': uid() } })
            .then(function () { setScheduledTasks(scheduledTasks.filter(function (st) { return st.id !== taskId; })); });
    };
    var toggleTask = function (taskId, enabled) {
        if (!agent?.id)
            return;
        fetch('/api/agents/' + agent.id + '/scheduled-tasks/' + taskId, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-User-Id': uid() },
            body: JSON.stringify({ enabled: enabled }),
        }).then(function (r) { return r.json(); }).then(function (d) {
            if (d.ok || d.task) {
                setScheduledTasks(scheduledTasks.map(function (st) { return st.id === taskId ? (d.task || Object.assign({}, st, { enabled: enabled })) : st; }));
            }
        });
    };
    var testSource = function (sourceId) {
        if (!agent?.id)
            return;
        fetch('/api/agents/' + agent.id + '/knowledge-sources/' + sourceId + '/test', { method: 'POST', headers: { 'X-User-Id': uid() } })
            .then(function (r) { return r.json(); })
            .then(function (d) {
            var newList = knowledgeSources.map(function (s) {
                if (s.id === sourceId)
                    return Object.assign({}, s, { last_test_ok: d.ok, last_test_at: new Date().toISOString() });
                return s;
            });
            setKnowledgeSources(newList);
        });
    };
    // 文件上传
    var handleFileUpload = function (file) {
        if (!agent?.id)
            return;
        setUploading(true);
        var fd = new FormData();
        fd.append('file', file);
        fd.append('name', file.name);
        fetch('/api/agents/' + agent.id + '/knowledge-sources/upload', {
            method: 'POST',
            headers: { 'X-User-Id': uid() },
            body: fd,
        }).then(function (r) { return r.json(); }).then(function (d) {
            if (d.ok && d.source) {
                setKnowledgeSources([d.source].concat(knowledgeSources));
            }
            setUploading(false);
        }).catch(function () { setUploading(false); });
    };
    // 对话功能
    var sendChatMessage = function (content) {
        setChatLoading(true);
        setChatError(null);
        var tempMsg = { id: Date.now(), role: 'user', content: content, status: 'done', created_at: new Date().toISOString() };
        setChatMessages(function (prev) { return prev.concat([tempMsg]); });
        fetch('/api/agents/' + agent.id + '/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-User-Id': uid() },
            body: JSON.stringify({ content: content, conversation_id: chatConversationId }),
        }).then(function (r) { return r.json(); }).then(function (d) {
            if (d.ok) {
                setChatMessages(function (prev) { return prev.filter(function (m) { return m.id !== tempMsg.id; }).concat([d.user_message, d.agent_message]); });
                setChatConversationId(d.conversation_id);
                if (d.agent_message && d.agent_message.status === 'error')
                    setChatError(d.agent_message.content);
            }
            else {
                setChatError(d.detail || '发送失败');
            }
            setChatLoading(false);
        }).catch(function () { setChatLoading(false); setChatError('网络错误'); });
    };
    var toggleWf = function (wfId) {
        var ids = (data.workflow_ids || []).slice();
        var idx = ids.indexOf(wfId);
        if (idx >= 0)
            ids.splice(idx, 1);
        else
            ids.push(wfId);
        setData(Object.assign({}, data, { workflow_ids: ids }));
    };
    // 工作流消耗统计
    var wfStats = {};
    if (monData) {
        monData.sessions.forEach(function (s) {
            var wfId = s.entity_id;
            if (!wfStats[wfId])
                wfStats[wfId] = { tokens: 0, calls: 0 };
            wfStats[wfId].tokens += s.total_tokens || 0;
            wfStats[wfId].calls += 1;
        });
    }
    return (_jsxs("div", { style: { padding: 24, height: '100%', overflow: 'auto' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }, children: [_jsx("button", { onClick: onBack, style: { padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }, children: _jsx(ArrowLeft, { size: 18 }) }), _jsx("h1", { style: { fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, margin: 0, flex: 1 }, children: isNew ? '创建 Agent' : data.name }), saved && _jsx("span", { style: { fontSize: 11, color: 'var(--green)', padding: '4px 10px', background: 'var(--green-bg)', borderRadius: 4 }, children: "\u5DF2\u4FDD\u5B58" })] }), !isNew && (_jsx("div", { style: { display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid var(--border)' }, children: ['edit', 'memory', 'chat', 'monitor'].map(function (t) { return _jsx("button", { onClick: function () { setTab(t); }, style: { padding: '8px 16px', background: 'none', border: 'none', borderBottom: tab === t ? '2px solid var(--color-primary)' : '2px solid transparent', color: tab === t ? 'var(--color-primary)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }, children: t === 'edit' ? '✏️ 编辑' : t === 'memory' ? '🧠 记忆' : t === 'chat' ? '💬 对话' : '📊 监控' }, t); }) })), tab === 'edit' && (_jsxs("div", { style: { maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 12 }, children: [_jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }, children: [_jsxs("div", { children: [_jsx("label", { style: lbl, children: "\u540D\u79F0" }), _jsx("input", { value: data.name, onChange: function (e) { setData(Object.assign({}, data, { name: e.target.value })); }, style: inp })] }), _jsxs("div", { children: [_jsx("label", { style: lbl, children: "\u8FD0\u884C\u65F6" }), _jsxs("select", { value: data.runtime, onChange: function (e) { setData(Object.assign({}, data, { runtime: e.target.value })); }, style: inp, children: [_jsx("option", { value: "langgraph", children: "LangGraph" }), _jsx("option", { value: "langchain", children: "LangChain" }), _jsx("option", { value: "autogen", children: "AutoGen" }), _jsx("option", { value: "crewai", children: "CrewAI" }), _jsx("option", { value: "codex", children: "OpenAI Codex CLI" }), _jsx("option", { value: "custom", children: "\u81EA\u5B9A\u4E49" })] })] })] }), _jsxs("div", { children: [_jsx("label", { style: lbl, children: "\u63CF\u8FF0" }), _jsx("input", { value: data.description, onChange: function (e) { setData(Object.assign({}, data, { description: e.target.value })); }, style: inp })] }), _jsxs("div", { style: { borderTop: '1px solid var(--border)', paddingTop: 12 }, children: [_jsx("label", { style: { ...lbl, fontSize: 13 }, children: "\uD83D\uDCDD \u7CFB\u7EDF Prompt" }), _jsx("textarea", { value: data.system_prompt || '', onChange: function (e) { setData(Object.assign({}, data, { system_prompt: e.target.value })); }, rows: 6, style: { ...inp, resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.6, minHeight: 120 }, placeholder: '你是一个资深的代码审查员。\n\n核心原则：\n- 逐行审查代码质量和安全性\n- 引用具体行号给出建议\n- 区分 blocking 和 suggestion' })] }), _jsxs("div", { children: [_jsx("label", { style: { ...lbl, fontSize: 13 }, children: "\uD83D\uDC64 \u89D2\u8272\u5B9A\u4E49" }), _jsx("textarea", { value: data.role_def || '', onChange: function (e) { setData(Object.assign({}, data, { role_def: e.target.value })); }, rows: 4, style: { ...inp, resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.6, minHeight: 80 }, placeholder: '性情: 严谨、边界思维\n\n职责: 代码审查、安全扫描\n\n不能做: 不直接修改代码' })] }), _jsxs("div", { children: [_jsx("label", { style: { ...lbl, fontSize: 13 }, children: "\uD83D\uDCCB SOP / \u8C03\u7528\u65B9\u5F0F" }), _jsx("textarea", { value: data.sop || '', onChange: function (e) { setData(Object.assign({}, data, { sop: e.target.value })); }, rows: 3, style: { ...inp, resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.6, minHeight: 60 }, placeholder: '触发: on_project_create\n输入: requirement_doc\n输出: review_report' })] }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }, children: [_jsxs("div", { children: [_jsx("label", { style: lbl, children: "\u6A21\u578B Provider" }), _jsxs("select", { value: data.model_provider, onChange: function (e) { setData(Object.assign({}, data, { model_provider: e.target.value })); }, style: inp, children: [_jsx("option", { value: "ollama", children: "Ollama" }), _jsx("option", { value: "openai", children: "OpenAI" }), _jsx("option", { value: "anthropic", children: "Anthropic" }), _jsx("option", { value: "deepseek", children: "DeepSeek" }), _jsx("option", { value: "gemini", children: "Gemini" }), _jsx("option", { value: "codex", children: "Codex" }), _jsx("option", { value: "hermes", children: "Hermes" })] })] }), _jsxs("div", { children: [_jsx("label", { style: lbl, children: "\u6A21\u578B\u540D\u79F0" }), _jsx("input", { value: data.model_name, onChange: function (e) { setData(Object.assign({}, data, { model_name: e.target.value })); }, style: inp })] }), _jsxs("div", { children: [_jsx("label", { style: lbl, children: "API Key" }), _jsx("input", { type: "password", value: data.api_key || '', onChange: function (e) { setData(Object.assign({}, data, { api_key: e.target.value })); }, style: inp })] })] }), _jsxs("div", { children: [_jsx("label", { style: lbl, children: "\uD83D\uDD00 \u7ED1\u5B9A\u5DE5\u4F5C\u6D41\uFF08\u591A\u9009\uFF09" }), _jsxs("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 6 }, children: [workflows.map(function (w) {
                                        var isBound = (data.workflow_ids || []).indexOf(w.id) >= 0;
                                        return (_jsxs("div", { onClick: function () { toggleWf(w.id); }, style: { padding: '8px 12px', borderRadius: 6, border: isBound ? '2px solid var(--color-primary)' : '1px solid var(--border)', background: isBound ? 'var(--blue-bg)' : 'var(--bg-card)', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }, children: [_jsx("span", { children: isBound ? '✅' : '○' }), _jsx("span", { children: w.name }), _jsxs("span", { style: { fontSize: 9, color: 'var(--text-dim)' }, children: [(w.spec_json?.nodes || []).length, "\u8282\u70B9"] })] }, w.id));
                                    }), workflows.length === 0 && _jsx("span", { style: { fontSize: 12, color: 'var(--text-dim)' }, children: "\u6682\u65E0\u5DE5\u4F5C\u6D41" })] })] }), _jsxs("details", { style: { borderTop: '1px solid var(--border)', paddingTop: 10 }, children: [_jsxs("summary", { style: { cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }, children: [_jsx(ShieldAlert, { size: 14 }), " \uD83D\uDEE1\uFE0F \u5B89\u5168\u95F8\u95E8 & Token \u9650\u5236"] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }, children: [_jsx("input", { value: data.gate_pre || '', onChange: function (e) { setData(Object.assign({}, data, { gate_pre: e.target.value })); }, style: inp, placeholder: "\u524D\u7F6E\u6821\u9A8C\u89C4\u5219" }), _jsx("input", { value: data.gate_post || '', onChange: function (e) { setData(Object.assign({}, data, { gate_post: e.target.value })); }, style: inp, placeholder: "\u540E\u7F6E\u6821\u9A8C\u89C4\u5219" }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }, children: [_jsxs("select", { value: data.io_filter || 'none', onChange: function (e) { setData(Object.assign({}, data, { io_filter: e.target.value })); }, style: inp, children: [_jsx("option", { value: "none", children: "I/O\u4E0D\u8FC7\u6EE4" }), _jsx("option", { value: "sanitize", children: "\u57FA\u7840" }), _jsx("option", { value: "strict", children: "\u4E25\u683C" })] }), _jsx("input", { type: "number", value: data.token_soft_limit, onChange: function (e) { setData(Object.assign({}, data, { token_soft_limit: parseInt(e.target.value) || 0 })); }, style: inp, placeholder: "\u8F6F\u9650\u5236" }), _jsx("input", { type: "number", value: data.token_hard_limit, onChange: function (e) { setData(Object.assign({}, data, { token_hard_limit: parseInt(e.target.value) || 0 })); }, style: inp, placeholder: "\u786C\u9650\u5236" })] })] })] }), _jsxs("details", { open: true, style: { borderTop: '1px solid var(--border)', paddingTop: 10 }, children: [_jsxs("summary", { style: { cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }, children: [_jsx(Database, { size: 14 }), " \uD83D\uDCE1 \u8D44\u6599\u6E90\u63A5\u5165\uFF08RAG / DB / API\uFF09"] }), _jsxs("div", { style: { marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }, children: [knowledgeSources.map(function (ks) {
                                        var isProcessing = ks.status && ['uploading', 'processing', 'indexing'].includes(ks.status);
                                        var statusCfg = {
                                            uploading: { label: '上传中', color: '#f59e0b', pct: 10 },
                                            processing: { label: '解析中', color: '#3b82f6', pct: 35 },
                                            indexing: { label: '索引中', color: '#8b5cf6', pct: 70 },
                                            indexed: { label: '已完成', color: '#10b981', pct: 100 },
                                            failed: { label: '失败', color: '#ef4444', pct: 0 },
                                        };
                                        var sc = statusCfg[ks.status] || null;
                                        return (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--bg-input)', borderRadius: 6, border: '1px solid var(--border)' }, children: [_jsx("span", { style: { fontSize: 10, padding: '2px 6px', borderRadius: 3, background: ks.source_type === 'rag_api' ? 'var(--purple-bg, #7c3aed20)' : ks.source_type === 'mysql' ? 'var(--blue-bg)' : 'var(--bg-card)', color: ks.source_type === 'rag_api' ? '#a78bfa' : 'var(--blue)', fontWeight: 500 }, children: ks.source_type }), _jsx("span", { style: { flex: 1, fontSize: 12, fontWeight: 500 }, children: ks.name || ks.url }), _jsx("span", { style: { fontSize: 9, color: 'var(--text-dim)' }, children: ks.url }), isProcessing && sc && (_jsxs("span", { style: { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10 }, children: [_jsx(Loader2, { size: 10, style: { animation: 'spin 1s linear infinite', color: sc.color } }), _jsx("span", { style: { color: sc.color }, children: sc.label }), _jsx("div", { style: { width: 40, height: 3, background: 'var(--bg-card)', borderRadius: 2 }, children: _jsx("div", { style: { width: sc.pct + '%', height: '100%', background: sc.color, borderRadius: 2 } }) })] })), ks.status === 'indexed' && _jsx("span", { style: { fontSize: 10, color: 'var(--green)' }, children: "\u2705 \u5DF2\u7D22\u5F15" }), ks.status === 'failed' && _jsx("span", { style: { fontSize: 10, color: 'var(--red)' }, children: "\u274C \u5931\u8D25" }), ks.last_test_ok === true && _jsx("span", { title: "\u8FDE\u63A5\u6B63\u5E38", children: _jsx(Wifi, { size: 12, color: "var(--green)" }) }), ks.last_test_ok === false && _jsx("span", { title: "\u8FDE\u63A5\u5931\u8D25", children: _jsx(WifiOff, { size: 12, color: "var(--red)" }) }), _jsx("button", { onClick: function () { testSource(ks.id); }, style: { padding: '2px 8px', fontSize: 10, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 3, cursor: 'pointer', color: 'var(--text-secondary)' }, children: "\u6D4B\u8BD5" }), _jsx("button", { onClick: function () { setSourceForm(ks); setShowSourceForm(true); }, style: { padding: '2px 8px', fontSize: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }, children: "\u270F\uFE0F" }), _jsx("button", { onClick: function () { deleteSource(ks.id); }, style: { padding: '2px 4px', fontSize: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)' }, title: "\u5220\u9664", children: _jsx(X, { size: 12 }) })] }, ks.id));
                                    }), !showSourceForm && (_jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsxs("button", { onClick: function () { setShowSourceForm(true); }, style: { display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', background: 'none', border: '1px dashed var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 12 }, children: [_jsx(Plus, { size: 12 }), " \u6DFB\u52A0\u8D44\u6599\u6E90"] }), _jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', background: 'none', border: '1px dashed var(--border)', borderRadius: 6, cursor: uploading ? 'wait' : 'pointer', color: 'var(--text-secondary)', fontSize: 12, opacity: uploading ? 0.5 : 1 }, children: [uploading ? _jsx(Loader2, { size: 12, style: { animation: 'spin 1s linear infinite' } }) : _jsx(Upload, { size: 12 }), uploading ? '上传中...' : '上传文件', _jsx("input", { type: "file", accept: ".pdf,.docx,.txt,.md,.py,.js,.json", onChange: function (e) { var f = e.target.files?.[0]; if (f)
                                                            handleFileUpload(f); }, style: { display: 'none' } })] })] })), showSourceForm && (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 8, padding: 12, background: 'var(--bg-input)', borderRadius: 6, border: '1px solid var(--border)' }, children: [_jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }, children: [_jsxs("div", { children: [_jsx("label", { style: lbl, children: "\u7C7B\u578B" }), _jsxs("select", { value: sourceForm.source_type, onChange: function (e) { setSourceForm(Object.assign({}, sourceForm, { source_type: e.target.value })); }, style: inp, children: [_jsx("option", { value: "rag_api", children: "RAG API" }), _jsx("option", { value: "mysql", children: "MySQL" }), _jsx("option", { value: "postgres", children: "PostgreSQL" }), _jsx("option", { value: "redis", children: "Redis" }), _jsx("option", { value: "http_api", children: "HTTP API" }), _jsx("option", { value: "url_crawl", children: "URL \u722C\u53D6" }), _jsx("option", { value: "local_file", children: "\uD83D\uDCC2 \u672C\u5730\u6587\u4EF6" })] })] }), _jsxs("div", { children: [_jsx("label", { style: lbl, children: "\u540D\u79F0" }), _jsx("input", { value: sourceForm.name, onChange: function (e) { setSourceForm(Object.assign({}, sourceForm, { name: e.target.value })); }, style: inp, placeholder: "\u77E5\u8BC6\u5E93/\u5185\u90E8\u6587\u6863/\u7528\u6237\u6570\u636E" })] })] }), _jsxs("div", { children: [_jsx("label", { style: lbl, children: "\u8FDE\u63A5\u5730\u5740 (URL)" }), _jsx("input", { value: sourceForm.url, onChange: function (e) { setSourceForm(Object.assign({}, sourceForm, { url: e.target.value })); }, style: inp, placeholder: sourceForm.source_type === 'mysql' ? 'mysql://user:pass@host:3306/db' : sourceForm.source_type === 'postgres' ? 'postgresql://user:pass@host:5432/db' : sourceForm.source_type === 'redis' ? 'redis://host:6379/0' : 'https://my-rag-api.example.com/query' })] }), _jsxs("div", { children: [_jsx("label", { style: lbl, children: "\u63CF\u8FF0" }), _jsx("input", { value: sourceForm.description, onChange: function (e) { setSourceForm(Object.assign({}, sourceForm, { description: e.target.value })); }, style: inp, placeholder: "\u8FD9\u4E2A\u8D44\u6599\u6E90\u5305\u542B\u4EC0\u4E48\u5185\u5BB9" })] }), (sourceForm.source_type === 'mysql' || sourceForm.source_type === 'postgres' || sourceForm.source_type === 'redis') && (_jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }, children: [_jsxs("div", { children: [_jsx("label", { style: lbl, children: "\u7528\u6237\u540D\uFF08\u53EF\u9009\uFF09" }), _jsx("input", { value: (sourceForm.config_json || {}).user || '', onChange: function (e) { setSourceForm(Object.assign({}, sourceForm, { config_json: Object.assign({}, sourceForm.config_json || {}, { user: e.target.value }) })); }, style: inp })] }), _jsxs("div", { children: [_jsx("label", { style: lbl, children: "\u5BC6\u7801/Token\uFF08\u53EF\u9009\uFF09" }), _jsx("input", { type: "password", value: (sourceForm.config_json || {}).password || '', onChange: function (e) { setSourceForm(Object.assign({}, sourceForm, { config_json: Object.assign({}, sourceForm.config_json || {}, { password: e.target.value }) })); }, style: inp })] })] })), (sourceForm.source_type === 'rag_api' || sourceForm.source_type === 'http_api') && (_jsxs("div", { children: [_jsx("label", { style: lbl, children: "API Key\uFF08\u53EF\u9009\uFF09" }), _jsx("input", { type: "password", value: (sourceForm.config_json || {}).api_key || '', onChange: function (e) { setSourceForm(Object.assign({}, sourceForm, { config_json: Object.assign({}, sourceForm.config_json || {}, { api_key: e.target.value }) })); }, style: inp, placeholder: "Bearer Token / API Key" })] })), _jsxs("div", { style: { display: 'flex', gap: 6 }, children: [_jsx("button", { onClick: saveSource, style: { padding: '6px 16px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }, children: "\u4FDD\u5B58" }), _jsx("button", { onClick: function () { setShowSourceForm(false); setSourceForm({ source_type: 'http_api', url: '', name: '', description: '', config_json: {} }); }, style: { padding: '6px 12px', background: 'none', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)' }, children: "\u53D6\u6D88" })] })] }))] })] }), _jsxs("details", { style: { borderTop: '1px solid var(--border)', paddingTop: 10 }, children: [_jsxs("summary", { style: { cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }, children: [_jsx(Clock, { size: 14 }), " \u23F0 \u5B9A\u65F6\u4EFB\u52A1"] }), _jsxs("div", { style: { marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }, children: [scheduledTasks.map(function (t) {
                                        return (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--bg-input)', borderRadius: 6, border: '1px solid var(--border)' }, children: [_jsx("span", { style: {
                                                        fontSize: 10, padding: '2px 6px', borderRadius: 3,
                                                        background: t.enabled ? 'var(--green-bg)' : 'var(--bg-card)',
                                                        color: t.enabled ? 'var(--green)' : 'var(--text-dim)',
                                                        fontWeight: 500,
                                                    }, children: t.enabled ? '启用' : '禁用' }), _jsx("span", { style: { flex: 1, fontSize: 12, fontWeight: 500 }, children: t.name || t.capability }), _jsx("code", { style: { fontSize: 10, color: 'var(--text-dim)', background: 'var(--bg-card)', padding: '2px 6px', borderRadius: 3 }, children: t.cron_expr }), _jsx("span", { style: { fontSize: 10, color: 'var(--text-dim)' }, children: t.capability }), t.last_run && _jsxs("span", { style: { fontSize: 9, color: 'var(--text-muted)' }, children: ["\u4E0A\u6B21: ", new Date(t.last_run).toLocaleString('zh-CN')] }), _jsx("button", { onClick: function () { toggleTask(t.id, !t.enabled); }, style: {
                                                        padding: '2px 8px', fontSize: 10,
                                                        background: t.enabled ? 'var(--bg-card)' : 'var(--green-bg)',
                                                        border: '1px solid var(--border)', borderRadius: 3, cursor: 'pointer',
                                                        color: t.enabled ? 'var(--text-secondary)' : 'var(--green)',
                                                    }, children: t.enabled ? '禁用' : '启用' }), _jsx("button", { onClick: function () { setTaskForm(t); setShowTaskForm(true); }, style: { padding: '2px 8px', fontSize: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }, children: "\u270F\uFE0F" }), _jsx("button", { onClick: function () { deleteTask(t.id); }, style: { padding: '2px 4px', fontSize: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)' }, title: "\u5220\u9664", children: _jsx(X, { size: 12 }) })] }, t.id));
                                    }), !showTaskForm && (_jsxs("button", { onClick: function () { setShowTaskForm(true); setTaskForm({ name: '', cron_expr: '0 9 * * *', capability: '', enabled: true }); }, style: { display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', background: 'none', border: '1px dashed var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 12 }, children: [_jsx(Plus, { size: 12 }), " \u6DFB\u52A0\u5B9A\u65F6\u4EFB\u52A1"] })), showTaskForm && (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 8, padding: 12, background: 'var(--bg-input)', borderRadius: 6, border: '1px solid var(--border)' }, children: [_jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }, children: [_jsxs("div", { children: [_jsx("label", { style: lbl, children: "\u4EFB\u52A1\u540D\u79F0" }), _jsx("input", { value: taskForm.name, onChange: function (e) { setTaskForm(Object.assign({}, taskForm, { name: e.target.value })); }, style: inp, placeholder: "\u4F8B\u5982\uFF1A\u6BCF\u65E5\u4EE3\u7801\u5BA1\u67E5" })] }), _jsxs("div", { children: [_jsx("label", { style: lbl, children: "\u80FD\u529B (capability)" }), _jsx("input", { value: taskForm.capability, onChange: function (e) { setTaskForm(Object.assign({}, taskForm, { capability: e.target.value })); }, style: inp, placeholder: "\u4F8B\u5982\uFF1Acode_review" })] })] }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr auto', gap: 6 }, children: [_jsxs("div", { children: [_jsx("label", { style: lbl, children: "Cron \u8868\u8FBE\u5F0F" }), _jsx("input", { value: taskForm.cron_expr, onChange: function (e) { setTaskForm(Object.assign({}, taskForm, { cron_expr: e.target.value })); }, style: inp, placeholder: "\u5206 \u65F6 \u65E5 \u6708 \u5468\uFF0C\u4F8B\u5982\uFF1A0 9 * * 1" })] }), _jsx("div", { style: { display: 'flex', alignItems: 'flex-end', gap: 6 }, children: _jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)' }, children: [_jsx("input", { type: "checkbox", checked: taskForm.enabled, onChange: function (e) { setTaskForm(Object.assign({}, taskForm, { enabled: e.target.checked })); } }), "\u542F\u7528"] }) })] }), _jsxs("div", { style: { fontSize: 10, color: 'var(--text-dim)' }, children: ["\u5FEB\u6377 cron\uFF1A", _jsx("code", { style: { cursor: 'pointer', padding: '1px 4px', background: 'var(--bg-card)', borderRadius: 2 }, onClick: function () { setTaskForm(Object.assign({}, taskForm, { cron_expr: '*/5 * * * *' })); }, children: "*/5 * * * * (\u6BCF5\u5206\u949F)" }), " ", _jsx("code", { style: { cursor: 'pointer', padding: '1px 4px', background: 'var(--bg-card)', borderRadius: 2 }, onClick: function () { setTaskForm(Object.assign({}, taskForm, { cron_expr: '0 * * * *' })); }, children: "0 * * * * (\u6BCF\u5C0F\u65F6)" }), " ", _jsx("code", { style: { cursor: 'pointer', padding: '1px 4px', background: 'var(--bg-card)', borderRadius: 2 }, onClick: function () { setTaskForm(Object.assign({}, taskForm, { cron_expr: '0 9 * * 1' })); }, children: "0 9 * * 1 (\u6BCF\u5468\u4E00 9:00)" })] }), _jsxs("div", { style: { display: 'flex', gap: 6 }, children: [_jsx("button", { onClick: saveTask, style: { padding: '6px 16px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }, children: "\u4FDD\u5B58" }), _jsx("button", { onClick: function () { setShowTaskForm(false); setTaskForm({ name: '', cron_expr: '0 9 * * *', capability: '', enabled: true }); }, style: { padding: '6px 12px', background: 'none', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)' }, children: "\u53D6\u6D88" })] })] })), scheduledTasks.length === 0 && !showTaskForm && (_jsx("div", { style: { textAlign: 'center', padding: 16, color: 'var(--text-dim)', fontSize: 12 }, children: "\u6682\u65E0\u5B9A\u65F6\u4EFB\u52A1\uFF0C\u70B9\u51FB\u4E0A\u65B9\u6309\u94AE\u6DFB\u52A0" }))] })] }), _jsx("div", { style: { borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 8 }, children: _jsx(ChannelConfigComponent, { agentId: agent.id }) }), saveError && (_jsxs("div", { style: { padding: '10px 14px', background: 'var(--red-bg, #dc262620)', border: '1px solid var(--color-danger, #dc2626)', borderRadius: 6, color: 'var(--color-danger, #dc2626)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("span", { children: "\u274C" }), " ", saveError] })), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsxs("button", { onClick: handleSave, style: { padding: '10px 24px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }, children: [_jsx(Save, { size: 14 }), " \u4FDD\u5B58"] }), onDelete && _jsxs("button", { onClick: onDelete, style: { padding: '10px 16px', background: 'none', color: 'var(--color-danger)', border: '1px solid var(--color-danger)', borderRadius: 4, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }, children: [_jsx(Trash2, { size: 14 }), " \u5220\u9664"] })] })] })), tab === 'chat' && agent && agent.id && (_jsx("div", { style: { height: 'calc(100vh - 200px)', minHeight: 400 }, children: _jsx(ChatWindow, { agentId: agent.id, agentName: agent.name, messages: chatMessages, loading: chatLoading, error: chatError, onSend: function (content) { sendChatMessage(content); }, onRetry: function () { setChatError(null); }, extraHeader: _jsxs("button", { onClick: function () { setTab('edit'); }, style: { display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: 11, background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }, children: [_jsx(ExternalLink, { size: 12 }), " \u53D1\u5E03\u5230\u6E20\u9053"] }) }) })), tab === 'memory' && (_jsxs("div", { style: { maxWidth: 900 }, children: [_jsxs("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: 16 }, children: [Object.keys(memoryChannels).map(function (ch) {
                                var s = memoryChannels[ch];
                                return (_jsxs("div", { style: { background: 'var(--bg-card)', borderRadius: 8, padding: 12, border: '1px solid var(--border)', textAlign: 'center' }, children: [_jsx("div", { style: { fontSize: 18 }, children: ch === 'web' ? '🌐' : ch === 'feishu' ? '🐦' : ch === 'dingtalk' ? '📌' : ch === 'wechat_work' ? '💬' : ch === 'slack' ? '💎' : ch === 'telegram' ? '✈️' : '🔌' }), _jsx("div", { style: { fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }, children: s.total }), _jsx("div", { style: { fontSize: 10, color: 'var(--text-dim)' }, children: ch }), _jsx("div", { style: { fontSize: 9, color: 'var(--text-dim)' }, children: Object.keys(s.types || {}).join(', ') })] }, ch));
                            }), Object.keys(memoryChannels).length === 0 && _jsx("div", { style: { gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-dim)', padding: 20 }, children: "\u6682\u65E0\u8BB0\u5FC6\u6570\u636E" })] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }, children: [_jsxs("span", { style: { fontSize: 14, fontWeight: 600 }, children: ["\uD83D\uDCDD \u8BB0\u5FC6\u6761\u76EE\uFF08", memories.length, "\uFF09"] }), !showMemForm && _jsxs("button", { onClick: function () { setShowMemForm(true); }, style: { display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }, children: [_jsx(Plus, { size: 14 }), " \u6DFB\u52A0\u8BB0\u5FC6"] })] }), showMemForm && (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 8, padding: 12, background: 'var(--bg-input)', borderRadius: 6, border: '1px solid var(--border)', marginBottom: 12 }, children: [_jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }, children: [_jsxs("div", { children: [_jsx("label", { style: lbl, children: "\u6E20\u9053" }), _jsxs("select", { value: memForm.channel, onChange: function (e) { setMemForm(Object.assign({}, memForm, { channel: e.target.value })); }, style: inp, children: [_jsx("option", { value: "web", children: "\uD83C\uDF10 Web" }), _jsx("option", { value: "feishu", children: "\uD83D\uDC26 \u98DE\u4E66" }), _jsx("option", { value: "dingtalk", children: "\uD83D\uDCCC \u9489\u9489" }), _jsx("option", { value: "wechat_work", children: "\uD83D\uDCAC \u4F01\u5FAE" }), _jsx("option", { value: "slack", children: "\uD83D\uDC8E Slack" }), _jsx("option", { value: "telegram", children: "\u2708\uFE0F Telegram" }), _jsx("option", { value: "api", children: "\uD83D\uDD0C API" })] })] }), _jsxs("div", { children: [_jsx("label", { style: lbl, children: "\u7C7B\u578B" }), _jsxs("select", { value: memForm.memory_type, onChange: function (e) { setMemForm(Object.assign({}, memForm, { memory_type: e.target.value })); }, style: inp, children: [_jsx("option", { value: "fact", children: "\uD83D\uDCCB \u4E8B\u5B9E" }), _jsx("option", { value: "preference", children: "\u2B50 \u504F\u597D" }), _jsx("option", { value: "conversation", children: "\uD83D\uDCAC \u5BF9\u8BDD" }), _jsx("option", { value: "context", children: "\uD83D\uDCCE \u4E0A\u4E0B\u6587" })] })] })] }), _jsxs("div", { children: [_jsx("label", { style: lbl, children: "Key" }), _jsx("input", { value: memForm.key, onChange: function (e) { setMemForm(Object.assign({}, memForm, { key: e.target.value })); }, style: inp, placeholder: "user_preference / project_context" })] }), _jsxs("div", { children: [_jsx("label", { style: lbl, children: "Value (JSON)" }), _jsx("textarea", { value: memForm.value, onChange: function (e) { setMemForm(Object.assign({}, memForm, { value: e.target.value })); }, rows: 3, style: { ...inp, resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: 11 }, placeholder: '{"language":"zh","tone":"formal"}' })] }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }, children: [_jsxs("div", { children: [_jsx("label", { style: lbl, children: "\u4F18\u5148\u7EA7 (1-10)" }), _jsx("input", { type: "number", value: memForm.priority, onChange: function (e) { setMemForm(Object.assign({}, memForm, { priority: parseInt(e.target.value) || 5 })); }, style: inp, min: 1, max: 10 })] }), _jsxs("div", { children: [_jsx("label", { style: lbl, children: "TTL (\u79D2, \u7A7A=\u6C38\u4E45)" }), _jsx("input", { type: "number", value: memForm.ttl_seconds || '', onChange: function (e) { setMemForm(Object.assign({}, memForm, { ttl_seconds: e.target.value ? parseInt(e.target.value) : null })); }, style: inp, placeholder: "86400 = 1\u5929" })] })] }), _jsxs("div", { style: { display: 'flex', gap: 6 }, children: [_jsx("button", { onClick: saveMemory, style: { padding: '6px 16px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }, children: "\u4FDD\u5B58" }), _jsx("button", { onClick: function () { setShowMemForm(false); }, style: { padding: '6px 12px', background: 'none', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)' }, children: "\u53D6\u6D88" })] })] })), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 4 }, children: [memories.map(function (m) {
                                var channelIcon = m.channel === 'web' ? '🌐' : m.channel === 'feishu' ? '🐦' : m.channel === 'dingtalk' ? '📌' : m.channel === 'wechat_work' ? '💬' : m.channel === 'slack' ? '💎' : m.channel === 'telegram' ? '✈️' : '🔌';
                                var typeColor = m.memory_type === 'preference' ? '#a78bfa' : m.memory_type === 'fact' ? '#5cb878' : m.memory_type === 'conversation' ? '#548cf0' : '#e8a450';
                                return (_jsxs("div", { style: { background: 'var(--bg-card)', borderRadius: 6, padding: '10px 12px', border: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: 10 }, children: [_jsx("span", { style: { fontSize: 16 }, children: channelIcon }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }, children: [_jsx("span", { style: { fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }, children: m.key }), _jsx("span", { style: { fontSize: 9, padding: '1px 6px', borderRadius: 3, background: typeColor + '20', color: typeColor }, children: m.memory_type }), m.priority >= 8 && _jsx("span", { style: { fontSize: 9, padding: '1px 4px', borderRadius: 3, background: 'var(--red-bg)', color: 'var(--red)' }, children: "\u9AD8\u4F18\u5148\u7EA7" }), m.expires_at && _jsxs("span", { style: { fontSize: 9, color: 'var(--text-dim)' }, children: ["\u23F0 ", new Date(m.expires_at).toLocaleString()] })] }), _jsx("pre", { style: { margin: 0, fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 80, overflow: 'auto' }, children: JSON.stringify(m.value, null, 2) }), _jsxs("div", { style: { fontSize: 9, color: 'var(--text-dim)', marginTop: 4 }, children: [m.channel, " \u00B7 ", m.session_id || '无会话', " \u00B7 ", m.updated_at ? new Date(m.updated_at).toLocaleString() : ''] })] }), _jsx("button", { onClick: function () { deleteMemory(m.id); }, style: { padding: 2, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }, title: "\u5220\u9664", children: _jsx(X, { size: 14 }) })] }, m.id));
                            }), memories.length === 0 && !showMemForm && (_jsxs("div", { style: { textAlign: 'center', padding: 40, color: 'var(--text-dim)' }, children: [_jsx("p", { style: { fontSize: 28, margin: '0 0 8px' }, children: "\uD83E\uDDE0" }), _jsx("p", { style: { fontSize: 13, margin: 0 }, children: "\u6682\u65E0\u8BB0\u5FC6\u6570\u636E" }), _jsx("p", { style: { fontSize: 11, margin: '4px 0' }, children: "Agent \u8FD0\u884C\u65F6\u4F1A\u81EA\u52A8\u8BB0\u5F55\u8DE8\u6E20\u9053\u8BB0\u5FC6" })] }))] })] })), tab === 'monitor' && agent?.id && (_jsx(EntityBreakdownPanel, { entityType: "agent", entityId: agent.id, entityName: agent.name || 'Agent' })), false && monData && (_jsxs("div", { children: [_jsxs("div", { style: { display: 'none' }, children: [_jsxs("div", { style: card, children: [_jsx("div", { style: cardV, children: monData.sessions.reduce(function (s, x) { return s + (x.total_tokens || 0); }, 0).toLocaleString() }), _jsx("div", { style: cardL, children: "\u603B Token \u6D88\u8017" })] }), _jsxs("div", { style: card, children: [_jsx("div", { style: cardV, children: monData.sessions.length }), _jsx("div", { style: cardL, children: "\u4F1A\u8BDD\u6570" })] }), _jsxs("div", { style: card, children: [_jsxs("div", { style: cardV, children: [(monData.sessions.reduce(function (s, x) { return s + (x.duration_ms || 0); }, 0) / 1000).toFixed(1), "s"] }), _jsx("div", { style: cardL, children: "\u603B\u6267\u884C\u65F6\u95F4" })] }), _jsxs("div", { style: card, children: [_jsx("div", { style: cardV, children: (data.workflow_ids || []).length }), _jsx("div", { style: cardL, children: "\u7ED1\u5B9A\u5DE5\u4F5C\u6D41" })] })] }), monData.buckets.length > 0 && (_jsxs("div", { style: { background: 'var(--bg-card)', borderRadius: 8, padding: 16, border: '1px solid var(--border)', marginBottom: 16 }, children: [_jsx("h3", { style: { fontSize: 14, fontWeight: 600, margin: '0 0 12px 0' }, children: "\uD83D\uDCC8 Token \u6D88\u8017\u8D8B\u52BF" }), _jsxs("div", { style: { display: 'flex', alignItems: 'flex-end', height: 140, gap: 2 }, children: [_jsxs("div", { style: { display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 140, paddingRight: 4, fontSize: 8, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }, children: [_jsx("span", { children: Math.max.apply(null, monData.buckets.map(function (b) { return b.tokens; })).toLocaleString() }), _jsx("span", { children: "0" })] }), monData.buckets.map(function (b, i) {
                                        var max = Math.max.apply(null, monData.buckets.map(function (x) { return x.tokens; })) || 1;
                                        return _jsx("div", { style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: 140 }, children: _jsx("div", { title: b.time + ': ' + b.tokens.toLocaleString(), style: { width: '70%', height: Math.max(4, b.tokens / max * 135), background: 'var(--color-primary)', borderRadius: '2px 2px 0 0', opacity: 0.8, minWidth: 4 } }) }, i);
                                    })] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 8, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }, children: [_jsx("span", { children: monData.buckets[0]?.time }), _jsx("span", { children: monData.buckets[monData.buckets.length - 1]?.time })] })] })), _jsxs("div", { style: { background: 'var(--bg-card)', borderRadius: 8, padding: 16, border: '1px solid var(--border)', marginBottom: 16 }, children: [_jsx("h3", { style: { fontSize: 14, fontWeight: 600, margin: '0 0 12px 0' }, children: "\uD83D\uDD00 \u5404\u5DE5\u4F5C\u6D41\u6D88\u8017\u660E\u7EC6" }), _jsxs("table", { style: { width: '100%', borderCollapse: 'collapse', fontSize: 11 }, children: [_jsx("thead", { children: _jsxs("tr", { style: { borderBottom: '1px solid var(--border)' }, children: [_jsx("th", { style: th, children: "\u5DE5\u4F5C\u6D41" }), _jsx("th", { style: { ...th, textAlign: 'right' }, children: "Token \u6D88\u8017" }), _jsx("th", { style: { ...th, textAlign: 'right' }, children: "\u8C03\u7528\u6B21\u6570" }), _jsx("th", { style: th, children: "\u5360\u6BD4" })] }) }), _jsxs("tbody", { children: [(data.workflow_ids || []).map(function (wfId) {
                                                var wf = workflows.find(function (w) { return w.id === wfId; });
                                                var stats = wfStats[wfId] || { tokens: 0, calls: 0 };
                                                var totalTokens = monData.sessions.reduce(function (s, x) { return s + (x.total_tokens || 0); }, 0) || 1;
                                                return (_jsxs("tr", { style: { borderBottom: '1px solid var(--border)' }, children: [_jsx("td", { style: td, children: wf?.name || '工作流 #' + wfId }), _jsx("td", { style: { ...td, fontFamily: 'var(--font-mono)', textAlign: 'right' }, children: stats.tokens.toLocaleString() }), _jsx("td", { style: { ...td, fontFamily: 'var(--font-mono)', textAlign: 'right' }, children: stats.calls }), _jsxs("td", { style: td, children: [_jsx("div", { style: { height: 4, background: 'var(--bg-input)', borderRadius: 2, width: 80 }, children: _jsx("div", { style: { height: '100%', width: Math.round(stats.tokens / totalTokens * 100) + '%', background: 'var(--color-primary)', borderRadius: 2 } }) }), _jsxs("span", { style: { fontSize: 9, color: 'var(--text-dim)' }, children: [Math.round(stats.tokens / totalTokens * 100), "%"] })] })] }, wfId));
                                            }), (data.workflow_ids || []).length === 0 && _jsx("tr", { children: _jsx("td", { colSpan: 4, style: { padding: 20, textAlign: 'center', color: 'var(--text-dim)' }, children: "\u672A\u7ED1\u5B9A\u5DE5\u4F5C\u6D41" }) })] })] })] }), _jsxs("div", { style: { background: 'var(--bg-card)', borderRadius: 8, padding: 16, border: '1px solid var(--border)' }, children: [_jsxs("h3", { style: { fontSize: 14, fontWeight: 600, margin: '0 0 12px 0' }, children: ["\uD83D\uDCDC \u4F1A\u8BDD\u6D88\u8017\uFF08", monData.sessions.length, " \u6761\uFF09"] }), _jsxs("table", { style: { width: '100%', borderCollapse: 'collapse', fontSize: 11 }, children: [_jsx("thead", { children: _jsxs("tr", { style: { borderBottom: '1px solid var(--border)' }, children: [_jsx("th", { style: th, children: "\u65F6\u95F4" }), _jsx("th", { style: th, children: "\u6A21\u578B" }), _jsx("th", { style: th, children: "\u5DE5\u5177" }), _jsx("th", { style: { ...th, textAlign: 'right' }, children: "Token" }), _jsx("th", { style: th, children: "\u8017\u65F6" }), _jsx("th", { style: th, children: "\u72B6\u6001" })] }) }), _jsxs("tbody", { children: [monData.sessions.map(function (s, i) {
                                                return _jsxs("tr", { style: { borderBottom: '1px solid var(--border)' }, children: [_jsx("td", { style: td, children: s.timestamp?.slice(11, 19) || '-' }), _jsx("td", { style: { ...td, fontFamily: 'var(--font-mono)' }, children: s.model_name }), _jsx("td", { style: td, children: s.tool_name || '-' }), _jsx("td", { style: { ...td, fontFamily: 'var(--font-mono)', textAlign: 'right' }, children: s.total_tokens?.toLocaleString() }), _jsx("td", { style: { ...td, fontFamily: 'var(--font-mono)' }, children: s.duration_ms ? (s.duration_ms / 1000).toFixed(1) + 's' : '-' }), _jsx("td", { style: td, children: _jsx("span", { style: { padding: '2px 6px', borderRadius: 2, fontSize: 9, background: s.status === 'success' ? 'var(--green-bg)' : 'var(--red-bg)', color: s.status === 'success' ? 'var(--green)' : 'var(--red)' }, children: s.status === 'success' ? 'OK' : 'ERR' }) })] }, i);
                                            }), monData.sessions.length === 0 && _jsx("tr", { children: _jsx("td", { colSpan: 6, style: { padding: 20, textAlign: 'center', color: 'var(--text-dim)' }, children: "\u6682\u65E0\u4F1A\u8BDD" }) })] })] })] })] }))] }));
}
var card = { background: 'var(--bg-card)', borderRadius: 8, padding: 20, border: '1px solid var(--border)', textAlign: 'center' };
var cardV = { fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700, color: 'var(--color-primary)' };
var cardL = { fontSize: 10, color: 'var(--text-dim)', marginTop: 4 };
