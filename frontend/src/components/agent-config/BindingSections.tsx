/**
 * 9 · 对外集成（含 9A IM 通道） / 10 · 技能 / 11 · 知识源 / 12 · 编排引用
 *
 * 这四区都是「关系」而不是「字段」，写路径各不相同，所以每一区都必须把**自己的写路径**说清楚：
 * - 9A IM 通道：既有 `ChannelConfig` 组件（真端点 `/api/agents/{id}/channels`），本页只挂载，不重写；
 * - 10 技能：真端点 `/api/agents/{id}/tools`（绑定/解绑即时落库），**不进**页底「保存全部」；
 * - 11 知识源：真端点 `/api/agents/{id}/knowledge-sources`（CRUD + 测试 + 上传）；
 * - 12 编排引用：只读（引用关系由编排持有，原型同此口径）。
 */
import { useEffect, useState } from 'react';
import { Plus, X, Wifi, WifiOff, ExternalLink, Loader2, Upload, Database } from 'lucide-react';
import { Section, Unwired } from './Section';
import { F } from './fields';
import { showValue } from './model';
import ChannelConfigComponent from '../ChannelConfig';

/* ───────────────────────── 9 · 对外集成（9A IM 通道） ───────────────────────── */

export function IntegrationsSection({ agentId, isNew }: { agentId?: number; isNew: boolean }) {
  return (
    <Section
      id="sec9" no={9} title="对外集成"
      note="出站到外部系统（GitHub / CI / 通知）与入站 IM 通道是两条链路，凭据各自属「连接」所有权，不随运行时搬迁。"
      extra={<span className="chip info">9A = 集成（IM 通道）</span>}
    >
      <div>
        <p className="section-title" style={{ fontSize: 11.5 }}>9A · 集成（IM 通道）· 入站</p>
        <p className="page-note" style={{ marginBottom: 8 }}>
          通道 × Agent = 唯一 bot：一个 bot 只服务一个 Agent，杜绝路由歧义；密钥写-only，界面永不回显。
          连接 / 断开 / 改密都是即时请求，**不受本页「保存全部」与「放弃」影响**。
        </p>
        {isNew || !agentId ? (
          <p className="page-note">Agent 保存后才能配置 IM 通道。</p>
        ) : (
          <ChannelConfigComponent agentId={agentId} />
        )}
        <div className="toolbar" style={{ marginTop: 8 }}>
          <a className="btn btn-ghost btn-sm" href="#sec9" aria-label="连接管理说明">
            <ExternalLink size={12} /> 连接管理 →「对外集成」页
          </a>
        </div>
      </div>

      <Unwired>
        出站连接（GitHub issue 跟踪 / CI / Notion / Slack 的「连接 + 凭据主体 + 本 Agent 用途」表）：
        后端无 connections 端点（只有 `channels`，用于入站 IM），本区不渲染示例连接行。
      </Unwired>
    </Section>
  );
}

/* ───────────────────────────── 10 · 技能 ───────────────────────────── */

/**
 * 技能绑定（v23 · multica `agent_skill` 迁移落点）。
 * 口径：**绑定 ≠ 授权** —— 绑定只表示「这个 Agent 可以用这个技能」，调用权仍按执行与安全闸门判定。
 * 数据全部来自真端点，没有一条是页面造的示例。
 */
export function SkillsSection({ agentId, isNew }: { agentId?: number; isNew: boolean }) {
  const [bound, setBound] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [pick, setPick] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  function loadBound(id: number) {
    fetch('/api/agents/' + id + '/tools')
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (d) { setBound(d.tools || []); setError(null); })
      .catch(function (e) { setError('技能绑定读取失败：' + ((e && e.message) || String(e))); });
  }

  useEffect(function () {
    // 目录一次拉全；绑定关系按 Agent 拉（拉不到不影响其它分区，本区就地显错）
    fetch('/api/tools?type=skill')
      .then(function (r) { return r.json(); })
      .then(function (d) { setCatalog(d.tools || []); })
      .catch(function () { setCatalog([]); });
    if (agentId) loadBound(agentId);
  }, [agentId]);

  function bind(toolId: number) {
    if (!agentId) return;
    fetch('/api/agents/' + agentId + '/tools', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool_id: toolId }),
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      setPick('');
      loadBound(agentId);
    }).catch(function (e) { setError('绑定失败：' + ((e && e.message) || String(e))); });
  }

  function unbind(toolId: number) {
    if (!agentId) return;
    fetch('/api/agents/' + agentId + '/tools/' + toolId, { method: 'DELETE' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); loadBound(agentId); })
      .catch(function (e) { setError('解绑失败：' + ((e && e.message) || String(e))); });
  }

  const boundIds = bound.map(function (t: any) { return t.id; });
  const options = catalog.filter(function (s: any) { return boundIds.indexOf(s.id) < 0; });

  return (
    <Section
      id="sec10" no={10} title="技能"
      note="绑定只是「这个 Agent 可以用这个技能」，调用权仍按执行与安全闸门判定。"
      extra={<span className="chip">{'能力 · 技能（' + bound.length + '）'}</span>}
    >
      <div role="region" aria-label="能力技能">
        {error ? <p role="alert" style={F.err}>{error}</p> : null}
        {isNew ? <p style={F.hint}>先保存 Agent，之后才能绑定技能。</p> : null}
        {!isNew ? (
          <div className="toolbar" style={{ margin: '8px 0' }}>
            {bound.map(function (t: any) {
              return (
                <span key={t.id} className="chip" style={{ background: 'var(--purple-bg)', color: 'var(--purple)', borderColor: 'var(--purple)' }}>
                  {t.name}
                  <button type="button" onClick={function () { unbind(t.id); }} title={'解绑 ' + t.name}
                    aria-label={'解绑 ' + t.name}
                    style={{ background: 'none', border: 'none', color: 'var(--purple)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                    <X size={11} />
                  </button>
                </span>
              );
            })}
            {bound.length === 0 ? <span style={F.hint}>尚未绑定任何技能</span> : null}
          </div>
        ) : null}
        {!isNew && agentId ? (
          options.length === 0 ? (
            <p style={F.hint}>暂无可绑定的技能（工具库里还没有未绑定的技能）。</p>
          ) : (
            <div style={F.lineRow1}>
              <select aria-label="选择要绑定的技能" value={pick}
                onChange={function (e) { setPick(e.target.value); }} style={F.full}>
                <option value="">（选择技能）</option>
                {options.map(function (s: any) { return <option key={s.id} value={s.id}>{s.name}</option>; })}
              </select>
              <button type="button" className="btn btn-primary btn-sm" disabled={!pick}
                onClick={function () { if (pick) bind(parseInt(pick, 10)); }}>
                <Plus size={12} /> 绑定
              </button>
            </div>
          )
        ) : null}
      </div>
      <p style={F.hint}>
        本区的绑定/解绑是**即时请求**（专用端点 `POST|DELETE /api/agents/{'{id}'}/tools`），不进页底「保存全部」；
        全字段保存里没有技能字段，因此不存在「保存技能」这一步。
      </p>
    </Section>
  );
}

/* ───────────────────────────── 11 · 知识源 ───────────────────────────── */

/**
 * 知识源挂载（RAG / DB / API / 本地文件）。与技能同属「关系」，全部走 `/api/agents/{id}/knowledge-sources`。
 * 断开只把源移出**本 Agent 的检索范围**，源本身不删（可能被其它 Agent 挂载）。
 */
export function KnowledgeSection({ agentId, isNew }: { agentId?: number; isNew: boolean }) {
  const [sources, setSources] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ source_type: 'http_api', url: '', name: '', description: '', config_json: {} });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(function () {
    if (!agentId) return;
    fetch('/api/agents/' + agentId + '/knowledge-sources')
      .then(function (r) { return r.json(); })
      .then(function (d) { if (Array.isArray(d)) setSources(d); })
      .catch(function (e) { setError('知识源读取失败：' + ((e && e.message) || String(e))); });
  }, [agentId]);

  function saveSource() {
    if (!agentId) return; // 需要先保存 Agent
    const url = '/api/agents/' + agentId + '/knowledge-sources';
    const method = form.id ? 'PUT' : 'POST';
    const apiUrl = form.id ? url + '/' + form.id : url;
    fetch(apiUrl, { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.ok || d.source) {
          var ks = d.source || form;
          if (form.id) {
            setSources(sources.map(function (s: any) { return s.id === ks.id ? ks : s; }));
          } else {
            setSources([ks].concat(sources));
          }
          setShowForm(false);
          setForm({ source_type: 'http_api', url: '', name: '', description: '', config_json: {} });
        } else {
          setError(d.detail || '知识源保存失败');
        }
      })
      .catch(function (e) { setError('知识源保存失败：' + ((e && e.message) || String(e))); });
  }

  function deleteSource(sourceId: number) {
    if (!agentId) return;
    fetch('/api/agents/' + agentId + '/knowledge-sources/' + sourceId, { method: 'DELETE' })
      .then(function () { setSources(sources.filter(function (s: any) { return s.id !== sourceId; })); });
  }

  function testSource(sourceId: number) {
    if (!agentId) return;
    fetch('/api/agents/' + agentId + '/knowledge-sources/' + sourceId + '/test', { method: 'POST' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        setSources(sources.map(function (s: any) {
          if (s.id === sourceId) return Object.assign({}, s, { last_test_ok: d.ok, last_test_at: new Date().toISOString() });
          return s;
        }));
      });
  }

  function upload(file: File) {
    if (!agentId) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('name', file.name);
    fetch('/api/agents/' + agentId + '/knowledge-sources/upload', { method: 'POST', body: fd })
      .then(function (r) { return r.json(); })
      .then(function (d) { if (d.ok && d.source) setSources([d.source].concat(sources)); setUploading(false); })
      .catch(function () { setUploading(false); });
  }

  return (
    <Section
      id="sec11" no={11} title="知识源"
      note="断开只把它移出**本 Agent** 的检索范围，源本身不删（可能被其它 Agent 挂载）；凭据属知识库连接，不随 Agent 复制。"
      extra={<span className="chip mono">{sources.length + ' 源'}</span>}
    >
      {error ? <p role="alert" style={F.err}>{error}</p> : null}
      {isNew ? <p style={F.hint}>Agent 保存后才能挂载知识源。</p> : null}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sources.map(function (ks: any) {
          const isProcessing = ks.status && ['uploading', 'processing', 'indexing'].indexOf(ks.status) >= 0;
          return (
            <div key={ks.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--bg-input)', borderRadius: 6, border: '1px solid var(--border)' }}>
              <span className="chip mono">{ks.source_type}</span>
              <span style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>{ks.name || ks.url}</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{ks.url}</span>
              {isProcessing ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--orange)' }}>
                  <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />{ks.status}
                </span>
              ) : null}
              {ks.status === 'indexed' ? <span className="chip ok">已索引</span> : null}
              {ks.status === 'failed' ? <span className="chip bad">失败</span> : null}
              {ks.last_test_ok === true ? <span title="连接正常"><Wifi size={12} color="var(--green)" /></span> : null}
              {ks.last_test_ok === false ? <span title="连接失败"><WifiOff size={12} color="var(--red)" /></span> : null}
              <button type="button" className="btn btn-ghost btn-sm" onClick={function () { testSource(ks.id); }}>测试</button>
              <button type="button" className="btn btn-ghost btn-sm" aria-label={'编辑知识源 ' + (ks.name || ks.id)}
                onClick={function () { setForm(ks); setShowForm(true); }}>✏️</button>
              <button type="button" className="btn btn-ghost btn-sm" aria-label={'断开知识源 ' + (ks.name || ks.id)}
                title="断开（只移出本 Agent 检索范围）" onClick={function () { deleteSource(ks.id); }}
                style={{ color: 'var(--red)' }}><X size={12} /></button>
            </div>
          );
        })}
        {!showForm && !isNew ? (
          <div className="toolbar">
            <button type="button" className="btn btn-ghost btn-sm" onClick={function () { setShowForm(true); }}>
              <Plus size={12} /> 添加资料源
            </button>
            <label className="btn btn-ghost btn-sm" style={{ cursor: uploading ? 'wait' : 'pointer', opacity: uploading ? 0.5 : 1 }}>
              {uploading ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={12} />}
              {uploading ? '上传中...' : '上传文件'}
              <input type="file" accept=".pdf,.docx,.txt,.md,.py,.js,.json"
                onChange={function (e) { const f = e.target.files && e.target.files[0]; if (f) upload(f); }}
                style={{ display: 'none' }} />
            </label>
          </div>
        ) : null}
      </div>

      {showForm ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, marginTop: 8, background: 'var(--bg-input)', borderRadius: 6, border: '1px solid var(--border)' }}>
          <div style={F.grid2}>
            <div>
              <label style={F.label} htmlFor="ks-type">类型</label>
              <select id="ks-type" value={form.source_type}
                onChange={function (e) { setForm(Object.assign({}, form, { source_type: e.target.value })); }} style={F.full}>
                <option value="rag_api">RAG API</option>
                <option value="mysql">MySQL</option>
                <option value="postgres">PostgreSQL</option>
                <option value="redis">Redis</option>
                <option value="http_api">HTTP API</option>
                <option value="url_crawl">URL 爬取</option>
                <option value="local_file">📂 本地文件</option>
              </select>
            </div>
            <div>
              <label style={F.label} htmlFor="ks-name">名称</label>
              <input id="ks-name" value={form.name} placeholder="知识库/内部文档/用户数据"
                onChange={function (e) { setForm(Object.assign({}, form, { name: e.target.value })); }} style={F.full} />
            </div>
          </div>
          <div>
            <label style={F.label} htmlFor="ks-url">连接地址 (URL)</label>
            <input id="ks-url" value={form.url}
              placeholder={form.source_type === 'mysql' ? 'mysql://user:pass@host:3306/db'
                : form.source_type === 'postgres' ? 'postgresql://user:pass@host:5432/db'
                  : form.source_type === 'redis' ? 'redis://host:6379/0' : 'https://my-rag-api.example.com/query'}
              onChange={function (e) { setForm(Object.assign({}, form, { url: e.target.value })); }} style={F.full} />
          </div>
          <div>
            <label style={F.label} htmlFor="ks-desc">描述</label>
            <input id="ks-desc" value={form.description} placeholder="这个资料源包含什么内容"
              onChange={function (e) { setForm(Object.assign({}, form, { description: e.target.value })); }} style={F.full} />
          </div>
          {(form.source_type === 'mysql' || form.source_type === 'postgres' || form.source_type === 'redis') ? (
            <div style={F.grid2}>
              <div>
                <label style={F.label} htmlFor="ks-user">用户名（可选）</label>
                <input id="ks-user" value={(form.config_json || {}).user || ''}
                  onChange={function (e) { setForm(Object.assign({}, form, { config_json: Object.assign({}, form.config_json || {}, { user: e.target.value }) })); }} style={F.full} />
              </div>
              <div>
                <label style={F.label} htmlFor="ks-pass">密码/Token（可选 · 只写）</label>
                <input id="ks-pass" type="password" value={(form.config_json || {}).password || ''}
                  onChange={function (e) { setForm(Object.assign({}, form, { config_json: Object.assign({}, form.config_json || {}, { password: e.target.value }) })); }} style={F.full} />
              </div>
            </div>
          ) : null}
          {(form.source_type === 'rag_api' || form.source_type === 'http_api') ? (
            <div>
              <label style={F.label} htmlFor="ks-apikey">API Key（可选 · 只写）</label>
              <input id="ks-apikey" type="password" value={(form.config_json || {}).api_key || ''}
                onChange={function (e) { setForm(Object.assign({}, form, { config_json: Object.assign({}, form.config_json || {}, { api_key: e.target.value }) })); }} style={F.full} />
            </div>
          ) : null}
          <div className="toolbar">
            <button type="button" className="btn btn-primary btn-sm" onClick={saveSource}>保存</button>
            <button type="button" className="btn btn-ghost btn-sm"
              onClick={function () { setShowForm(false); setForm({ source_type: 'http_api', url: '', name: '', description: '', config_json: {} }); }}>取消</button>
          </div>
        </div>
      ) : null}

      <p style={F.hint}><Database size={11} style={{ verticalAlign: -1 }} /> 知识源是关系表，不进配置草稿；每次增删测试都是即时请求。</p>
    </Section>
  );
}

/* ───────────────────────────── 12 · 编排引用 ───────────────────────────── */

/**
 * 编排引用（谁在用我）：只读。
 * 原型同口径「本表不可在此编辑：引用关系由编排持有」；本仓后端也确实没有写路径
 * （`workflow_ids` 只在 metrics_api 被读取，`GET /api/agents/{id}` 的 to_dict 未返回它，
 * `PUT` 白名单也不收）——所以**不显示「未引用」这种会被误读成事实的空态**。
 */
export function OrchestrationSection({ data, workflows }: { data: any; workflows: any[] }) {
  const ids: number[] = Array.isArray(data.workflow_ids) ? data.workflow_ids : [];
  return (
    <Section
      id="sec12" no={12} title="编排引用"
      note="只回答「改我会影响谁」：节点级超时 / Token 预算在边上覆盖（边优先于本页的 Agent 级默认值）。"
      extra={<span className="chip warn">只读</span>}
    >
      {ids.length === 0 ? (
        <Unwired>
          本接口未返回 `workflow_ids`，`PUT /api/agents/{'{id}'}` 也不收录 —— 本区无法列出真实引用，
          因此不渲染「未引用」空态（那会被读成事实）。引用清单需后端补「按 Agent 反查编排」端点。
        </Unwired>
      ) : (
        <table className="tbl compact" aria-label="编排引用">
          <thead>
            <tr><th>工作流</th><th>节点数</th><th>状态</th><th>引用</th></tr>
          </thead>
          <tbody>
            {ids.map(function (id: number) {
              const wf = workflows.find(function (w: any) { return w.id === id; });
              return (
                <tr key={id}>
                  <td>{wf ? wf.name : '工作流 #' + id}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{wf ? ((wf.spec_json && wf.spec_json.nodes) || []).length : '—'}</td>
                  <td>{showValue(wf && wf.status)}</td>
                  <td><span className="chip">只读引用</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <p style={F.hint}>删除前置检查复用同一份引用清单（本区只读，不提供解绑入口）。</p>
    </Section>
  );
}
