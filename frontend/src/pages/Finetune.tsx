/**
 * 微调工厂与三指标自测（原型 6.24 · `/admin/decision-models/finetune`）——**规划原型**
 *
 * 原型口径：域内数据 → LLaMA-Factory 编排 → 三指标门禁的闭环；含「未过门槛」「硬件不达标」两个边界态。
 * 后端未接入：训练任务、数据台账、硬件预检、门禁判定都没有端点；本页只对齐形态与判定文案。
 */
import PlanningNotice from '../components/ui/PlanningNotice';

const ROWS = [
  {
    task: 'dept-router-v3-ft', base: 'Qwen3.5-2B · LoRA r16 · log-score',
    data: '会话 412 · 记忆条目 88 · 指纹 a91f…', engine: '本机 LLaMA-Factory 0.9.x',
    hw: '通过 · 显存 10GB ≥ 8GB', state: '完成 41min',
    acc: '79.4%', ece: '0.061', agree: '91%',
    gate: '禁止切产', reason: 'ECE 0.061 > 门槛 0.05 · 服务端拒绝（AC-C2）',
  },
  {
    task: 'dept-router-v4-ft', base: '同配方 · 温度修正样本 +3k',
    data: '会话 455 · 记忆 90 · 指纹 c207…', engine: '本机 LLaMA-Factory 0.9.x',
    hw: '通过', state: '完成',
    acc: '83.1%', ece: '0.023', agree: '88%',
    gate: '切生产', reason: '过门槛 · 血缘可回滚',
  },
];

export default function Finetune() {
  return (
    <div>
      <PlanningNotice change="small-model-decisions"
        note="域内数据 → LLaMA-Factory → 三指标门禁。域微调开关默认关（关闭时任何训练操作 403 并给开启指引）；
        平台只编排、不代装引擎；硬件预检不达标不允许开跑。表格为原型示例。" />

      <div className="panel" style={{ marginTop: 8 }}>
        <div className="toolbar" style={{ marginBottom: 6 }}>
          <span className="section-title">训练批次</span>
          <span className="chip">域：quant-research（训练数据不出本域）</span>
          <span className="chip warn">域微调开关：示例·已开</span>
          <span className="grow" />
          <button className="btn btn-ghost btn-sm" disabled title="后端未接入">新建微调任务</button>
        </div>
        <table className="tbl compact" aria-label="微调批次">
          <thead>
            <tr>
              <th>任务 / 基座</th><th>数据台账（脱敏后）</th><th>引擎</th><th>硬件预检</th>
              <th>状态</th><th>准确 / ECE / 一致率</th><th>生产门禁</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.task}>
                <td><div style={{ fontWeight: 600 }}>{r.task}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.base}</div></td>
                <td style={{ fontSize: 11 }}>{r.data}</td>
                <td style={{ fontSize: 11 }}>{r.engine}</td>
                <td style={{ fontSize: 11 }}>{r.hw}</td>
                <td><span className="chip">{r.state}</span></td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                  {r.acc} / <span style={{ color: Number(r.ece) > 0.05 ? 'var(--red)' : 'var(--green)' }}>{r.ece}</span> / {r.agree}
                </td>
                <td>
                  <span className={`chip ${r.gate === '切生产' ? 'ok' : 'bad'}`}>{r.gate}</span>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>{r.reason}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
