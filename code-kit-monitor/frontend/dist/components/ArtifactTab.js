import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Save, Edit3, X, FileText, ChevronRight } from 'lucide-react';
import { artifactName } from '../hooks/useFileNames';
import ConfirmDialog from './ConfirmDialog';
const STAGE_MAP = {
    'CHANGE.md': { stage: '0-change', name: '变更提案', order: 0 },
    'REQUIREMENT.md': { stage: '1-requirement', name: '需求分析', order: 1 },
    'DESIGN.md': { stage: '2-design', name: '技术设计', order: 2 },
    'UI-DESIGN.md': { stage: '2a-ui-design', name: 'UI 设计', order: 3 },
    'TASK.md': { stage: '3-task', name: '任务拆分', order: 4 },
    'TEST.md': { stage: '5-test', name: '测试验证', order: 6 },
    'REVIEW.md': { stage: '6-review', name: '代码审查', order: 7 },
};
const STAGE_COLORS = {
    '0-change': 'var(--blue)', '1-requirement': 'var(--green)', '2-design': 'var(--purple)',
    '2a-ui-design': 'var(--orange)', '3-task': 'var(--blue)', '4-dev': 'var(--blue)',
    '5-test': 'var(--green)', '6-review': 'var(--purple)', '7-integration': 'var(--text-muted)',
};
function getStageInfo(fname) {
    if (STAGE_MAP[fname])
        return STAGE_MAP[fname];
    if (fname.includes('-SUMMARY'))
        return { stage: '4-dev', name: '开发执行', order: 5 };
    return { stage: 'unknown', name: '其他', order: 99 };
}
export default function ArtifactTab({ changeId, artifacts }) {
    const [selected, setSelected] = useState('');
    const [content, setContent] = useState('');
    const [original, setOriginal] = useState('');
    const [editing, setEditing] = useState(false);
    const [editContent, setEditContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    // 分组排序
    const sorted = [...artifacts].sort((a, b) => {
        const sa = getStageInfo(a).order;
        const sb = getStageInfo(b).order;
        if (sa !== sb)
            return sa - sb;
        return a.localeCompare(b);
    });
    const load = async (fname) => {
        setSelected(fname);
        setLoading(true);
        setEditing(false);
        try {
            const res = await fetch(`/api/changes/${changeId}/${fname.replace('.md', '')}`);
            const data = await res.json();
            setContent(data.content);
            setOriginal(data.content);
            setEditContent(data.content);
        }
        catch {
            setContent('');
        }
        setLoading(false);
    };
    const startEdit = () => { setEditContent(content); setEditing(true); };
    const cancelEdit = () => { setEditing(false); setEditContent(content); };
    const promptSave = () => setShowConfirm(true);
    const doSave = async () => {
        const artifact = selected.replace('.md', '');
        const res = await fetch(`/api/changes/${changeId}/${artifact}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: editContent }),
        });
        if (res.ok) {
            setContent(editContent);
            setOriginal(editContent);
            setEditing(false);
            setShowConfirm(false);
        }
    };
    const isModified = editContent !== original;
    const info = selected ? getStageInfo(selected) : null;
    const isMd = selected.endsWith('.md');
    return (_jsxs("div", { style: { display: 'flex', gap: 0, minHeight: 'calc(100vh - 200px)' }, children: [_jsx("div", { style: { width: 240, flexShrink: 0, borderRight: '1px solid var(--border)', paddingRight: 12, overflow: 'auto' }, children: sorted.map(fname => {
                    const si = getStageInfo(fname);
                    const isSummary = fname.includes('-SUMMARY');
                    return (_jsxs("div", { onClick: () => load(fname), style: {
                            display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
                            borderRadius: 'var(--r-sm)', cursor: 'pointer', marginBottom: 2,
                            background: selected === fname ? 'var(--bg-selected)' : 'transparent',
                            color: selected === fname ? 'var(--text)' : 'var(--text-secondary)',
                            fontSize: 12, fontFamily: 'var(--font-mono)',
                        }, children: [_jsx("span", { style: { width: 6, height: 6, borderRadius: '50%', background: STAGE_COLORS[si.stage] || 'var(--text-muted)', flexShrink: 0 } }), _jsx("span", { style: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font)' }, children: artifactName(fname) }), !isSummary && (_jsx("span", { style: { fontSize: 9, color: STAGE_COLORS[si.stage] || 'var(--text-muted)', fontFamily: 'var(--font)', whiteSpace: 'nowrap' }, children: si.stage }))] }, fname));
                }) }), _jsx("div", { style: { flex: 1, paddingLeft: 16, overflow: 'auto' }, children: !selected ? (_jsxs("div", { style: { textAlign: 'center', paddingTop: 60, color: 'var(--text-muted)' }, children: [_jsx(FileText, { size: 36, style: { marginBottom: 12, opacity: 0.15 } }), _jsx("p", { children: "\u2190 \u9009\u62E9\u4EA7\u7269\u6587\u4EF6\u67E5\u770B" })] })) : loading ? (_jsx("p", { style: { color: 'var(--text-muted)' }, children: "\u52A0\u8F7D\u4E2D..." })) : (_jsxs("div", { children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("span", { style: { fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 600 }, children: selected }), info && (_jsxs("span", { className: "badge", style: {
                                                background: (STAGE_COLORS[info.stage] || 'var(--text-muted)') + '20',
                                                color: STAGE_COLORS[info.stage] || 'var(--text-muted)',
                                                fontSize: 10,
                                            }, children: [_jsx(ChevronRight, { size: 10 }), info.stage, " \u00B7 ", info.name] })), _jsxs("span", { style: { fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }, children: [content.length.toLocaleString(), " \u5B57\u7B26"] })] }), _jsx("div", { style: { display: 'flex', gap: 6 }, children: editing ? (_jsxs(_Fragment, { children: [_jsxs("button", { className: "btn btn-sm", onClick: cancelEdit, children: [_jsx(X, { size: 12 }), " \u53D6\u6D88"] }), _jsxs("button", { className: "btn btn-primary btn-sm", onClick: promptSave, disabled: !isModified, children: [_jsx(Save, { size: 12 }), " \u4FDD\u5B58"] })] })) : (_jsxs("button", { className: "btn btn-sm", onClick: startEdit, children: [_jsx(Edit3, { size: 12 }), " \u7F16\u8F91"] })) })] }), editing ? (_jsx("textarea", { value: editContent, onChange: e => setEditContent(e.target.value), style: {
                                width: '100%', minHeight: 'calc(100vh - 320px)',
                                background: 'var(--bg-input)', color: 'var(--text)',
                                fontFamily: isMd ? 'var(--font-mono)' : 'var(--font)',
                                fontSize: 13, lineHeight: 1.7, padding: '12px 16px',
                                border: '1px solid var(--border)', borderRadius: 'var(--r-md)',
                                resize: 'vertical', outline: 'none', tabSize: 2,
                            }, spellCheck: false })) : (_jsx("div", { className: "card", style: {
                                fontFamily: 'var(--font)', fontSize: 14, lineHeight: 1.8,
                                color: 'var(--text)', maxHeight: 'calc(100vh - 300px)', overflow: 'auto',
                            }, children: _jsx(ReactMarkdown, { children: content }) }))] })) }), _jsx(ConfirmDialog, { open: showConfirm, title: "\u4FDD\u5B58\u4FEE\u6539", message: `确定要将修改写入 ${selected}？此操作会直接修改 .specs/ 下的源文件。`, onConfirm: doSave, onCancel: () => setShowConfirm(false) })] }));
}
