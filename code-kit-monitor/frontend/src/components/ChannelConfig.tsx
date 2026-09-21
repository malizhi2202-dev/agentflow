import { useState, useEffect } from 'react';
import { Plus, X, Wifi, WifiOff, RefreshCw, Trash2, QrCode } from 'lucide-react';
import QrScanModal from './QrScanModal';

const CHANNEL_META: Record<string, { label: string; icon: string; fields: { key: string; label: string; type: string; placeholder: string }[] }> = {
  feishu: {
    label: '飞书', icon: '🐦',
    fields: [
      { key: 'app_id', label: 'App ID', type: 'text', placeholder: 'cli_xxx...' },
      { key: 'app_secret', label: 'App Secret', type: 'password', placeholder: '飞书应用凭证' },
    ],
  },
  dingtalk: {
    label: '钉钉', icon: '📌',
    fields: [
      { key: 'webhook_url', label: 'Webhook URL', type: 'text', placeholder: 'https://oapi.dingtalk.com/robot/send?access_token=xxx' },
    ],
  },
  slack: {
    label: 'Slack', icon: '💬',
    fields: [
      { key: 'bot_token', label: 'Bot Token', type: 'password', placeholder: 'xoxb-...' },
      { key: 'signing_secret', label: 'Signing Secret', type: 'password', placeholder: 'slack signing secret' },
    ],
  },
  telegram: {
    label: 'Telegram', icon: '📱',
    fields: [
      { key: 'bot_token', label: 'Bot Token', type: 'password', placeholder: '123456:ABC-DEF...' },
    ],
  },
  smtp_email: {
    label: 'SMTP 邮件', icon: '📧',
    fields: [
      { key: 'smtp_host', label: 'SMTP 服务器', type: 'text', placeholder: 'smtp.example.com' },
      { key: 'smtp_port', label: '端口', type: 'number', placeholder: '587' },
      { key: 'smtp_user', label: '用户名', type: 'text', placeholder: 'user@example.com' },
      { key: 'smtp_password', label: '密码', type: 'password', placeholder: '邮箱密码/SMTP授权码' },
      { key: 'from_addr', label: '发件地址', type: 'text', placeholder: 'user@example.com' },
      { key: 'to_addr', label: '收件地址', type: 'text', placeholder: 'recipient@example.com' },
    ],
  },
};

const CHANNEL_TYPES = Object.keys(CHANNEL_META);
const STATUS_COLORS: Record<string, string> = {
  draft: 'var(--text-dim)',
  active: '#5cb878',
  error: 'var(--red)',
  disabled: 'var(--text-dim)',
};
const STATUS_ICONS: Record<string, any> = {
  active: Wifi,
  error: WifiOff,
  draft: RefreshCw,
  disabled: WifiOff,
};

interface ChannelConfigProps {
  agentId: number;
}

export default function ChannelConfigComponent({ agentId }: ChannelConfigProps) {
  const [channels, setChannels] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ channel_type: 'feishu', credentials: {} });
  const [testing, setTesting] = useState<number | null>(null);
  const [showQrScan, setShowQrScan] = useState(false);
  const [qrScanChannelType, setQrScanChannelType] = useState('feishu');
  const uid = () => localStorage.getItem('current_user_id') || 'admin';

  const loadChannels = () => {
    if (!agentId) return;
    fetch('/api/agents/' + agentId + '/channels', { headers: { 'X-User-Id': uid() } })
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setChannels(d); })
      .catch(() => {});
  };

  useEffect(() => { loadChannels(); }, [agentId]);

  const saveChannel = () => {
    const url = '/api/agents/' + agentId + '/channels';
    const method = 'POST';
    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-User-Id': uid() },
      body: JSON.stringify({ channel_type: form.channel_type, credentials: form.credentials }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.ok) {
          loadChannels();
          setShowForm(false);
          setForm({ channel_type: 'feishu', credentials: {} });
        }
      });
  };

  const deleteChannel = (chId: number) => {
    fetch('/api/agents/' + agentId + '/channels/' + chId, { method: 'DELETE', headers: { 'X-User-Id': uid() } })
      .then(() => loadChannels());
  };

  const testChannel = (chId: number) => {
    setTesting(chId);
    fetch('/api/agents/' + agentId + '/channels/' + chId + '/test', { method: 'POST', headers: { 'X-User-Id': uid() } })
      .then(r => r.json())
      .then(() => { loadChannels(); setTesting(null); })
      .catch(() => { setTesting(null); });
  };

  const toggleChannel = (ch: any) => {
    const newStatus = ch.status === 'disabled' ? 'draft' : 'disabled';
    fetch('/api/agents/' + agentId + '/channels/' + ch.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-User-Id': uid() },
      body: JSON.stringify({ status: newStatus }),
    })
      .then(r => r.json())
      .then(() => loadChannels());
  };

  const updateCredential = (key: string, value: string) => {
    setForm((f: any) => ({
      ...f,
      credentials: { ...f.credentials, [key]: value },
    }));
  };

  const currentMeta = CHANNEL_META[form.channel_type] || CHANNEL_META['feishu'];
  const inp: React.CSSProperties = { width: '100%', padding: '6px', background: 'var(--bg-input)', color: 'var(--color-text)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11, boxSizing: 'border-box' };
  const lbl: React.CSSProperties = { fontSize: 10, fontWeight: 500, color: 'var(--text-dim)', display: 'block', marginBottom: 2 };

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)', marginBottom: 10 }}>📡 渠道接入</div>

      {channels.map(ch => {
        const meta = CHANNEL_META[ch.channel_type];
        const StatusIcon = STATUS_ICONS[ch.status] || RefreshCw;
        return (
          <div key={ch.id} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
            background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, marginBottom: 6,
          }}>
            <span style={{ fontSize: 18 }}>{meta?.icon || '🔌'}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: 'var(--color-text)', fontWeight: 500 }}>
                {meta?.label || ch.channel_type}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <StatusIcon size={10} style={{ color: STATUS_COLORS[ch.status] }} />
                <span style={{ fontSize: 9, color: STATUS_COLORS[ch.status] }}>
                  {ch.status === 'active' ? '已连接' : ch.status === 'error' ? '连接失败' : ch.status === 'disabled' ? '已禁用' : '草稿'}
                </span>
              </div>
            </div>
            <button onClick={() => testChannel(ch.id)} disabled={testing === ch.id}
              style={{ padding: '2px 8px', fontSize: 10, background: 'none', border: '1px solid var(--border)', borderRadius: 3, cursor: 'pointer', color: 'var(--text-secondary)' }}>
              {testing === ch.id ? '...' : '测试'}
            </button>
            <button onClick={() => toggleChannel(ch)}
              style={{ padding: '2px 8px', fontSize: 10, background: 'none', border: '1px solid var(--border)', borderRadius: 3, cursor: 'pointer', color: ch.status === 'disabled' ? '#5cb878' : 'var(--text-dim)' }}>
              {ch.status === 'disabled' ? '启用' : '禁用'}
            </button>
            <button onClick={() => deleteChannel(ch.id)}
              style={{ padding: '2px 4px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: 10 }}>
              <Trash2 size={12} />
            </button>
          </div>
        );
      })}

      {!showForm && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowForm(true)} style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px',
            background: 'none', border: '1px dashed var(--border)', borderRadius: 6,
            cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 11, flex: 1,
          }}>
            <Plus size={14} /> 添加渠道
          </button>
          <button onClick={() => { setQrScanChannelType('feishu'); setShowQrScan(true); }} style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px',
            background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 6,
            cursor: 'pointer', fontSize: 11,
          }}>
            <QrCode size={14} /> 扫码接入飞书
          </button>
          <button onClick={() => { setQrScanChannelType('dingtalk'); setShowQrScan(true); }} style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px',
            background: 'var(--bg-card)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)', borderRadius: 6,
            cursor: 'pointer', fontSize: 11,
          }}>
            <QrCode size={14} /> 扫码接入钉钉
          </button>
        </div>
      )}

      {showForm && (
        <div style={{ padding: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6 }}>
          <div style={{ marginBottom: 8 }}>
            <label style={lbl}>渠道类型</label>
            <select value={form.channel_type} onChange={e => setForm({ channel_type: e.target.value, credentials: {} })} style={inp}>
              {CHANNEL_TYPES.map(t => (
                <option key={t} value={t}>{CHANNEL_META[t].icon} {CHANNEL_META[t].label}</option>
              ))}
            </select>
          </div>

          {currentMeta.fields.map(f => (
            <div key={f.key} style={{ marginBottom: 6 }}>
              <label style={lbl}>{f.label}</label>
              <input
                type={f.type}
                value={form.credentials[f.key] || ''}
                onChange={e => updateCredential(f.key, e.target.value)}
                placeholder={f.placeholder}
                style={inp}
              />
            </div>
          ))}

          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={saveChannel} style={{
              padding: '6px 16px', background: 'var(--color-primary)', color: '#fff',
              border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11,
            }}>保存</button>
            <button onClick={() => { setShowForm(false); setForm({ channel_type: 'feishu', credentials: {} }); }} style={{
              padding: '6px 12px', background: 'none', border: '1px solid var(--border)',
              borderRadius: 4, cursor: 'pointer', fontSize: 11, color: 'var(--text-secondary)',
            }}>取消</button>
          </div>
        </div>
      )}

      {showQrScan && (
        <QrScanModal
          channelType={qrScanChannelType}
          agentId={agentId}
          onSuccess={(channel) => {
            loadChannels();
            setShowQrScan(false);
          }}
          onClose={() => setShowQrScan(false)}
          onManualEntry={() => {
            setShowQrScan(false);
            setShowForm(true);
            setForm({ channel_type: qrScanChannelType, credentials: {} });
          }}
        />
      )}
    </div>
  );
}
