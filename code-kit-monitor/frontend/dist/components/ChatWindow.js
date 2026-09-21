import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useState, useRef, useEffect } from 'react';
import { Send, RefreshCw, AlertCircle } from 'lucide-react';
export default function ChatWindow({ agentId, agentName, messages, loading, error, onSend, onRetry, extraHeader }) {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    const handleSend = () => {
        const trimmed = input.trim();
        if (!trimmed || loading)
            return;
        onSend(trimmed);
        setInput('');
        inputRef.current?.focus();
    };
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };
    const formatTime = (ts) => {
        const d = new Date(ts);
        return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
    };
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 400, background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border)' }, children: [_jsxs("div", { style: { padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsxs("span", { style: { fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }, children: ["\uD83E\uDD16 ", agentName] }), _jsx("span", { style: { fontSize: 10, color: 'var(--text-dim)', padding: '2px 8px', background: 'var(--bg-input)', borderRadius: 3 }, children: "\u5BF9\u8BDD\u6D4B\u8BD5" })] }), extraHeader] }), _jsxs("div", { style: { flex: 1, overflowY: 'auto', padding: '16px' }, children: [messages.length === 0 && !loading && (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-dim)', gap: 8 }, children: [_jsx("span", { style: { fontSize: 32 }, children: "\uD83D\uDCAC" }), _jsxs("span", { style: { fontSize: 13 }, children: ["\u53D1\u9001\u6D88\u606F\u5F00\u59CB\u4E0E ", agentName, " \u5BF9\u8BDD"] }), _jsx("span", { style: { fontSize: 11, opacity: 0.6 }, children: "Enter \u53D1\u9001 \u00B7 Shift+Enter \u6362\u884C" })] })), messages.map((msg) => (_jsxs("div", { style: { marginBottom: 16, display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }, children: [_jsxs("div", { style: {
                                    maxWidth: '80%',
                                    padding: '10px 14px',
                                    borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                                    background: msg.role === 'user' ? 'var(--color-primary)' : 'var(--bg-input)',
                                    color: msg.role === 'user' ? '#fff' : 'var(--color-text)',
                                    fontSize: 13,
                                    lineHeight: 1.5,
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                }, children: [msg.status === 'error' && _jsx(AlertCircle, { size: 14, style: { display: 'inline', marginRight: 4, verticalAlign: -2, color: 'var(--red)' } }), msg.content] }), _jsxs("span", { style: { fontSize: 9, color: 'var(--text-dim)', marginTop: 4, padding: '0 4px' }, children: [msg.role === 'user' ? '你' : agentName, " \u00B7 ", formatTime(msg.created_at), msg.status === 'error' && _jsx("span", { style: { color: 'var(--red)', marginLeft: 4 }, children: "\u53D1\u9001\u5931\u8D25" })] })] }, msg.id))), loading && (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', color: 'var(--text-dim)', fontSize: 12 }, children: [_jsx(RefreshCw, { size: 14, style: { animation: 'spin 1s linear infinite' } }), agentName, " \u601D\u8003\u4E2D..."] })), error && (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '12px', margin: '8px 0', background: 'rgba(255,100,100,0.1)', borderRadius: 8, border: '1px solid rgba(255,100,100,0.2)' }, children: [_jsx(AlertCircle, { size: 14, style: { color: 'var(--red)' } }), _jsx("span", { style: { fontSize: 12, color: 'var(--red)', flex: 1 }, children: error }), onRetry && (_jsx("button", { onClick: onRetry, style: { padding: '4px 12px', fontSize: 11, background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }, children: "\u91CD\u8BD5" }))] })), _jsx("div", { ref: messagesEndRef })] }), _jsxs("div", { style: { padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'flex-end' }, children: [_jsx("textarea", { ref: inputRef, value: input, onChange: (e) => setInput(e.target.value), onKeyDown: handleKeyDown, placeholder: '给 ' + agentName + ' 发送消息...', rows: 1, style: {
                            flex: 1,
                            padding: '10px 14px',
                            background: 'var(--bg-input)',
                            color: 'var(--color-text)',
                            border: '1px solid var(--border)',
                            borderRadius: 8,
                            fontSize: 13,
                            resize: 'none',
                            outline: 'none',
                            fontFamily: 'var(--font-mono)',
                            maxHeight: 120,
                        } }), _jsx("button", { onClick: handleSend, disabled: !input.trim() || loading, style: {
                            padding: '10px 16px',
                            background: input.trim() && !loading ? 'var(--color-primary)' : 'var(--bg-input)',
                            color: input.trim() && !loading ? '#fff' : 'var(--text-dim)',
                            border: 'none',
                            borderRadius: 8,
                            cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 12,
                            transition: 'background 0.15s',
                        }, children: _jsx(Send, { size: 16 }) })] }), _jsx("style", { children: `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }` })] }));
}
