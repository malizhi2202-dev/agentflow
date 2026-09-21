import { useEffect, useState } from 'react';
import { FileText, Save, X, Edit3, ChevronRight, Clock, FolderOpen } from 'lucide-react';
import { artifactName } from '../hooks/useFileNames';
import { useAuth } from '../stores/auth';

const STAGES = [
  { id: '0-change', name: '变更提案', file: 'CHANGE.md' },
  { id: '1-requirement', name: '需求分析', file: 'REQUIREMENT.md' },
  { id: '2-design', name: '技术设计', file: 'DESIGN.md' },
  { id: '2a-ui-design', name: 'UI 设计', file: 'UI-DESIGN.md' },
  { id: '3-task', name: '任务拆分', file: 'TASK.md' },
  { id: '4-dev', name: '开发执行', file: null },
  { id: '5-test', name: '测试验证', file: 'TEST.md' },
  { id: '6-review', name: '代码审查', file: 'REVIEW.md' },
  { id: '7-integration', name: '集成归档', file: null },
];

const STAGE_COLORS: Record<string, string> = {
  '0-change': 'var(--blue)', '1-requirement': 'var(--green)', '2-design': 'var(--purple)',
  '2a-ui-design': 'var(--orange)', '3-task': 'var(--blue)', '4-dev': 'var(--info)',
  '5-test': 'var(--green)', '6-review': 'var(--purple)', '7-integration': 'var(--text-muted)',
};

interface ArtifactInfo { changeId: string; fname: string; phase: string; }

export default function SpecsEditor({ onSelect }: { onSelect: (id: string) => void }) {
  const { isAdmin, rolePermissions } = useAuth();
  const canWrite = isAdmin || rolePermissions.includes('project:write');
  const [changes, setChanges] = useState<any[]>([]);
  const [activeStage, setActiveStage] = useState('0-change');
  const [openFile, setOpenFile] = useState<{ changeId: string; fname: string } | null>(null);
  const [content, setContent] = useState('');
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetch('/api/changes').then(r => r.json()).then(d => setChanges(d.changes || [])).catch(() => {});
  }, []);

  // 当前选中阶段的所有产物
  const stageArtifacts: ArtifactInfo[] = [];
  const stageDef = STAGES.find(s => s.id === activeStage);
  changes.forEach((c: any) => {
    (c.artifacts || []).forEach((a: string) => {
      if (!a.endsWith('.md')) return;
      const isSummary = a.includes('-SUMMARY');
      const stageFile = stageDef?.file;
      const matches = isSummary ? activeStage === '4-dev' : (stageFile && a.toUpperCase().includes(stageFile.replace('.md', '').toUpperCase()));
      if (matches) stageArtifacts.push({ changeId: c.id, fname: a, phase: c.phase_name });
    });
  });

  const loadFile = async (changeId: string, fname: string) => {
    setOpenFile({ changeId, fname }); setLoading(true); setEditing(false); setErrorMsg('');
    try {
      const res = await fetch(`/api/changes/${changeId}/${fname.replace('.md', '')}`);
      if (!res.ok) {
        if (res.status === 404) { setContent(''); setErrorMsg('文件不存在'); }
        else { setContent(''); setErrorMsg(`请求失败 (${res.status})`); }
      } else {
        const data = await res.json();
        setContent(data.content); setEditText(data.content);
      }
    } catch { setContent(''); setErrorMsg('网络请求失败，请确认后端已启动'); }
    setLoading(false);
  };

  const saveFile = async () => {
    if (!openFile) return;
    await fetch(`/api/changes/${openFile.changeId}/${openFile.fname.replace('.md', '')}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: editText }),
    });
    setContent(editText); setEditing(false);
  };

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* ── 左侧：阶段时间线 ── */}
      <div style={{ width: 200, flexShrink: 0, borderRight: '1px solid var(--border)', overflow: 'auto', padding: '12px 0' }}>
        <div style={{ padding: '0 12px 8px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          <FolderOpen size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} /> 阶段
        </div>
        {STAGES.map((stage, i) => {
          const active = activeStage === stage.id;
          const hasContent = stageArtifacts.length > 0 || stage.id === activeStage;
          return (
            <div key={stage.id} style={{ display: 'flex' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 28, paddingTop: 6, flexShrink: 0 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: active ? STAGE_COLORS[stage.id] : 'var(--text-muted)', opacity: hasContent ? 1 : 0.3 }} />
                {i < STAGES.length - 1 && <div style={{ width: 1, flex: 1, minHeight: 12, background: 'var(--border)' }} />}
              </div>
              <button
                onClick={() => setActiveStage(stage.id)}
                style={{
                  flex: 1, textAlign: 'left', padding: '5px 8px', marginBottom: 2,
                  background: active ? 'var(--bg-selected)' : 'transparent',
                  border: 'none', borderRadius: 'var(--r-sm)',
                  color: active ? 'var(--text)' : 'var(--text-secondary)',
                  cursor: 'pointer', fontSize: 11,
                  fontWeight: active ? 600 : 400, opacity: hasContent ? 1 : 0.4,
                }}
              >
                <span style={{ fontFamily: 'var(--font)', fontSize: 12 }}>{stage.name}</span><br />
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 400 }}>{stage.id}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* ── 中间：产物列表 ── */}
      <div style={{ width: 320, flexShrink: 0, borderRight: '1px solid var(--border)', overflow: 'auto', padding: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, fontFamily: 'var(--font-mono)' }}>
          {STAGES.find(s => s.id === activeStage)?.name}
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>{stageArtifacts.length} 个文件</span>
        </div>
        {stageArtifacts.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>此阶段暂无产物</p>
        ) : (
          stageArtifacts.map(a => {
            const key = `${a.changeId}/${a.fname}`;
            const isActive = openFile?.changeId === a.changeId && openFile?.fname === a.fname;
            return (
              <div
                key={key}
                style={{
                  padding: '10px', marginBottom: 6,
                  borderRadius: 'var(--r-md)', border: '1px solid var(--border)',
                  background: isActive ? 'var(--bg-selected)' : 'var(--bg-card)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <FileText size={13} style={{ color: STAGE_COLORS[activeStage], flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {artifactName(a.fname)}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>
                  {a.changeId} · {a.phase}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); onSelect(a.changeId); }}
                    className="btn btn-sm"
                    style={{ flex: 1, justifyContent: 'center', fontSize: 11 }}
                  >
                    <ChevronRight size={12} /> 工作流
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); loadFile(a.changeId, a.fname); }}
                    className={`btn btn-sm ${isActive ? 'btn-primary' : ''}`}
                    style={{ flex: 1, justifyContent: 'center', fontSize: 11 }}
                  >
                    <Edit3 size={12} /> 编辑
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── 右侧：内容预览 + 编辑 ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
        {!openFile ? (
          <div style={{ textAlign: 'center', paddingTop: 80, color: 'var(--text-muted)' }}>
            <FileText size={40} style={{ marginBottom: 12, opacity: 0.1 }} />
            <p style={{ fontSize: 14 }}>选择左侧阶段 → 点击中间产物文件</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>每个文件标注了所属 Change 和阶段，支持查看与编辑</p>
          </div>
        ) : loading ? (
          <p style={{ color: 'var(--text-muted)' }}>加载中...</p>
        ) : errorMsg ? (
          <div style={{ textAlign: 'center', paddingTop: 60, color: 'var(--text-muted)' }}>
            <p style={{ fontSize: 16, color: 'var(--red)', marginBottom: 8 }}>{errorMsg}</p>
            <p style={{ fontSize: 12 }}>请确认文件存在于 .specs/ 目录中</p>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600 }}>{openFile.fname}</span>
                <span className="badge" style={{ background: (STAGE_COLORS[activeStage] || 'var(--text-muted)') + '20', color: STAGE_COLORS[activeStage] }}>
                  {activeStage} · {STAGES.find(s => s.id === activeStage)?.name}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {openFile.changeId} · {content.length.toLocaleString()} 字符
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {editing ? (
                  <>
                    <button className="btn btn-sm" onClick={() => { setEditing(false); setEditText(content); }}><X size={12} /> 取消</button>
                    {canWrite && <button className="btn btn-primary btn-sm" onClick={saveFile}><Save size={12} /> 保存</button>}
                  </>
                ) : canWrite ? (
                  <button className="btn btn-sm" onClick={() => { setEditText(content); setEditing(true); }}><Edit3 size={12} /> 编辑</button>
                ) : null}
              </div>
            </div>
            {editing ? (
              <textarea value={editText} onChange={e => setEditText(e.target.value)}
                style={{ width: '100%', minHeight: 'calc(100vh - 260px)', background: 'var(--bg-input)', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 1.7, padding: 12, border: '1px solid var(--border)', borderRadius: 'var(--r-md)', resize: 'vertical', outline: 'none' }} />
            ) : (
              <div className="card" style={{ fontFamily: 'var(--font)', fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{content}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
