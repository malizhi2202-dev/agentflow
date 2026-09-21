import { ArrowLeft, Shield, User, Calendar, Circle, Key, FolderOpen } from 'lucide-react';
import { useAuth } from '../stores/auth';

const PERM_LABELS: Record<string, string> = {
  'project:read': '查看项目', 'project:write': '编辑项目',
  'project:delete': '删除产物', 'workflow:stop': '停止流程',
  'user:manage': '管理用户', 'audit:view': '查看审计',
};

const DANGEROUS_PERMS = new Set(['project:delete', 'workflow:stop', 'user:manage', 'audit:view']);

export default function UserCenter({ onBack }: { onBack: () => void }) {
  const { currentUser, isAdmin, rolePermissions } = useAuth();

  if (!currentUser) {
    return (
      <div style={{ padding: 40, color: 'var(--text-muted)', textAlign: 'center' }}>
        加载中...
      </div>
    );
  }

  const u = currentUser;
  const basePerms = rolePermissions.filter(p => !DANGEROUS_PERMS.has(p));
  const dangerPerms = rolePermissions.filter(p => DANGEROUS_PERMS.has(p));
  const createdAt = u.created_at ? new Date(u.created_at).toLocaleString('zh-CN') : '—';

  const sectionStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r-md)',
    padding: '20px 24px',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 10, color: 'var(--text-muted)', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: 0.05, marginBottom: 8,
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: 720, margin: '0 auto' }}>
      {/* 顶部 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <button onClick={onBack} className="btn btn-ghost btn-sm" aria-label="返回">
          <ArrowLeft size={18} />
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--text)' }}>
          用户中心
        </h1>
      </div>

      {/* 基本信息卡片 */}
      <div style={{ ...sectionStyle, marginBottom: 16 }}>
        <div style={labelStyle}>基本信息</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: isAdmin ? 'var(--blue)' : 'var(--bg-selected)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {isAdmin
              ? <Shield size={28} style={{ color: '#fff' }} />
              : <User size={28} style={{ color: 'var(--text-secondary)' }} />}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{u.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                @{u.id}
              </span>
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--r-sm)',
                background: isAdmin ? 'var(--blue)' : 'var(--bg-selected)',
                color: isAdmin ? '#fff' : 'var(--text-muted)',
              }}>
                {isAdmin ? '管理员' : '用户'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: u.active ? 'var(--green)' : 'var(--text-muted)' }}>
                <Circle size={6} fill={u.active ? 'var(--green)' : 'var(--text-muted)'} />
                {u.active ? '活跃' : '已禁用'}
              </span>
            </div>
          </div>
        </div>

        {/* 详细信息行 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <InfoRow icon={<Key size={12} />} label="用户 ID" value={u.id} mono />
          <InfoRow icon={<Calendar size={12} />} label="创建时间" value={createdAt} />
        </div>
      </div>

      {/* 权限卡片 */}
      <div style={{ ...sectionStyle, marginBottom: 16 }}>
        <div style={labelStyle}>权限信息</div>

        {/* 基础权限 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
            基础权限（角色自带）
          </div>
          {basePerms.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {basePerms.map(p => (
                <span key={p} style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 'var(--r-sm)',
                  background: 'var(--bg-selected)', color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {PERM_LABELS[p] || p}
                </span>
              ))}
            </div>
          ) : (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>无</span>
          )}
        </div>

        {/* 危险权限 */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
            危险权限（显式授予）
          </div>
          {dangerPerms.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {dangerPerms.map(p => (
                <span key={p} style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 'var(--r-sm)',
                  background: 'rgba(239,68,68,0.1)', color: 'var(--red)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {PERM_LABELS[p] || p}
                </span>
              ))}
            </div>
          ) : (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>无额外危险权限</span>
          )}
        </div>
      </div>

      {/* 归属项目卡片 */}
      <div style={sectionStyle}>
        <div style={labelStyle}>归属项目</div>
        {isAdmin && (!u.project_ids || u.project_ids.length === 0) ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FolderOpen size={14} style={{ color: 'var(--blue)' }} />
            <span style={{ fontSize: 13, color: 'var(--blue)', fontWeight: 600 }}>全部项目</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>（管理员可访问所有项目）</span>
          </div>
        ) : (u.project_ids || []).length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {u.project_ids.map(p => (
              <span key={p} style={{
                fontSize: 11, padding: '4px 12px', borderRadius: 'var(--r-sm)',
                background: 'var(--bg-selected)', color: 'var(--text)',
                fontFamily: 'var(--font-mono)',
              }}>
                {p}
              </span>
            ))}
          </div>
        ) : (
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>未分配任何项目</span>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value, mono }: {
  icon: React.ReactNode; label: string; value: string; mono?: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{label}</span>
      <span style={{
        fontSize: 12, color: 'var(--text)', fontWeight: 500,
        fontFamily: mono ? 'var(--font-mono)' : undefined,
      }}>
        {value}
      </span>
    </div>
  );
}
