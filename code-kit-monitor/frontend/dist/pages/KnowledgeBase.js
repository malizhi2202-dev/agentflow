import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useRef, useCallback } from 'react';
import { BookOpen, Plus, Trash2, Database, Globe, Server, Network, Cable, RefreshCw, CheckCircle, XCircle, FolderOpen, Upload, Loader2, Tag } from 'lucide-react';
import { useKnowledge } from '../stores/knowledge';
import { useAgents } from '../stores/agents';
import ConfirmDialog from '../components/ConfirmDialog';
// Brain icon fallback
const BrainIcon = ({ size = 14 }) => _jsx("span", { style: { fontSize: size, lineHeight: 1 }, children: "\uD83E\uDDE0" });
const SOURCE_TYPE_CONFIG = {
    rag_api: { label: 'RAG API', icon: _jsx(BrainIcon, { size: 14 }) },
    mysql: { label: 'MySQL', icon: _jsx(Database, { size: 14 }) },
    postgres: { label: 'PostgreSQL', icon: _jsx(Database, { size: 14 }) },
    redis: { label: 'Redis', icon: _jsx(Server, { size: 14 }) },
    http_api: { label: 'HTTP API', icon: _jsx(Globe, { size: 14 }) },
    url_crawl: { label: 'URL 抓取', icon: _jsx(Network, { size: 14 }) },
    local_file: { label: '本地文件', icon: _jsx(FolderOpen, { size: 14 }) },
};
function sourceTypeIcon(type) {
    const cfg = SOURCE_TYPE_CONFIG[type];
    if (cfg)
        return cfg.icon;
    const icons = {
        rag_api: '🧠', mysql: '🐬', postgres: '🐘', redis: '🔴', http_api: '🌐', url_crawl: '🕸️', local_file: '📂',
    };
    return _jsx("span", { style: { fontSize: 14 }, children: icons[type] || '📁' });
}
function sourceTypeLabel(type) {
    const cfg = SOURCE_TYPE_CONFIG[type];
    return cfg ? cfg.label : type;
}
const STATUS_CONFIG = {
    uploading: { label: '上传中', color: '#f59e0b', progress: 10 },
    processing: { label: '解析中', color: '#3b82f6', progress: 35 },
    indexing: { label: '索引中', color: '#8b5cf6', progress: 70 },
    indexed: { label: '已完成', color: '#10b981', progress: 100 },
    failed: { label: '失败', color: '#ef4444', progress: 0 },
};
export default function KnowledgeBase() {
    const { agents, fetchAgents } = useAgents();
    const { sources, loading, fetchKnowledgeSources, createSource, deleteSource, testSource, uploadFile, getSourceStatus, tags, fetchTags, createTag, deleteTag, addSourceTag, removeSourceTag } = useKnowledge();
    const [selectedAgentId, setSelectedAgentId] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [testingId, setTestingId] = useState(null);
    const [testResult, setTestResult] = useState({});
    // 标签状态
    const [selectedTag, setSelectedTag] = useState(null);
    const [showTagModal, setShowTagModal] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState('#3b82f6');
    const [tagError, setTagError] = useState('');
    // 表单状态
    const [formName, setFormName] = useState('');
    const [formType, setFormType] = useState('http_api');
    const [formUrl, setFormUrl] = useState('');
    const [formConfigJson, setFormConfigJson] = useState('');
    const [formError, setFormError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    // 文件上传状态
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const fileInputRef = useRef(null);
    // 轮询状态
    const [statusPolling, setStatusPolling] = useState({});
    useEffect(() => {
        fetchAgents();
        fetchTags();
    }, []);
    useEffect(() => {
        if (selectedAgentId) {
            fetchKnowledgeSources(selectedAgentId, selectedTag || undefined);
        }
    }, [selectedAgentId, selectedTag]);
    // 轮询处理中的资料源状态
    useEffect(() => {
        if (!selectedAgentId)
            return;
        const processingSources = sources.filter((s) => s.status && ['uploading', 'processing', 'indexing'].includes(s.status));
        if (processingSources.length === 0)
            return;
        const timer = setInterval(async () => {
            for (const src of processingSources) {
                const status = await getSourceStatus(selectedAgentId, src.id);
                if (status) {
                    setStatusPolling((prev) => ({ ...prev, [src.id]: status }));
                }
            }
            // Refresh full list
            fetchKnowledgeSources(selectedAgentId);
        }, 3000);
        return () => clearInterval(timer);
    }, [selectedAgentId, sources]);
    const handleAdd = async () => {
        setFormError('');
        if (!formName.trim()) {
            setFormError('请输入资料源名称');
            return;
        }
        if (!formUrl.trim()) {
            setFormError('请输入 URL');
            return;
        }
        let configJson = {};
        if (formConfigJson.trim()) {
            try {
                configJson = JSON.parse(formConfigJson);
            }
            catch {
                setFormError('config_json 格式错误，请输入有效的 JSON');
                return;
            }
        }
        setSubmitting(true);
        try {
            const result = await createSource(selectedAgentId, {
                name: formName.trim(),
                source_type: formType,
                url: formUrl.trim(),
                config_json: configJson,
                enabled: true,
            });
            if (result) {
                setShowModal(false);
                resetForm();
            }
            else {
                setFormError('创建失败，请重试');
            }
        }
        catch {
            setFormError('创建失败，请检查网络连接');
        }
        finally {
            setSubmitting(false);
        }
    };
    const resetForm = () => {
        setFormName('');
        setFormType('http_api');
        setFormUrl('');
        setFormConfigJson('');
        setFormError('');
    };
    // 文件上传处理
    const handleFileUpload = useCallback(async (file) => {
        if (!selectedAgentId)
            return;
        setUploadError('');
        setUploading(true);
        try {
            const result = await uploadFile(selectedAgentId, file, file.name, '');
            if (result) {
                // 自动开始轮询状态
                const status = await getSourceStatus(selectedAgentId, result.id);
                if (status) {
                    setStatusPolling((prev) => ({ ...prev, [result.id]: status }));
                }
            }
            else {
                setUploadError('上传失败，请重试');
            }
        }
        catch {
            setUploadError('上传失败，请检查网络连接');
        }
        finally {
            setUploading(false);
        }
    }, [selectedAgentId, uploadFile, getSourceStatus]);
    const handleDragOver = (e) => {
        e.preventDefault();
        setDragOver(true);
    };
    const handleDragLeave = (e) => {
        e.preventDefault();
        setDragOver(false);
    };
    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            const ext = '.' + file.name.split('.').pop()?.toLowerCase();
            if (!['.pdf', '.docx', '.txt', '.md', '.py', '.js', '.json'].includes(ext)) {
                setUploadError(`不支持的文件类型: ${ext}，支持: PDF/DOCX/TXT/MD/PY/JS/JSON`);
                return;
            }
            handleFileUpload(file);
        }
    };
    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileUpload(file);
        }
        if (fileInputRef.current)
            fileInputRef.current.value = '';
    };
    const handleTest = async (sourceId) => {
        if (!selectedAgentId)
            return;
        setTestingId(sourceId);
        try {
            const result = await testSource(selectedAgentId, sourceId);
            if (result) {
                setTestResult((prev) => ({ ...prev, [sourceId]: result }));
                fetchKnowledgeSources(selectedAgentId);
            }
        }
        finally {
            setTestingId(null);
        }
    };
    const handleDelete = async () => {
        if (!selectedAgentId || deleteId === null)
            return;
        await deleteSource(selectedAgentId, deleteId);
        setDeleteId(null);
    };
    // 标签处理
    const handleCreateTag = async () => {
        setTagError('');
        if (!newTagName.trim()) {
            setTagError('请输入标签名称');
            return;
        }
        const result = await createTag(newTagName.trim(), newTagColor);
        if (result) {
            setShowTagModal(false);
            setNewTagName('');
            setNewTagColor('#3b82f6');
        }
        else {
            setTagError('创建标签失败');
        }
    };
    const handleTagClick = (tagName) => {
        if (selectedTag === tagName) {
            setSelectedTag(null); // 取消过滤
        }
        else {
            setSelectedTag(tagName);
        }
    };
    const handleAddTagToSource = async (sourceId, tagId) => {
        await addSourceTag(sourceId, tagId);
        // 刷新列表
        if (selectedAgentId) {
            fetchKnowledgeSources(selectedAgentId, selectedTag || undefined);
        }
    };
    const handleRemoveTagFromSource = async (sourceId, tagId) => {
        await removeSourceTag(sourceId, tagId);
        if (selectedAgentId) {
            fetchKnowledgeSources(selectedAgentId, selectedTag || undefined);
        }
    };
    const statusIndicator = (src) => {
        // 如果是处理中的本地文件，显示进度
        if (src.source_type === 'local_file' && src.status && ['uploading', 'processing', 'indexing'].includes(src.status)) {
            const cfg = STATUS_CONFIG[src.status] || { label: src.status, color: '#6b7280', progress: 30 };
            return (_jsxs("div", { style: { display: 'inline-flex', alignItems: 'center', gap: 6 }, children: [_jsx(Loader2, { size: 12, style: { animation: 'spin 1s linear infinite', color: cfg.color } }), _jsx("span", { style: { fontSize: 11, color: cfg.color }, children: cfg.label }), _jsx("div", { style: { width: 60, height: 4, background: 'var(--bg-input)', borderRadius: 2 }, children: _jsx("div", { style: { width: `${cfg.progress}%`, height: '100%', background: cfg.color, borderRadius: 2, transition: 'width 0.5s ease' } }) })] }));
        }
        if (src.status === 'indexed') {
            return (_jsxs("span", { style: { display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, padding: '1px 6px', borderRadius: 3, background: 'var(--color-success)', color: '#fff' }, children: [_jsx(CheckCircle, { size: 10 }), " \u5DF2\u7D22\u5F15"] }));
        }
        if (src.status === 'failed') {
            return (_jsxs("span", { style: { display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, padding: '1px 6px', borderRadius: 3, background: 'var(--color-danger)', color: '#fff' }, children: [_jsx(XCircle, { size: 10 }), " \u5904\u7406\u5931\u8D25"] }));
        }
        if (!src.enabled) {
            return _jsx("span", { style: { fontSize: 11, padding: '1px 6px', borderRadius: 3, background: 'var(--text-dim)', color: '#fff' }, children: "\u5DF2\u7981\u7528" });
        }
        if (src.last_test_ok === true) {
            return (_jsxs("span", { style: { display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, padding: '1px 6px', borderRadius: 3, background: 'var(--color-success)', color: '#fff' }, children: [_jsx(CheckCircle, { size: 10 }), " \u6D4B\u8BD5\u901A\u8FC7"] }));
        }
        if (src.last_test_ok === false) {
            return (_jsxs("span", { style: { display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, padding: '1px 6px', borderRadius: 3, background: 'var(--color-danger)', color: '#fff' }, children: [_jsx(XCircle, { size: 10 }), " \u6D4B\u8BD5\u5931\u8D25"] }));
        }
        return _jsx("span", { style: { fontSize: 11, padding: '1px 6px', borderRadius: 3, background: 'var(--color-success)', color: '#fff' }, children: "\u5DF2\u542F\u7528" });
    };
    const selectedAgent = agents.find((a) => a.id === selectedAgentId);
    return (_jsxs("div", { style: { padding: 24, height: '100%', overflow: 'auto' }, children: [_jsx("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10 }, children: [_jsx(BookOpen, { size: 22, color: "var(--color-primary)" }), _jsx("h1", { style: { fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, margin: 0 }, children: "\u77E5\u8BC6\u5E93" })] }) }), _jsxs("div", { style: { marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }, children: [_jsx("label", { style: { fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }, children: "\u9009\u62E9 Agent\uFF1A" }), _jsxs("select", { value: selectedAgentId ?? '', onChange: (e) => {
                            const id = e.target.value ? Number(e.target.value) : null;
                            setSelectedAgentId(id);
                            setTestResult({});
                            setStatusPolling({});
                        }, style: {
                            padding: '7px 12px',
                            borderRadius: 'var(--r-sm)',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-input)',
                            color: 'var(--text-primary)',
                            fontSize: 13,
                            minWidth: 260,
                        }, children: [_jsx("option", { value: "", children: "-- \u8BF7\u9009\u62E9 Agent --" }), agents.map((a) => (_jsx("option", { value: a.id, children: a.name }, a.id)))] })] }), selectedAgentId && (_jsx("div", { style: { marginBottom: 16 }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }, children: [_jsxs("button", { onClick: () => { resetForm(); setShowModal(true); }, style: {
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                padding: '8px 16px', background: 'var(--color-primary)', color: '#fff',
                                border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13,
                            }, children: [_jsx(Plus, { size: 14 }), " \u6DFB\u52A0\u8D44\u6599\u6E90"] }), _jsxs("button", { onClick: () => fileInputRef.current?.click(), disabled: uploading, style: {
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                padding: '8px 16px', background: 'var(--color-success)', color: '#fff',
                                border: 'none', borderRadius: 4, cursor: uploading ? 'wait' : 'pointer', fontSize: 13,
                                opacity: uploading ? 0.6 : 1,
                            }, children: [uploading ? _jsx(Loader2, { size: 14, style: { animation: 'spin 1s linear infinite' } }) : _jsx(Upload, { size: 14 }), "\u4E0A\u4F20\u6587\u4EF6"] }), _jsx("input", { ref: fileInputRef, type: "file", accept: ".pdf,.docx,.txt,.md,.py,.js,.json", onChange: handleFileSelect, style: { display: 'none' } }), selectedAgent && (_jsxs("span", { style: { marginLeft: 12, fontSize: 12, color: 'var(--text-dim)' }, children: ["\u5F53\u524D Agent: ", _jsx("strong", { children: selectedAgent.name })] }))] }) })), selectedAgentId && (_jsxs("div", { onDragOver: handleDragOver, onDragLeave: handleDragLeave, onDrop: handleDrop, style: {
                    border: `2px dashed ${dragOver ? 'var(--color-primary)' : 'var(--border)'}`,
                    borderRadius: 8,
                    padding: '20px 16px',
                    textAlign: 'center',
                    marginBottom: 16,
                    background: dragOver ? 'var(--blue-bg)' : 'var(--bg-card)',
                    transition: 'all var(--fast)',
                    cursor: 'pointer',
                }, onClick: () => fileInputRef.current?.click(), children: [_jsx(Upload, { size: 20, style: { color: 'var(--text-dim)', marginBottom: 8 } }), _jsx("p", { style: { fontSize: 13, color: 'var(--text-secondary)', margin: 0 }, children: "\u62D6\u62FD\u6587\u4EF6\u5230\u6B64\u5904\u4E0A\u4F20\uFF08PDF / DOCX / TXT / MD / PY / JS / JSON\uFF09" }), _jsx("p", { style: { fontSize: 11, color: 'var(--text-dim)', margin: '4px 0 0' }, children: "\u6216\u70B9\u51FB\u9009\u62E9\u6587\u4EF6" })] })), uploadError && (_jsx("div", { style: { padding: '8px 12px', borderRadius: 4, background: 'var(--red-bg)', color: 'var(--red)', fontSize: 12, marginBottom: 12 }, children: uploadError })), selectedAgentId && tags.length > 0 && (_jsxs("div", { style: { marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }, children: [_jsxs("span", { style: { fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginRight: 4 }, children: [_jsx(Tag, { size: 12, style: { marginRight: 4 } }), "\u6807\u7B7E\uFF1A"] }), tags.map((t) => (_jsxs("button", { onClick: () => handleTagClick(t.name), style: {
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '3px 10px',
                            borderRadius: 12,
                            border: selectedTag === t.name ? `2px solid ${t.color}` : '1px solid var(--border)',
                            background: selectedTag === t.name ? `${t.color}20` : 'var(--bg-input)',
                            color: selectedTag === t.name ? t.color : 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: selectedTag === t.name ? 600 : 400,
                            transition: 'all var(--fast)',
                        }, children: [_jsx("span", { style: { width: 8, height: 8, borderRadius: '50%', background: t.color, display: 'inline-block' } }), t.name, selectedTag === t.name && ' ✕'] }, t.id))), _jsxs("button", { onClick: () => { setShowTagModal(true); setNewTagName(''); setNewTagColor('#3b82f6'); setTagError(''); }, style: {
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '3px 10px',
                            borderRadius: 12,
                            border: '1px dashed var(--border)',
                            background: 'none',
                            color: 'var(--text-dim)',
                            cursor: 'pointer',
                            fontSize: 12,
                        }, title: "\u521B\u5EFA\u65B0\u6807\u7B7E", children: [_jsx(Plus, { size: 10 }), " \u6807\u7B7E"] })] })), showTagModal && (_jsx("div", { style: {
                    position: 'fixed', inset: 0, zIndex: 1100,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.5)',
                }, onClick: () => setShowTagModal(false), role: "dialog", "aria-modal": "true", "aria-label": "\u521B\u5EFA\u6807\u7B7E", children: _jsxs("div", { style: {
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-strong)',
                        borderRadius: 'var(--r-lg)',
                        padding: '24px 28px',
                        maxWidth: 400, width: '90%',
                        boxShadow: 'var(--shadow-md)',
                    }, onClick: (e) => e.stopPropagation(), children: [_jsx("h3", { style: { fontSize: 16, fontWeight: 700, marginBottom: 16 }, children: "\u521B\u5EFA\u6807\u7B7E" }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 12 }, children: [_jsxs("div", { children: [_jsx("label", { style: { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }, children: "\u540D\u79F0" }), _jsx("input", { type: "text", value: newTagName, onChange: (e) => setNewTagName(e.target.value), placeholder: "\u4F8B\u5982\uFF1A\u91CD\u8981\u3001\u6587\u6863\u3001API", style: {
                                                width: '100%', padding: '7px 10px',
                                                borderRadius: 'var(--r-sm)', border: '1px solid var(--border)',
                                                background: 'var(--bg-input)', color: 'var(--text-primary)',
                                                fontSize: 13, boxSizing: 'border-box',
                                            }, onKeyDown: (e) => { if (e.key === 'Enter')
                                                handleCreateTag(); } })] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }, children: "\u989C\u8272" }), _jsx("div", { style: { display: 'flex', gap: 6, flexWrap: 'wrap' }, children: ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'].map((c) => (_jsx("button", { onClick: () => setNewTagColor(c), style: {
                                                    width: 28, height: 28, borderRadius: '50%',
                                                    background: c,
                                                    border: newTagColor === c ? '3px solid var(--text-primary)' : '2px solid transparent',
                                                    cursor: 'pointer',
                                                    transition: 'all var(--fast)',
                                                } }, c))) })] }), tagError && (_jsx("div", { style: { padding: '8px 12px', borderRadius: 4, background: 'var(--red-bg)', color: 'var(--red)', fontSize: 12 }, children: tagError }))] }), _jsxs("div", { style: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }, children: [_jsx("button", { className: "btn", onClick: () => setShowTagModal(false), children: "\u53D6\u6D88" }), _jsx("button", { className: "btn btn-primary", onClick: handleCreateTag, children: "\u521B\u5EFA\u6807\u7B7E" })] })] }) })), !selectedAgentId ? (_jsxs("div", { style: { textAlign: 'center', padding: '60px 20px', color: 'var(--text-dim)' }, children: [_jsx(BookOpen, { size: 40, style: { opacity: 0.3, marginBottom: 12 } }), _jsx("p", { style: { fontSize: 14 }, children: "\u8BF7\u5148\u9009\u62E9\u4E00\u4E2A Agent \u4EE5\u7BA1\u7406\u5176\u77E5\u8BC6\u5E93\u8D44\u6599\u6E90" })] })) : loading ? (_jsx("p", { style: { color: 'var(--text-dim)' }, children: "\u52A0\u8F7D\u4E2D..." })) : sources.length === 0 ? (_jsxs("div", { style: { textAlign: 'center', padding: '60px 20px', color: 'var(--text-dim)' }, children: [_jsx(Database, { size: 40, style: { opacity: 0.3, marginBottom: 12 } }), _jsx("p", { style: { fontSize: 14 }, children: "\u8BE5 Agent \u6682\u65E0\u8D44\u6599\u6E90" }), _jsx("p", { style: { fontSize: 12 }, children: "\u70B9\u51FB\"\u6DFB\u52A0\u8D44\u6599\u6E90\"\u63A5\u5165\u5916\u90E8\u6570\u636E\uFF0C\u6216\u4E0A\u4F20\u6587\u4EF6" })] })) : (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: sources.map((src) => {
                    const tr = testResult[src.id];
                    return (_jsxs("div", { style: {
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '12px 16px',
                            background: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 8,
                            transition: 'all var(--fast)',
                        }, children: [_jsx("div", { style: {
                                    width: 36, height: 36, borderRadius: 8,
                                    background: 'var(--blue-bg)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'var(--blue)',
                                    flexShrink: 0,
                                }, children: sourceTypeIcon(src.source_type) }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }, children: [_jsx("span", { style: { fontWeight: 600, fontSize: 14 }, children: src.name }), _jsx("span", { style: {
                                                    fontSize: 10, padding: '1px 6px', borderRadius: 3,
                                                    background: 'var(--bg-input)', color: 'var(--text-dim)',
                                                }, children: sourceTypeLabel(src.source_type) }), statusIndicator(src), tr && (_jsx("span", { style: { fontSize: 11, color: tr.ok ? 'var(--color-success)' : 'var(--color-danger)' }, children: tr.detail }))] }), src.url && (_jsx("div", { style: { fontSize: 12, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: src.url })), src.last_test_at && (_jsxs("div", { style: { fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }, children: ["\u4E0A\u6B21\u6D4B\u8BD5: ", new Date(src.last_test_at).toLocaleString('zh-CN')] })), src.tags && src.tags.length > 0 && (_jsx("div", { style: { display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }, children: src.tags.map((t) => (_jsxs("span", { style: {
                                                display: 'inline-flex', alignItems: 'center', gap: 3,
                                                fontSize: 10, padding: '1px 6px', borderRadius: 10,
                                                background: `${t.color}20`, color: t.color,
                                                border: `1px solid ${t.color}40`,
                                            }, children: [_jsx("span", { style: { width: 6, height: 6, borderRadius: '50%', background: t.color, display: 'inline-block' } }), t.name, _jsx("button", { onClick: (e) => { e.stopPropagation(); handleRemoveTagFromSource(src.id, t.id); }, style: {
                                                        background: 'none', border: 'none', cursor: 'pointer',
                                                        color: t.color, fontSize: 10, padding: 0, lineHeight: 1,
                                                        marginLeft: 1,
                                                    }, title: "\u79FB\u9664\u6807\u7B7E", children: "\u00D7" })] }, t.id))) }))] }), _jsxs("div", { style: { display: 'flex', gap: 6, flexShrink: 0, alignItems: 'flex-start' }, children: [tags.length > 0 && (_jsxs("select", { value: "", onChange: (e) => {
                                            const tagId = parseInt(e.target.value);
                                            if (tagId) {
                                                handleAddTagToSource(src.id, tagId);
                                                e.target.value = '';
                                            }
                                        }, style: {
                                            padding: '4px 6px', fontSize: 11,
                                            borderRadius: 4, border: '1px solid var(--border)',
                                            background: 'var(--bg-input)', color: 'var(--text-secondary)',
                                            maxWidth: 80,
                                        }, title: "\u6DFB\u52A0\u6807\u7B7E", children: [_jsx("option", { value: "", children: "+\u6807\u7B7E" }), tags.filter((t) => !(src.tags || []).find((st) => st.id === t.id)).map((t) => (_jsx("option", { value: t.id, children: t.name }, t.id)))] })), _jsxs("button", { onClick: () => handleTest(src.id), disabled: testingId === src.id, style: {
                                            display: 'inline-flex', alignItems: 'center', gap: 4,
                                            padding: '5px 12px',
                                            background: 'var(--bg-input)',
                                            border: '1px solid var(--border)',
                                            borderRadius: 4, cursor: testingId === src.id ? 'wait' : 'pointer',
                                            fontSize: 12, color: 'var(--text-primary)',
                                        }, title: "\u6D4B\u8BD5\u8FDE\u63A5", children: [testingId === src.id ? (_jsx(RefreshCw, { size: 12, style: { animation: 'spin 1s linear infinite' } })) : (_jsx(Cable, { size: 12 })), "\u6D4B\u8BD5\u8FDE\u63A5"] }), _jsxs("button", { onClick: () => setDeleteId(src.id), style: {
                                            display: 'inline-flex', alignItems: 'center', gap: 4,
                                            padding: '5px 12px',
                                            background: 'var(--bg-input)',
                                            border: '1px solid var(--border)',
                                            borderRadius: 4, cursor: 'pointer',
                                            fontSize: 12, color: 'var(--color-danger)',
                                        }, title: "\u5220\u9664", children: [_jsx(Trash2, { size: 12 }), "\u5220\u9664"] })] })] }, src.id));
                }) })), showModal && (_jsx("div", { style: {
                    position: 'fixed', inset: 0, zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.5)',
                }, onClick: () => { setShowModal(false); resetForm(); }, role: "dialog", "aria-modal": "true", "aria-label": "\u6DFB\u52A0\u8D44\u6599\u6E90", children: _jsxs("div", { style: {
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-strong)',
                        borderRadius: 'var(--r-lg)',
                        padding: '24px 28px',
                        maxWidth: 520, width: '90%',
                        boxShadow: 'var(--shadow-md)',
                    }, onClick: (e) => e.stopPropagation(), children: [_jsx("h3", { style: { fontSize: 16, fontWeight: 700, marginBottom: 20 }, children: "\u6DFB\u52A0\u8D44\u6599\u6E90" }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 14 }, children: [_jsxs("div", { children: [_jsxs("label", { style: { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }, children: ["\u540D\u79F0 ", _jsx("span", { style: { color: 'var(--color-danger)' }, children: "*" })] }), _jsx("input", { type: "text", value: formName, onChange: (e) => setFormName(e.target.value), placeholder: "\u4F8B\u5982\uFF1A\u4EA7\u54C1\u6587\u6863 RAG API", style: {
                                                width: '100%', padding: '7px 10px',
                                                borderRadius: 'var(--r-sm)', border: '1px solid var(--border)',
                                                background: 'var(--bg-input)', color: 'var(--text-primary)',
                                                fontSize: 13, boxSizing: 'border-box',
                                            } })] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }, children: "\u7C7B\u578B" }), _jsxs("select", { value: formType, onChange: (e) => setFormType(e.target.value), style: {
                                                width: '100%', padding: '7px 10px',
                                                borderRadius: 'var(--r-sm)', border: '1px solid var(--border)',
                                                background: 'var(--bg-input)', color: 'var(--text-primary)',
                                                fontSize: 13, boxSizing: 'border-box',
                                            }, children: [_jsx("option", { value: "http_api", children: "HTTP API" }), _jsx("option", { value: "rag_api", children: "RAG API" }), _jsx("option", { value: "mysql", children: "MySQL" }), _jsx("option", { value: "postgres", children: "PostgreSQL" }), _jsx("option", { value: "redis", children: "Redis" }), _jsx("option", { value: "url_crawl", children: "URL \u6293\u53D6" }), _jsx("option", { value: "local_file", children: "\uD83D\uDCC2 \u672C\u5730\u6587\u4EF6" })] })] }), _jsxs("div", { children: [_jsxs("label", { style: { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }, children: ["URL ", _jsx("span", { style: { color: 'var(--color-danger)' }, children: "*" })] }), _jsx("input", { type: "text", value: formUrl, onChange: (e) => setFormUrl(e.target.value), placeholder: "\u4F8B\u5982\uFF1Ahttps://api.example.com/rag", style: {
                                                width: '100%', padding: '7px 10px',
                                                borderRadius: 'var(--r-sm)', border: '1px solid var(--border)',
                                                background: 'var(--bg-input)', color: 'var(--text-primary)',
                                                fontSize: 13, boxSizing: 'border-box',
                                            } })] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }, children: "config_json (\u9009\u586B)" }), _jsx("textarea", { value: formConfigJson, onChange: (e) => setFormConfigJson(e.target.value), placeholder: '{"api_key": "your-key", "timeout": 10}', rows: 4, style: {
                                                width: '100%', padding: '7px 10px',
                                                borderRadius: 'var(--r-sm)', border: '1px solid var(--border)',
                                                background: 'var(--bg-input)', color: 'var(--text-primary)',
                                                fontSize: 12, fontFamily: 'monospace', boxSizing: 'border-box',
                                                resize: 'vertical',
                                            } })] }), formError && (_jsx("div", { style: { padding: '8px 12px', borderRadius: 4, background: 'var(--red-bg)', color: 'var(--red)', fontSize: 12 }, children: formError }))] }), _jsxs("div", { style: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }, children: [_jsx("button", { className: "btn", onClick: () => { setShowModal(false); resetForm(); }, children: "\u53D6\u6D88" }), _jsx("button", { className: "btn btn-primary", onClick: handleAdd, disabled: submitting, style: { opacity: submitting ? 0.6 : 1 }, children: submitting ? '创建中...' : '确认添加' })] })] }) })), _jsx(ConfirmDialog, { open: deleteId !== null, title: "\u786E\u8BA4\u5220\u9664", message: "\u786E\u5B9A\u8981\u5220\u9664\u8BE5\u8D44\u6599\u6E90\u5417\uFF1F\u6B64\u64CD\u4F5C\u4E0D\u53EF\u6062\u590D\u3002", danger: true, onConfirm: handleDelete, onCancel: () => setDeleteId(null) })] }));
}
