import { useEffect, useState } from 'react';
import { Shield, Lock, AlertTriangle, Settings } from 'lucide-react';

interface SecurityDefaults { gate_pre_check: string | null; gate_post_check: string | null; token_soft_limit: number; token_hard_limit: number; io_filter: string; audit_enabled: boolean; }

export default function SecurityPage() {
  const [defaults, setDefaults] = useState<SecurityDefaults>({ gate_pre_check: null, gate_post_check: null, token_soft_limit: 80000, token_hard_limit: 100000, io_filter: 'none', audit_enabled: true });
  const [saved, setSaved] = useState(false);
  const uid = () => localStorage.getItem('current_user_id') || 'admin';

  useEffect(() => {
    fetch('/api/admin/security-config', { headers: { 'X-User-Id': uid() } }).then(r => r.json()).then(d => {
      if (d.config) setDefaults(d.config);
    }).catch(() => {});
  }, []);

  const save = async () => {
    await fetch('/api/admin/security-config', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-User-Id': uid() }, body: JSON.stringify(defaults) });
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 8 }}><Shield size={22} color="var(--color-primary)" /> 安全策略</h1>
      <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 24 }}>全局默认安全配置。每个新创建的实体自动填充这些默认值，可在实体编辑页单独调整。</p>

      {/* Token 限制 */}
      <div style={{ background: 'var(--bg-card, #181a1f)', borderRadius: 8, padding: 20, border: '1px solid var(--border-normal, #2a2d35)', marginBottom: 16 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 6 }}><Lock size={14} /> Token 限制默认值</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={lbl}>软限制（单次）</label><input type="number" value={defaults.token_soft_limit} onChange={e => setDefaults({ ...defaults, token_soft_limit: +e.target.value })} style={inp} /><span style={{ fontSize: 10, color: 'var(--text-dim)' }}>执行中触发警告，不中断</span></div>
          <div><label style={lbl}>硬限制（单次）</label><input type="number" value={defaults.token_hard_limit} onChange={e => setDefaults({ ...defaults, token_hard_limit: +e.target.value })} style={inp} /><span style={{ fontSize: 10, color: 'var(--text-dim)' }}>执行完成后阻断后续调用</span></div>
        </div>
        <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--bg-input, #0b0c10)', borderRadius: 4, fontSize: 11, color: 'var(--text-dim)' }}>
          <AlertTriangle size={12} style={{ verticalAlign: -2, marginRight: 4 }} />
          层级规则：实际限制 = min(项目的限制, Agent的限制, 工作流的限制, 工具的限制)，取最严值
        </div>
      </div>

      {/* 安全闸门 */}
      <div style={{ background: 'var(--bg-card, #181a1f)', borderRadius: 8, padding: 20, border: '1px solid var(--border-normal, #2a2d35)', marginBottom: 16 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px 0' }}>安全闸门默认值</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div><label style={lbl}>前置校验规则</label><input value={defaults.gate_pre_check || ''} onChange={e => setDefaults({ ...defaults, gate_pre_check: e.target.value || null })} style={inp} placeholder="例：输入必须包含 project_id 字段" /></div>
          <div><label style={lbl}>后置校验规则</label><input value={defaults.gate_post_check || ''} onChange={e => setDefaults({ ...defaults, gate_post_check: e.target.value || null })} style={inp} placeholder="例：输出不能为空" /></div>
          <div><label style={lbl}>I/O 过滤</label><select value={defaults.io_filter} onChange={e => setDefaults({ ...defaults, io_filter: e.target.value })} style={inp}><option value="none">不过滤</option><option value="sanitize">基础过滤</option><option value="strict">严格过滤</option></select></div>
        </div>
      </div>

      {/* 审计 */}
      <div style={{ background: 'var(--bg-card, #181a1f)', borderRadius: 8, padding: 20, border: '1px solid var(--border-normal, #2a2d35)', marginBottom: 16 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px 0' }}>审计配置</h2>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
          <input type="checkbox" checked={defaults.audit_enabled} onChange={e => setDefaults({ ...defaults, audit_enabled: e.target.checked })} />
          启用审计日志（所有 CRUD 操作自动记录）
        </label>
      </div>

      <button onClick={save} style={{ padding: '10px 24px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Settings size={14} /> {saved ? '✅ 已保存' : '保存安全配置'}
      </button>
    </div>
  );
}

const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 };
const inp: React.CSSProperties = { width: '100%', padding: '8px', background: 'var(--bg-input, #0b0c10)', color: 'var(--color-text)', border: '1px solid var(--border-normal, #2a2d35)', borderRadius: 4, fontSize: 13, boxSizing: 'border-box' };
