/**
 * §3 外部源：关联进空间后只读 · 源级授权 · 凭据只写不读 · 未关联空间时对普通成员不可见。
 *
 * 这一节是**真数据**：`/api/agents/{id}/knowledge-sources`（list / upload / test / delete）都是现有端点。
 * 但「源 ↔ 空间」的关联表与源级授权后端没有 → 这两列如实标未接入，不造假关联关系。
 *
 * 凭据纪律：页面**任何地方都不渲染 config_json**。后端 `to_dict(mask_secrets=True)` 只打码
 * password / api_key 两键，其他自定义键仍会原样返回 —— 这个缺口写在 CREDENTIAL_GAP_NOTE 里。
 */
import { Loader2, RefreshCw, Trash2, Upload } from 'lucide-react';
import type { KnowledgeSource, KnowledgeTag } from '../../stores/knowledge';
import { Section, Unwired } from '../agent-config/Section';
import {
  CREDENTIAL_GAP_NOTE,
  CREDENTIAL_WRITE_ONLY_NOTE,
  EXTERNAL_READONLY_NOTE,
  EXTERNAL_UNLINKED_NOTE,
  EXTERNAL_UNWIRED,
} from './policy';

const SOURCE_TYPE_LABEL: Record<string, string> = {
  rag_api: 'RAG API',
  mysql: 'MySQL',
  postgres: 'PostgreSQL',
  redis: 'Redis',
  http_api: 'HTTP API',
  url_crawl: 'URL 抓取',
  local_file: '本地文件',
};

const STATUS_LABEL: Record<string, string> = {
  uploading: '上传中',
  processing: '解析中',
  indexing: '索引中',
  indexed: '已索引',
  failed: '处理失败',
};

function statusChip(src: KnowledgeSource) {
  if (src.status && STATUS_LABEL[src.status]) {
    const bad = src.status === 'failed';
    return <span className={`chip ${bad ? 'bad' : 'info'}`}>{STATUS_LABEL[src.status]}</span>;
  }
  if (!src.enabled) return <span className="chip warn">已禁用</span>;
  if (src.last_test_ok === true) return <span className="chip ok">测试通过</span>;
  if (src.last_test_ok === false) return <span className="chip bad">测试失败</span>;
  return <span className="chip ok">已启用</span>;
}

export interface ExternalSourcesSectionProps {
  agentId: number | null;
  agentName: string | null;
  sources: KnowledgeSource[];
  loading: boolean;
  search: string;
  tags: KnowledgeTag[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  testingId: number | null;
  testResults: Record<number, { ok: boolean; detail: string }>;
  onTest: (sourceId: number) => void;
  onDelete: (sourceId: number) => void;
  /** 上传（真实 POST multipart）：由页面提供，Section 只负责入口与文案 */
  uploading: boolean;
  dragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onPickFile: () => void;
  onAddSource: () => void;
  onRemoveTag: (sourceId: number, tagId: number) => void;
  onAddTag: (sourceId: number, tagId: number) => void;
  uploadError: string;
}

export default function ExternalSourcesSection(props: ExternalSourcesSectionProps) {
  const {
    agentId, agentName, sources, loading, search, tags, selectedTag, onSelectTag,
    testingId, testResults, onTest, onDelete, uploading, dragOver,
    onDragOver, onDragLeave, onDrop, onPickFile, onAddSource, onRemoveTag, onAddTag, uploadError,
  } = props;

  const q = search.trim().toLowerCase();
  const rows = sources.filter((s) => !q || s.name.toLowerCase().includes(q));

  return (
    <Section
      id="sec3"
      no={3}
      title="§3 外部源 —— 关联进空间后只读 · 源级授权 · 凭据只写不读"
      extra={<span className="chip">{agentName ? `当前 Agent：${agentName}` : '未选 Agent'}</span>}
      note={EXTERNAL_READONLY_NOTE}
    >
      <div className="toolbar" style={{ marginBottom: 6 }}>
        <span className="chip">{CREDENTIAL_WRITE_ONLY_NOTE}</span>
        <span className="grow" />
        <button className="btn btn-ghost btn-sm" onClick={onPickFile} disabled={!agentId || uploading}>
          {uploading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={13} />} 上传文件
        </button>
        <button className="btn btn-primary btn-sm" onClick={onAddSource} disabled={!agentId}>
          添加外部源
        </button>
      </div>

      {tags.length > 0 && (
        <div className="toolbar" style={{ marginBottom: 6 }}>
          <span className="section-title" style={{ margin: 0 }}>标签</span>
          <button className="btn btn-ghost btn-sm" aria-pressed={selectedTag === null} onClick={() => onSelectTag(null)}>
            全部
          </button>
          {tags.map((t) => (
            <button
              key={t.id}
              className="btn btn-ghost btn-sm"
              aria-pressed={selectedTag === t.name}
              onClick={() => onSelectTag(selectedTag === t.name ? null : t.name)}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

      {/* 拖拽上传（真端点：POST /knowledge-sources/upload） */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={onPickFile}
        style={{
          border: `2px dashed ${dragOver ? 'var(--color-primary)' : 'var(--border)'}`,
          borderRadius: 8, padding: '14px 12px', textAlign: 'center', marginBottom: 8,
          background: dragOver ? 'var(--blue-bg)' : 'transparent', cursor: 'pointer',
        }}
      >
        <p className="page-note" style={{ margin: 0 }}>
          拖拽文件到此处上传（写入本 Agent 的资料源）· 支持 .pdf .docx .txt .md .py .js .json，单文件 ≤ 10MB
        </p>
        <p className="page-note" style={{ margin: '2px 0 0', color: 'var(--text-dim)' }}>
          不支持的类型 / 超过上限时，后端 400 的 detail 会原样显示在下方（不改写成「上传失败」）。
        </p>
      </div>

      {uploadError && (
        <div role="alert" className="panel" style={{ borderColor: 'var(--red)', color: 'var(--red)', padding: '6px 10px', marginBottom: 8 }}>
          {uploadError}
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table className="tbl compact" aria-label="外部源清单">
          <thead>
            <tr>
              <th scope="col">源名称</th>
              <th scope="col">来源类型</th>
              <th scope="col">状态</th>
              <th scope="col">关联空间（只读）</th>
              <th scope="col">凭据</th>
              <th scope="col">标签</th>
              <th scope="col">最近测试</th>
              <th scope="col" style={{ textAlign: 'right' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {!agentId && (
              <tr><td colSpan={8} style={{ color: 'var(--text-muted)' }}>先在上方选择 Agent：资料源按 Agent 绑定（真实端点 `/api/agents/&lt;id&gt;/knowledge-sources`）。</td></tr>
            )}
            {agentId && loading && (
              <tr><td colSpan={8} style={{ color: 'var(--text-muted)' }}>读取资料源…</td></tr>
            )}
            {agentId && !loading && rows.length === 0 && (
              <tr>
                <td colSpan={8} style={{ color: 'var(--text-muted)' }}>
                  {sources.length === 0 ? '该 Agent 暂无外部源（空就是空，不放示例行）。' : '搜索没有命中任何外部源。'}
                </td>
              </tr>
            )}
            {agentId && !loading && rows.map((src) => {
              const tr = testResults[src.id];
              return (
                <tr key={src.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{src.name}</div>
                    {src.url && (
                      <div style={{ fontSize: 10.5, color: 'var(--text-muted)', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {src.url}
                      </div>
                    )}
                  </td>
                  <td>{SOURCE_TYPE_LABEL[src.source_type] || src.source_type}</td>
                  <td>{statusChip(src)}</td>
                  <td><span className="chip warn">未接入</span></td>
                  <td>
                    <span className="chip mono">{src.config_json && Object.keys(src.config_json).length > 0 ? '已配置（只写不读）' : '未配置'}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {(src.tags || []).map((t) => (
                        <span key={t.id} className="chip">
                          {t.name}
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ padding: 0, height: 14, fontSize: 10 }}
                            aria-label={`移除标签 ${t.name}`}
                            onClick={() => onRemoveTag(src.id, t.id)}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      {tags.length > 0 && (
                        <select
                          aria-label={`给 ${src.name} 添加标签`}
                          value=""
                          onChange={(e) => {
                            const tagId = parseInt(e.target.value, 10);
                            if (tagId) onAddTag(src.id, tagId);
                          }}
                          style={{
                            padding: '1px 4px', fontSize: 10.5, borderRadius: 4,
                            border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-secondary)',
                          }}
                        >
                          <option value="">+ 标签</option>
                          {tags.filter((t) => !(src.tags || []).find((st) => st.id === t.id)).map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </td>
                  <td>
                    {tr ? (
                      <span className={tr.ok ? 'chip ok' : 'chip bad'}>{tr.detail}</span>
                    ) : src.last_test_at ? (
                      <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{src.last_test_at.slice(0, 16).replace('T', ' ')}</span>
                    ) : (
                      <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>未测试</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => onTest(src.id)}
                      disabled={testingId === src.id}
                    >
                      {testingId === src.id
                        ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                        : <RefreshCw size={12} />} 测试连接
                    </button>
                    <button className="btn btn-ghost btn-sm" disabled title="源 ↔ 空间关联表未接入：没有「关联到空间」端点">
                      关联到空间
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => onDelete(src.id)} aria-label={`删除外部源 ${src.name}`}>
                      <Trash2 size={12} /> 删除
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="page-note" style={{ marginTop: 6 }}>{CREDENTIAL_GAP_NOTE}</p>
      <p className="page-note" style={{ marginTop: 2 }}>{EXTERNAL_UNLINKED_NOTE}</p>
      <Unwired>{EXTERNAL_UNWIRED}</Unwired>
    </Section>
  );
}
