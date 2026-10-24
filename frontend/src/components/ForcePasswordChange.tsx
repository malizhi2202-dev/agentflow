import { useState } from 'react';
import { Shield, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../stores/auth';

/**
 * 首登强制改密（P0-1 / P0-2 配套）。
 *
 * 服务端才是门：must_change_password 期间除 /api/auth/* 外一律 403
 * （中间件 code=password_change_required）；这里只是把人引到改密入口，
 * 不承担任何鉴权职责。
 */
export default function ForcePasswordChange() {
  const { currentUser, fetchMe } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setError('');
    if (newPassword !== confirm) {
      setError('两次输入的新口令不一致');
      return;
    }
    if (newPassword.length < 12) {
      setError('新口令至少 12 位');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.detail || `改密失败 (${res.status})`);
        setSaving(false);
        return;
      }
      // 改密成功即旋转会话；重新拉 /me 让门自己打开
      await fetchMe();
    } catch {
      setError('网络错误');
    }
    setSaving(false);
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', width: '100vw', background: 'var(--bg-app)' }}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-strong)',
        borderRadius: 'var(--r-lg)', padding: '32px 40px', maxWidth: 440, width: '90%',
        boxShadow: 'var(--shadow-md)' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <Shield size={28} style={{ color: 'var(--blue)' }} />
          <h1 style={{ fontSize: 17, fontWeight: 700, margin: '10px 0 4px', color: 'var(--text)' }}>
            首次登录必须修改口令
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {currentUser ? `${currentUser.name}（${currentUser.id}）` : ''} · 初始口令来自部署日志或管理员
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            当前口令
            <input type="password" value={oldPassword} autoFocus
              onChange={e => setOldPassword(e.target.value)}
              style={{ width: '100%', marginTop: 4 }} />
          </label>
          <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            新口令（≥12 位，不要重复字符）
            <input type="password" value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              style={{ width: '100%', marginTop: 4 }} />
          </label>
          <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            再输一次
            <input type="password" value={confirm}
              onChange={e => setConfirm(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submit(); }}
              style={{ width: '100%', marginTop: 4 }} />
          </label>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--red)', fontSize: 12 }}>
              <AlertCircle size={14} />{error}
            </div>
          )}

          <button onClick={submit} disabled={saving || !oldPassword || !newPassword}
            className="btn btn-primary" style={{ width: '100%', padding: '10px 0', justifyContent: 'center' }}>
            <Lock size={14} />{saving ? '提交中...' : '修改口令并继续'}
          </button>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
            改密后旧会话全部作废，当前浏览器自动换新会话
          </p>
        </div>
      </div>
    </div>
  );
}
