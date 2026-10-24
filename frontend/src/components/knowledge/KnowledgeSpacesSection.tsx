/**
 * §2 知识空间：与项目 1:1 · 空间成员（用户与 Agent）可读写 · 非成员不可见。
 *
 * 数据口径：后端没有 knowledge spaces 表/端点，页面**不造空间行**——把真实项目列表
 * 当作「空间 ↔ 项目 1:1」的归属映射（建项目即建空间，是产品判定而不是后端字段）。
 * 成员、文档数、最近写入这三列一律标未接入，留出后端补齐后的位置。
 */
import { Section, Unwired } from '../agent-config/Section';
import type { ProjectLite } from '../chat/types';
import { SPACE_MEMBER_NOTE, SPACE_UNVISIBILITY_WORDING, SPACE_UNWIRED, SPACE_VISIBILITY_NOTE } from './policy';

export default function KnowledgeSpacesSection({
  projects,
  loading,
  search,
}: {
  projects: ProjectLite[];
  loading: boolean;
  search: string;
}) {
  const q = search.trim().toLowerCase();
  const rows = projects.filter((p) => !q || p.name.toLowerCase().includes(q));

  return (
    <Section
      id="sec2"
      no={2}
      title="§2 知识空间 —— 与项目一一对应 · 成员读写"
      extra={<span className="chip">与项目 1:1</span>}
      note={`${SPACE_UNVISIBILITY_WORDING} · ${SPACE_VISIBILITY_NOTE}`}
    >
      <div style={{ overflowX: 'auto' }}>
        <table className="tbl compact" aria-label="知识空间清单">
          <thead>
            <tr>
              <th scope="col">知识空间</th>
              <th scope="col">所属项目</th>
              <th scope="col">成员（用户 · Agent）</th>
              <th scope="col">文档数</th>
              <th scope="col">最近写入</th>
              <th scope="col" style={{ textAlign: 'right' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} style={{ color: 'var(--text-muted)' }}>读取项目列表…</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: 'var(--text-muted)' }}>
                  {projects.length === 0
                    ? '没有可见项目：空间随项目 1:1 自动创建，先建项目（或你没有项目读权限）。'
                    : '搜索没有命中任何项目空间。'}
                </td>
              </tr>
            )}
            {!loading && rows.map((p) => (
              <tr key={p.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{p.name} 空间</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                    <span className="chip warn" style={{ fontSize: 10 }}>未接入</span> 空间独立表未接入，此处由项目行映射
                  </div>
                </td>
                <td>
                  {p.name}
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>project #{p.id}</div>
                </td>
                <td><span className="chip warn">未接入</span></td>
                <td><span className="chip warn">未接入</span></td>
                <td><span className="chip warn">未接入</span></td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button className="btn btn-ghost btn-sm" disabled title="空间工作台未接入（无 space 端点）">进入</button>
                  <button className="btn btn-ghost btn-sm" disabled title="深链锚点未接入（空间页不存在）">复制链接</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="page-note" style={{ marginTop: 6 }}>{SPACE_MEMBER_NOTE}</p>
      <Unwired>{SPACE_UNWIRED}</Unwired>
    </Section>
  );
}
