import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import { X, RefreshCw } from 'lucide-react';
const CHANNEL_META = {
    feishu: { label: '飞书', icon: '🐦' },
    dingtalk: { label: '钉钉', icon: '📌' },
};
export default function QrScanModal({ channelType, agentId, onSuccess, onClose, onManualEntry }) {
    const [status, setStatus] = useState('loading');
    const [qrUrl, setQrUrl] = useState('');
    const [deviceCode, setDeviceCode] = useState('');
    const [expiresIn, setExpiresIn] = useState(300);
    const [errorDetail, setErrorDetail] = useState('');
    const pollRef = useRef(null);
    const mountedRef = useRef(true);
    const meta = CHANNEL_META[channelType] || { label: channelType, icon: '🔌' };
    const uid = () => localStorage.getItem('current_user_id') || 'admin';
    // 发起 OAuth
    useEffect(() => {
        mountedRef.current = true;
        startOAuth();
        return () => { mountedRef.current = false; stopPolling(); };
    }, [channelType]);
    const startOAuth = async () => {
        setStatus('loading');
        try {
            const res = await fetch('/api/channels/' + channelType + '/oauth/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-User-Id': uid() },
                body: JSON.stringify({ agent_id: agentId }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: '启动失败' }));
                setStatus('error');
                setErrorDetail(err.detail || 'OAuth 启动失败');
                return;
            }
            const data = await res.json();
            if (!mountedRef.current)
                return;
            setQrUrl(data.qr_url);
            setDeviceCode(data.device_code);
            setExpiresIn(data.expires_in || 300);
            setStatus('scanning');
            startPolling(data.device_code, data.expires_in || 300);
        }
        catch {
            if (mountedRef.current) {
                setStatus('error');
                setErrorDetail('网络连接异常');
            }
        }
    };
    const startPolling = (code, timeout) => {
        stopPolling();
        const startTime = Date.now();
        const maxMs = timeout * 1000;
        pollRef.current = setInterval(async () => {
            if (!mountedRef.current) {
                stopPolling();
                return;
            }
            // 检查超时
            if (Date.now() - startTime > maxMs) {
                stopPolling();
                setStatus('expired');
                return;
            }
            try {
                const res = await fetch('/api/channels/' + channelType + '/oauth/poll?device_code=' + encodeURIComponent(code), {
                    headers: { 'X-User-Id': uid() },
                });
                if (!res.ok) {
                    if (res.status === 429)
                        return; // rate limited, skip this round
                    return;
                }
                const data = await res.json();
                if (!mountedRef.current)
                    return;
                switch (data.status) {
                    case 'authorized':
                        stopPolling();
                        setStatus('authorized');
                        if (onSuccess)
                            onSuccess(data.channel);
                        // 1.5s 后自动关闭
                        setTimeout(() => { if (mountedRef.current)
                            onClose(); }, 1500);
                        break;
                    case 'rejected':
                        stopPolling();
                        setStatus('rejected');
                        setErrorDetail(data.error_detail || '用户拒绝了授权');
                        break;
                    case 'expired':
                        stopPolling();
                        setStatus('expired');
                        break;
                    case 'error':
                        stopPolling();
                        setStatus('error');
                        setErrorDetail(data.error_detail || '平台服务异常');
                        break;
                    // pending → continue polling
                }
            }
            catch {
                // 网络抖动，不影响继续轮询（连续 3 次失败才报错）
            }
        }, 3000);
    };
    const stopPolling = () => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
    };
    // 倒计时
    const [countdown, setCountdown] = useState(300);
    useEffect(() => {
        if (status !== 'scanning')
            return;
        setCountdown(expiresIn);
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [status, expiresIn]);
    const formatTime = (s) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return m + ':' + sec.toString().padStart(2, '0');
    };
    const statusUI = {
        loading: { text: '正在获取二维码…', color: 'var(--text-dim)', icon: '⏳' },
        scanning: { text: '请使用 ' + meta.label + ' App 扫描二维码', color: 'var(--text-secondary)', icon: '📱' },
        authorized: { text: '授权成功！渠道已激活', color: 'var(--green, #5cb878)', icon: '✅' },
        rejected: { text: '授权已取消', color: 'var(--color-danger, #dc2626)', icon: '❌' },
        expired: { text: '二维码已过期', color: 'var(--color-warning, #e8a450)', icon: '⏰' },
        error: { text: errorDetail || '平台服务异常', color: 'var(--color-danger, #dc2626)', icon: '⚠️' },
    };
    const ui = statusUI[status];
    const s = {
        overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
        modal: { background: 'var(--bg-card, #1a1a2e)', borderRadius: 12, border: '1px solid var(--border, #2a2a4a)', padding: 28, width: 360, maxWidth: '90vw', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 },
        title: { fontSize: 16, fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: 8, alignSelf: 'stretch', justifyContent: 'space-between' },
        qrBox: { width: 200, height: 200, background: '#fff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
        qrImg: { width: 184, height: 184, objectFit: 'contain' },
        statusText: { fontSize: 13, color: ui.color, textAlign: 'center', display: 'flex', alignItems: 'center', gap: 6 },
        countdown: { fontSize: 18, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' },
        btnRow: { display: 'flex', gap: 8, width: '100%' },
        btnSecondary: { flex: 1, padding: '8px 12px', background: 'none', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 },
        btnClose: { padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 18, lineHeight: 1 },
    };
    return (_jsx("div", { style: s.overlay, onClick: (e) => { if (e.target === e.currentTarget)
            onClose(); }, children: _jsxs("div", { style: s.modal, children: [_jsxs("div", { style: s.title, children: [_jsxs("span", { children: [meta.icon, " \u626B\u7801\u63A5\u5165", meta.label] }), _jsx("button", { onClick: onClose, style: s.btnClose, children: _jsx(X, { size: 18 }) })] }), _jsx("div", { style: s.qrBox, children: status === 'loading' ? (_jsx("span", { style: { fontSize: 28 }, children: "\u23F3" })) : status === 'scanning' ? (_jsx("img", { src: qrUrl, alt: '扫码接入' + meta.label, style: s.qrImg, onError: (e) => { e.target.style.display = 'none'; } })) : null }), status === 'scanning' && (_jsxs("div", { style: s.countdown, children: ["\u23F1 ", formatTime(countdown)] })), _jsxs("div", { style: s.statusText, children: [_jsx("span", { children: ui.icon }), " ", ui.text] }), status === 'scanning' && (_jsxs("div", { style: s.btnRow, children: [_jsxs("button", { onClick: startOAuth, style: s.btnSecondary, children: [_jsx(RefreshCw, { size: 14 }), " \u91CD\u65B0\u83B7\u53D6"] }), _jsx("button", { onClick: onManualEntry, style: s.btnSecondary, children: "\u270D\uFE0F \u624B\u52A8\u586B\u5199\u51ED\u8BC1" })] })), (status === 'rejected' || status === 'expired' || status === 'error') && (_jsxs("div", { style: s.btnRow, children: [_jsxs("button", { onClick: startOAuth, style: { ...s.btnSecondary, borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }, children: [_jsx(RefreshCw, { size: 14 }), " \u91CD\u8BD5"] }), _jsx("button", { onClick: onManualEntry, style: s.btnSecondary, children: "\u270D\uFE0F \u624B\u52A8\u586B\u5199" })] })), status === 'authorized' && _jsx("div", { style: { fontSize: 11, color: 'var(--text-dim)' }, children: "\u5F39\u7A97\u5373\u5C06\u81EA\u52A8\u5173\u95ED" })] }) }));
}
