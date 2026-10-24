/**
 * §1 公共知识：全局只读 · 平台管理员维护 · 四分类（公司规范 / API 契约 / 安全基线 / 入职引导）。
 *
 * 表里列的是**分类口径**而不是文档行：后端没有公共知识表/端点，摆几行示例文档
 * （规范.pdf / api-schema.json…）就变成了伪造数据。所以「文档 / 版本 / Chunks / 挂载 Agent」
 * 这些原型列在这里不出现，改为写清「分类 + 读范围 + 维护者 + 写入路径」。
 */
import { Section, Unwired } from '../agent-config/Section';
import { PUBLIC_CATEGORIES, PUBLIC_READONLY_NOTE, PUBLIC_UNWIRED } from './policy';

export default function PublicKnowledgeSection() {
  return (
    <Section
      id="sec1"
      no={1}
      title="§1 公共知识 —— 全局可用 · 只读"
      extra={<span className="chip">全局只读</span>}
      note={PUBLIC_READONLY_NOTE}
    >
      <div style={{ overflowX: 'auto' }}>
        <table className="tbl compact" aria-label="公共知识四分类">
          <thead>
            <tr>
              <th scope="col">分类</th>
              <th scope="col">读范围</th>
              <th scope="col">维护者（写）</th>
              <th scope="col">标签</th>
              <th scope="col">说明</th>
              <th scope="col" style={{ textAlign: 'right' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {PUBLIC_CATEGORIES.map((c) => (
              <tr key={c.name}>
                <td style={{ fontWeight: 600 }}>{c.name}</td>
                <td>{c.readScope}</td>
                <td>{c.maintainer}</td>
                <td><span className="chip">{c.tags}</span></td>
                <td style={{ color: 'var(--text-secondary)' }}>{c.note}</td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button className="btn btn-ghost btn-sm" disabled title="公共知识后端未接入：无详情抽屉可开">
                    查看
                  </button>
                  <button className="btn btn-ghost btn-sm" disabled title="公共知识后端未接入：关联到空间需要空间表">
                    关联到空间
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="page-note" style={{ marginTop: 6 }}>
        写不进去是设计而非缺能：公共知识无「编辑 / 重建索引 / 删除」行操作 —— 改它要走
        <b> 晋升与评审</b>：空间侧记忆层 L3 核心记忆 → 提交晋升申请 → 晋升评审门（必人批 · 公共知识需平台管理员二审）
        → 通过后作为新版本发布并落审计。
      </p>

      <Unwired>{PUBLIC_UNWIRED}</Unwired>
    </Section>
  );
}
