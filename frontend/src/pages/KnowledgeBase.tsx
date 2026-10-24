/**
 * 知识库（原型 6.9 `knowledge.html`，change ui-parity · P3-4）
 *
 * 四节 + 一屏权限矩阵，全部落在语义类上（panel / tbl / chip / toolbar / page-note / section-title），
 * 页名由壳层 `.crumb` 承担 —— 本页不写 h1/h2。
 *
 * 数据诚实性（本轮的关键）：
 *   §0 权限矩阵 = 产品口径（无权限端点）→ 标「口径」+ 说明按钮可用性以后端 403/404 为准
 *   §1 公共知识 = 只有四分类口径（无公共知识表/端点）→ 不摆示例文档
 *   §2 知识空间 = 用**真实项目列表**做 1:1 归属映射；成员 / 文档数 / 最近写入标未接入
 *   §3 外部源   = 真端点（/api/agents/<id>/knowledge-sources + upload + test + delete），
 *                 但「源 ↔ 空间关联」与源级授权没有端点 → 标未接入
 * 写操作失败一律把后端 `detail` 原样显示（stores/knowledge.ts 的 WriteResult 负责带回来）。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Tag } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import PermissionMatrix from '../components/knowledge/PermissionMatrix';
import PublicKnowledgeSection from '../components/knowledge/PublicKnowledgeSection';
import KnowledgeSpacesSection from '../components/knowledge/KnowledgeSpacesSection';
import ExternalSourcesSection from '../components/knowledge/ExternalSourcesSection';
import { SPACE_PROJECT_1TO1 } from '../components/knowledge/policy';
import { useKnowledge, type KnowledgeSource } from '../stores/knowledge';
import { useAgents } from '../stores/agents';
import { useProjects } from '../stores/projects';

type Scope = 'all' | 'public' | 'spaces' | 'external';

const SUPPORTED_EXT = ['.pdf', '.docx', '.txt', '.md', '.py', '.js', '.json'];

export default function KnowledgeBase() {
  const { agents, fetchAgents } = useAgents();
  const { projects, loading: projectsLoading, fetchProjects } = useProjects();
  const {
    sources, loading, fetchKnowledgeSources, createSource, deleteSource, testSource,
    uploadFile, getSourceStatus, tags, fetchTags, createTag, addSourceTag, removeSourceTag,
  } = useKnowledge();

  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [scope, setScope] = useState<Scope>('all');
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // 外部源（§3）的临时态
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testResults, setTestResults] = useState<Record<number, { ok: boolean; detail: string }>>({});
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [actionError, setActionError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 添加外部源表单
  const [showModal, setShowModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('http_api');
  const [formUrl, setFormUrl] = useState('');
  const [formConfigJson, setFormConfigJson] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // 标签创建
  const [showTagModal, setShowTagModal] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [tagError, setTagError] = useState('');

  useEffect(() => {
    fetchAgents();
    fetchProjects();
    fetchTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedAgentId) fetchKnowledgeSources(selectedAgentId, selectedTag || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAgentId, selectedTag]);

  // 处理中的本地文件：3s 轮询状态（真端点 /knowledge-sources/<id>/status）
  useEffect(() => {
    if (!selectedAgentId) return;
    const processing = sources.filter((s) => s.status && ['uploading', 'processing', 'indexing'].includes(s.status));
    if (processing.length === 0) return;
    const timer = setInterval(async () => {
      // 逐个探状态（真端点）+ 整表刷新：进度只看后端，不在前端推测
      for (const src of processing) {
        await getSourceStatus(selectedAgentId, src.id);
      }
      fetchKnowledgeSources(selectedAgentId);
    }, 3000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAgentId, sources]);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || null;

  // ── 写操作：失败 detail 原样透传 ───────────────────────────────
  const handleAddSource = async () => {
    setFormError('');
    if (!formName.trim()) { setFormError('请输入外部源名称'); return; }
    if (!formUrl.trim()) { setFormError('请输入 URL'); return; }
    let configJson: Record<string, any> = {};
    if (formConfigJson.trim()) {
      try {
        configJson = JSON.parse(formConfigJson);
      } catch {
        setFormError('config_json 格式错误，请输入有效的 JSON');
        return;
      }
    }
    setSubmitting(true);
    try {
      const res = await createSource(selectedAgentId!, {
        name: formName.trim(),
        source_type: formType as KnowledgeSource['source_type'],
        url: formUrl.trim(),
        config_json: configJson,
        enabled: true,
      });
      if (res.ok) {
        setShowModal(false);
        setFormName(''); setFormType('http_api'); setFormUrl(''); setFormConfigJson('');
      } else {
        setFormError(res.error || '创建失败');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = useCallback(async (file: File) => {
    if (!selectedAgentId) return;
    setUploadError('');
    setUploading(true);
    try {
      const res = await uploadFile(selectedAgentId, file, file.name, '');
      if (!res.ok) {
        // 后端 detail 原样显示（原型口径：400「不支持的文件类型: .exe」/「文件过大: …」）
        setUploadError(res.error || '上传失败');
      }
    } finally {
      setUploading(false);
    }
  }, [selectedAgentId, uploadFile]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
    if (!SUPPORTED_EXT.includes(ext)) {
      setUploadError(`不支持的文件类型: ${ext}`);
      return;
    }
    handleFileUpload(file);
  };

  const handleTest = async (sourceId: number) => {
    if (!selectedAgentId) return;
    setTestingId(sourceId);
    try {
      const res = await testSource(selectedAgentId, sourceId);
      if (res.ok && res.data) {
        setTestResults((prev) => ({ ...prev, [sourceId]: res.data as { ok: boolean; detail: string } }));
      } else {
        setTestResults((prev) => ({ ...prev, [sourceId]: { ok: false, detail: res.error || '测试失败' } }));
      }
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedAgentId || deleteId === null) return;
    const res = await deleteSource(selectedAgentId, deleteId);
    if (!res.ok) setActionError(res.error || '删除失败');
    setDeleteId(null);
  };

  const handleCreateTag = async () => {
    setTagError('');
    if (!newTagName.trim()) { setTagError('请输入标签名称'); return; }
    const res = await createTag(newTagName.trim());
    if (res.ok) {
      setShowTagModal(false);
      setNewTagName('');
    } else {
      setTagError(res.error || '创建标签失败');
    }
  };

  const showPublic = scope === 'all' || scope === 'public';
  const showSpaces = scope === 'all' || scope === 'spaces';
  const showExternal = scope === 'all' || scope === 'external';

  return (
    <div className="app-body">
      {/* ── 页级工具栏（页名在壳层 .crumb） ── */}
      <div className="panel">
        <div className="toolbar">
          <span className="section-title" style={{ margin: 0 }}>知识库 · 公共知识 + 知识空间（与项目 1:1）</span>
          <span className="chip">公共 4 类 · 全局只读</span>
          <span className="chip mono">空间 {projects.length} · 与项目 1:1</span>
          <span className="chip mono">外部源 {sources.length}</span>
          <span className="grow" />
          <button className="btn btn-ghost btn-sm" disabled title={SPACE_PROJECT_1TO1}>
            + 新建空间
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => { setShowModal(true); setFormError(''); }}>
            <Plus size={13} /> 添加外部源
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => { setShowTagModal(true); setTagError(''); }}>
            <Tag size={13} /> 新建标签
          </button>
        </div>

        <div className="toolbar" style={{ marginTop: 6 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="搜索知识"
            placeholder="搜索空间 / 外部源名称…"
            style={{
              padding: '5px 10px', background: 'var(--bg-input)', color: 'var(--text-color)',
              border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, minWidth: 220,
            }}
          />
          <label style={{ fontSize: 11.5, color: 'var(--text-muted)' }} htmlFor="kb-scope">范围</label>
          <select
            id="kb-scope"
            value={scope}
            onChange={(e) => setScope(e.target.value as Scope)}
            style={{
              padding: '5px 8px', background: 'var(--bg-input)', color: 'var(--text-color)',
              border: '1px solid var(--border)', borderRadius: 4, fontSize: 12,
            }}
          >
            <option value="all">全部（公共 + 空间 + 外部源）</option>
            <option value="public">仅公共知识</option>
            <option value="spaces">仅知识空间</option>
            <option value="external">仅外部源</option>
          </select>
          <span className="grow" />
          <label style={{ fontSize: 11.5, color: 'var(--text-muted)' }} htmlFor="kb-agent">外部源所属 Agent</label>
          <select
            id="kb-agent"
            value={selectedAgentId ?? ''}
            onChange={(e) => {
              const id = e.target.value ? Number(e.target.value) : null;
              setSelectedAgentId(id);
              setTestResults({});
              setActionError('');
            }}
            style={{
              padding: '5px 8px', background: 'var(--bg-input)', color: 'var(--text-color)',
              border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, minWidth: 180,
            }}
          >
            <option value="">-- 请选择 Agent --</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>

        <p className="page-note" style={{ marginTop: 6 }}>
          搜索 / 范围两个筛选跨节生效；但<b>写操作只在空间层出现</b> —— 公共知识行只有「查看 · 关联到空间」，
          外部源行只有「测试连接 / 关联到空间 / 删除」。缺的端点如实标未接入，不造数据。
        </p>
      </div>

      {actionError && (
        <div role="alert" className="panel" style={{ borderColor: 'var(--red)', color: 'var(--red)' }}>
          {actionError}
        </div>
      )}

      <PermissionMatrix />
      {showPublic && <PublicKnowledgeSection />}
      {showSpaces && (
        <KnowledgeSpacesSection projects={projects} loading={projectsLoading} search={search} />
      )}
      {showExternal && (
        <ExternalSourcesSection
          agentId={selectedAgentId}
          agentName={selectedAgent?.name || null}
          sources={sources}
          loading={loading}
          search={search}
          tags={tags}
          selectedTag={selectedTag}
          onSelectTag={setSelectedTag}
          testingId={testingId}
          testResults={testResults}
          onTest={handleTest}
          onDelete={(id) => setDeleteId(id)}
          uploading={uploading}
          dragOver={dragOver}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
          onDrop={handleDrop}
          onPickFile={() => fileInputRef.current?.click()}
          onAddSource={() => { setShowModal(true); setFormError(''); }}
          onRemoveTag={(sourceId, tagId) => { removeSourceTag(sourceId, tagId).then(() => { if (selectedAgentId) fetchKnowledgeSources(selectedAgentId, selectedTag || undefined); }); }}
          onAddTag={(sourceId, tagId) => { addSourceTag(sourceId, tagId).then(() => { if (selectedAgentId) fetchKnowledgeSources(selectedAgentId, selectedTag || undefined); }); }}
          uploadError={uploadError}
        />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={SUPPORTED_EXT.join(',')}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }}
        style={{ display: 'none' }}
      />

      {/* ── 添加外部源（真端点 POST /knowledge-sources） ── */}
      {showModal && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowModal(false)}
          role="dialog" aria-modal="true" aria-label="添加外部源"
        >
          <div
            className="panel"
            style={{ maxWidth: 520, width: '90%', padding: '20px 22px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="toolbar" style={{ marginBottom: 8 }}>
              <span className="section-title" style={{ margin: 0 }}>添加外部源</span>
              <span className="grow" />
              <span className="chip">凭据只写不读</span>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              <label style={{ fontSize: 12 }}>
                名称 <span style={{ color: 'var(--red)' }}>*</span>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="例如：Confluence · 架构决策记录"
                  aria-label="外部源名称"
                  style={{ width: '100%', marginTop: 4, padding: '6px 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-color)', fontSize: 12, boxSizing: 'border-box' }}
                />
              </label>
              <label style={{ fontSize: 12 }}>
                类型
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  aria-label="外部源类型"
                  style={{ width: '100%', marginTop: 4, padding: '6px 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-color)', fontSize: 12 }}
                >
                  <option value="http_api">HTTP API</option>
                  <option value="rag_api">RAG API</option>
                  <option value="mysql">MySQL</option>
                  <option value="postgres">PostgreSQL</option>
                  <option value="redis">Redis</option>
                  <option value="url_crawl">URL 抓取</option>
                  <option value="local_file">本地文件</option>
                </select>
              </label>
              <label style={{ fontSize: 12 }}>
                URL <span style={{ color: 'var(--red)' }}>*</span>
                <input
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="https://…"
                  aria-label="外部源 URL"
                  style={{ width: '100%', marginTop: 4, padding: '6px 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-color)', fontSize: 12, boxSizing: 'border-box' }}
                />
              </label>
              <label style={{ fontSize: 12 }}>
                config_json（选填 · 凭据只写不读，页面不回显）
                <textarea
                  value={formConfigJson}
                  onChange={(e) => setFormConfigJson(e.target.value)}
                  placeholder='{"api_key": "…"}'
                  rows={3}
                  aria-label="外部源连接配置"
                  style={{ width: '100%', marginTop: 4, padding: '6px 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-color)', fontSize: 12, fontFamily: 'var(--font-mono)', boxSizing: 'border-box' }}
                />
              </label>
              {formError && <div role="alert" style={{ color: 'var(--red)', fontSize: 12 }}>{formError}</div>}
            </div>
            <div className="toolbar" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setShowModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleAddSource} disabled={submitting}>
                {submitting ? '提交中…' : '确认添加'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 新建标签（真端点 POST /knowledge/tags） ── */}
      {showTagModal && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowTagModal(false)}
          role="dialog" aria-modal="true" aria-label="新建标签"
        >
          <div className="panel" style={{ maxWidth: 380, width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <div className="toolbar" style={{ marginBottom: 8 }}>
              <span className="section-title" style={{ margin: 0 }}>新建标签</span>
            </div>
            <input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="例如：规范、接口、安全"
              aria-label="标签名称"
              style={{ width: '100%', padding: '6px 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-color)', fontSize: 12, boxSizing: 'border-box' }}
            />
            {tagError && <div role="alert" style={{ color: 'var(--red)', fontSize: 12, marginTop: 6 }}>{tagError}</div>}
            <div className="toolbar" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setShowTagModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleCreateTag}>创建标签</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        title="确认删除外部源"
        message="删除只影响该 Agent 的检索范围：已索引内容一并移除，历史会话引用保持快照（破坏性操作需二次确认）。"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
