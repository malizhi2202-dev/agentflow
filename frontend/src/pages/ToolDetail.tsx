import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Trash2, Download, Eye, ShieldAlert, Plus, X } from 'lucide-react';

interface SkillFile { path: string; content: string; }

interface ToolData {
  id?: number; name: string; type: string; description: string;
  content_md: string; token_soft_limit: number; token_hard_limit: number;
  permissions: string[]; gate_pre: string; gate_post: string; io_filter: string;
  /** 多文件技能包（详情接口给全文；列表接口只给 files_count） */
  files_json?: SkillFile[];
  files_count?: number;
}

var emptyTool = function(): ToolData {
  return { name: '', type: 'plugin', description: '', content_md: '', token_soft_limit: 80000, token_hard_limit: 100000, permissions: ['read'], gate_pre: '', gate_post: '', io_filter: 'none', files_json: [] };
};

export default function ToolDetail({ tool, onBack, onSave, onDelete }: {
  tool: ToolData | null; onBack: () => void;
  onSave: (data: ToolData) => void; onDelete?: () => void;
}) {
  var [data, setData] = useState<ToolData>(tool || emptyTool());
  var [saved, setSaved] = useState(false);
  var [newPerm, setNewPerm] = useState('');
  var [showPreview, setShowPreview] = useState(true);
  // 技能文件包：列表接口只给 files_count，详情要按 id 再拉一次
  var [filesLoading, setFilesLoading] = useState(false);
  var [filesError, setFilesError] = useState<string | null>(null);

  useEffect(function() {
    if (tool) {
      var t = Object.assign({}, tool);
      if (typeof t.permissions === 'string') {
        try { t.permissions = JSON.parse(t.permissions); } catch(e) { t.permissions = ['read']; }
      }
      if (!Array.isArray(t.permissions)) t.permissions = ['read'];
      setData(t);
    }
  }, [tool]);

  // 已有技能：挂载后按 id 取详情拿 files_json（列表接口不带文件全文）
  useEffect(function() {
    var existing: any = tool;
    if (!existing || !existing.id || existing.type !== 'skill') return;   // 只有技能有文件包
    if (Array.isArray(existing.files_json) && existing.files_json.length > 0) return;   // 列表已带文件就不重复拉
    setFilesLoading(true);
    fetch('/api/tools/' + existing.id)
      .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function(d) {
        setData(function(prev: any) { return Object.assign({}, prev, { files_json: d.files_json || [] }); });
      })
      .catch(function(e) { setFilesError('技能文件加载失败：' + ((e && e.message) || String(e))); })
      .then(function() { setFilesLoading(false); });
  }, [tool]);

  var setFiles = function(next: SkillFile[]) {
    setData(Object.assign({}, data, { files_json: next }));
  };

  var handleSave = function() {
    var files: SkillFile[] = Array.isArray(data.files_json) ? data.files_json : [];
    if (data.type === 'skill') {
      // 只做格式预校验（与服务端同一口径的**早失败**，不是授权判断）
      var seen: Record<string, boolean> = {};
      for (var i = 0; i < files.length; i++) {
        var p = (files[i].path || '').trim();
        if (!p) { setFilesError('第 ' + (i + 1) + ' 个技能文件缺 path'); return; }
        if (seen[p]) { setFilesError('技能文件 path 重复：' + p); return; }
        seen[p] = true;
      }
    }
    setFilesError(null);
    onSave(Object.assign({}, data, {
      files_json: files.map(function(f) { return { path: (f.path || '').trim(), content: f.content || '' }; }),
    }));
    setSaved(true);
    setTimeout(function() { setSaved(false); }, 1500);
  };
  var removeFile = function(idx: number) {
    var files: SkillFile[] = Array.isArray(data.files_json) ? data.files_json.slice() : [];
    files.splice(idx, 1);
    setFiles(files);
  };
  var addFile = function() {
    var files: SkillFile[] = Array.isArray(data.files_json) ? data.files_json.slice() : [];
    setFiles(files.concat([{ path: '', content: '' }]));
  };
  var updateFile = function(idx: number, patch: Partial<SkillFile>) {
    var files: SkillFile[] = Array.isArray(data.files_json) ? data.files_json.slice() : [];
    files[idx] = Object.assign({}, files[idx], patch);
    setFiles(files);
  };

  var fmtPerms = function(p: any) { if (Array.isArray(p)) return p.join(', '); try { return JSON.parse(p || '[]').join(', '); } catch(e) { return 'read'; } };
  var isNew = !tool || !tool.id;
  var defaultMd = '# ' + (data.name || '工具名称') + '\n\n**类型**: ' + data.type + '\n**描述**: ' + (data.description || '') + '\n\n## 配置\n- token软限制: ' + data.token_soft_limit + '\n- token硬限制: ' + data.token_hard_limit + '\n- 权限: ' + fmtPerms(data.permissions) + '\n\n## 接口定义\n\n```json\n{\n  \n}\n```\n';
  var mdContent = data.content_md || defaultMd;

  // 简易 Markdown 预览
  var previewHtml = mdContent
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h4 style="margin:12px 0 4px;font-size:13px">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 style="margin:14px 0 4px;font-size:15px;font-weight:600">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 style="margin:16px 0 6px;font-size:18px;font-weight:700">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code style="background:var(--bg-input);padding:1px 4px;border-radius:2px;font-family:var(--font-mono);font-size:11px">$1</code>')
    .replace(/^- (.+)$/gm, '<li style="margin-left:16px;font-size:12px">$1</li>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');

  var lineCount = mdContent.split('\n').length;

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto' }}>
      {/* 头部 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={onBack} style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><ArrowLeft size={18} /></button>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, margin: 0, flex: 1 }}>{isNew ? '创建工具' : data.name}</h1>
        {saved && <span style={{ fontSize: 11, color: 'var(--green)', padding: '4px 10px', background: 'var(--green-bg)', borderRadius: 4 }}>已保存</span>}
        {!isNew && <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 3, background: data.type === 'plugin' ? 'var(--blue-bg)' : data.type === 'skill' ? 'var(--green-bg)' : 'var(--purple-bg)', color: data.type === 'plugin' ? 'var(--blue)' : data.type === 'skill' ? 'var(--green)' : 'var(--purple)' }}>{data.type === 'plugin' ? 'Plugin' : data.type === 'skill' ? 'Skill' : 'MCP'}</span>}
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {/* 左侧编辑区 */}
        <div style={{ flex: '1 1 500px', maxWidth: 700, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* 基本信息 */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
            <div>
              <label style={lbl}>名称</label>
              <input value={data.name} onChange={function(e) { setData(Object.assign({}, data, { name: e.target.value })); }} style={inp} placeholder="工具名称" />
            </div>
            <div>
              <label style={lbl}>类型</label>
              <select value={data.type} onChange={function(e) { setData(Object.assign({}, data, { type: e.target.value })); }} style={inp}>
                <option value="plugin">Plugin</option><option value="skill">Skill</option><option value="mcp">MCP</option>
              </select>
            </div>
          </div>
          <div>
            <label style={lbl}>描述</label>
            <input value={data.description} onChange={function(e) { setData(Object.assign({}, data, { description: e.target.value })); }} style={inp} placeholder="一句话描述工具用途" />
          </div>

          {/* Markdown 编辑器 */}
          <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-input)', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>📝 Markdown 编辑器</span>
              <button onClick={function() { setShowPreview(!showPreview); }} style={{ padding: '3px 8px', background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 3, cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', gap: 3 }}>{showPreview ? <Eye size={10} /> : <Eye size={10} />} {showPreview ? '隐藏预览' : '显示预览'}</button>
            </div>
            <div style={{ display: 'flex', minHeight: 400 }}>
              {/* 编辑器 + 行号 */}
              <div style={{ display: 'flex', flex: 1, background: 'var(--bg-input)' }}>
                <div style={{ width: 36, background: 'var(--bg-card)', borderRight: '1px solid var(--border)', paddingTop: 10, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', textAlign: 'right', userSelect: 'none', overflow: 'hidden', flexShrink: 0 }}>
                  {Array.from({ length: Math.max(lineCount, 20) }, function(_, i) { return <div key={i} style={{ lineHeight: '20px', height: 20, paddingRight: 8 }}>{i + 1}</div>; })}
                </div>
                <textarea
                  value={mdContent}
                  onChange={function(e) { setData(Object.assign({}, data, { content_md: e.target.value })); }}
                  spellCheck={false}
                  style={{ flex: 1, padding: '10px 12px', background: 'transparent', color: 'var(--color-text)', fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: '20px', border: 'none', outline: 'none', resize: 'none', minHeight: 400, tabSize: 2 }}
                  placeholder={'# 工具名称\n\n**类型**: plugin\n**描述**: ...\n\n## 配置\n- token软限制: 80000\n- token硬限制: 100000\n- 权限: [read]\n\n## 接口定义\n\n```json\n{\n  \n}\n```'}
                />
              </div>
              {/* 右侧预览 */}
              {showPreview && (
                <div style={{ width: '45%', borderLeft: '1px solid var(--border)', padding: '12px 16px', background: 'var(--bg-card)', overflow: 'auto', maxHeight: 500, fontSize: 12, color: 'var(--color-text)', lineHeight: 1.6, fontFamily: 'var(--font-body)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 8, fontWeight: 600 }}>👁 预览</div>
                  <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                </div>
              )}
            </div>
          </div>

          {/* Token 限制 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={lbl}>Token 软限制</label><input type="number" value={data.token_soft_limit} onChange={function(e) { setData(Object.assign({}, data, { token_soft_limit: parseInt(e.target.value) || 0 })); }} style={inp} /></div>
            <div><label style={lbl}>Token 硬限制</label><input type="number" value={data.token_hard_limit} onChange={function(e) { setData(Object.assign({}, data, { token_hard_limit: parseInt(e.target.value) || 0 })); }} style={inp} /></div>
          </div>

          {/* 权限 */}
          <div>
            <label style={lbl}>权限</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
              {(Array.isArray(data.permissions) ? data.permissions : []).map(function(p, i) {
                return <span key={i} style={{ padding: '3px 8px', background: 'var(--blue-bg)', color: 'var(--blue)', borderRadius: 3, fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>{p} <X size={10} style={{ cursor: 'pointer' }} onClick={function() { var perms = Array.isArray(data.permissions) ? data.permissions.slice() : []; perms.splice(i, 1); setData(Object.assign({}, data, { permissions: perms })); }} /></span>;
              })}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={newPerm} onChange={function(e) { setNewPerm(e.target.value); }} onKeyDown={function(e) { if (e.key === 'Enter') { var arr = Array.isArray(data.permissions) ? data.permissions.slice() : []; setData(Object.assign({}, data, { permissions: arr.concat([newPerm]) })); setNewPerm(''); } }} style={{ ...inp, flex: 1 }} placeholder="例: read, write, execute" />
              <button onClick={function() { if (newPerm.trim()) { var arr = Array.isArray(data.permissions) ? data.permissions.slice() : []; setData(Object.assign({}, data, { permissions: arr.concat([newPerm.trim()]) })); setNewPerm(''); } }} style={{ padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer' }}><Plus size={12} /></button>
            </div>
          </div>

          {/* 技能文件包（v23 · multica 迁移）：技能 = 主 SKILL.md（上方编辑器）+ 附带文件 */}
          {data.type === 'skill' && (
            <div role="region" aria-label="技能文件" style={{ border: '1px solid var(--border)', borderRadius: 6, padding: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>📦 技能文件（{(data.files_json || []).length}）</span>
                {filesLoading && <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>加载中…</span>}
                <button onClick={addFile} style={{ marginLeft: 'auto', padding: '4px 10px', background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 3, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}><Plus size={11} /> 新增文件</button>
              </div>
              <p style={{ fontSize: 10, color: 'var(--text-dim)', margin: '0 0 8px', lineHeight: 1.5 }}>
                附带文件随技能一起保存（path 同技能内唯一）；正文仍是上方主 SKILL.md。
              </p>
              {filesError && <div role="alert" style={{ color: 'var(--red)', fontSize: 11, marginBottom: 8 }}>{filesError}</div>}
              {(data.files_json || []).length === 0 && !filesLoading && (
                <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: 0 }}>该技能暂无附带文件（只保存 SKILL.md 正文）</p>
              )}
              {(data.files_json || []).map(function(f, i) {
                return (
                  <details key={i} style={{ border: '1px solid var(--border)', borderRadius: 4, marginBottom: 6, background: 'var(--bg-card)' }}>
                    <summary style={{ cursor: 'pointer', padding: '6px 8px', fontSize: 11, fontFamily: 'var(--font-mono)', display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📄 {f.path || '(未命名)'}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{(f.content || '').length} 字符</span>
                    </summary>
                    <div style={{ padding: '0 8px 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <input
                        aria-label={'文件路径 ' + (i + 1)}
                        value={f.path}
                        onChange={function(e) { updateFile(i, { path: e.target.value }); }}
                        style={inp}
                        placeholder="references/checklist.md" />
                      <textarea
                        aria-label={'文件内容 ' + (i + 1)}
                        value={f.content}
                        onChange={function(e) { updateFile(i, { content: e.target.value }); }}
                        rows={6}
                        spellCheck={false}
                        style={{ ...inp, resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.5 }} />
                      <button onClick={function() { removeFile(i); }} style={{ alignSelf: 'flex-start', padding: '3px 10px', background: 'none', color: 'var(--color-danger)', border: '1px solid var(--color-danger)', borderRadius: 3, cursor: 'pointer', fontSize: 11 }}>删除该文件</button>
                    </div>
                  </details>
                );
              })}
            </div>
          )}

          {/* 安全闸门 */}
          <details style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
            <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><ShieldAlert size={14} /> 🛡️ 安全闸门配置</summary>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              <input value={data.gate_pre} onChange={function(e) { setData(Object.assign({}, data, { gate_pre: e.target.value })); }} style={inp} placeholder="前置校验规则" />
              <input value={data.gate_post} onChange={function(e) { setData(Object.assign({}, data, { gate_post: e.target.value })); }} style={inp} placeholder="后置校验规则" />
              <select value={data.io_filter} onChange={function(e) { setData(Object.assign({}, data, { io_filter: e.target.value })); }} style={inp}>
                <option value="none">I/O 不过滤</option><option value="sanitize">基础过滤</option><option value="strict">严格过滤</option>
              </select>
            </div>
          </details>

          {/* 按钮 */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSave} style={{ padding: '10px 24px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><Save size={14} /> 保存</button>
            {!isNew && <a href={'/api/tools/' + data.id + '/demo'} target="_blank" style={{ padding: '10px 16px', background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', fontSize: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}><Download size={14} /> 下载 Demo</a>}
            {onDelete && <button onClick={onDelete} style={{ padding: '10px 16px', background: 'none', color: 'var(--color-danger)', border: '1px solid var(--color-danger)', borderRadius: 4, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}><Trash2 size={14} /> 删除</button>}
          </div>

        </div>
      </div>
    </div>
  );
}

var lbl: React.CSSProperties = { fontSize: 11, fontWeight: 500, color: 'var(--text-dim)', display: 'block', marginBottom: 4 };
var inp: React.CSSProperties = { width: '100%', padding: '8px', background: 'var(--bg-input)', color: 'var(--color-text)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, boxSizing: 'border-box' };
