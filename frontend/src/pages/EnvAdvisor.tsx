/**
 * 环境参谋（原型 6.25 · `/admin/decision-models/advisor`）——**规划原型**
 *
 * 命名消歧（原型页首）：本页 L1/L2/L3 = **部署方案档位**（本机/混合/云）；数据出域分级是 D0-D3；
 * 记忆四层是 L0-L3。三词互不相干。
 * 后端未接入：机器画像探测与方案生成没有端点；本页对齐形态与「能/不能」「缺失步骤逐项确认」两项关键信息。
 */
import PlanningNotice from '../components/ui/PlanningNotice';

const ROWS = [
  {
    layer: 'L1 · 本机最优', engine: 'MLX（Apple 原生）', model: 'Jev-Style-Qwen3.5-2B · bf16',
    ability: '推理 ✓ 微调 ✓（MLX 后端）', disk: '7.8GB · ~80ms',
    steps: ['pip install mlx（指南 · 不代执行）', '⧉ 复制下载命令（源 + sha256 ✓）', '⧉ 端点配置片段 + 校验命令'],
  },
  {
    layer: 'L2 · 跨平台稳妥', engine: 'llama.cpp（Metal 后端）', model: '同模型 · Q8_0（2.1GB）',
    ability: '推理 ✓ 微调 ✗（走 L1 训练）', disk: '2.1GB · ~110ms',
    steps: ['安装 llama.cpp 指南', '⧉ 下载 GGUF（sha256 ✓）', '⧉ 启动参数模板'],
  },
];

export default function EnvAdvisor() {
  return (
    <div>
      <PlanningNotice change="small-model-decisions"
        note="E 层：分层部署方案（可复制命令 / 可下载脚本 / 操作路径三种交付形态，平台零执行）。
        机器画像默认不上传；档位判定按统一内存/显存阈值，不达标即不给该层。表格为原型示例。" />

      <div className="panel" style={{ marginTop: 8 }}>
        <div className="toolbar" style={{ marginBottom: 6 }}>
          <span className="section-title">机器画像（示例 · 默认不上传）</span>
          <span className="chip mono">32GB 统一内存 · 磁盘余 412GB · Metal ✓ / CUDA ✗</span>
          <span className="chip ok">档位判定：本地推理 + 本地微调均可用</span>
          <span className="grow" />
          <button className="btn btn-ghost btn-sm" disabled title="后端未接入">重新画像</button>
        </div>
        <table className="tbl compact" aria-label="部署方案">
          <thead>
            <tr><th>方案层</th><th>引擎</th><th>推荐模型 · 量化</th><th>能 / 不能</th><th>磁盘 · 延迟估算</th><th>缺失步骤（逐项确认）</th></tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.layer}>
                <td style={{ fontWeight: 600 }}>{r.layer}</td>
                <td>{r.engine}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{r.model}</td>
                <td style={{ fontSize: 11.5 }}>{r.ability}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{r.disk}</td>
                <td>
                  {r.steps.map((s) => (
                    <label key={s} style={{ display: 'block', fontSize: 11.5, color: 'var(--text-secondary)' }}>
                      <input type="checkbox" readOnly disabled aria-label={`已确认 ${s}`} /> {s}
                    </label>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
