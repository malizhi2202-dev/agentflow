/**
 * 决策模型目录（原型 6.23 · `/admin/decision-models`）——**规划原型**
 *
 * 原型标注：change `small-model-decisions`；核心形态是「未绑定 ⇒ 直通」的每一处显式表达。
 * 后端未接入：登记/双轨连接/健康态探测/域用途绑定两步制都没有端点；本页只对齐形态与信息项。
 */
import PlanningNotice from '../components/ui/PlanningNotice';

interface Row {
  model: string; track: string; kind: string; health: string; p95: string;
  bindings: { label: string; on: boolean }[];
  threshold: string; escalated: string; fallback: string;
}

const ROWS: Row[] = [
  {
    model: 'Jev-Style-Qwen3.5-2B', track: '本地 · llama.cpp :8080', kind: 'Q4_K_M · 1.3GB',
    health: 'healthy', p95: '112ms',
    bindings: [{ label: '路由决策', on: true }, { label: '对话分诊', on: false }, { label: '简单任务', on: false }],
    threshold: '0.60', escalated: '14', fallback: '0',
  },
  {
    model: 'intent-cls-mini', track: '云 API 备轨', kind: '0.6B',
    health: 'healthy', p95: '210ms',
    bindings: [{ label: '路由决策', on: false }, { label: '对话分诊', on: true }, { label: '简单任务', on: false }],
    threshold: '0.55', escalated: '3', fallback: '1',
  },
];

export default function DecisionModels() {
  return (
    <div>
      <PlanningNotice change="small-model-decisions"
        note="决策模型的登记、双轨连接（本地/云）、健康态与「域用途绑定两步制」。核心口径：未绑定 ⇒ 直通（标签匹配 + 最小连接数），
        「已登记」不等于「在用」——绑定开关在每行右侧。后端尚无这些端点，表格为原型示例。" />

      <div className="panel" style={{ marginTop: 8 }}>
        <div className="toolbar" style={{ marginBottom: 6 }}>
          <span className="section-title">AC-0 状态横幅（示例）</span>
          <span className="chip mono">quant-research 域今日决策调用 0 次 · 路由 100% 走直通</span>
        </div>
        <table className="tbl compact" aria-label="决策模型目录">
          <thead>
            <tr>
              <th>模型 / 轨道</th><th>类型</th><th>健康态</th><th>延迟 P95</th>
              <th>用途绑定（独立开关 · 默认全关）</th><th>阈值 · escalated · fallback</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.model}>
                <td>
                  <div style={{ fontWeight: 600 }}>{r.model}</div>
                  <div className="chip mono" style={{ marginTop: 2 }}>{r.track}</div>
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{r.kind}</td>
                <td><span className={`chip ${r.health === 'healthy' ? 'ok' : 'warn'}`}>{r.health}</span></td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{r.p95}</td>
                <td>
                  {r.bindings.map((b) => (
                    <label key={b.label} style={{ marginRight: 10, fontSize: 11.5, color: 'var(--text-secondary)' }}>
                      <input type="checkbox" checked={b.on} readOnly disabled aria-label={`${r.model} ${b.label}`} />{' '}
                      {b.on ? '开' : '关'} · {b.label}
                    </label>
                  ))}
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>阈值 {r.threshold} · escalated {r.escalated} · fallback {r.fallback}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel" style={{ marginTop: 8 }}>
        <span className="section-title">双门 + 轮次预算（RSI S19 三根线）</span>
        <ul style={{ margin: '4px 0 0', paddingLeft: 18, fontSize: 12, color: 'var(--text-secondary)' }}>
          <li>纠错即标注：仅**人类**的纠正计入训练标注，Agent 互纠不计。</li>
          <li>溯源批次账：每条训练数据可回放「哪些会话被用过」。</li>
          <li>双门 + 轮次预算：准确率门 + ECE 门；过门才允许切生产。</li>
          <li>出域分级用 **D0-D3**（与记忆四层 L0-L3 两词不相混）。</li>
        </ul>
      </div>
    </div>
  );
}
