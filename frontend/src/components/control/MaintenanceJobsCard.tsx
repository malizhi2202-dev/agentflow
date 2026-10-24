/**
 * ③ 维护作业区（原型 `control-plane.html`「维护作业」）
 *
 * 与上面自动调和**并列成文**：调和管「状态收敛」（回收 / 过期 / 清理），维护作业管「数据改写」
 * （schema 迁移 / 历史修复 / 批量回填 / 全量校验）。两句话不冲突：
 * **自动的那一路永不写大批历史数据，写大批历史数据的那一路永不自动**——全库级批量写一律人批。
 *
 * 本区只给入口与纪律：后端没有维护作业端点（无作业列表 / 无 dry-run / 无 apply），
 * 所以作业卡片与两个按钮一律标「未接入」并禁用，不做假 toast、不编 remaining 行数。
 * 「最近一次调和结果」是能读到的真数据（`GET /api/control-plane/reconcile` 读审计里的 reconcile 事件）。
 */
import { AlertCircle, Wrench } from 'lucide-react';
import { useControlPlane } from '../../stores/controlPlane';

export const NOT_PROVIDED = '未接入';

/** 审计行（/api/control-plane/reconcile 返回 audit 行；字段名容错，见 store 的 ReconcileEntry 说明） */
function lastReconcile(reconcile: any[]): { at: string; text: string; who: string } | null {
  if (!Array.isArray(reconcile) || reconcile.length === 0) return null;
  const row: any = reconcile[0] || {};
  const at = row.timestamp || row.created_at || '';
  const text = row.detail || row.message || row.action || '';
  const who = row.user_name || row.user_id || '';
  if (!at && !text) return null;
  return { at, text, who };
}

export default function MaintenanceJobsCard() {
  const { reconcile } = useControlPlane();
  const last = lastReconcile(reconcile as any[]);

  return (
    <section className="panel" aria-label="维护作业">
      <div className="toolbar">
        <span className="section-title">维护作业（operator-driven 批量作业）—— 与上方自动调和并列成文 · 永不自动发生</span>
        <span className="chip warn">{NOT_PROVIDED}</span>
        <span className="chip">后端无作业端点</span>
      </div>

      <p className="page-note">
        <b>是什么</b>：由<b>人启动</b>、对<b>全库或大批量数据</b>动手的作业——schema 迁移、历史数据修复、
        批量回填、全量校验。它和自动调和是并列的两条路：<b>调和管状态收敛（回收 / 过期 / 清理），
        维护作业管数据改写</b>。自动的那一路永不写大批历史数据，写大批历史数据的那一路永不自动。
      </p>

      <div style={{ overflowX: 'auto', marginTop: 4 }}>
        <table className="tbl compact" aria-label="维护作业纪律">
          <thead>
            <tr><th>纪律</th><th>事实</th><th>为什么这样定</th></tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ fontWeight: 500 }}>入口</td>
              <td>独立本机监听口，只听 <span style={{ fontFamily: 'var(--font-mono)' }}>127.0.0.1</span>，地址不可覆盖、不对外发布；无应用层鉴权——挡人靠容器权限</td>
              <td>批量写是最难回滚的动作，权限模型简单到「你在不在那台机器里」</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 500 }}>默认态</td>
              <td>dry-run：只报告「会碰哪些表 / 哪些行、改完长什么样」，不落任何写</td>
              <td>让人先读计划，而不是先信代码</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 500 }}>转 apply 前置</td>
              <td><b>新幂等键</b>（不复用旧键，重复提交即拒）＋ <b>人工担保旗标</b>（我读完这份计划并担保它）—— 缺任一项直接拒，连事务都不开</td>
              <td>「按两次得到两种结果」不可能发生</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 500 }}>事务与预算</td>
              <td>每请求一个短事务（不拿长事务锁全库）＋ 批次预算与墙钟预算双限，任一触顶即停</td>
              <td>停得下来比跑得快重要；在线库不能被一次回填按住</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 500 }}>暂停语义</td>
              <td>暂停后<b>不自动 resume</b>，必须人再点</td>
              <td>止损可以自动，恢复必须有人</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 500 }}>退出码</td>
              <td><span style={{ fontFamily: 'var(--font-mono)' }}>0</span> 完成 · <span style={{ fontFamily: 'var(--font-mono)' }}>2</span> 未竟（可续跑）· <span style={{ fontFamily: 'var(--font-mono)' }}>1</span> 技术失败</td>
              <td>「没跑完」和「跑挂了」必须可区分</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 500 }}>完成定义</td>
              <td><b>全量校验通过</b>且 <span style={{ fontFamily: 'var(--font-mono)' }}>remaining=0</span> 才算完成——跑完 ≠ 完成</td>
              <td>完成是结论，不是进度条到头</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="toolbar" style={{ marginTop: 10 }}>
        <span className="section-title">作业入口</span>
        <span className="grow" />
        <button className="btn btn-ghost btn-sm" disabled aria-label="跑一次 dry-run（未接入）"
                title="后端无维护作业端点，入口未接入">
          <Wrench size={12} /> 跑一次 dry-run
        </button>
        <button className="btn btn-ghost btn-sm" disabled aria-label="转 apply（未接入）"
                title="后端无维护作业端点；apply 还需新幂等键 + 人工担保旗标">
          转 apply（需幂等键 + 担保）
        </button>
      </div>
      <p className="page-note">
        {NOT_PROVIDED} · 作业列表 / 计划 diff / 断点续跑属审计页与后台运维面，不在管控面铺开
        —— 管控面的职责是<b>看清运行态</b>，不是执行批量改写。本页只给入口与纪律，不执行任何真作业。
      </p>

      <div className="section-title" style={{ marginTop: 10 }}>最近一次调和结果</div>
      {last ? (
        <p className="page-note" role="status">
          <span style={{ fontFamily: 'var(--font-mono)' }}>{last.at || '—'}</span>
          {last.who ? ` · ${last.who}` : ''} —— {last.text || '（该条调和事件无 detail）'}
        </p>
      ) : (
        <p className="page-note" role="status">
          {NOT_PROVIDED} · 未读到 reconcile 事件（`GET /api/control-plane/reconcile` 无行，或审计库不可用）
        </p>
      )}
      <p className="page-note">
        <AlertCircle size={11} /> 调和只做<b>状态回收 / 过期 / 清理</b>；全库级批量写一律人批。
        定位对照：别家（multica 口径）没有「控制器持续对齐期望态」这一层，靠多个小收敛机制 + 人驱动批量作业拼出最终一致；
        本平台保留 K8s 式自动调和作为差异，但吸收它的纪律——大批历史数据改写必须走维护作业、由人批。
      </p>
    </section>
  );
}
