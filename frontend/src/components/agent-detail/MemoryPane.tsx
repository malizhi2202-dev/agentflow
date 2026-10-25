/**
 * 记忆栏（v26-agent-ui · 从 AgentDetail 壳层原样搬家）
 *
 * 真端点 /api/agents/{id}/memory*（写是即时请求，不进「能力/设置」的保存条草稿）。
 * 原型把记忆呈现为概览只读卡 + 抽屉；本仓已有完整 CRUD，v26 裁定保留为顶层栏
 * （差异登记 RULINGS §五点六 R26-2，退役条件=并入概览卡的后继批次）。
 */
import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';

var lbl: React.CSSProperties = { fontSize: 11, fontWeight: 500, color: 'var(--text-dim)', display: 'block', marginBottom: 4 };
var inp: React.CSSProperties = { width: '100%', padding: '8px', background: 'var(--bg-input)', color: 'var(--color-text)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, boxSizing: 'border-box' };
var hintS: React.CSSProperties = { fontSize: 10, color: 'var(--text-dim)', margin: '4px 0 0', lineHeight: 1.5 };

const chIcon = function (ch: string) {
  return ch === 'web' ? '🌐' : ch === 'feishu' ? '🐦' : ch === 'dingtalk' ? '📌' : ch === 'wechat_work' ? '💬' : ch === 'slack' ? '💎' : ch === 'telegram' ? '✈️' : '🔌';
};

export default function MemoryPane({ agentId }: { agentId: number }) {
  var [memories, setMemories] = useState<any[]>([]);
  var [memoryChannels, setMemoryChannels] = useState<any>({});
  var [showMemForm, setShowMemForm] = useState(false);
  var [memForm, setMemForm] = useState<any>({ channel: 'web', key: '', value: '', memory_type: 'fact', priority: 5 });

  // 记忆 CRUD（真端点 /api/agents/{id}/memory）
  var loadMemories = function () {
    fetch('/api/agents/' + agentId + '/memory?limit=100')
      .then(function (r) { return r.json(); }).then(function (d) { if (Array.isArray(d)) setMemories(d); });
  };
  var loadMemoryStats = function () {
    fetch('/api/agents/' + agentId + '/memory/channels')
      .then(function (r) { return r.json(); }).then(function (d) { setMemoryChannels(d.channels || {}); });
  };
  useEffect(function () { loadMemories(); loadMemoryStats(); }, [agentId]);

  var saveMemory = function () {
    fetch('/api/agents/' + agentId + '/memory', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({}, memForm, { value: (function () { try { return JSON.parse(memForm.value); } catch (e) { return memForm.value; } })() })),
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (d.ok) { setShowMemForm(false); setMemForm({ channel: 'web', key: '', value: '', memory_type: 'fact', priority: 5 }); loadMemories(); loadMemoryStats(); }
    });
  };
  var deleteMemory = function (mid: number) {
    fetch('/api/agents/' + agentId + '/memory/' + mid, { method: 'DELETE' })
      .then(function () { loadMemories(); loadMemoryStats(); });
  };

  return (
    <div style={{ maxWidth: 900 }}>
      {/* 跨渠道统计卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: 16 }}>
        {Object.keys(memoryChannels).map(function (ch: string) {
          var s = memoryChannels[ch];
          return (
            <div key={ch} style={{ background: 'var(--bg-card)', borderRadius: 8, padding: 12, border: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ fontSize: 18 }}>{chIcon(ch)}</div>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}>{s.total}</div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{ch}</div>
              <div style={{ fontSize: 9, color: 'var(--text-dim)' }}>{Object.keys(s.types || {}).join(', ')}</div>
            </div>
          );
        })}
        {Object.keys(memoryChannels).length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-dim)', padding: 20 }}>暂无记忆数据</div>}
      </div>

      {/* 记忆列表 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span className="section-title" style={{ fontSize: 13 }}>📝 记忆条目（{memories.length}）</span>
        {!showMemForm && <button onClick={function () { setShowMemForm(true); }} className="btn btn-primary btn-sm"><Plus size={13} /> 添加记忆</button>}
      </div>

      {/* 添加记忆表单 */}
      {showMemForm && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, background: 'var(--bg-input)', borderRadius: 6, border: '1px solid var(--border)', marginBottom: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <div>
              <label style={lbl}>渠道</label>
              <select aria-label="记忆渠道" value={memForm.channel} onChange={function (e) { setMemForm(Object.assign({}, memForm, { channel: e.target.value })); }} style={inp}>
                <option value="web">🌐 Web</option><option value="feishu">🐦 飞书</option><option value="dingtalk">📌 钉钉</option><option value="wechat_work">💬 企微</option><option value="slack">💎 Slack</option><option value="telegram">✈️ Telegram</option><option value="api">🔌 API</option>
              </select>
            </div>
            <div>
              <label style={lbl}>类型</label>
              <select aria-label="记忆类型" value={memForm.memory_type} onChange={function (e) { setMemForm(Object.assign({}, memForm, { memory_type: e.target.value })); }} style={inp}>
                <option value="fact">📋 事实</option><option value="preference">⭐ 偏好</option><option value="conversation">💬 对话</option><option value="context">📎 上下文</option>
              </select>
            </div>
          </div>
          <div><label style={lbl}>Key</label><input aria-label="记忆 Key" value={memForm.key} onChange={function (e) { setMemForm(Object.assign({}, memForm, { key: e.target.value })); }} style={inp} placeholder="user_preference / project_context" /></div>
          <div><label style={lbl}>Value (JSON)</label><textarea aria-label="记忆 Value" value={memForm.value} onChange={function (e) { setMemForm(Object.assign({}, memForm, { value: e.target.value })); }} rows={3} style={{ ...inp, resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: 11 }} placeholder='{"language":"zh","tone":"formal"}' /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <div><label style={lbl}>优先级 (1-10)</label><input type="number" aria-label="记忆优先级" value={memForm.priority} onChange={function (e) { setMemForm(Object.assign({}, memForm, { priority: parseInt(e.target.value) || 5 })); }} style={inp} min={1} max={10} /></div>
            <div><label style={lbl}>TTL (秒, 空=永久)</label><input type="number" aria-label="记忆 TTL" value={memForm.ttl_seconds || ''} onChange={function (e) { setMemForm(Object.assign({}, memForm, { ttl_seconds: e.target.value ? parseInt(e.target.value) : null })); }} style={inp} placeholder="86400 = 1天" /></div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={saveMemory} className="btn btn-primary btn-sm">保存</button>
            <button onClick={function () { setShowMemForm(false); }} className="btn btn-ghost btn-sm">取消</button>
          </div>
        </div>
      )}

      {/* 记忆条目列表 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {memories.map(function (m: any) {
          var typeColor = m.memory_type === 'preference' ? '#a78bfa' : m.memory_type === 'fact' ? '#5cb878' : m.memory_type === 'conversation' ? '#548cf0' : '#e8a450';
          return (
            <div key={m.id} style={{ background: 'var(--bg-card)', borderRadius: 6, padding: '10px 12px', border: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ fontSize: 16 }}>{chIcon(m.channel)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}>{m.key}</span>
                  <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 3, background: typeColor + '20', color: typeColor }}>{m.memory_type}</span>
                  {m.priority >= 8 && <span className="badge badge-red">高优先级</span>}
                  {m.expires_at && <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>⏰ {new Date(m.expires_at).toLocaleString()}</span>}
                </div>
                <pre style={{ margin: 0, fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 80, overflow: 'auto' }}>{JSON.stringify(m.value, null, 2)}</pre>
                <div style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 4 }}>
                  {m.channel} · {m.session_id || '无会话'} · {m.updated_at ? new Date(m.updated_at).toLocaleString() : ''}
                </div>
              </div>
              <button onClick={function () { deleteMemory(m.id); }} aria-label={'删除记忆 ' + m.key} style={{ padding: 2, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}><X size={14} /></button>
            </div>
          );
        })}
        {memories.length === 0 && !showMemForm && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>
            <p style={{ fontSize: 28, margin: '0 0 8px' }}>🧠</p>
            <p style={{ fontSize: 13, margin: 0 }}>暂无记忆数据</p>
            <p style={{ fontSize: 11, margin: '4px 0' }}>Agent 运行时会自动记录跨渠道记忆</p>
          </div>
        )}
      </div>
      <p style={hintS}>记忆条目按渠道/类型归档；写入是即时请求，不进「能力/设置」栏底部的「保存全部」。</p>
    </div>
  );
}
