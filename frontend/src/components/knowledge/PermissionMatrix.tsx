/**
 * §0 权限矩阵：一屏表定死「谁能读 / 谁能写」，并写清越权与不存在同码 404。
 *
 * 这张表是**口径**而不是数据（后端没有权限矩阵端点）。所以标题旁挂「口径」chip，
 * 表下再写一句「按钮真实可用性以后端 403/404 为准」——不让人把这张表当实时授权。
 */
import { Section, Unwired } from '../agent-config/Section';
import {
  MATRIX_UNWIRED,
  NOT_FOUND_SAME_CODE,
  PERMISSION_MATRIX,
  SPACE_PROJECT_1TO1,
} from './policy';

export default function PermissionMatrix() {
  return (
    <Section
      id="sec0"
      no={0}
      title="§0 权限矩阵 —— 谁能读、谁能写，一眼定死；越权与不存在同码 404"
      extra={<span className="chip">口径</span>}
      note="一屏定死四层（公共知识 / 知识空间 / 跨空间引用 / 外部源）的读、写与可见性，避免「谁能读」散落在各页各说一套。"
    >
      <div style={{ overflowX: 'auto' }}>
        <table className="tbl compact" aria-label="知识库权限矩阵">
          <thead>
            <tr>
              <th scope="col">层</th>
              <th scope="col">全体用户 / 全体 Agent</th>
              <th scope="col">空间成员（用户 · Agent）</th>
              <th scope="col">平台管理员</th>
              <th scope="col">写入路径</th>
            </tr>
          </thead>
          <tbody>
            {PERMISSION_MATRIX.map((row) => (
              <tr key={row.layer}>
                <td>
                  <div style={{ fontWeight: 600 }}>{row.layer}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{row.hint}</div>
                </td>
                <td>{row.everyone}</td>
                <td>{row.member}</td>
                <td>{row.admin}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{row.writePath}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="page-note" style={{ marginTop: 6 }}>两条判定句：</p>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11.5, lineHeight: 1.8, color: 'var(--text-secondary)' }}>
        <li>① {SPACE_PROJECT_1TO1}</li>
        <li>② {NOT_FOUND_SAME_CODE}</li>
      </ul>

      <Unwired>{MATRIX_UNWIRED}</Unwired>
    </Section>
  );
}
