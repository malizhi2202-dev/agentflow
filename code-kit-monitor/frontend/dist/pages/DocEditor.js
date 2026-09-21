import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Save, FileText, RefreshCw, Edit3 } from 'lucide-react';
import { cn, useFileNames } from '../hooks/useFileNames';
import { useAuth } from '../stores/auth';
export default function DocEditor() {
    const { isAdmin, rolePermissions } = useAuth();
    const canWrite = isAdmin || rolePermissions.includes('project:write');
    const [files, setFiles] = useState([]);
    const [selected, setSelected] = useState('');
    const [content, setContent] = useState('');
    const [original, setOriginal] = useState('');
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(false);
    const [editingName, setEditingName] = useState(false);
    const [customName, setCustomName] = useState('');
    const { map: nameMap, fetch: fetchNames } = useFileNames();
    useEffect(() => {
        fetchNames();
        fetch('/api/admin/files').then(r => r.json()).then(d => setFiles(d.files || []));
    }, []);
    const displayName = (path) => cn(path, nameMap);
    const openFile = async (path) => {
        setLoading(true);
        setSelected(path);
        setEditingName(false);
        setCustomName(nameMap[path] || '');
        const res = await fetch(`/api/admin/files/${encodeURIComponent(path)}`);
        const data = await res.json();
        setContent(data.content);
        setOriginal(data.content);
        setLoading(false);
        setSaved(false);
    };
    const saveFile = async () => {
        await fetch(`/api/admin/files/${encodeURIComponent(selected)}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }),
        });
        setOriginal(content);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };
    const saveCustomName = async () => {
        const updated = { ...nameMap, [selected]: customName || selected.split('/').pop() || selected };
        useFileNames.setState({ map: updated });
        await fetch('/api/admin/file-names', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
        setEditingName(false);
    };
    const isModified = content !== original;
    const groups = {};
    const GROUP_NAMES = { prompts: '阶段流程', templates: '工件模板', reference: '参考文档', root: '核心文件' };
    files.forEach(f => {
        const dir = f.path.includes('/') ? f.path.split('/')[0] : 'root';
        if (!groups[dir])
            groups[dir] = [];
        groups[dir].push(f);
    });
    return (_jsxs("div", { style: { display: 'flex', height: '100%' }, children: [_jsx("div", { style: { width: 280, flexShrink: 0, borderRight: '1px solid var(--border)', overflow: 'auto', padding: 10 }, children: Object.entries(groups).map(([group, items]) => (_jsxs("div", { style: { marginBottom: 14 }, children: [_jsxs("div", { style: { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', padding: '4px 8px', textTransform: 'uppercase', letterSpacing: '0.04em' }, children: [GROUP_NAMES[group] || group, _jsx("span", { style: { fontWeight: 400, marginLeft: 6, fontSize: 10 }, children: items.length })] }), items.map(f => {
                            const name = displayName(f.path);
                            const isEng = f.path.endsWith('.md') && !nameMap[f.path];
                            return (_jsxs("div", { onClick: () => openFile(f.path), style: {
                                    padding: '5px 8px 5px 16px', cursor: 'pointer', borderRadius: 'var(--r-sm)',
                                    fontSize: 12, color: selected === f.path ? 'var(--blue)' : isEng ? 'var(--text-muted)' : 'var(--text-secondary)',
                                    background: selected === f.path ? 'var(--bg-selected)' : 'transparent',
                                    display: 'flex', alignItems: 'center', gap: 6,
                                }, children: [_jsx(FileText, { size: 11, style: { flexShrink: 0, opacity: 0.5 } }), _jsx("span", { style: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: isEng ? 'var(--font-mono)' : 'var(--font)' }, children: name }), isEng && _jsx("span", { style: { fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }, children: "EN" })] }, f.path));
                        })] }, group))) }), _jsx("div", { style: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }, children: selected ? (_jsxs(_Fragment, { children: [_jsxs("div", { style: { padding: '8px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }, children: [_jsx("div", { style: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }, children: editingName ? (_jsxs("div", { style: { display: 'flex', gap: 4 }, children: [_jsx("input", { value: customName, onChange: e => setCustomName(e.target.value), style: { width: 160, padding: '3px 8px', fontSize: 12 }, placeholder: "\u4E2D\u6587\u540D" }), _jsx("button", { className: "btn btn-primary btn-xs", onClick: saveCustomName, children: "\u4FDD\u5B58" }), _jsx("button", { className: "btn btn-ghost btn-xs", onClick: () => setEditingName(false), children: "\u53D6\u6D88" })] })) : (_jsxs(_Fragment, { children: [_jsx("span", { style: { fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: displayName(selected) }), _jsx("button", { className: "btn btn-ghost btn-xs", onClick: () => { setCustomName(nameMap[selected] || ''); setEditingName(true); }, title: "\u8BBE\u7F6E\u4E2D\u6587\u540D", children: _jsx(Edit3, { size: 10 }) }), _jsx("span", { style: { fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }, children: selected })] })) }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsxs("span", { className: "mono", style: { fontSize: 11, color: 'var(--text-muted)' }, children: [content.length.toLocaleString(), " \u5B57\u7B26"] }), isModified && _jsx("span", { style: { fontSize: 11, color: 'var(--orange)' }, children: "\u5DF2\u4FEE\u6539" }), saved && _jsx("span", { className: "badge badge-green", children: "\u5DF2\u4FDD\u5B58" }), canWrite && _jsx("button", { className: "btn btn-sm", onClick: () => openFile(selected), disabled: loading, children: _jsx(RefreshCw, { size: 12 }) }), canWrite && _jsxs("button", { className: "btn btn-primary btn-sm", onClick: saveFile, disabled: !isModified, children: [_jsx(Save, { size: 12 }), " \u4FDD\u5B58"] }), !canWrite && _jsx("span", { style: { fontSize: 11, color: 'var(--text-muted)' }, children: "\u53EA\u8BFB" })] })] }), _jsx("textarea", { value: content, onChange: e => canWrite && setContent(e.target.value), readOnly: !canWrite, style: { flex: 1, width: '100%', resize: 'none', border: 'none', borderRadius: 0, background: 'var(--bg-input)', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 1.7, padding: '12px 16px', outline: 'none', tabSize: 2, cursor: canWrite ? 'text' : 'default' }, spellCheck: false })] })) : (_jsx("div", { style: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }, children: _jsxs("div", { style: { textAlign: 'center' }, children: [_jsx(FileText, { size: 40, style: { marginBottom: 12, opacity: 0.1 } }), _jsx("p", { children: "\u2190 \u9009\u62E9\u6587\u4EF6\u5F00\u59CB\u7F16\u8F91" }), _jsx("p", { style: { fontSize: 12, marginTop: 4 }, children: "\u53EF\u76F4\u63A5\u7F16\u8F91 code-kit \u7684 prompts / templates / rules" }), _jsx("p", { style: { fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }, children: "\u70B9\u51FB\u6587\u4EF6\u540D\u65C1\u7684 \u270F\uFE0F \u53EF\u8BBE\u7F6E\u4E2D\u6587\u5C55\u793A\u540D" })] }) })) })] }));
}
