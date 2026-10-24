/**
 * Agent 详情（原型 6.4 · 独立页形态）· 四标签：编辑 / 记忆 / 对话 / 监控
 *
 * 为什么本文件变薄：编辑标签已按原型改造成 **16 分区配置页**
 * （`components/agent-config/`，锚点 sec1…sec16），十六个分区的字段、校验与保存口径都在那边；
 * 本文件只留页面骨架（返回 / 名称 / 四标签）与另外三个标签的真实逻辑
 * （记忆 CRUD、对话、监控），避免又长出一份「什么都在里面」的巨型组件。
 *
 * 纪律：页面名归壳层 `.crumb`，页内不写 h1/h2（已有用例断言页内不重复页名）；
 * 这里只是把 Agent 名称绑在标题位上，用普通 span 承载。
 */
import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, X, ExternalLink } from 'lucide-react';
import ChatWindow from '../components/ChatWindow';
import EntityBreakdownPanel from '../components/EntityBreakdownPanel';
import AgentConfigEditor from '../components/agent-config/AgentConfigEditor';

var lbl: React.CSSProperties = { fontSize: 11, fontWeight: 500, color: 'var(--text-dim)', display: 'block', marginBottom: 4 };
var inp: React.CSSProperties = { width: '100%', padding: '8px', background: 'var(--bg-input)', color: 'var(--color-text)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, boxSizing: 'border-box' };
var hintS: React.CSSProperties = { fontSize: 10, color: 'var(--text-dim)', margin: '4px 0 0', lineHeight: 1.5 };

export default function AgentDetail({ agent, onBack, onSave, onDelete, saveError }: {
  agent: any; onBack: () => void; onSave: (data: any) => void; onDelete?: () => void; saveError?: string | null;
}) {
  var isNew = !agent || !agent.id;
  // 常规字段的期望态（页面持有）：编辑标签的十六个分区通过 patch 改它，保存时由 AgentConfigEditor 组装
  var [data, setData] = useState<any>(Object.assign({
    name: '', description: '', runtime: '', model_name: '',
    workflow_ids: [], token_soft_limit: 800000, token_hard_limit: 1000000,
    io_filter: 'none', system_prompt: '', role_def: '', sop: '',
  }, agent || {}));
  var [tab, setTab] = useState('edit');
  var [workflows, setWorkflows] = useState<any[]>([]);

  // 记忆
  var [memories, setMemories] = useState<any[]>([]);
  var [memoryChannels, setMemoryChannels] = useState<any>({});
  var [showMemForm, setShowMemForm] = useState(false);
  var [memForm, setMemForm] = useState<any>({ channel: 'web', key: '', value: '', memory_type: 'fact', priority: 5 });
  // 对话
  var [chatMessages, setChatMessages] = useState<any[]>([]);
  var [chatLoading, setChatLoading] = useState(false);
  var [chatError, setChatError] = useState<string | null>(null);
  var [chatConversationId, setChatConversationId] = useState<number | null>(null);

  /** 分区 → 期望态：函数式更新，避免十六个分区在同一 tick 内互相覆盖 */
  var patch = function (p: any) {
    setData(function (prev: any) { return Object.assign({}, prev, p); });
  };

  useEffect(function () {
    fetch('/api/workflows').then(function (r) { return r.json(); }).then(function (d) { setWorkflows(d.workflows || []); });
    if (agent?.id) { loadMemories(); loadMemoryStats(); }
  }, [agent]);

  // 记忆 CRUD（真端点 /api/agents/{id}/memory）
  var loadMemories = function () {
    if (!agent?.id) return;
    fetch('/api/agents/' + agent.id + '/memory?limit=100')
      .then(function (r) { return r.json(); }).then(function (d) { if (Array.isArray(d)) setMemories(d); });
  };
  var loadMemoryStats = function () {
    if (!agent?.id) return;
    fetch('/api/agents/' + agent.id + '/memory/channels')
      .then(function (r) { return r.json(); }).then(function (d) { setMemoryChannels(d.channels || {}); });
  };
  var saveMemory = function () {
    if (!agent?.id) return;
    fetch('/api/agents/' + agent.id + '/memory', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({}, memForm, { value: (function () { try { return JSON.parse(memForm.value); } catch (e) { return memForm.value; } })() })),
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (d.ok) { setShowMemForm(false); setMemForm({ channel: 'web', key: '', value: '', memory_type: 'fact', priority: 5 }); loadMemories(); loadMemoryStats(); }
    });
  };
  var deleteMemory = function (mid: number) {
    if (!agent?.id) return;
    fetch('/api/agents/' + agent.id + '/memory/' + mid, { method: 'DELETE' })
      .then(function () { loadMemories(); loadMemoryStats(); });
  };

  // 对话（一条消息 = 一个 run，回复写回同一会话）
  var sendChatMessage = function (content: string) {
    setChatLoading(true); setChatError(null);
    var tempMsg = { id: Date.now(), role: 'user', content: content, status: 'done', created_at: new Date().toISOString() };
    setChatMessages(function (prev: any[]) { return prev.concat([tempMsg]); });
    fetch('/api/agents/' + agent.id + '/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: content, conversation_id: chatConversationId }),
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (d.ok) {
        setChatMessages(function (prev: any[]) { return prev.filter(function (m) { return m.id !== tempMsg.id; }).concat([d.user_message, d.agent_message]); });
        setChatConversationId(d.conversation_id);
        if (d.agent_message && d.agent_message.status === 'error') setChatError(d.agent_message.content);
      } else {
        setChatError(d.detail || '发送失败');
      }
      setChatLoading(false);
    }).catch(function () { setChatLoading(false); setChatError('网络错误'); });
  };

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <button onClick={onBack} aria-label="返回" style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={18} />
        </button>
        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
          {isNew ? '创建 Agent' : (data.name || agent?.name || 'Agent')}
        </span>
        {!isNew && <span className="chip mono">{'ID ' + agent.id}</span>}
      </div>

      {!isNew && (
        <div className="tab-bar" aria-label="Agent 详情标签">
          {['edit', 'memory', 'chat', 'monitor'].map(function (t) {
            var label = t === 'edit' ? '✏️ 编辑' : t === 'memory' ? '🧠 记忆' : t === 'chat' ? '💬 对话' : '📊 监控';
            return (
              <button key={t} aria-current={tab === t ? 'page' : undefined} className={'tab' + (tab === t ? ' active' : '')}
                onClick={function () { setTab(t); }}>
                {label}
              </button>
            );
          })}
        </div>
      )}

      {tab === 'edit' && (
        <AgentConfigEditor
          key={agent?.id || 'new-agent'}
          agent={agent}
          data={data}
          patch={patch}
          onSave={onSave}
          onDelete={onDelete}
          saveError={saveError}
          workflows={workflows}
        />
      )}

      {tab === 'chat' && agent && agent.id && (
        <div style={{ height: 'calc(100vh - 200px)', minHeight: 400 }}>
          <ChatWindow
            agentId={agent.id}
            agentName={agent.name}
            messages={chatMessages}
            loading={chatLoading}
            error={chatError}
            onSend={function (content: string) { sendChatMessage(content); }}
            onRetry={function () { setChatError(null); }}
            extraHeader={
              <button onClick={function () { setTab('edit'); }}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: 11, background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                <ExternalLink size={12} /> 发布到渠道
              </button>
            }
          />
        </div>
      )}

      {tab === 'memory' && (
        <div style={{ maxWidth: 900 }}>
          {/* 跨渠道统计卡片 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: 16 }}>
            {Object.keys(memoryChannels).map(function (ch: string) {
              var s = memoryChannels[ch];
              return (
                <div key={ch} style={{ background: 'var(--bg-card)', borderRadius: 8, padding: 12, border: '1px solid var(--border)', textAlign: 'center' }}>
                  <div style={{ fontSize: 18 }}>{ch === 'web' ? '🌐' : ch === 'feishu' ? '🐦' : ch === 'dingtalk' ? '📌' : ch === 'wechat_work' ? '💬' : ch === 'slack' ? '💎' : ch === 'telegram' ? '✈️' : '🔌'}</div>
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
              var channelIcon = m.channel === 'web' ? '🌐' : m.channel === 'feishu' ? '🐦' : m.channel === 'dingtalk' ? '📌' : m.channel === 'wechat_work' ? '💬' : m.channel === 'slack' ? '💎' : m.channel === 'telegram' ? '✈️' : '🔌';
              var typeColor = m.memory_type === 'preference' ? '#a78bfa' : m.memory_type === 'fact' ? '#5cb878' : m.memory_type === 'conversation' ? '#548cf0' : '#e8a450';
              return (
                <div key={m.id} style={{ background: 'var(--bg-card)', borderRadius: 6, padding: '10px 12px', border: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ fontSize: 16 }}>{channelIcon}</span>
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
          <p style={hintS}>记忆条目按渠道/类型归档；写入是即时请求，不进编辑标签的「保存全部」。</p>
        </div>
      )}

      {tab === 'monitor' && agent?.id && (
        <EntityBreakdownPanel entityType="agent" entityId={agent.id} entityName={agent.name || 'Agent'} />
      )}
    </div>
  );
}
