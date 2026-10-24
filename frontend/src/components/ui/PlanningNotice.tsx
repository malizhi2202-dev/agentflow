/**
 * 规划原型提示条（ui-parity）
 *
 * 原型里有多页明确标着「规划原型 · 此界面尚不存在 · 演示数据」（决策模型 / 微调工厂 / 环境参谋）。
 * 这些页**没有后端**：直接按原型渲染示例数据会让人误以为是真实运行状态，所以统一挂这条：
 * 讲清「这是形态基线、不是真实数据、后端未接入」，并把示例表头写清楚来源。
 */
export default function PlanningNotice({ change, note }: { change?: string; note?: string }) {
  return (
    <div className="panel" style={{ borderStyle: 'dashed', background: 'transparent' }}>
      <div className="toolbar" style={{ marginBottom: 4 }}>
        <span className="chip warn" role="note">规划原型 · 后端未接入</span>
        {change && <span className="chip mono">{change}</span>}
        <span className="chip">示例数据（非真实运行状态）</span>
      </div>
      <p className="page-note">
        {note || '本页按原型形态基线实现，用于对齐布局与信息项；后端尚未提供对应能力，页面里的行是原型示例，不参与任何真实调度。'}
      </p>
    </div>
  );
}
