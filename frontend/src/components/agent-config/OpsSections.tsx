/**
 * 15 · 健康与探活 / 16 · 危险区
 *
 * 15 区复用既有的 `AgentProbePanel`（探针数据来自 `/api/control-plane/probes`），
 * 不重写一份探活 UI；探活**配置**（health_url / 周期 / 阈值 / 退避）在 Agent 表没有列，
 * 只如实标未接入 —— 原型的这组字段属于控制面契约，不是 Agent 字段。
 *
 * 16 区沿用既有删除链路：`onDelete`（列表页壳层传下来的 handler）优先；没有 handler 时
 * 本组件自己发 `DELETE /api/agents/{id}`。**必须二次确认**：删除不可逆（记忆/渠道/知识源挂载一并失效），
 * 一次点击不落库。
 */
import { useState } from 'react';
import { Trash2, Copy } from 'lucide-react';
import { Section, Unwired } from './Section';
import { F } from './fields';
import AgentProbePanel from '../AgentProbePanel';
import ConfirmDialog from '../ConfirmDialog';

export function ProbeSection() {
  return (
    <Section
      id="sec15" no={15} title="健康与探活"
      note="探的是 AgentFlow 侧对该 Agent 服务的健康（HTTP 探活 + 上报心跳）；CLI 是否已登录是另一件事，在「运行时发现」里看。"
      extra={<span className="chip info">数据源 · /api/control-plane/probes</span>}
    >
      <AgentProbePanel />
      <Unwired>
        探活配置（health_url / 探测周期 / 连续失败阈值 / 退避序列）：Agent 表无这些列，
        现由 `backend/services/agent_probe_service.py` 按 base_url 推导 health_url；本页不渲染「填了不生效」的输入框。
      </Unwired>
    </Section>
  );
}

export function DangerSection({ agentId, agentName, onDelete }: {
  agentId?: number;
  agentName?: string;
  onDelete?: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function doDelete() {
    setConfirming(false);
    setError(null);
    if (onDelete) { onDelete(); return; }
    if (!agentId) return;
    fetch('/api/agents/' + agentId, { method: 'DELETE' })
      .then(function (r) {
        if (!r.ok) {
          return r.json().catch(function () { return { detail: '删除失败 (' + r.status + ')' }; })
            .then(function (b: any) { setError(b.detail || ('删除失败 (' + r.status + ')')); });
        }
        return undefined;
      })
      .catch(function (e) { setError('删除失败：' + ((e && e.message) || String(e))); });
  }

  return (
    <Section
      id="sec16" no={16} title="危险区"
      note="不可逆 / 影响在途的操作集中在这里；删除必须二次确认（一次点击不发请求）。"
      extra={<span className="chip bad">不可逆</span>}
    >
      <table className="tbl compact" aria-label="危险区动作">
        <thead><tr><th>动作</th><th>语义</th><th>可逆性</th><th style={{ textAlign: 'right' }}>操作</th></tr></thead>
        <tbody>
          <tr>
            <td>彻底删除</td>
            <td>删除该 Agent（记忆 / 渠道绑定 / 知识源挂载一并失效）；运行中的 Agent 后端会拒绝（400「运行中 Agent 不可删除」）。</td>
            <td><span className="chip bad">不可逆</span></td>
            <td style={{ textAlign: 'right' }}>
              <button type="button" className="btn btn-sm" onClick={function () { setConfirming(true); }}
                disabled={!agentId && !onDelete}
                style={{ color: 'var(--red)' }}>
                <Trash2 size={12} /> 删除 Agent
              </button>
            </td>
          </tr>
          <tr>
            <td>复制为新 Agent</td>
            <td>拷 persona / 指令 / 闸门；env 值与 MCP 配置从不复制（敏感值属各自所有权）。</td>
            <td><span className="chip">不影响本实例</span></td>
            <td style={{ textAlign: 'right' }}>
              <button type="button" className="btn btn-sm" disabled title="后端无复制端点">
                <Copy size={12} /> 复制
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      {error ? <p role="alert" style={F.err}>{error}</p> : null}

      <Unwired>
        归档（archived_at / archived_by 软删 + 恢复）与「删除前 9 项前置检查」：Agent 表这些列与端点都还没有，
        故本区只给真实的删除动作；不伪造「已做前置检查」的通过态。
      </Unwired>

      <ConfirmDialog
        open={confirming}
        danger
        title="彻底删除这个 Agent？"
        message={'「' + (agentName || '未命名 Agent') + '」删除后不可恢复：记忆、IM 通道绑定与知识源挂载一并失效。确认删除？'}
        onCancel={function () { setConfirming(false); }}
        onConfirm={doDelete}
      />
    </Section>
  );
}
