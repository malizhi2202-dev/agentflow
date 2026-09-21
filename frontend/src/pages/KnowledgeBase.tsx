import { useEffect, useState, useRef, useCallback } from 'react';
import { BookOpen, Plus, Trash2, Database, Globe, Server, Network, Cable, RefreshCw, CheckCircle, XCircle, FolderOpen, Upload, FileText, Loader2, Tag } from 'lucide-react';
import { useKnowledge, KnowledgeSource, KnowledgeTag, SourceStatus } from '../stores/knowledge';
import { useAgents } from '../stores/agents';
import ConfirmDialog from '../components/ConfirmDialog';

// Brain icon fallback
const BrainIcon = ({ size = 14 }: { size?: number }) => <span style={{ fontSize: size, lineHeight: 1 }}>🧠</span>;

const SOURCE_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  rag_api: { label: 'RAG API', icon: <BrainIcon size={14} /> },
  mysql: { label: 'MySQL', icon: <Database size={14} /> },
  postgres: { label: 'PostgreSQL', icon: <Database size={14} /> },
  redis: { label: 'Redis', icon: <Server size={14} /> },
  http_api: { label: 'HTTP API', icon: <Globe size={14} /> },
  url_crawl: { label: 'URL 抓取', icon: <Network size={14} /> },
  local_file: { label: '本地文件', icon: <FolderOpen size={14} /> },
};

function sourceTypeIcon(type: string) {
  const cfg = SOURCE_TYPE_CONFIG[type];
  if (cfg) return cfg.icon;

  const icons: Record<string, string> = {
    rag_api: '🧠', mysql: '🐬', postgres: '🐘', redis: '🔴', http_api: '🌐', url_crawl: '🕸️', local_file: '📂',
  };
  return <span style={{ fontSize: 14 }}>{icons[type] || '📁'}</span>;
}

function sourceTypeLabel(type: string) {
  const cfg = SOURCE_TYPE_CONFIG[type];
  return cfg ? cfg.label : type;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; progress: number }> = {
  uploading: { label: '上传中', color: '#f59e0b', progress: 10 },
  processing: { label: '解析中', color: '#3b82f6', progress: 35 },
  indexing: { label: '索引中', color: '#8b5cf6', progress: 70 },
  indexed: { label: '已完成', color: '#10b981', progress: 100 },
  failed: { label: '失败', color: '#ef4444', progress: 0 },
};

export default function KnowledgeBase() {
  const { agents, fetchAgents } = useAgents();
  const { sources, loading, fetchKnowledgeSources, createSource, deleteSource, testSource, uploadFile, getSourceStatus, tags, fetchTags, createTag, deleteTag, addSourceTag, removeSourceTag } = useKnowledge();

  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<Record<number, { ok: boolean; detail: string }>>({});

  // 标签状态
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showTagModal, setShowTagModal] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6');
  const [tagError, setTagError] = useState('');

  // 表单状态
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('http_api');
  const [formUrl, setFormUrl] = useState('');
  const [formConfigJson, setFormConfigJson] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 文件上传状态
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 轮询状态
  const [statusPolling, setStatusPolling] = useState<Record<number, SourceStatus | null>>({});

  useEffect(() => {
    fetchAgents();
    fetchTags();
  }, []);

  useEffect(() => {
    if (selectedAgentId) {
      fetchKnowledgeSources(selectedAgentId, selectedTag || undefined);
    }
  }, [selectedAgentId, selectedTag]);

  // 轮询处理中的资料源状态
  useEffect(() => {
    if (!selectedAgentId) return;
    const processingSources = sources.filter(
      (s) => s.status && ['uploading', 'processing', 'indexing'].includes(s.status)
    );
    if (processingSources.length === 0) return;

    const timer = setInterval(async () => {
      for (const src of processingSources) {
        const status = await getSourceStatus(selectedAgentId, src.id);
        if (status) {
          setStatusPolling((prev) => ({ ...prev, [src.id]: status }));
        }
      }
      // Refresh full list
      fetchKnowledgeSources(selectedAgentId);
    }, 3000);

    return () => clearInterval(timer);
  }, [selectedAgentId, sources]);

  const handleAdd = async () => {
    setFormError('');
    if (!formName.trim()) { setFormError('请输入资料源名称'); return; }
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
      const result = await createSource(selectedAgentId!, {
        name: formName.trim(),
        source_type: formType as KnowledgeSource['source_type'],
        url: formUrl.trim(),
        config_json: configJson,
        enabled: true,
      });
      if (result) {
        setShowModal(false);
        resetForm();
      } else {
        setFormError('创建失败，请重试');
      }
    } catch {
      setFormError('创建失败，请检查网络连接');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormType('http_api');
    setFormUrl('');
    setFormConfigJson('');
    setFormError('');
  };

  // 文件上传处理
  const handleFileUpload = useCallback(async (file: File) => {
    if (!selectedAgentId) return;
    setUploadError('');
    setUploading(true);
    try {
      const result = await uploadFile(selectedAgentId, file, file.name, '');
      if (result) {
        // 自动开始轮询状态
        const status = await getSourceStatus(selectedAgentId, result.id);
        if (status) {
          setStatusPolling((prev) => ({ ...prev, [result.id]: status }));
        }
      } else {
        setUploadError('上传失败，请重试');
      }
    } catch {
      setUploadError('上传失败，请检查网络连接');
    } finally {
      setUploading(false);
    }
  }, [selectedAgentId, uploadFile, getSourceStatus]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!['.pdf', '.docx', '.txt', '.md', '.py', '.js', '.json'].includes(ext)) {
        setUploadError(`不支持的文件类型: ${ext}，支持: PDF/DOCX/TXT/MD/PY/JS/JSON`);
        return;
      }
      handleFileUpload(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleTest = async (sourceId: number) => {
    if (!selectedAgentId) return;
    setTestingId(sourceId);
    try {
      const result = await testSource(selectedAgentId, sourceId);
      if (result) {
        setTestResult((prev) => ({ ...prev, [sourceId]: result }));
        fetchKnowledgeSources(selectedAgentId);
      }
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedAgentId || deleteId === null) return;
    await deleteSource(selectedAgentId, deleteId);
    setDeleteId(null);
  };

  // 标签处理
  const handleCreateTag = async () => {
    setTagError('');
    if (!newTagName.trim()) { setTagError('请输入标签名称'); return; }
    const result = await createTag(newTagName.trim(), newTagColor);
    if (result) {
      setShowTagModal(false);
      setNewTagName('');
      setNewTagColor('#3b82f6');
    } else {
      setTagError('创建标签失败');
    }
  };

  const handleTagClick = (tagName: string) => {
    if (selectedTag === tagName) {
      setSelectedTag(null); // 取消过滤
    } else {
      setSelectedTag(tagName);
    }
  };

  const handleAddTagToSource = async (sourceId: number, tagId: number) => {
    await addSourceTag(sourceId, tagId);
    // 刷新列表
    if (selectedAgentId) {
      fetchKnowledgeSources(selectedAgentId, selectedTag || undefined);
    }
  };

  const handleRemoveTagFromSource = async (sourceId: number, tagId: number) => {
    await removeSourceTag(sourceId, tagId);
    if (selectedAgentId) {
      fetchKnowledgeSources(selectedAgentId, selectedTag || undefined);
    }
  };

  const statusIndicator = (src: KnowledgeSource) => {
    // 如果是处理中的本地文件，显示进度
    if (src.source_type === 'local_file' && src.status && ['uploading', 'processing', 'indexing'].includes(src.status)) {
      const cfg = STATUS_CONFIG[src.status] || { label: src.status, color: '#6b7280', progress: 30 };
      return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Loader2 size={12} style={{ animation: 'spin 1s linear infinite', color: cfg.color }} />
          <span style={{ fontSize: 11, color: cfg.color }}>{cfg.label}</span>
          <div style={{ width: 60, height: 4, background: 'var(--bg-input)', borderRadius: 2 }}>
            <div style={{ width: `${cfg.progress}%`, height: '100%', background: cfg.color, borderRadius: 2, transition: 'width 0.5s ease' }} />
          </div>
        </div>
      );
    }
    if (src.status === 'indexed') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, padding: '1px 6px', borderRadius: 3, background: 'var(--color-success)', color: '#fff' }}>
          <CheckCircle size={10} /> 已索引
        </span>
      );
    }
    if (src.status === 'failed') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, padding: '1px 6px', borderRadius: 3, background: 'var(--color-danger)', color: '#fff' }}>
          <XCircle size={10} /> 处理失败
        </span>
      );
    }
    if (!src.enabled) {
      return <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 3, background: 'var(--text-dim)', color: '#fff' }}>已禁用</span>;
    }
    if (src.last_test_ok === true) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, padding: '1px 6px', borderRadius: 3, background: 'var(--color-success)', color: '#fff' }}>
          <CheckCircle size={10} /> 测试通过
        </span>
      );
    }
    if (src.last_test_ok === false) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, padding: '1px 6px', borderRadius: 3, background: 'var(--color-danger)', color: '#fff' }}>
          <XCircle size={10} /> 测试失败
        </span>
      );
    }
    return <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 3, background: 'var(--color-success)', color: '#fff' }}>已启用</span>;
  };

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BookOpen size={22} color="var(--color-primary)" />
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, margin: 0 }}>知识库</h1>
        </div>
      </div>

      {/* Agent 选择器 */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>选择 Agent：</label>
        <select
          value={selectedAgentId ?? ''}
          onChange={(e) => {
            const id = e.target.value ? Number(e.target.value) : null;
            setSelectedAgentId(id);
            setTestResult({});
            setStatusPolling({});
          }}
          style={{
            padding: '7px 12px',
            borderRadius: 'var(--r-sm)',
            border: '1px solid var(--border)',
            background: 'var(--bg-input)',
            color: 'var(--text-primary)',
            fontSize: 13,
            minWidth: 260,
          }}
        >
          <option value="">-- 请选择 Agent --</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>

      {/* 操作栏 */}
      {selectedAgentId && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => { resetForm(); setShowModal(true); }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', background: 'var(--color-primary)', color: '#fff',
                border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13,
              }}
            >
              <Plus size={14} /> 添加资料源
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', background: 'var(--color-success)', color: '#fff',
                border: 'none', borderRadius: 4, cursor: uploading ? 'wait' : 'pointer', fontSize: 13,
                opacity: uploading ? 0.6 : 1,
              }}
            >
              {uploading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={14} />}
              上传文件
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,.md,.py,.js,.json"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            {selectedAgent && (
              <span style={{ marginLeft: 12, fontSize: 12, color: 'var(--text-dim)' }}>
                当前 Agent: <strong>{selectedAgent.name}</strong>
              </span>
            )}
          </div>
        </div>
      )}

      {/* 拖拽上传区域 */}
      {selectedAgentId && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragOver ? 'var(--color-primary)' : 'var(--border)'}`,
            borderRadius: 8,
            padding: '20px 16px',
            textAlign: 'center',
            marginBottom: 16,
            background: dragOver ? 'var(--blue-bg)' : 'var(--bg-card)',
            transition: 'all var(--fast)',
            cursor: 'pointer',
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={20} style={{ color: 'var(--text-dim)', marginBottom: 8 }} />
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            拖拽文件到此处上传（PDF / DOCX / TXT / MD / PY / JS / JSON）
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '4px 0 0' }}>
            或点击选择文件
          </p>
        </div>
      )}

      {uploadError && (
        <div style={{ padding: '8px 12px', borderRadius: 4, background: 'var(--red-bg)', color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>
          {uploadError}
        </div>
      )}

      {/* 标签云 */}
      {selectedAgentId && tags.length > 0 && (
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginRight: 4 }}>
            <Tag size={12} style={{ marginRight: 4 }} />标签：
          </span>
          {tags.map((t) => (
            <button
              key={t.id}
              onClick={() => handleTagClick(t.name)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '3px 10px',
                borderRadius: 12,
                border: selectedTag === t.name ? `2px solid ${t.color}` : '1px solid var(--border)',
                background: selectedTag === t.name ? `${t.color}20` : 'var(--bg-input)',
                color: selectedTag === t.name ? t.color : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: selectedTag === t.name ? 600 : 400,
                transition: 'all var(--fast)',
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, display: 'inline-block' }} />
              {t.name}
              {selectedTag === t.name && ' ✕'}
            </button>
          ))}
          <button
            onClick={() => { setShowTagModal(true); setNewTagName(''); setNewTagColor('#3b82f6'); setTagError(''); }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 10px',
              borderRadius: 12,
              border: '1px dashed var(--border)',
              background: 'none',
              color: 'var(--text-dim)',
              cursor: 'pointer',
              fontSize: 12,
            }}
            title="创建新标签"
          >
            <Plus size={10} /> 标签
          </button>
        </div>
      )}

      {/* 创建标签 Modal */}
      {showTagModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
          }}
          onClick={() => setShowTagModal(false)}
          role="dialog" aria-modal="true" aria-label="创建标签"
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--r-lg)',
              padding: '24px 28px',
              maxWidth: 400, width: '90%',
              boxShadow: 'var(--shadow-md)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>创建标签</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>名称</label>
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="例如：重要、文档、API"
                  style={{
                    width: '100%', padding: '7px 10px',
                    borderRadius: 'var(--r-sm)', border: '1px solid var(--border)',
                    background: 'var(--bg-input)', color: 'var(--text-primary)',
                    fontSize: 13, boxSizing: 'border-box',
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateTag(); }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>颜色</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewTagColor(c)}
                      style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: c,
                        border: newTagColor === c ? '3px solid var(--text-primary)' : '2px solid transparent',
                        cursor: 'pointer',
                        transition: 'all var(--fast)',
                      }}
                    />
                  ))}
                </div>
              </div>
              {tagError && (
                <div style={{ padding: '8px 12px', borderRadius: 4, background: 'var(--red-bg)', color: 'var(--red)', fontSize: 12 }}>
                  {tagError}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn" onClick={() => setShowTagModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleCreateTag}>创建标签</button>
            </div>
          </div>
        </div>
      )}

      {/* 资料源列表 */}
      {!selectedAgentId ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-dim)' }}>
          <BookOpen size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p style={{ fontSize: 14 }}>请先选择一个 Agent 以管理其知识库资料源</p>
        </div>
      ) : loading ? (
        <p style={{ color: 'var(--text-dim)' }}>加载中...</p>
      ) : sources.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-dim)' }}>
          <Database size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p style={{ fontSize: 14 }}>该 Agent 暂无资料源</p>
          <p style={{ fontSize: 12 }}>点击"添加资料源"接入外部数据，或上传文件</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sources.map((src) => {
            const tr = testResult[src.id];
            return (
              <div
                key={src.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  transition: 'all var(--fast)',
                }}
              >
                {/* 类型图标 */}
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: 'var(--blue-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--blue)',
                  flexShrink: 0,
                }}>
                  {sourceTypeIcon(src.source_type)}
                </div>

                {/* 信息 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{src.name}</span>
                    <span style={{
                      fontSize: 10, padding: '1px 6px', borderRadius: 3,
                      background: 'var(--bg-input)', color: 'var(--text-dim)',
                    }}>
                      {sourceTypeLabel(src.source_type)}
                    </span>
                    {statusIndicator(src)}
                    {tr && (
                      <span style={{ fontSize: 11, color: tr.ok ? 'var(--color-success)' : 'var(--color-danger)' }}>
                        {tr.detail}
                      </span>
                    )}
                  </div>
                  {src.url && (
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {src.url}
                    </div>
                  )}
                  {src.last_test_at && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      上次测试: {new Date(src.last_test_at).toLocaleString('zh-CN')}
                    </div>
                  )}
                  {/* 标签 */}
                  {src.tags && src.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                      {src.tags.map((t: KnowledgeTag) => (
                        <span
                          key={t.id}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 3,
                            fontSize: 10, padding: '1px 6px', borderRadius: 10,
                            background: `${t.color}20`, color: t.color,
                            border: `1px solid ${t.color}40`,
                          }}
                        >
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.color, display: 'inline-block' }} />
                          {t.name}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRemoveTagFromSource(src.id, t.id); }}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              color: t.color, fontSize: 10, padding: 0, lineHeight: 1,
                              marginLeft: 1,
                            }}
                            title="移除标签"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 操作按钮 */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'flex-start' }}>
                  {/* 添加标签下拉 */}
                  {tags.length > 0 && (
                    <select
                      value=""
                      onChange={(e) => {
                        const tagId = parseInt(e.target.value);
                        if (tagId) {
                          handleAddTagToSource(src.id, tagId);
                          e.target.value = '';
                        }
                      }}
                      style={{
                        padding: '4px 6px', fontSize: 11,
                        borderRadius: 4, border: '1px solid var(--border)',
                        background: 'var(--bg-input)', color: 'var(--text-secondary)',
                        maxWidth: 80,
                      }}
                      title="添加标签"
                    >
                      <option value="">+标签</option>
                      {tags.filter((t) => !(src.tags || []).find((st: KnowledgeTag) => st.id === t.id)).map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  )}
                  <button
                    onClick={() => handleTest(src.id)}
                    disabled={testingId === src.id}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '5px 12px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border)',
                      borderRadius: 4, cursor: testingId === src.id ? 'wait' : 'pointer',
                      fontSize: 12, color: 'var(--text-primary)',
                    }}
                    title="测试连接"
                  >
                    {testingId === src.id ? (
                      <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <Cable size={12} />
                    )}
                    测试连接
                  </button>
                  <button
                    onClick={() => setDeleteId(src.id)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '5px 12px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border)',
                      borderRadius: 4, cursor: 'pointer',
                      fontSize: 12, color: 'var(--color-danger)',
                    }}
                    title="删除"
                  >
                    <Trash2 size={12} />
                    删除
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 添加资料源 Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
          }}
          onClick={() => { setShowModal(false); resetForm(); }}
          role="dialog" aria-modal="true" aria-label="添加资料源"
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--r-lg)',
              padding: '24px 28px',
              maxWidth: 520, width: '90%',
              boxShadow: 'var(--shadow-md)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>添加资料源</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  名称 <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="例如：产品文档 RAG API"
                  style={{
                    width: '100%', padding: '7px 10px',
                    borderRadius: 'var(--r-sm)', border: '1px solid var(--border)',
                    background: 'var(--bg-input)', color: 'var(--text-primary)',
                    fontSize: 13, boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  类型
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  style={{
                    width: '100%', padding: '7px 10px',
                    borderRadius: 'var(--r-sm)', border: '1px solid var(--border)',
                    background: 'var(--bg-input)', color: 'var(--text-primary)',
                    fontSize: 13, boxSizing: 'border-box',
                  }}
                >
                  <option value="http_api">HTTP API</option>
                  <option value="rag_api">RAG API</option>
                  <option value="mysql">MySQL</option>
                  <option value="postgres">PostgreSQL</option>
                  <option value="redis">Redis</option>
                  <option value="url_crawl">URL 抓取</option>
                  <option value="local_file">📂 本地文件</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  URL <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="例如：https://api.example.com/rag"
                  style={{
                    width: '100%', padding: '7px 10px',
                    borderRadius: 'var(--r-sm)', border: '1px solid var(--border)',
                    background: 'var(--bg-input)', color: 'var(--text-primary)',
                    fontSize: 13, boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Config JSON */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  config_json (选填)
                </label>
                <textarea
                  value={formConfigJson}
                  onChange={(e) => setFormConfigJson(e.target.value)}
                  placeholder='{"api_key": "your-key", "timeout": 10}'
                  rows={4}
                  style={{
                    width: '100%', padding: '7px 10px',
                    borderRadius: 'var(--r-sm)', border: '1px solid var(--border)',
                    background: 'var(--bg-input)', color: 'var(--text-primary)',
                    fontSize: 12, fontFamily: 'monospace', boxSizing: 'border-box',
                    resize: 'vertical',
                  }}
                />
              </div>

              {formError && (
                <div style={{ padding: '8px 12px', borderRadius: 4, background: 'var(--red-bg)', color: 'var(--red)', fontSize: 12 }}>
                  {formError}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn" onClick={() => { setShowModal(false); resetForm(); }}>取消</button>
              <button
                className="btn btn-primary"
                onClick={handleAdd}
                disabled={submitting}
                style={{ opacity: submitting ? 0.6 : 1 }}
              >
                {submitting ? '创建中...' : '确认添加'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认 */}
      <ConfirmDialog
        open={deleteId !== null}
        title="确认删除"
        message="确定要删除该资料源吗？此操作不可恢复。"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
