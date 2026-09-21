import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Trash2, Download, Upload, ShieldAlert, ChevronDown, ChevronRight, ArrowRight, GitFork } from 'lucide-react';
import { useWorkflows } from '../stores/workflows';
var lbl = { fontSize: 11, fontWeight: 500, color: 'var(--text-dim)', display: 'block', marginBottom: 4 };
var inp = { width: '100%', padding: '8px', background: 'var(--bg-input)', color: 'var(--color-text)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, boxSizing: 'border-box' };
var btn1 = { padding: '10px 24px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 };
var btn2 = { padding: '10px 16px', background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 };
var DEMO_MD = '# 我的工作流\n\n**描述**: 工作流用途描述\n\n## 节点\n- n1: 天气查询 (plugin)\n- n2: 代码审查 (skill)\n- n3: 报告生成 (plugin)\n\n## 连线\n- n1 → n2 (顺序)\n- n2 → n3 (IF/ELSE: 风险等级>3)\n\n## 安全闸门\n- 前置校验: 输入必须包含 project_id\n- 后置校验: 输出不能为空\n- I/O过滤: 基础过滤\n\n## Token限制\n- 软限制: 800000\n- 硬限制: 1000000\n';
export default function WorkflowCreate({ onBack, onCreated }) {
    var { createWorkflow } = useWorkflows();
    var [name, setName] = useState('');
    var [description, setDescription] = useState('');
    var [md, setMd] = useState(DEMO_MD);
    var [tools, setTools] = useState([]);
    var [nodes, setNodes] = useState([]);
    var [edges, setEdges] = useState([]);
    var [showSecurity, setShowSecurity] = useState(false);
    var [gate, setGate] = useState({ pre: '', post: '', io: 'none' });
    var [token, setToken] = useState({ soft: 800000, hard: 1000000 });
    var [saved, setSaved] = useState(false);
    var [newEdge, setNewEdge] = useState({ from: '', to: '', type: 'sequential' });
    var [mode, setMode] = useState('md');
    useEffect(function () {
        var uid = localStorage.getItem('current_user_id') || 'admin';
        fetch('/api/tools', { headers: { 'X-User-Id': uid } }).then(function (r) { return r.json(); }).then(function (d) { setTools(d.tools || []); });
    }, []);
    // 从 MD 解析节点和连线
    var parseMd = function (content) {
        var ns = [];
        var es = [];
        var lines = content.split('\n');
        var inNodes = false, inEdges = false;
        for (var i = 0; i < lines.length; i++) {
            var l = lines[i].trim();
            if (l === '## 节点' || l === '## Nodes') {
                inNodes = true;
                inEdges = false;
                continue;
            }
            if (l === '## 连线' || l === '## Edges') {
                inEdges = true;
                inNodes = false;
                continue;
            }
            if (l.startsWith('##') && l !== '## 节点' && l !== '## 连线') {
                inNodes = false;
                inEdges = false;
                continue;
            }
            if (inNodes && l.startsWith('- ')) {
                var m = l.match(/-\s*(\w+):\s*(.+?)\s*\((\w+)\)/);
                if (m)
                    ns.push({ id: m[1], label: m[2].trim(), tool_id: 0, tool_type: m[3], tool_name: m[2].trim() });
            }
            if (inEdges && l.startsWith('- ')) {
                var em = l.match(/-\s*(\w+)\s*→\s*(\w+)\s*\((\S+?)\)/);
                if (em)
                    es.push({ from: em[1], to: em[2], type: em[3] === 'IF/ELSE' ? 'if-else' : em[3] === '并行' ? 'parallel' : 'sequential' });
            }
        }
        setNodes(ns);
        setEdges(es);
        // 从第一行提取名称
        for (var j = 0; j < lines.length; j++) {
            if (lines[j].startsWith('# ') && !lines[j].startsWith('## ')) {
                setName(lines[j].replace('# ', '').trim());
                break;
            }
        }
    };
    useEffect(function () { parseMd(md); }, []);
    var handleSave = async function () {
        var wf = await createWorkflow({
            name: name || '未命名工作流', description: description,
            definition_mode: 'visual',
            spec_json: { nodes: nodes, edges: edges },
            token_soft_limit: token.soft, token_hard_limit: token.hard,
        });
        if (wf) {
            setSaved(true);
            setTimeout(function () { onCreated(wf.id); }, 800);
        }
    };
    var addToolToNode = function (tool) {
        var id = 'n' + (nodes.length + 1);
        setNodes(nodes.concat([{ id: id, label: tool.name, tool_id: tool.id, tool_type: tool.type, tool_name: tool.name }]));
        // 更新 MD
        var newMd = md + '\n- ' + id + ': ' + tool.name + ' (' + tool.type + ')';
        setMd(newMd);
    };
    var removeNode = function (nodeId) {
        setNodes(nodes.filter(function (n) { return n.id !== nodeId; }));
        setEdges(edges.filter(function (e) { return e.from !== nodeId && e.to !== nodeId; }));
    };
    var addEdge = function () {
        if (!newEdge.from || !newEdge.to)
            return;
        setEdges(edges.concat([newEdge]));
        setNewEdge({ from: '', to: '', type: 'sequential' });
    };
    var handleUpload = function (e) {
        var f = e.target.files?.[0];
        if (!f)
            return;
        var reader = new FileReader();
        reader.onload = function () { setMd(reader.result); parseMd(reader.result); };
        reader.readAsText(f);
    };
    var downloadDemo = function () {
        var blob = new Blob([DEMO_MD], { type: 'text/markdown' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'workflow-template.md';
        a.click();
    };
    return (_jsxs("div", { style: { padding: 24, height: '100%', overflow: 'auto' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }, children: [_jsx("button", { onClick: onBack, style: { padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }, children: _jsx(ArrowLeft, { size: 18 }) }), _jsx("h1", { style: { fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, margin: 0, flex: 1 }, children: "\u521B\u5EFA\u5DE5\u4F5C\u6D41" }), saved && _jsx("span", { style: { fontSize: 11, color: 'var(--green)', padding: '4px 10px', background: 'var(--green-bg)', borderRadius: 4 }, children: "\u5DF2\u521B\u5EFA" }), _jsxs("button", { onClick: downloadDemo, style: btn2, children: [_jsx(Download, { size: 14 }), " \u4E0B\u8F7D Demo"] })] }), _jsx("div", { style: { display: 'flex', gap: 6, marginBottom: 16 }, children: [{ id: 'md', label: '📝 Markdown' }, { id: 'upload', label: '📤 上传 MD' }, { id: 'visual', label: '🔀 可视化节点' }].map(function (m) {
                    return _jsx("button", { onClick: function () { setMode(m.id); }, style: { padding: '6px 14px', borderRadius: 4, border: '1px solid var(--border)', background: mode === m.id ? 'var(--color-primary)' : 'var(--bg-card)', color: mode === m.id ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 12 }, children: m.label }, m.id);
                }) }), _jsxs("div", { style: { display: 'flex', gap: 20, flexWrap: 'wrap' }, children: [(mode === 'md' || mode === 'upload') && (_jsxs("div", { style: { flex: '1 1 450px', maxWidth: 600 }, children: [mode === 'upload' && (_jsxs("div", { style: { marginBottom: 12, padding: 16, border: '2px dashed var(--border)', borderRadius: 8, textAlign: 'center' }, children: [_jsx(Upload, { size: 24, color: "var(--text-dim)" }), _jsx("p", { style: { fontSize: 13, marginTop: 8 }, children: "\u4E0A\u4F20 Markdown \u5DE5\u4F5C\u6D41\u5B9A\u4E49\u6587\u4EF6" }), _jsx("input", { type: "file", accept: ".md,.markdown", onChange: handleUpload, style: { marginTop: 8 } }), _jsxs("p", { style: { fontSize: 10, color: 'var(--text-dim)', marginTop: 8 }, children: ["\u6216\u5148\u4E0B\u8F7D Demo \u6A21\u677F\uFF1A", _jsx("button", { onClick: downloadDemo, style: { background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', textDecoration: 'underline', fontSize: 10 }, children: "workflow-template.md" })] })] })), _jsxs("div", { style: { border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }, children: [_jsxs("div", { style: { padding: '8px 12px', background: 'var(--bg-input)', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 600, display: 'flex', justifyContent: 'space-between' }, children: [_jsx("span", { children: "\uD83D\uDCDD Markdown \u7F16\u8F91\u5668" }), _jsx("button", { onClick: function () { parseMd(md); }, style: { padding: '2px 8px', background: 'var(--bg-card)', color: 'var(--color-primary)', border: '1px solid var(--border)', borderRadius: 3, cursor: 'pointer', fontSize: 10 }, children: "\u89E3\u6790 \u2192" })] }), _jsxs("div", { style: { display: 'flex' }, children: [_jsx("div", { style: { width: 36, background: 'var(--bg-card)', borderRight: '1px solid var(--border)', paddingTop: 10, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', textAlign: 'right', userSelect: 'none', flexShrink: 0 }, children: md.split('\n').map(function (_, i) { return _jsx("div", { style: { lineHeight: '20px', height: 20, paddingRight: 8 }, children: i + 1 }, i); }) }), _jsx("textarea", { value: md, onChange: function (e) { setMd(e.target.value); }, style: { flex: 1, padding: '10px 12px', background: 'var(--bg-input)', color: 'var(--color-text)', fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: '20px', border: 'none', outline: 'none', resize: 'none', minHeight: 500, tabSize: 2 } })] })] }), _jsxs("div", { style: { marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }, children: [_jsxs("div", { children: [_jsx("label", { style: lbl, children: "\u540D\u79F0" }), _jsx("input", { value: name, onChange: function (e) { setName(e.target.value); }, style: inp })] }), _jsxs("div", { children: [_jsx("label", { style: lbl, children: "\u63CF\u8FF0" }), _jsx("input", { value: description, onChange: function (e) { setDescription(e.target.value); }, style: inp })] })] })] })), _jsxs("div", { style: { flex: '1 1 350px' }, children: [mode === 'visual' && (_jsxs("div", { style: { padding: 12, background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 12 }, children: [_jsx("h3", { style: { fontSize: 13, fontWeight: 600, margin: '0 0 10px 0' }, children: "\uD83D\uDCCB \u53EF\u7528\u5DE5\u5177\uFF08\u70B9\u51FB\u6DFB\u52A0\uFF09" }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 4 }, children: [tools.map(function (t) {
                                                return (_jsxs("div", { onClick: function () { addToolToNode(t); }, style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--bg-input)', borderRadius: 4, cursor: 'pointer', border: '1px solid var(--border)' }, children: [_jsx("span", { style: { fontSize: 12 }, children: t.name }), _jsx("span", { style: { fontSize: 9, padding: '1px 5px', borderRadius: 3, background: t.type === 'plugin' ? 'var(--blue-bg)' : t.type === 'skill' ? 'var(--green-bg)' : 'var(--purple-bg)', color: t.type === 'plugin' ? 'var(--blue)' : t.type === 'skill' ? 'var(--green)' : 'var(--purple)' }, children: t.type })] }, t.id));
                                            }), tools.length === 0 && _jsx("p", { style: { fontSize: 12, color: 'var(--text-dim)' }, children: "\u8BF7\u5148\u5728\u5DE5\u5177\u5E93\u521B\u5EFA\u5DE5\u5177" })] })] })), _jsxs("div", { style: { padding: 12, background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 12 }, children: [_jsxs("h3", { style: { fontSize: 13, fontWeight: 600, margin: '0 0 8px 0' }, children: ["\uD83D\uDD00 \u5F53\u524D\u8282\u70B9\uFF08", nodes.length, "\uFF09"] }), nodes.map(function (n) {
                                        return (_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: 'var(--bg-input)', borderRadius: 4, marginBottom: 4 }, children: [_jsx("span", { style: { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', minWidth: 30 }, children: n.id }), _jsx("span", { style: { fontSize: 12, flex: 1 }, children: n.label || n.id }), _jsx("span", { style: { fontSize: 9, color: 'var(--text-dim)' }, children: n.tool_type || '-' }), _jsx("button", { onClick: function () { removeNode(n.id); }, style: { padding: 2, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)' }, children: _jsx(Trash2, { size: 12 }) })] }, n.id));
                                    }), nodes.length === 0 && _jsx("p", { style: { fontSize: 11, color: 'var(--text-dim)' }, children: "\u70B9\u51FB\u5DE6\u4FA7\u5DE5\u5177\u6DFB\u52A0\u6216\u5199 Markdown \u81EA\u52A8\u89E3\u6790" })] }), _jsxs("div", { style: { padding: 12, background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 12 }, children: [_jsxs("h3", { style: { fontSize: 13, fontWeight: 600, margin: '0 0 8px 0' }, children: ["\uD83D\uDD17 \u8FDE\u7EBF\uFF08", edges.length, "\uFF09"] }), _jsxs("div", { style: { display: 'flex', gap: 6, marginBottom: 8 }, children: [_jsxs("select", { value: newEdge.from, onChange: function (e) { setNewEdge({ from: e.target.value, to: newEdge.to, type: newEdge.type }); }, style: { ...inp, flex: 1 }, children: [_jsx("option", { value: "", children: "\u4ECE" }), nodes.map(function (n) { return _jsx("option", { value: n.id, children: n.label || n.id }, n.id); })] }), _jsxs("select", { value: newEdge.to, onChange: function (e) { setNewEdge({ from: newEdge.from, to: e.target.value, type: newEdge.type }); }, style: { ...inp, flex: 1 }, children: [_jsx("option", { value: "", children: "\u5230" }), nodes.map(function (n) { return _jsx("option", { value: n.id, children: n.label || n.id }, n.id); })] }), _jsxs("select", { value: newEdge.type, onChange: function (e) { setNewEdge({ from: newEdge.from, to: newEdge.to, type: e.target.value }); }, style: { ...inp, width: 80 }, children: [_jsx("option", { value: "sequential", children: "\u987A\u5E8F" }), _jsx("option", { value: "if-else", children: "IF" }), _jsx("option", { value: "parallel", children: "\u5E76\u884C" })] }), _jsx("button", { onClick: addEdge, disabled: !newEdge.from || !newEdge.to, style: { padding: '8px 12px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11, opacity: newEdge.from && newEdge.to ? 1 : 0.5 }, children: "+" })] }), edges.map(function (e, i) {
                                        var fn = nodes.find(function (n) { return n.id === e.from; });
                                        var tn = nodes.find(function (n) { return n.id === e.to; });
                                        return _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 4, padding: '4px 6px', background: 'var(--bg-input)', borderRadius: 3, marginBottom: 3, fontSize: 11 }, children: [_jsx("span", { style: { fontFamily: 'var(--font-mono)' }, children: (fn?.label || e.from) }), _jsxs("span", { style: { fontSize: 9, padding: '1px 4px', borderRadius: 2, background: e.type === 'if-else' ? 'var(--orange-bg)' : e.type === 'parallel' ? 'var(--purple-bg)' : 'var(--blue-bg)', color: e.type === 'if-else' ? 'var(--orange)' : e.type === 'parallel' ? 'var(--purple)' : 'var(--blue)' }, children: [e.type === 'if-else' ? _jsx(GitFork, { size: 9 }) : _jsx(ArrowRight, { size: 9 }), e.type === 'if-else' ? 'IF' : e.type === 'parallel' ? '||' : '→'] }), _jsx("span", { style: { fontFamily: 'var(--font-mono)' }, children: (tn?.label || e.to) }), _jsx("button", { onClick: function () { setEdges(edges.filter(function (_, j) { return j !== i; })); }, style: { padding: 1, marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)' }, children: _jsx(Trash2, { size: 10 }) })] }, i);
                                    })] }), _jsxs("div", { style: { padding: 12, background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 12 }, children: [_jsxs("button", { onClick: function () { setShowSecurity(!showSecurity); }, style: { display: 'flex', alignItems: 'center', gap: 6, width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', padding: 0 }, children: [showSecurity ? _jsx(ChevronDown, { size: 12 }) : _jsx(ChevronRight, { size: 12 }), _jsx(ShieldAlert, { size: 14 }), " \uD83D\uDEE1\uFE0F \u5B89\u5168\u95F8\u95E8", !showSecurity && _jsx("span", { style: { fontSize: 10, color: 'var(--text-dim)', fontWeight: 400 }, children: "\uFF08\u9ED8\u8BA4: \u8F6F800k, \u786C1M, I/O-none\uFF09" })] }), showSecurity && (_jsxs("div", { style: { marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }, children: [_jsx("input", { value: gate.pre, onChange: function (e) { setGate({ ...gate, pre: e.target.value }); }, style: inp, placeholder: "\u524D\u7F6E\u6821\u9A8C\u89C4\u5219\uFF08\u9ED8\u8BA4: \u65E0\uFF09" }), _jsx("input", { value: gate.post, onChange: function (e) { setGate({ ...gate, post: e.target.value }); }, style: inp, placeholder: "\u540E\u7F6E\u6821\u9A8C\u89C4\u5219\uFF08\u9ED8\u8BA4: \u65E0\uFF09" }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }, children: [_jsxs("select", { value: gate.io, onChange: function (e) { setGate({ ...gate, io: e.target.value }); }, style: inp, children: [_jsx("option", { value: "none", children: "I/O\u4E0D\u8FC7\u6EE4" }), _jsx("option", { value: "sanitize", children: "\u57FA\u7840" }), _jsx("option", { value: "strict", children: "\u4E25\u683C" })] }), _jsx("input", { type: "number", value: token.soft, onChange: function (e) { setToken({ ...token, soft: parseInt(e.target.value) || 0 }); }, style: inp, placeholder: "\u8F6F\u9650\u5236" }), _jsx("input", { type: "number", value: token.hard, onChange: function (e) { setToken({ ...token, hard: parseInt(e.target.value) || 0 }); }, style: inp, placeholder: "\u786C\u9650\u5236" })] })] }))] })] })] }), _jsxs("div", { style: { display: 'flex', gap: 8, marginTop: 16 }, children: [_jsxs("button", { onClick: handleSave, disabled: nodes.length === 0, style: { ...btn1, opacity: nodes.length > 0 ? 1 : 0.5 }, children: [_jsx(Save, { size: 14 }), " \u521B\u5EFA\u5DE5\u4F5C\u6D41"] }), _jsx("button", { onClick: onBack, style: btn2, children: "\u53D6\u6D88" })] })] }));
}
