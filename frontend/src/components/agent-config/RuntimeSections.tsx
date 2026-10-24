/**
 * 4 · 运行时与模型 / 5 · 执行设置 / 14 · 闸门
 *
 * 4 区沿用原页唯一一套运行时发现源（`stores/runtimes` 的 registry）+ `utils/runtimeOptions`
 * 纯派生，**不新造注册表**（RULINGS 2026-10-15：Provider / API Key 旧宇宙已裁撤，模型目录由运行时暴露）。
 *
 * 5 / 14 区按「后端有没有这一列 + PUT 收不收」两问决定形态：
 * - token 软/硬上限：Agent 表有两列、PUT 收录 → 可编辑；
 * - io_filter / gate_pre_check / gate_post_check：Agent 表有列（to_dict 回显），但 **PUT 白名单未收录**
 *   → 只读回显 + 明说「改了不落库」，不做假入口；
 * - 并发/轮次上限/单步超时/重试/ttl/retain：Agent 表根本没有这些列（并发在控制面） → 标未接入。
 */
import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Section, ReadRow, Unwired } from './Section';
import { F } from './fields';
import { showValue } from './model';
import { useRuntimes } from '../../stores/runtimes';
import { uniqueRuntimesByCli, modelsForRuntime, modelsErrorForRuntime } from '../../utils/runtimeOptions';

export function RuntimeSection({ data, patch, isNew }: { data: any; patch: (p: any) => void; isNew: boolean }) {
  const registry = useRuntimes();
  const [fetched, setFetched] = useState(false);

  // 运行时发现：一次拉全（同一 store 与「运行时」页共享，不另开缓存）
  useEffect(function () {
    Promise.resolve(registry.fetchRegistry()).then(function () { setFetched(true); });
  }, []);

  const options = uniqueRuntimesByCli(registry.registry);
  const known = options.some(function (rt) { return rt.cli === data.runtime; });
  const models = data.runtime ? modelsForRuntime(registry.registry, data.runtime) : [];
  const modelsErr = data.runtime ? modelsErrorForRuntime(registry.registry, data.runtime) : '';
  const current = options.find(function (rt) { return rt.cli === data.runtime; });

  /**
   * 切换运行时 = 模型 / thinking 档 / 服务档一并重选（原型 4 区口径）：
   * 模型 id 与档位语义都属该运行时的目录，跨运行时不通用，不做「尽力映射」。
   */
  function chooseRuntime(cli: string) {
    const next = modelsForRuntime(registry.registry, cli);
    const keepModel = next.indexOf(data.model_name) >= 0 ? data.model_name : '';
    patch({ runtime: cli, model_name: keepModel, model_provider: undefined, thinking_level: '', service_tier: '' });
  }

  // 新建：默认挑第一个**在线**运行时（一个都没发现就留空，让区块显式提示去运行时页）
  useEffect(function () {
    if (!isNew || data.runtime || options.length === 0) return;
    const online = options.filter(function (r) { return r.status === 'online'; });
    if (online.length > 0) patch({ runtime: online[0].cli });
  }, [registry.registry, isNew, data.runtime]);

  return (
    <Section
      id="sec4" no={4} title="运行时与模型"
      note="运行时由本机 daemon 探测注册；模型目录由所选运行时自己暴露，平台不内置、也不接收厂商凭据。"
      extra={<span className="chip info">平台不本地运行模型</span>}
    >
      <div role="region" aria-label="运行时 + 模型">
        <div style={F.grid2}>
          <div>
            <label style={F.label} htmlFor="agent-runtime">运行时</label>
            <select id="agent-runtime" aria-label="运行时" value={data.runtime || ''}
              onChange={function (e) { chooseRuntime(e.target.value); }} style={F.full}>
              {!data.runtime && <option value="">（未选择 · 先到「运行时」页确认在线）</option>}
              {data.runtime && !known && <option value={data.runtime}>{data.runtime + '（当前值 · 未被发现）'}</option>}
              {options.map(function (rt) {
                const offline = rt.status !== 'online';
                return (
                  <option key={rt.cli} value={rt.cli} disabled={offline}
                    title={offline ? '离线运行时不可选：先确认 daemon 在线与已登录' : '在线'}>
                    {rt.cli + (rt.version ? ' · ' + rt.version : '') + (offline ? ' · 离线 · 不可选' : ' · ✓在线')}
                  </option>
                );
              })}
            </select>
            {registry.registryLoading ? <p style={F.hint}>正在读取已发现的运行时…</p> : null}
            {registry.registryError ? (
              <p role="alert" style={F.err}>运行时列表读取失败：{registry.registryError}</p>
            ) : null}
            {fetched && !registry.registryLoading && options.length === 0 ? (
              <p role="alert" style={F.err}>
                尚未发现任何运行时（daemon 未上报）。到「运行时」页起 daemon 并确认在线后，再来选运行时与模型。
              </p>
            ) : null}
            {options.length > 0 ? (
              <p style={F.hint}>离线项置灰不可选；模型调用一律交给所选运行时的 CLI。</p>
            ) : null}
          </div>

          <div>
            {/* 「刷新模型列表」放在 label 外面：label 内嵌可标注元素（button）会让按钮也继承
                label 文本，`getByLabelText('模型')` 因此命中两个元素（既有用例就断在这） */}
            <div className="toolbar" style={{ marginBottom: 4 }}>
              <label style={Object.assign({}, F.label, { marginBottom: 0 })} htmlFor="agent-model">模型</label>
              <button type="button" onClick={function () { registry.fetchRegistry(); }}
                disabled={registry.registryLoading} title="重新向运行时读取模型目录"
                className="btn btn-ghost btn-xs">
                <RefreshCw size={11} /> 刷新模型列表
              </button>
            </div>
            <select id="agent-model" aria-label="模型" value={data.model_name || ''}
              onChange={function (e) { patch({ model_name: e.target.value }); }}
              disabled={models.length === 0}
              style={Object.assign({}, F.full, { opacity: models.length === 0 ? 0.65 : 1 })}
              title={models.length === 0 ? '该运行时未上报模型目录：留空即用运行时自身默认模型' : ''}>
              <option value="">{models.length > 0 ? '（留空 · 用运行时自身默认）' : '（该运行时未上报模型目录）'}</option>
              {models.map(function (m) { return <option key={m} value={m}>{m}</option>; })}
              {data.model_name && models.indexOf(data.model_name) < 0 && (
                <option value={data.model_name}>{data.model_name + '（当前值 · 未在目录中）'}</option>
              )}
            </select>
            {modelsErr ? (
              <p role="alert" style={F.err}>模型目录不可读：{modelsErr}（留空即用运行时自身默认）</p>
            ) : data.runtime && models.length === 0 ? (
              <p style={F.hint}>该运行时暂未暴露模型目录（不是 0 个模型，是没读到）；留空即用运行时自身默认。</p>
            ) : models.length > 0 ? (
              <p style={F.hint}>{'目录来自运行时（共 ' + models.length + ' 个）；切换运行时后需重新选。'}</p>
            ) : (
              <p style={F.hint}>先选运行时，模型可选项才会出现。</p>
            )}
          </div>
        </div>

        <div style={Object.assign({}, F.grid2, { marginTop: 10 })}>
          <div>
            <label style={F.label} htmlFor="agent-thinking">thinking 档（thinking_level）</label>
            <select id="agent-thinking" aria-label="thinking 档" value={data.thinking_level || ''}
              onChange={function (e) { patch({ thinking_level: e.target.value }); }} style={F.full}>
              <option value="">无</option>
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
            <p style={F.hint}>由运行时透传；不支持该档的运行时忽略此项。</p>
          </div>
          <div>
            <label style={F.label} htmlFor="agent-tier">服务档（service_tier）</label>
            <select id="agent-tier" aria-label="服务档" value={data.service_tier || ''}
              onChange={function (e) { patch({ service_tier: e.target.value }); }} style={F.full}>
              <option value="">默认（随运行时）</option>
              <option value="high">high</option>
              <option value="normal">normal</option>
            </select>
            <p style={F.hint}>仅 codex 类 CLI 有服务档；dsh / claude / hermes 忽略此项。</p>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
        <p className="section-title" style={{ fontSize: 11.5 }}>
          {'所选运行时能力 · ' + (current ? current.cli : '未选择')}
        </p>
        {current ? (
          <div style={F.grid2}>
            <ReadRow label="版本" value={showValue(current.version)} mono />
            <ReadRow label="协议族" value={showValue(current.protocol_family)} mono />
            <ReadRow label="模型目录" value={models.length + ' 个'} />
            <ReadRow label="上报能力" value={(current.capabilities && current.capabilities.length) ? current.capabilities.join(' · ') : '未上报'} />
          </div>
        ) : (
          <p style={F.hint}>未选择运行时（或所选运行时未被发现），因此没有可展示的能力。</p>
        )}
        <p style={F.hint}>能力项按运行时自报原样呈现 —— 平台不推断「会话续跑 / 平台托管 MCP」等未上报的能力。</p>
      </div>
    </Section>
  );
}

export function ExecutionSection({ data, patch }: { data: any; patch: (p: any) => void; isNew: boolean }) {
  return (
    <Section
      id="sec5" no={5} title="执行设置"
      note="token 软/硬上限两列由 Agent 表承载、PUT 收录，因此可编辑；其余执行参数本表没有列，如实标未接入。"
    >
      <div style={F.grid2}>
        <div>
          <label style={F.label} htmlFor="agent-token-soft">Token 软上限（超出告警，不中断）</label>
          <input id="agent-token-soft" type="number" aria-label="Token 软上限" value={data.token_soft_limit ?? ''}
            onChange={function (e) { patch({ token_soft_limit: parseInt(e.target.value, 10) || 0 }); }} style={F.full} />
        </div>
        <div>
          <label style={F.label} htmlFor="agent-token-hard">Token 硬上限（触达即中断该 run）</label>
          <input id="agent-token-hard" type="number" aria-label="Token 硬上限" value={data.token_hard_limit ?? ''}
            onChange={function (e) { patch({ token_hard_limit: parseInt(e.target.value, 10) || 0 }); }} style={F.full} />
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <label style={F.label} htmlFor="agent-iofilter">IO 过滤（io_filter · 只读）</label>
        <select id="agent-iofilter" aria-label="IO 过滤" value={data.io_filter || 'none'} disabled
          style={Object.assign({}, F.full, { opacity: 0.75 })}>
          <option value="none">none（不过滤）</option>
          <option value="sanitize">sanitize（基础：入参去 shell 元字符）</option>
          <option value="strict">strict（出参过 IO Schema）</option>
        </select>
        <p style={F.hint}>当前值来自 Agent 行；本页不提供编辑入口（见下方未接入说明）。</p>
      </div>

      <Unwired>
        并发上限 / 会话轮次上限 / 单步超时 / 重试次数 / ttl / retain：Agent 表无这些列
        （并发与调度底座在控制面 `/api/control-plane/cluster`，ttl/retain 属执行契约 `/api/runtime/execution-contract`），
        故本区不渲染输入框。
      </Unwired>
      <Unwired>io_filter：Agent 表有列、`GET` 会回显，但 `PUT /api/agents/{'{id}'}` 白名单未收录 —— 改了不会落库，因此只读。</Unwired>
    </Section>
  );
}

export function GateSection({ data }: { data: any; patch: (p: any) => void; isNew: boolean }) {
  return (
    <Section
      id="sec14" no={14} title="闸门"
      note="闸门加在状态转换层（动作者类型 × 目标状态），提示词契约不等于门禁；本区只如实呈现 Agent 行上的当前规则。"
      extra={<span className="chip warn">只读 · PUT 未收录</span>}
    >
      <div>
        <label style={F.label} htmlFor="agent-gate-pre">前置校验（gate_pre_check · 入队前）</label>
        <textarea id="agent-gate-pre" aria-label="前置校验" rows={2} readOnly
          value={data.gate_pre_check || ''} placeholder="（未配置 · 使用全局默认）"
          style={Object.assign({}, F.mono, { minHeight: 52, opacity: 0.85 })} />
      </div>
      <div style={{ marginTop: 8 }}>
        <label style={F.label} htmlFor="agent-gate-post">后置校验（gate_post_check · 交付前）</label>
        <textarea id="agent-gate-post" aria-label="后置校验" rows={2} readOnly
          value={data.gate_post_check || ''} placeholder="（未配置 · 使用全局默认）"
          style={Object.assign({}, F.mono, { minHeight: 52, opacity: 0.85 })} />
      </div>
      <div style={{ marginTop: 8 }}>
        <ReadRow label="IO 过滤" value={showValue(data.io_filter || 'none')} mono />
        <p style={F.hint}>io_filter 与 5 区同一字段，不重复渲染；其编辑口径见 5 区说明。</p>
      </div>
      <Unwired>
        gate_pre_check / gate_post_check / io_filter：`PUT /api/agents/{'{id}'}` 白名单未收录这三项
        （后端只 `setattr` 白名单内的字段），故本页只读回显，不做「改完静默不落库」的假编辑。
      </Unwired>
    </Section>
  );
}
