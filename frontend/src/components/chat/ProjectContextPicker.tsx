/**
 * 「＋ 挂 Project context」入口（语义补充项）。
 *
 * 原型：挂了项目 = 项目描述 + 仓库进上下文，只影响「下一条起」的运行入料。
 * 但后端**没有 chat context 端点**，也没有把 project_id 随消息落库的列 ——
 * 所以这里只做「选择器 + 显式未接入」：能选、能看见选了哪个，但绝不假装它进了 prompt。
 *
 * 纪律：不做「能点但存不进去」的假入口 —— 选中后必须同时出现未接入说明与原因。
 */
import { useState } from 'react';
import type { ProjectLite } from './types';
import { CONTEXT_NOTE, CONTEXT_UNWIRED_NOTE } from './chatSemantics';

export default function ProjectContextPicker({
  projects,
  selectedProjectId,
  onSelect,
  loading,
}: {
  projects: ProjectLite[];
  selectedProjectId: number | null;
  onSelect: (projectId: number | null) => void;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = projects.find((p) => p.id === selectedProjectId) || null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div className="toolbar">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          ＋ 挂 Project context
        </button>
        {selected && (
          <>
            <span className="chip mono">context {selected.name}</span>
            <span className="chip warn">未接入</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onSelect(null)}>
              取消挂载
            </button>
          </>
        )}
      </div>

      {open && (
        <div className="panel" style={{ borderStyle: 'dashed', background: 'transparent', padding: 'var(--s2) var(--s3)' }}>
          <p className="page-note" style={{ marginBottom: 4 }}>
            挂 Project context（选中后 Agent 运行会收到项目描述 + 仓库资源进上下文）
          </p>
          {loading && <p className="page-note">读取项目列表…</p>}
          {!loading && projects.length === 0 && (
            <p className="page-note">没有可见项目（项目列表为空，或你没有项目读权限）。</p>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              aria-pressed={selectedProjectId === null}
              onClick={() => onSelect(null)}
            >
              不关联
            </button>
            {projects.map((p) => (
              <button
                key={p.id}
                type="button"
                className="btn btn-ghost btn-sm"
                aria-pressed={selectedProjectId === p.id}
                aria-label={`挂载项目 ${p.name}`}
                onClick={() => onSelect(p.id)}
              >
                {p.name}
              </button>
            ))}
          </div>
          <p className="page-note" style={{ marginTop: 6 }}>{CONTEXT_NOTE}</p>
          {selected && (
            <p className="page-note" style={{ marginTop: 2, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span className="chip warn" style={{ flex: '0 0 auto' }}>未接入</span>
              <span>{CONTEXT_UNWIRED_NOTE}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
