import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, Clock, ShieldCheck, Loader2, MessageSquare } from 'lucide-react';
import { safeFetch, invalidateCache } from '../utils/requestDedup';
const uid = () => localStorage.getItem('current_user_id') || 'admin';
export default function ApprovalPage() {
    const [approvals, setApprovals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedApproval, setSelectedApproval] = useState(null);
    const [responseText, setResponseText] = useState('');
    const [responseStatus, setResponseStatus] = useState('approved');
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const fetchApprovals = async () => {
        setLoading(true);
        const result = await safeFetch('/api/approvals?limit=100');
        if (result.ok && result.data) {
            setApprovals(result.data.approvals || []);
        }
        setLoading(false);
    };
    const intervalRef = useRef(null);
    useEffect(() => {
        fetchApprovals();
        intervalRef.current = setInterval(fetchApprovals, 10000);
        return () => {
            if (intervalRef.current)
                clearInterval(intervalRef.current);
        };
    }, []);
    const handleRespond = async () => {
        if (!selectedApproval)
            return;
        setSubmitting(true);
        setMessage('');
        try {
            const res = await fetch(`/api/approvals/${selectedApproval.id}/respond`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-User-Id': uid() },
                body: JSON.stringify({
                    status: responseStatus,
                    response_data: { comment: responseText, timestamp: new Date().toISOString() },
                }),
            });
            if (res.ok) {
                setMessage(responseStatus === 'approved' ? '✅ 已批准' : '❌ 已拒绝');
                setSelectedApproval(null);
                setResponseText('');
                invalidateCache('/api/approvals?limit=100');
                fetchApprovals();
            }
            else {
                const err = await res.json();
                setMessage(`操作失败: ${err.detail || '未知错误'}`);
            }
        }
        catch {
            setMessage('网络错误，请重试');
        }
        finally {
            setSubmitting(false);
        }
    };
    const pendingCount = approvals.filter((a) => a.status === 'pending').length;
    return (_jsxs("div", { style: { padding: 24, height: '100%', overflow: 'auto' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10 }, children: [_jsx(ShieldCheck, { size: 22, color: "var(--color-primary)" }), _jsx("h1", { style: { fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, margin: 0 }, children: "\u4EBA\u5DE5\u5BA1\u6279" }), pendingCount > 0 && (_jsxs("span", { style: {
                                    background: 'var(--red)', color: '#fff', borderRadius: 10,
                                    padding: '2px 8px', fontSize: 12, fontWeight: 700,
                                }, children: [pendingCount, " \u5F85\u5904\u7406"] }))] }), _jsxs("button", { onClick: fetchApprovals, style: {
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '6px 12px', background: 'var(--bg-input)', border: '1px solid var(--border)',
                            borderRadius: 4, cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)',
                        }, children: [_jsx(Loader2, { size: 12, style: { animation: loading ? 'spin 1s linear infinite' : 'none' } }), "\u5237\u65B0"] })] }), message && (_jsx("div", { style: {
                    padding: '10px 14px', borderRadius: 6, marginBottom: 16,
                    background: message.includes('✅') || message.includes('已批准') ? 'var(--green-bg)' : 'var(--red-bg)',
                    color: message.includes('✅') || message.includes('已批准') ? 'var(--green)' : 'var(--red)',
                    fontSize: 13,
                }, children: message })), selectedApproval && (_jsx("div", { style: {
                    position: 'fixed', inset: 0, zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.5)',
                }, onClick: () => setSelectedApproval(null), role: "dialog", "aria-modal": "true", children: _jsxs("div", { style: {
                        background: 'var(--bg-card)', border: '1px solid var(--border-strong)',
                        borderRadius: 'var(--r-lg)', padding: '24px 28px', maxWidth: 520, width: '90%',
                        boxShadow: 'var(--shadow-md)',
                    }, onClick: (e) => e.stopPropagation(), children: [_jsxs("h3", { style: { fontSize: 16, fontWeight: 700, marginBottom: 16 }, children: ["\u5BA1\u6279\u8BF7\u6C42 #", selectedApproval.id] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 12 }, children: [_jsxs("div", { children: [_jsx("span", { style: { fontSize: 11, color: 'var(--text-dim)' }, children: "Agent ID: " }), _jsx("span", { style: { fontSize: 13, fontWeight: 500 }, children: selectedApproval.agent_id })] }), selectedApproval.task_id && (_jsxs("div", { children: [_jsx("span", { style: { fontSize: 11, color: 'var(--text-dim)' }, children: "\u4EFB\u52A1 ID: " }), _jsx("span", { style: { fontSize: 13, fontFamily: 'monospace' }, children: selectedApproval.task_id })] })), selectedApproval.form_data && Object.keys(selectedApproval.form_data).length > 0 && (_jsxs("div", { children: [_jsx("span", { style: { fontSize: 11, color: 'var(--text-dim)', display: 'block', marginBottom: 4 }, children: "\u8BF7\u6C42\u6570\u636E:" }), _jsx("pre", { style: {
                                                margin: 0, padding: 8, fontSize: 11, fontFamily: 'monospace',
                                                background: 'var(--bg-input)', borderRadius: 4,
                                                color: 'var(--text-primary)', whiteSpace: 'pre-wrap', maxHeight: 150, overflow: 'auto',
                                            }, children: JSON.stringify(selectedApproval.form_data, null, 2) })] })), _jsxs("div", { children: [_jsx("span", { style: { fontSize: 11, color: 'var(--text-dim)', display: 'block', marginBottom: 4 }, children: "\u5BA1\u6279\u51B3\u7B56:" }), _jsxs("div", { style: { display: 'flex', gap: 8, marginBottom: 8 }, children: [_jsxs("button", { onClick: () => setResponseStatus('approved'), style: {
                                                        padding: '6px 16px', borderRadius: 4, border: '2px solid',
                                                        borderColor: responseStatus === 'approved' ? 'var(--green)' : 'var(--border)',
                                                        background: responseStatus === 'approved' ? 'var(--green-bg)' : 'none',
                                                        color: responseStatus === 'approved' ? 'var(--green)' : 'var(--text-secondary)',
                                                        cursor: 'pointer', fontSize: 13, fontWeight: responseStatus === 'approved' ? 600 : 400,
                                                        display: 'flex', alignItems: 'center', gap: 4,
                                                    }, children: [_jsx(CheckCircle, { size: 14 }), " \u6279\u51C6"] }), _jsxs("button", { onClick: () => setResponseStatus('rejected'), style: {
                                                        padding: '6px 16px', borderRadius: 4, border: '2px solid',
                                                        borderColor: responseStatus === 'rejected' ? 'var(--red)' : 'var(--border)',
                                                        background: responseStatus === 'rejected' ? 'var(--red-bg)' : 'none',
                                                        color: responseStatus === 'rejected' ? 'var(--red)' : 'var(--text-secondary)',
                                                        cursor: 'pointer', fontSize: 13, fontWeight: responseStatus === 'rejected' ? 600 : 400,
                                                        display: 'flex', alignItems: 'center', gap: 4,
                                                    }, children: [_jsx(XCircle, { size: 14 }), " \u62D2\u7EDD"] })] })] }), _jsxs("div", { children: [_jsx("span", { style: { fontSize: 11, color: 'var(--text-dim)', display: 'block', marginBottom: 4 }, children: "\u5907\u6CE8:" }), _jsx("textarea", { value: responseText, onChange: (e) => setResponseText(e.target.value), placeholder: "\u8F93\u5165\u5BA1\u6279\u610F\u89C1...", rows: 3, style: {
                                                width: '100%', padding: '7px 10px',
                                                borderRadius: 'var(--r-sm)', border: '1px solid var(--border)',
                                                background: 'var(--bg-input)', color: 'var(--text-primary)',
                                                fontSize: 12, fontFamily: 'monospace', boxSizing: 'border-box',
                                                resize: 'vertical',
                                            } })] })] }), _jsxs("div", { style: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }, children: [_jsx("button", { className: "btn", onClick: () => setSelectedApproval(null), children: "\u53D6\u6D88" }), _jsx("button", { className: "btn btn-primary", onClick: handleRespond, disabled: submitting, style: { opacity: submitting ? 0.6 : 1 }, children: submitting ? '提交中...' : '确认提交' })] })] }) })), loading ? (_jsxs("div", { style: { textAlign: 'center', padding: 40, color: 'var(--text-dim)' }, children: [_jsx(Loader2, { size: 24, style: { animation: 'spin 1s linear infinite', marginBottom: 8 } }), _jsx("p", { children: "\u52A0\u8F7D\u4E2D..." })] })) : approvals.length === 0 ? (_jsxs("div", { style: { textAlign: 'center', padding: 60, color: 'var(--text-dim)' }, children: [_jsx(ShieldCheck, { size: 40, style: { opacity: 0.3, marginBottom: 12 } }), _jsx("p", { style: { fontSize: 14 }, children: "\u6682\u65E0\u5BA1\u6279\u8BF7\u6C42" }), _jsx("p", { style: { fontSize: 12 }, children: "\u5F53 Agent \u6267\u884C\u9700\u8981\u4EBA\u5DE5\u786E\u8BA4\u65F6\uFF0C\u5BA1\u6279\u8BF7\u6C42\u4F1A\u51FA\u73B0\u5728\u8FD9\u91CC" })] })) : (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: approvals.map((a) => (_jsxs("div", { style: {
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 16px', background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)', borderRadius: 8,
                        cursor: a.status === 'pending' ? 'pointer' : 'default',
                        opacity: a.status !== 'pending' ? 0.7 : 1,
                    }, onClick: () => { if (a.status === 'pending')
                        setSelectedApproval(a); }, children: [_jsx("div", { style: {
                                width: 36, height: 36, borderRadius: 8,
                                background: a.status === 'pending' ? 'var(--orange-bg, #f59e0b20)' : a.status === 'approved' ? 'var(--green-bg)' : 'var(--red-bg)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: a.status === 'pending' ? '#f59e0b' : a.status === 'approved' ? 'var(--green)' : 'var(--red)',
                                flexShrink: 0,
                            }, children: a.status === 'pending' ? _jsx(Clock, { size: 18 }) : a.status === 'approved' ? _jsx(CheckCircle, { size: 18 }) : _jsx(XCircle, { size: 18 }) }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }, children: [_jsxs("span", { style: { fontWeight: 600, fontSize: 14 }, children: ["\u5BA1\u6279 #", a.id] }), _jsx("span", { style: {
                                                fontSize: 10, padding: '1px 6px', borderRadius: 3,
                                                background: a.status === 'pending' ? 'var(--orange-bg, #f59e0b20)' : a.status === 'approved' ? 'var(--green-bg)' : 'var(--red-bg)',
                                                color: a.status === 'pending' ? '#f59e0b' : a.status === 'approved' ? 'var(--green)' : 'var(--red)',
                                                fontWeight: 500,
                                            }, children: a.status === 'pending' ? '待审批' : a.status === 'approved' ? '已批准' : '已拒绝' })] }), _jsxs("div", { style: { fontSize: 12, color: 'var(--text-dim)' }, children: ["Agent #", a.agent_id, a.task_id ? ` · 任务: ${a.task_id}` : ''] }), a.form_data && Object.keys(a.form_data).length > 0 && (_jsxs("div", { style: { fontSize: 11, color: 'var(--text-dim)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: [_jsx(MessageSquare, { size: 10, style: { marginRight: 4 } }), JSON.stringify(a.form_data).slice(0, 80), JSON.stringify(a.form_data).length > 80 ? '...' : ''] })), _jsxs("div", { style: { fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }, children: [new Date(a.created_at).toLocaleString('zh-CN'), a.resolved_at && ` · 处理于 ${new Date(a.resolved_at).toLocaleString('zh-CN')}`] })] }), a.status === 'pending' && (_jsx("button", { onClick: (e) => { e.stopPropagation(); setSelectedApproval(a); }, style: {
                                padding: '5px 14px', background: 'var(--color-primary)', color: '#fff',
                                border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12,
                                flexShrink: 0,
                            }, children: "\u5904\u7406" }))] }, a.id))) }))] }));
}
