import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { FileText, Save, X, Edit3, ChevronRight, FolderOpen } from 'lucide-react';
import { artifactName } from '../hooks/useFileNames';
import { useAuth } from '../stores/auth';
const STAGES = [
    { id: '0-change', name: '变更提案', file: 'CHANGE.md' },
    { id: '1-requirement', name: '需求分析', file: 'REQUIREMENT.md' },
    { id: '2-design', name: '技术设计', file: 'DESIGN.md' },
    { id: '2a-ui-design', name: 'UI 设计', file: 'UI-DESIGN.md' },
    { id: '3-task', name: '任务拆分', file: 'TASK.md' },
    { id: '4-dev', name: '开发执行', file: null },
    { id: '5-test', name: '测试验证', file: 'TEST.md' },
    { id: '6-review', name: '代码审查', file: 'REVIEW.md' },
    { id: '7-integration', name: '集成归档', file: null },
];
const STAGE_COLORS = {
    '0-change': 'var(--blue)', '1-requirement': 'var(--green)', '2-design': 'var(--purple)',
    '2a-ui-design': 'var(--orange)', '3-task': 'var(--blue)', '4-dev': 'var(--info)',
    '5-test': 'var(--green)', '6-review': 'var(--purple)', '7-integration': 'var(--text-muted)',
};
export default function SpecsEditor({ onSelect }) {
    const { isAdmin, rolePermissions } = useAuth();
    const canWrite = isAdmin || rolePermissions.includes('project:write');
    const [changes, setChanges] = useState([]);
    const [activeStage, setActiveStage] = useState('0-change');
    const [openFile, setOpenFile] = useState(null);
    const [content, setContent] = useState('');
    const [editing, setEditing] = useState(false);
    const [editText, setEditText] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    useEffect(() => {
        fetch('/api/changes').then(r => r.json()).then(d => setChanges(d.changes || [])).catch(() => { });
    }, []);
    // 当前选中阶段的所有产物
    const stageArtifacts = [];
    const stageDef = STAGES.find(s => s.id === activeStage);
    changes.forEach((c) => {
        (c.artifacts || []).forEach((a) => {
            if (!a.endsWith('.md'))
                return;
            const isSummary = a.includes('-SUMMARY');
            const stageFile = stageDef?.file;
            const matches = isSummary ? activeStage === '4-dev' : (stageFile && a.toUpperCase().includes(stageFile.replace('.md', '').toUpperCase()));
            if (matches)
                stageArtifacts.push({ changeId: c.id, fname: a, phase: c.phase_name });
        });
    });
    const loadFile = async (changeId, fname) => {
        setOpenFile({ changeId, fname });
        setLoading(true);
        setEditing(false);
        setErrorMsg('');
        try {
            const res = await fetch(`/api/changes/${changeId}/${fname.replace('.md', '')}`);
            if (!res.ok) {
                if (res.status === 404) {
                    setContent('');
                    setErrorMsg('文件不存在');
                }
                else {
                    setContent('');
                    setErrorMsg(`请求失败 (${res.status})`);
                }
            }
            else {
                const data = await res.json();
                setContent(data.content);
                setEditText(data.content);
            }
        }
        catch {
            setContent('');
            setErrorMsg('网络请求失败，请确认后端已启动');
        }
        setLoading(false);
    };
    const saveFile = async () => {
        if (!openFile)
            return;
        await fetch(`/api/changes/${openFile.changeId}/${openFile.fname.replace('.md', '')}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: editText }),
        });
        setContent(editText);
        setEditing(false);
    };
    return (_jsxs("div", { style: { display: 'flex', height: '100%' }, children: [_jsxs("div", { style: { width: 200, flexShrink: 0, borderRight: '1px solid var(--border)', overflow: 'auto', padding: '12px 0' }, children: [_jsxs("div", { style: { padding: '0 12px 8px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }, children: [_jsx(FolderOpen, { size: 11, style: { marginRight: 4, verticalAlign: 'middle' } }), " \u9636\u6BB5"] }), STAGES.map((stage, i) => {
                        const active = activeStage === stage.id;
                        const hasContent = stageArtifacts.length > 0 || stage.id === activeStage;
                        return (_jsxs("div", { style: { display: 'flex' }, children: [_jsxs("div", { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: 28, paddingTop: 6, flexShrink: 0 }, children: [_jsx("div", { style: { width: 8, height: 8, borderRadius: '50%', background: active ? STAGE_COLORS[stage.id] : 'var(--text-muted)', opacity: hasContent ? 1 : 0.3 } }), i < STAGES.length - 1 && _jsx("div", { style: { width: 1, flex: 1, minHeight: 12, background: 'var(--border)' } })] }), _jsxs("button", { onClick: () => setActiveStage(stage.id), style: {
                                        flex: 1, textAlign: 'left', padding: '5px 8px', marginBottom: 2,
                                        background: active ? 'var(--bg-selected)' : 'transparent',
                                        border: 'none', borderRadius: 'var(--r-sm)',
                                        color: active ? 'var(--text)' : 'var(--text-secondary)',
                                        cursor: 'pointer', fontSize: 11,
                                        fontWeight: active ? 600 : 400, opacity: hasContent ? 1 : 0.4,
                                    }, children: [_jsx("span", { style: { fontFamily: 'var(--font)', fontSize: 12 }, children: stage.name }), _jsx("br", {}), _jsx("span", { style: { fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 400 }, children: stage.id })] })] }, stage.id));
                    })] }), _jsxs("div", { style: { width: 320, flexShrink: 0, borderRight: '1px solid var(--border)', overflow: 'auto', padding: 12 }, children: [_jsxs("div", { style: { fontSize: 13, fontWeight: 600, marginBottom: 10, fontFamily: 'var(--font-mono)' }, children: [STAGES.find(s => s.id === activeStage)?.name, _jsxs("span", { style: { fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }, children: [stageArtifacts.length, " \u4E2A\u6587\u4EF6"] })] }), stageArtifacts.length === 0 ? (_jsx("p", { style: { fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }, children: "\u6B64\u9636\u6BB5\u6682\u65E0\u4EA7\u7269" })) : (stageArtifacts.map(a => {
                        const key = `${a.changeId}/${a.fname}`;
                        const isActive = openFile?.changeId === a.changeId && openFile?.fname === a.fname;
                        return (_jsxs("div", { style: {
                                padding: '10px', marginBottom: 6,
                                borderRadius: 'var(--r-md)', border: '1px solid var(--border)',
                                background: isActive ? 'var(--bg-selected)' : 'var(--bg-card)',
                            }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }, children: [_jsx(FileText, { size: 13, style: { color: STAGE_COLORS[activeStage], flexShrink: 0 } }), _jsx("span", { style: { fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }, children: artifactName(a.fname) })] }), _jsxs("div", { style: { fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 8 }, children: [a.changeId, " \u00B7 ", a.phase] }), _jsxs("div", { style: { display: 'flex', gap: 6 }, children: [_jsxs("button", { onClick: (e) => { e.stopPropagation(); onSelect(a.changeId); }, className: "btn btn-sm", style: { flex: 1, justifyContent: 'center', fontSize: 11 }, children: [_jsx(ChevronRight, { size: 12 }), " \u5DE5\u4F5C\u6D41"] }), _jsxs("button", { onClick: (e) => { e.stopPropagation(); loadFile(a.changeId, a.fname); }, className: `btn btn-sm ${isActive ? 'btn-primary' : ''}`, style: { flex: 1, justifyContent: 'center', fontSize: 11 }, children: [_jsx(Edit3, { size: 12 }), " \u7F16\u8F91"] })] })] }, key));
                    }))] }), _jsx("div", { style: { flex: 1, overflow: 'auto', padding: '16px 20px' }, children: !openFile ? (_jsxs("div", { style: { textAlign: 'center', paddingTop: 80, color: 'var(--text-muted)' }, children: [_jsx(FileText, { size: 40, style: { marginBottom: 12, opacity: 0.1 } }), _jsx("p", { style: { fontSize: 14 }, children: "\u9009\u62E9\u5DE6\u4FA7\u9636\u6BB5 \u2192 \u70B9\u51FB\u4E2D\u95F4\u4EA7\u7269\u6587\u4EF6" }), _jsx("p", { style: { fontSize: 12, marginTop: 4 }, children: "\u6BCF\u4E2A\u6587\u4EF6\u6807\u6CE8\u4E86\u6240\u5C5E Change \u548C\u9636\u6BB5\uFF0C\u652F\u6301\u67E5\u770B\u4E0E\u7F16\u8F91" })] })) : loading ? (_jsx("p", { style: { color: 'var(--text-muted)' }, children: "\u52A0\u8F7D\u4E2D..." })) : errorMsg ? (_jsxs("div", { style: { textAlign: 'center', paddingTop: 60, color: 'var(--text-muted)' }, children: [_jsx("p", { style: { fontSize: 16, color: 'var(--red)', marginBottom: 8 }, children: errorMsg }), _jsx("p", { style: { fontSize: 12 }, children: "\u8BF7\u786E\u8BA4\u6587\u4EF6\u5B58\u5728\u4E8E .specs/ \u76EE\u5F55\u4E2D" })] })) : (_jsxs("div", { children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("span", { style: { fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600 }, children: openFile.fname }), _jsxs("span", { className: "badge", style: { background: (STAGE_COLORS[activeStage] || 'var(--text-muted)') + '20', color: STAGE_COLORS[activeStage] }, children: [activeStage, " \u00B7 ", STAGES.find(s => s.id === activeStage)?.name] }), _jsxs("span", { style: { fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }, children: [openFile.changeId, " \u00B7 ", content.length.toLocaleString(), " \u5B57\u7B26"] })] }), _jsx("div", { style: { display: 'flex', gap: 6 }, children: editing ? (_jsxs(_Fragment, { children: [_jsxs("button", { className: "btn btn-sm", onClick: () => { setEditing(false); setEditText(content); }, children: [_jsx(X, { size: 12 }), " \u53D6\u6D88"] }), canWrite && _jsxs("button", { className: "btn btn-primary btn-sm", onClick: saveFile, children: [_jsx(Save, { size: 12 }), " \u4FDD\u5B58"] })] })) : canWrite ? (_jsxs("button", { className: "btn btn-sm", onClick: () => { setEditText(content); setEditing(true); }, children: [_jsx(Edit3, { size: 12 }), " \u7F16\u8F91"] })) : null })] }), editing ? (_jsx("textarea", { value: editText, onChange: e => setEditText(e.target.value), style: { width: '100%', minHeight: 'calc(100vh - 260px)', background: 'var(--bg-input)', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 1.7, padding: 12, border: '1px solid var(--border)', borderRadius: 'var(--r-md)', resize: 'vertical', outline: 'none' } })) : (_jsx("div", { className: "card", style: { fontFamily: 'var(--font)', fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap' }, children: content }))] })) })] }));
}
