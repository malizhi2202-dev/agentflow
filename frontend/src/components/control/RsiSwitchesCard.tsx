/**
 * ① RSI 开关卡组（原型 `control-plane.html`「自动化改进（RSI 开关）」）
 *
 * 三条硬口径：
 * 1. **类目与可改面全部来自接口**（`/api/rsi/switches`、`/api/rsi/surfaces`），
 *    组件里不写死四类目、不写死路径模式——真源在后端 `RSI_CATEGORIES` / `surface_manifests`。
 * 2. **后端没有的列必须标「未接入」**；v25（R25-2）起 `path_pattern / cap_bytes /
 *    structure_rules / exclusions` 已落库并被门禁消费——已接入的真值照画，
 *    **未配置的项显示「—（未配置）」**（声明可选，不再是「后端未提供」）。
 * 3. **写操作走既有端点** `POST /api/rsi/switches/{category}`（停用 = 危险动作，先二次确认；
 *    失败把后端 `detail` 原样显示）。v25 R25-7：总闸 = **`global` 真行**（后端转换层
 *    短路一切类目）；旧后端无 global 行时如实回退为逐类目聚合（store 内分支）。
 */
import { useState } from 'react';
import { AlertCircle, ArrowDownToLine, ShieldAlert } from 'lucide-react';
import {
  useControlPlane,
  rsiCategoryLabel,
  type RsiSurfaceRow,
} from '../../stores/controlPlane';

/** 后端未提供的列统一用这个字面量（用例会断言它在页面上） */
export const NOT_PROVIDED = '未接入';

function SurfaceRow({ surface }: { surface: RsiSurfaceRow }) {
  const allow = (surface.allow_edit || []).filter(Boolean);
  const exclude = (surface.exclusions || []).filter(Boolean);
  const rules = (surface.structure_rules || []).filter((r) => r != null);
  return (
    <tr>
      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{surface.name}</td>
      <td style={{ fontSize: 11.5 }}>
        {/* 可写路径模式：声明了 path_pattern 画声明；否则画白名单（两者后端语义互补） */}
        {surface.path_pattern ? (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5 }}>{surface.path_pattern}</span>
        ) : allow.length === 0 ? (
          <span className="chip warn">空 · 无可写路径</span>
        ) : (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5 }}>{allow.join(' · ')}</span>
        )}
      </td>
      <td style={{ fontSize: 11.5 }}>
        {surface.cap_bytes ? (
          <span className="chip mono" title="体量上限（字节）：门禁在有正文时判">{surface.cap_bytes} B</span>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>—（未配置）</span>
        )}
      </td>
      <td style={{ fontSize: 11 }}>
        {rules.length === 0 ? (
          <span style={{ color: 'var(--text-muted)' }}>—（未配置）</span>
        ) : (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>
            {rules.map((r) => (typeof r === 'string' ? r : JSON.stringify(r))).join(' ∧ ')}
          </span>
        )}
      </td>
      <td style={{ fontSize: 11 }}>
        {exclude.length === 0 ? (
          <span style={{ color: 'var(--text-muted)' }}>—</span>
        ) : (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5 }}>{exclude.join(' · ')}</span>
        )}
      </td>
    </tr>
  );
}

export default function RsiSwitchesCard() {
  const {
    rsiSwitches, rsiSurfaces, rsiImmutablePrefixes,
    rsiError, rsiNotice, rsiLoading,
    setRsiSwitch, setRsiMaster,
  } = useControlPlane();
  /** 待二次确认的停用目标：类目 key 或 '__master__' */
  const [confirmOff, setConfirmOff] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  // D11（设计 §3.3「必填原因、双入口校验、审计落可见态」）：停用原因必填
  const [offReason, setOffReason] = useState('');

  // v25 R25-7：总闸 = `global` 真行（off 由转换层短路一切类目）；缺真行 = 旧后端，
  // 如实退聚合呈现（store 的 setRsiMaster 同样按真行有无分支，不假装是新后端）
  const globalRow = rsiSwitches.find((s) => s.category === 'global') ?? null;
  const categoryRows = rsiSwitches.filter((s) => s.category !== 'global');
  const total = categoryRows.length;
  const enabledCount = categoryRows.filter((s) => s.enabled).length;
  const masterOn = globalRow ? globalRow.enabled : total > 0 && enabledCount === total;
  const masterText = globalRow
    ? (globalRow.enabled ? '开（一切类目放行）' : '停用（短路一切类目）')
    : total === 0
      ? NOT_PROVIDED
      : enabledCount === total
        ? `派生 · 运行中（${total} 开）`
        : enabledCount === 0
          ? `派生 · 已停用（${total} 停）`
          : `派生 · 部分停用（${total - enabledCount} 关 / ${enabledCount} 开）`;

  async function runOff(category: string) {
    const reason = offReason.trim();
    if (!reason) return;  // 必填：无原因不给提交（服务端 400 是第二道）
    setBusy(category);
    try {
      if (category === '__master__') await setRsiMaster(false, reason);
      else await setRsiSwitch(category, false, reason);
    } finally {
      setBusy(null);
      setConfirmOff(null);
      setOffReason('');
    }
  }

  async function runOn(category: string) {
    setBusy(category);
    try {
      if (category === '__master__') await setRsiMaster(true);
      else await setRsiSwitch(category, true);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="panel" aria-label="自动化改进（RSI 开关）">
      <div className="toolbar">
        <span className="section-title">自动化改进（RSI 开关）—— 四类产物白名单 ＋ 总闸 ＋ 可改面声明</span>
        <span className="chip warn">规划态 · 演示数值不作承诺</span>
        <span className="chip mono">类目 {total === 0 ? NOT_PROVIDED : total}</span>
        <span className="chip ok">开 {enabledCount}</span>
        <span className={'chip ' + (total === 0 ? 'warn' : enabledCount === total ? 'ok' : enabledCount === 0 ? 'bad' : 'warn')}>
          总闸 {masterText}
        </span>
        <span className="grow" />
        {!masterOn && (total > 0 || globalRow) && (
          <button
            className="btn btn-ghost btn-sm"
            disabled={busy !== null}
            onClick={() => runOn('__master__')}
            title={globalRow ? '恢复全局总闸（真行）' : '四类目逐个恢复（每个都单独入审计）'}
          >
            总闸 · 恢复
          </button>
        )}
        {masterOn && (
          <button
            className="btn btn-ghost btn-sm"
            disabled={busy !== null}
            onClick={() => setConfirmOff('__master__')}
            aria-label="总闸 · 一键全停（全局总闸·短路一切类目）"
          >
            <ShieldAlert size={12} /> 总闸 · 一键全停
          </button>
        )}
      </div>

      <p className="page-note">
        <b>白名单制（禁改区成文）</b>：只有<b>四类产物</b>可被自动改进 —— 技能 / 知识记忆 /
        编排配置（经提案制）/ 决策微模型权重（经双门）。四类之外的<b>一切改进</b>
        （含平台代码、闸门规则与门禁本体、本条款自身）禁止自动化，一律走 R16 议题 + 人批；
        「RSI 的 RSI」（治理流程自我优化 = 改门禁本体）<b>永久出白名单</b>。
        开关本身是<b>状态转换层动作</b>（入口 + 中间件两处独立校验，动作者须域 owner / Admin），
        每次启停入审计，停用态审计事件记「自动体已暂停」。
      </p>

      {/* 四类目开关（数据来自 /api/rsi/switches） */}
      <div style={{ overflowX: 'auto', marginTop: 8 }}>
        <table className="tbl compact" aria-label="RSI 四类产物开关">
          <thead>
            <tr>
              <th>产物类</th>
              <th>开关</th>
              <th>状态</th>
              <th>最近更新</th>
            </tr>
          </thead>
          <tbody>
            {categoryRows.map((row) => {
              const label = rsiCategoryLabel(row.category);
              const key = `rsi-${row.category}`;
              const confirming = confirmOff === row.category;
              return (
                <tr key={key}>
                  <td style={{ fontWeight: 500 }}>
                    {label}
                    <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {row.category}
                    </span>
                  </td>
                  <td>
                    {row.enabled ? (
                      <button
                        className="btn btn-ghost btn-xs"
                        disabled={busy !== null}
                        aria-label={`停用「${label}」自动改进`}
                        onClick={() => setConfirmOff(row.category)}
                      >
                        开 ▾
                      </button>
                    ) : (
                      <button
                        className="btn btn-ghost btn-xs"
                        disabled={busy !== null}
                        aria-label={`恢复「${label}」自动改进`}
                        onClick={() => runOn(row.category)}
                      >
                        关 ▾
                      </button>
                    )}
                  </td>
                  <td>
                    <span className={'chip ' + (row.enabled ? 'ok' : 'bad')}>{row.enabled ? '运行中' : '已暂停'}</span>
                    <span style={{ marginLeft: 6, fontSize: 10.5, color: 'var(--text-muted)' }}>{row.label || ''}</span>
                  </td>
                  <td style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                    {row.updated_at ? `${new Date(row.updated_at).toLocaleString('zh-CN')} · ${row.updated_by || '-'}` : '—'}
                  </td>
                </tr>
              );
            })}
            {total === 0 && (
              <tr>
                <td colSpan={4} style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                  {rsiLoading ? '读取中…' : `${NOT_PROVIDED} · 未读到 /api/rsi/switches 返回的四类目`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 危险动作二次确认（停用类目或总闸） */}
      {confirmOff !== null && (
        <div
          role="group"
          aria-label="停用自动改进的二次确认"
          style={{
            marginTop: 8, padding: 10, borderRadius: 4,
            border: '1px solid var(--orange, #c80)', background: 'var(--bg-input)',
          }}
        >
          <div style={{ fontSize: 11.5, color: 'var(--text)', lineHeight: 1.7 }}>
            <b>
              停用「{confirmOff === '__master__' ? (globalRow ? '全局总闸（短路一切类目）' : '总闸 · 四类目全停') : rsiCategoryLabel(confirmOff)}」？
            </b>
            停用后该类目<b>不再产生新作业</b>（提案 / 归纳 / 反思 / 灰度回流同停）；
            <b>存量在途不受影响</b>，跑完为止；回归熔断一并停用 → 回滚转手工；
            待审提案保留，<b>沉默 ≠ 同意</b>，不自动采纳。运行态自愈（reconcile / 探针）不受影响（另一条轴）。
          </div>
          <div className="toolbar" style={{ marginTop: 8, gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              id="rsi-off-reason"
              aria-label="停用原因（必填）"
              placeholder="停用原因（必填，入审计）"
              style={{ flex: '1 1 220px', minWidth: 200 }}
              value={offReason}
              onChange={(e) => setOffReason(e.target.value)}
              disabled={busy !== null}
            />
            <button className="btn btn-ghost btn-sm" onClick={() => { setConfirmOff(null); setOffReason(''); }} disabled={busy !== null}>
              取消
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => runOff(confirmOff)}
              disabled={busy !== null || !offReason.trim()}
            >
              {busy !== null ? '提交中…' : '确认停用'}
            </button>
          </div>
        </div>
      )}

      {/* 可改面声明对象（SurfaceSpec 四列） */}
      <div className="toolbar" style={{ marginTop: 12 }}>
        <span className="section-title">可改面声明对象（SurfaceSpec）—— 禁改区不是名词清单，是声明对象</span>
        <span className="chip mono">声明 {rsiSurfaces.length}</span>
      </div>
      <p className="page-note">
        四类产物各自登记 <b>可写路径模式 + 体量上限 + 结构规则 + 显式排除</b>，门禁引擎按声明判定
        「这次提案碰没碰禁改面」——「不碰代码」是<b>路径白名单问题</b>，不是措辞问题；声明与双入口校验
        同一真源（界面与门禁各读同一份）。<b>v25（R25-2）：四结构列已落库并被 `assert_editable` 消费</b>
        （path_pattern 命中制 · exclusions 命中即拒 · structure_rules 逐条合取 · cap_bytes 有正文时判）；
        未配置的项显示「—（未配置）」，属声明可选，<b>不是</b>后端缺列。
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table className="tbl compact" aria-label="可改面声明（SurfaceSpec 四列）">
          <thead>
            <tr>
              <th>产物类</th>
              <th>可写路径模式</th>
              <th>体量上限</th>
              <th>结构规则</th>
              <th>显式排除</th>
            </tr>
          </thead>
          <tbody>
            {rsiSurfaces.map((s) => <SurfaceRow key={`surface-${s.id}`} surface={s} />)}
            {rsiSurfaces.length === 0 && (
              <tr>
                <td colSpan={5} style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                  {rsiLoading ? '读取中…' : `${NOT_PROVIDED} · 后端 surface_manifests 暂无声明行（门禁会拒绝一切无声明提案）`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {rsiImmutablePrefixes.length > 0 && (
        <p className="page-note" style={{ marginTop: 6 }}>
          <ArrowDownToLine size={11} /> 服务端永久禁改前缀（`IMMUTABLE_PREFIXES`，来自接口）：
          <span style={{ fontFamily: 'var(--font-mono)' }}> {rsiImmutablePrefixes.join(' / ')}</span>
          —— 白名单再怎么扩，这些前缀也永远不可写。
        </p>
      )}

      {(rsiError) && (
        <div role="alert" style={{ color: 'var(--red)', fontSize: 12, marginTop: 8, display: 'flex', gap: 6 }}>
          <AlertCircle size={14} /> {rsiError}
        </div>
      )}
      {rsiNotice && <p className="page-note" role="status">{rsiNotice}</p>}
    </section>
  );
}
