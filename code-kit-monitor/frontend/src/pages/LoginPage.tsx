import { useEffect, useState } from 'react';
import { Shield, User, ArrowRight, Lock, AlertCircle } from 'lucide-react';

interface SimpleUser { id: string; name: string; role: string; }

export default function LoginPage() {
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SimpleUser | null>(null);
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
    if (!selected || !password) return;
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
      } else {
        setError(data.detail || '登录失败');
      }
    } catch {
      setError('网络错误');
    }
    setLogging(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
  };

  const goBack = () => { setSelected(null); setPassword(''); setError(''); };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100vw', background: 'var(--bg-app)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--blue)', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100vw', background: 'var(--bg-app)' }}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-strong)',
        borderRadius: 'var(--r-lg)', padding: '32px 40px', maxWidth: 420, width: '90%',
        boxShadow: 'var(--shadow-md)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <span style={{ color: 'var(--blue)', fontWeight: 800, fontSize: 28 }}>◈</span>
          <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, margin: '8px 0 4px', color: 'var(--text)' }}>
            code-kit monitor
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {selected ? `输入密码以「${selected.name}」登录` : '选择用户以继续'}
          </p>
        </div>

        {/* 用户列表 */}
        {!selected ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {users.map(u => (
              <button key={u.id} onClick={() => setSelected(u)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                  padding: '12px 16px', border: '1px solid var(--border)',
                  borderRadius: 'var(--r-md)', background: 'var(--bg-main)',
                  cursor: 'pointer', transition: 'all var(--fast)',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--blue)'; e.currentTarget.style.background = 'var(--bg-selected)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-main)'; }}
              >
                {u.role === 'admin' ? <Shield size={20} style={{ color: 'var(--blue)', flexShrink: 0 }} /> : <User size={20} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{u.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{u.id} · {u.role === 'admin' ? '管理员' : '用户'}</div>
                </div>
                <ArrowRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              </button>
            ))}
          </div>
        ) : (
          /* 密码输入 */
          <div>
            {/* 选中的用户 */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
              background: 'var(--bg-selected)', borderRadius: 'var(--r-md)', marginBottom: 16,
            }}>
              {selected.role === 'admin' ? <Shield size={16} style={{ color: 'var(--blue)' }} /> : <User size={16} />}
              <span style={{ fontWeight: 600, fontSize: 14 }}>{selected.name}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{selected.role === 'admin' ? '管理员' : '用户'}</span>
              <button onClick={goBack} className="btn btn-ghost btn-xs" style={{ fontSize: 11, color: 'var(--text-muted)' }}>更换</button>
            </div>

            {/* 密码框 */}
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <Lock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="password" placeholder="密码" value={password}
                onChange={e => setPassword(e.target.value)} onKeyDown={handleKeyDown}
                autoFocus
                style={{ width: '100%', paddingLeft: 36, fontSize: 14 }} />
            </div>

            {/* 错误提示 */}
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>
                <AlertCircle size={14} />{error}
              </div>
            )}

            <button onClick={handleLogin} disabled={!password || logging}
              className="btn btn-primary" style={{ width: '100%', padding: '10px 0', fontSize: 14, justifyContent: 'center' }}>
              {logging ? '登录中...' : '登录'}
            </button>
          </div>
        )}

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'var(--text-muted)' }}>
          仅 localhost · 默认管理员密码 123456
        </p>
      </div>
    </div>
  );
}
