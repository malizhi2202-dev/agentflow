import { useAuth } from '../stores/auth';
import { User, Shield, LogOut } from 'lucide-react';

interface Props {
  collapsed: boolean;
  onNavigateProfile: () => void;
}

export default function UserArea({ collapsed, onNavigateProfile }: Props) {
  const { currentUser, isAdmin, logout } = useAuth();
  const curName = currentUser?.name || '...';
  const curRole = currentUser?.role || 'user';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* 用户信息：点击进入用户中心 */}
      <button
        onClick={onNavigateProfile}
        className="btn btn-ghost btn-sm"
        style={{
          width: '100%', justifyContent: collapsed ? 'center' : 'flex-start', gap: 6,
        }}
        aria-label="用户中心"
        title="用户中心"
      >
        {isAdmin ? <Shield size={13} style={{ color: 'var(--blue)', flexShrink: 0 }} /> : <User size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
        {!collapsed && (
          <>
            <span style={{
              fontSize: 11, fontFamily: 'var(--font-mono)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left',
            }}>
              {curName}
            </span>
            <span style={{
              fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 'var(--r-sm)',
              background: isAdmin ? 'var(--blue)' : 'var(--bg-selected)',
              color: isAdmin ? '#fff' : 'var(--text-muted)',
              flexShrink: 0,
            }}>
              {isAdmin ? '管理员' : '用户'}
            </span>
          </>
        )}
      </button>

      {/* 登出按钮 */}
      <button
        onClick={logout}
        className="btn btn-ghost btn-sm"
        style={{
          width: '100%', justifyContent: collapsed ? 'center' : 'flex-start', gap: 6,
          color: 'var(--text-muted)',
        }}
        aria-label="登出"
        title="登出"
      >
        <LogOut size={12} style={{ flexShrink: 0 }} />
        {!collapsed && <span style={{ fontSize: 11 }}>登出</span>}
      </button>
    </div>
  );
}
