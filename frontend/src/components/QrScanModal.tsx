import { useState, useEffect, useRef } from 'react';
import { X, RefreshCw } from 'lucide-react';

const CHANNEL_META: Record<string, { label: string; icon: string }> = {
  feishu: { label: '飞书', icon: '🐦' },
  dingtalk: { label: '钉钉', icon: '📌' },
};

interface Props {
  channelType: string;
  agentId?: number;
  onSuccess?: (channel: any) => void;
  onClose: () => void;
  onManualEntry: () => void;
}

type ScanStatus = 'loading' | 'scanning' | 'authorized' | 'rejected' | 'expired' | 'error';

export default function QrScanModal({ channelType, agentId, onSuccess, onClose, onManualEntry }: Props) {
  const [status, setStatus] = useState<ScanStatus>('loading');
  const [qrUrl, setQrUrl] = useState('');
  const [deviceCode, setDeviceCode] = useState('');
  const [expiresIn, setExpiresIn] = useState(300);
  const [errorDetail, setErrorDetail] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
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
      if (!mountedRef.current) return;
      setQrUrl(data.qr_url);
      setDeviceCode(data.device_code);
      setExpiresIn(data.expires_in || 300);
      setStatus('scanning');
      startPolling(data.device_code, data.expires_in || 300);
    } catch {
      if (mountedRef.current) {
        setStatus('error');
        setErrorDetail('网络连接异常');
      }
    }
  };

  const startPolling = (code: string, timeout: number) => {
    stopPolling();
    const startTime = Date.now();
    const maxMs = timeout * 1000;

    pollRef.current = setInterval(async () => {
      if (!mountedRef.current) { stopPolling(); return; }

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
          if (res.status === 429) return; // rate limited, skip this round
          return;
        }
        const data = await res.json();
        if (!mountedRef.current) return;

        switch (data.status) {
          case 'authorized':
            stopPolling();
            setStatus('authorized');
            if (onSuccess) onSuccess(data.channel);
            // 1.5s 后自动关闭
            setTimeout(() => { if (mountedRef.current) onClose(); }, 1500);
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
      } catch {
        // 网络抖动，不影响继续轮询（连续 3 次失败才报错）
      }
    }, 3000);
  };

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  // 倒计时
  const [countdown, setCountdown] = useState(300);
  useEffect(() => {
    if (status !== 'scanning') return;
    setCountdown(expiresIn);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [status, expiresIn]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m + ':' + sec.toString().padStart(2, '0');
  };

  const statusUI: Record<ScanStatus, { text: string; color: string; icon: string }> = {
    loading: { text: '正在获取二维码…', color: 'var(--text-dim)', icon: '⏳' },
    scanning: { text: '请使用 ' + meta.label + ' App 扫描二维码', color: 'var(--text-secondary)', icon: '📱' },
    authorized: { text: '授权成功！渠道已激活', color: 'var(--green, #5cb878)', icon: '✅' },
    rejected: { text: '授权已取消', color: 'var(--color-danger, #dc2626)', icon: '❌' },
    expired: { text: '二维码已过期', color: 'var(--color-warning, #e8a450)', icon: '⏰' },
    error: { text: errorDetail || '平台服务异常', color: 'var(--color-danger, #dc2626)', icon: '⚠️' },
  };

  const ui = statusUI[status];

  const s: Record<string, React.CSSProperties> = {
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modal: { background: 'var(--bg-card, #1a1a2e)', borderRadius: 12, border: '1px solid var(--border, #2a2a4a)', padding: 28, width: 360, maxWidth: '90vw', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 },
    title: { fontSize: 16, fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: 8, alignSelf: 'stretch', justifyContent: 'space-between' },
    qrBox: { width: 200, height: 200, background: '#fff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    qrImg: { width: 184, height: 184, objectFit: 'contain' as const },
    statusText: { fontSize: 13, color: ui.color, textAlign: 'center' as const, display: 'flex', alignItems: 'center', gap: 6 },
    countdown: { fontSize: 18, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' },
    btnRow: { display: 'flex', gap: 8, width: '100%' },
    btnSecondary: { flex: 1, padding: '8px 12px', background: 'none', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 },
    btnClose: { padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 18, lineHeight: 1 },
  };

  return (
    <div style={s.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={s.modal}>
        <div style={s.title}>
          <span>{meta.icon} 扫码接入{meta.label}</span>
          <button onClick={onClose} style={s.btnClose}><X size={18} /></button>
        </div>

        <div style={s.qrBox}>
          {status === 'loading' ? (
            <span style={{ fontSize: 28 }}>⏳</span>
          ) : status === 'scanning' ? (
            <img src={qrUrl} alt={'扫码接入' + meta.label} style={s.qrImg}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : null}
        </div>

        {status === 'scanning' && (
          <div style={s.countdown}>⏱ {formatTime(countdown)}</div>
        )}

        <div style={s.statusText}>
          <span>{ui.icon}</span> {ui.text}
        </div>

        {status === 'scanning' && (
          <div style={s.btnRow}>
            <button onClick={startOAuth} style={s.btnSecondary}><RefreshCw size={14} /> 重新获取</button>
            <button onClick={onManualEntry} style={s.btnSecondary}>✍️ 手动填写凭证</button>
          </div>
        )}

        {(status === 'rejected' || status === 'expired' || status === 'error') && (
          <div style={s.btnRow}>
            <button onClick={startOAuth} style={{ ...s.btnSecondary, borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}><RefreshCw size={14} /> 重试</button>
            <button onClick={onManualEntry} style={s.btnSecondary}>✍️ 手动填写</button>
          </div>
        )}

        {status === 'authorized' && <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>弹窗即将自动关闭</div>}
      </div>
    </div>
  );
}
