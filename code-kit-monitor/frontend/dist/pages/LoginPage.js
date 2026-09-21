import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Shield, User, ArrowRight, Lock, AlertCircle } from 'lucide-react';
export default function LoginPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [logging, setLogging] = useState(false);
    useEffect(() => {
        fetch('/api/auth/list')
            .then(r => r.json())
            .then(d => {
            const list = d.users || [];
            setUsers(list);
            setLoading(false);
        })
            .catch(() => setLoading(false));
    }, []);
    const handleLogin = async () => {
        if (!selected || !password)
            return;
        setLogging(true);
        setError('');
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: selected.id, password }),
            });
            const data = await res.json();
            if (data.ok) {
                localStorage.setItem('current_user_id', selected.id);
                window.location.reload();
            }
            else {
                setError(data.detail || '登录失败');
            }
        }
        catch {
            setError('网络错误');
        }
        setLogging(false);
    };
    const handleKeyDown = (e) => {
        if (e.key === 'Enter')
            handleLogin();
    };
    const goBack = () => { setSelected(null); setPassword(''); setError(''); };
    if (loading) {
        return (_jsx("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100vw', background: 'var(--bg-app)' }, children: _jsxs("div", { style: { textAlign: 'center' }, children: [_jsx("div", { style: { width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--blue)', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px' } }), _jsx("p", { style: { color: 'var(--text-muted)', fontSize: 13 }, children: "\u52A0\u8F7D\u4E2D..." })] }) }));
    }
    return (_jsx("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100vw', background: 'var(--bg-app)' }, children: _jsxs("div", { style: {
                background: 'var(--bg-card)', border: '1px solid var(--border-strong)',
                borderRadius: 'var(--r-lg)', padding: '32px 40px', maxWidth: 420, width: '90%',
                boxShadow: 'var(--shadow-md)',
            }, children: [_jsxs("div", { style: { textAlign: 'center', marginBottom: 28 }, children: [_jsx("span", { style: { color: 'var(--blue)', fontWeight: 800, fontSize: 28 }, children: "\u25C8" }), _jsx("h1", { style: { fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, margin: '8px 0 4px', color: 'var(--text)' }, children: "code-kit monitor" }), _jsx("p", { style: { fontSize: 13, color: 'var(--text-muted)' }, children: selected ? `输入密码以「${selected.name}」登录` : '选择用户以继续' })] }), !selected ? (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, children: users.map(u => (_jsxs("button", { onClick: () => setSelected(u), style: {
                            display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                            padding: '12px 16px', border: '1px solid var(--border)',
                            borderRadius: 'var(--r-md)', background: 'var(--bg-main)',
                            cursor: 'pointer', transition: 'all var(--fast)',
                        }, onMouseEnter: e => { e.currentTarget.style.borderColor = 'var(--blue)'; e.currentTarget.style.background = 'var(--bg-selected)'; }, onMouseLeave: e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-main)'; }, children: [u.role === 'admin' ? _jsx(Shield, { size: 20, style: { color: 'var(--blue)', flexShrink: 0 } }) : _jsx(User, { size: 20, style: { color: 'var(--text-muted)', flexShrink: 0 } }), _jsxs("div", { style: { flex: 1, textAlign: 'left' }, children: [_jsx("div", { style: { fontSize: 14, fontWeight: 600, color: 'var(--text)' }, children: u.name }), _jsxs("div", { style: { fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }, children: [u.id, " \u00B7 ", u.role === 'admin' ? '管理员' : '用户'] })] }), _jsx(ArrowRight, { size: 16, style: { color: 'var(--text-muted)', flexShrink: 0 } })] }, u.id))) })) : (
                /* 密码输入 */
                _jsxs("div", { children: [_jsxs("div", { style: {
                                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                                background: 'var(--bg-selected)', borderRadius: 'var(--r-md)', marginBottom: 16,
                            }, children: [selected.role === 'admin' ? _jsx(Shield, { size: 16, style: { color: 'var(--blue)' } }) : _jsx(User, { size: 16 }), _jsx("span", { style: { fontWeight: 600, fontSize: 14 }, children: selected.name }), _jsx("span", { style: { fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }, children: selected.role === 'admin' ? '管理员' : '用户' }), _jsx("button", { onClick: goBack, className: "btn btn-ghost btn-xs", style: { fontSize: 11, color: 'var(--text-muted)' }, children: "\u66F4\u6362" })] }), _jsxs("div", { style: { position: 'relative', marginBottom: 12 }, children: [_jsx(Lock, { size: 14, style: { position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' } }), _jsx("input", { type: "password", placeholder: "\u5BC6\u7801", value: password, onChange: e => setPassword(e.target.value), onKeyDown: handleKeyDown, autoFocus: true, style: { width: '100%', paddingLeft: 36, fontSize: 14 } })] }), error && (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 6, color: 'var(--red)', fontSize: 12, marginBottom: 12 }, children: [_jsx(AlertCircle, { size: 14 }), error] })), _jsx("button", { onClick: handleLogin, disabled: !password || logging, className: "btn btn-primary", style: { width: '100%', padding: '10px 0', fontSize: 14, justifyContent: 'center' }, children: logging ? '登录中...' : '登录' })] })), _jsx("p", { style: { textAlign: 'center', marginTop: 20, fontSize: 11, color: 'var(--text-muted)' }, children: "\u4EC5 localhost \u00B7 \u9ED8\u8BA4\u7BA1\u7406\u5458\u5BC6\u7801 123456" })] }) }));
}
