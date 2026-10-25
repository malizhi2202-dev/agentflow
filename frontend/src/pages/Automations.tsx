/**
 * 自动化中心（P3-1）——原型 `automations.html` 九节
 *
 * 结构：左清单（①）+ 右侧分节（② 三段构成 / ③ schedule / ④ webhook / ⑤ 执行模式 /
 * ⑥ 两级账本 + Replay / ⑦ 治理 / ⑧ 权限两本账 / ⑨ 基线对照）。
 *
 * 纪律（照 `.specs/ui-parity` 口径）：
 * - 页名由壳层 `.app-top h1.crumb` 承担，页内**不写 h1/h2**，节标题一律 `.section-title`；
 * - 每一节都有空态（没选中 / 没有触发器 / 没有运行史 / 没有投递记录），不许删节凑数；
 * - 写操作失败把后端 `detail` 原样显示，不改写成「保存成功」；
 * - 权限判定只展示后端算好的两本账（manage ⟂ run），前端不复制判定；
 * - 执行器未接入的部分（Run now / Replay 重放）显式灰显 + 给出原因，不假装能跑。
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Plus, RefreshCw, Trash2 } from 'lucide-react';
import {
  useAutomations,
  type Automation,
  type AutomationDelivery,
  type AutomationRun,
  type Runbook,
  type RuleVersion,
} from '../stores/automations';

const STATUS_LABEL: Record<string, string> = { enabled: '启用', paused: '暂停', archived: '已归档' };
const EXEC_MODE_LABEL: Record<string, string> = {
  create_issue: 'create_issue · 建任务',
  run_only: 'run_only · 只运行',
};
const TZ_OPTIONS = ['Asia/Shanghai', 'America/New_York', 'Europe/Berlin'];
const MONO: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: 11 };
const MUTED: React.CSSProperties = { color: 'var(--text-muted)', fontSize: 11.5 };
const INPUT: React.CSSProperties = {
  padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
  background: 'var(--bg)', color: 'var(--text)', fontSize: 12,
};
const TEXTAREA: React.CSSProperties = { ...INPUT, width: '100%', minHeight: 46, resize: 'vertical' };

const EMPTY_RUNBOOK: Runbook = { goal: '', background: '', constraints: '', steps: '' };

/** ISO（含偏移）→ `MM-DD HH:mm`：按服务端给的墙钟切，不在浏览器时区里重算。 */
function fmtNextRun(iso: string): string {
  if (!iso || iso.length < 16) return iso || '—';
  return `${iso.slice(5, 10)} ${iso.slice(11, 16)}`;
}

/** 两版 spec 的 key 级只读对比（v25 R25-4）：added/removed/changed 三类；等值键不列。 */
function diffSpecs(a: Record<string, unknown>, b: Record<string, unknown>):
  { key: string; from: string; to: string; kind: 'removed' | 'added' | 'changed' }[] {
  const norm = (v: unknown) => JSON.stringify(v ?? null);
  const keys = Array.from(new Set([...Object.keys(a || {}), ...Object.keys(b || {})])).sort();
  const rows: { key: string; from: string; to: string; kind: 'removed' | 'added' | 'changed' }[] = [];
  for (const k of keys) {
    const inA = Object.prototype.hasOwnProperty.call(a || {}, k);
    const inB = Object.prototype.hasOwnProperty.call(b || {}, k);
    const sa = norm((a || {})[k]);
    const sb = norm((b || {})[k]);
    if (inA && !inB) rows.push({ key: k, from: sa, to: '—', kind: 'removed' });
    else if (!inA && inB) rows.push({ key: k, from: '—', to: sb, kind: 'added' });
    else if (sa !== sb) rows.push({ key: k, from: sa, to: sb, kind: 'changed' });
  }
  return rows;
}

/** 规则版本子节（节②内 · 原型 automations.html「每次改动存版本快照，可看 diff」）：
 *  v1…vN 列表 + 任选两版 key 级 diff **只读**——后端是只读账（无回滚端点），
 *  原型 toast 里的「回滚到 v1」未实现，如实标「只读 · 回滚未接入」，不造按钮。 */
function RuleVersionSection({ versions, current, readError }:
  { versions: RuleVersion[]; current: number; readError?: string | null }) {
  const [fromSel, setFromSel] = useState('');
  const [toSel, setToSel] = useState('');
  const list = useMemo(() => [...versions].sort((x, y) => x.version - y.version), [versions]);
  const from = fromSel || (list.length > 1 ? String(list[list.length - 2].version)
    : (list.length === 1 ? String(list[0].version) : ''));
  const to = toSel || (list.length ? String(list[list.length - 1].version) : '');
  const va = list.find((v) => String(v.version) === from);
  const vb = list.find((v) => String(v.version) === to);
  const diffs = useMemo(() => (va && vb ? diffSpecs(va.spec ?? {}, vb.spec ?? {}) : []), [va, vb]);
  return (
    <div style={{ marginTop: 10 }}>
      <div className="toolbar">
        <span className="section-title">规则版本账（v1…vN · 只读 diff）—— 每次改规格留一行快照，可指回「当时按哪版跑」</span>
        <span className="chip mono">版本 {list.length}</span>
        <span className="chip">当前 v{current}</span>
      </div>
      {readError ? (
        <p className="page-note" style={{ color: 'var(--orange)' }}>
          规则版本读取失败（{readError}）——不影响其余节；版本账可用性以接口为准。
        </p>
      ) : list.length === 0 ? (
        <p className="page-note">账上暂无版本行（版本账随创建/改动记入；旧库历史行可能缺账，界面不编版本）。</p>
      ) : (
        <>
          <table className="tbl compact" aria-label="规则版本清单">
            <thead><tr><th>版本</th><th>变更理由</th><th>创建人</th><th>时间</th></tr></thead>
            <tbody>
              {list.map((v) => (
                <tr key={v.id}>
                  <td style={MONO}>
                    v{v.version}
                    {v.version === current && <span className="chip ok" style={{ marginLeft: 6 }}>当前</span>}
                  </td>
                  <td style={{ fontSize: 11.5 }}>{v.reason || '—'}</td>
                  <td style={{ fontSize: 11 }}>{v.created_by || '—'}</td>
                  <td style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                    {v.created_at ? new Date(v.created_at).toLocaleString('zh-CN') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="toolbar" style={{ marginTop: 6, gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={MUTED} htmlFor="rv-from">对比</label>
            <select id="rv-from" style={INPUT} value={from} onChange={(e) => setFromSel(e.target.value)}>
              {list.map((v) => <option key={v.id} value={String(v.version)}>v{v.version}</option>)}
            </select>
            <span style={MUTED}>→</span>
            <select id="rv-to" aria-label="对比目标版本" style={INPUT} value={to} onChange={(e) => setToSel(e.target.value)}>
              {list.map((v) => <option key={v.id} value={String(v.version)}>v{v.version}</option>)}
            </select>
            <span className="chip warn">只读 diff · 回滚未接入（后端是只读账，原型的「回滚到 v1」不作实现承诺）</span>
          </div>
          {from === to ? (
            <p className="page-note" style={{ marginTop: 4 }}>选的是同一版，无差异。</p>
          ) : diffs.length === 0 ? (
            <p className="page-note" style={{ marginTop: 4 }}>v{from} → v{to} 规格逐键一致（只有理由/创建人不同）。</p>
          ) : (
            <table className="tbl compact" aria-label="规则版本 diff" style={{ marginTop: 4 }}>
              <thead><tr><th>字段</th><th>v{from}</th><th>v{to}</th><th>变化</th></tr></thead>
              <tbody>
                {diffs.map((d) => (
                  <tr key={d.key}>
                    <td style={MONO}>{d.key}</td>
                    <td style={{ ...MONO, color: 'var(--red)', wordBreak: 'break-all' }}>{d.from}</td>
                    <td style={{ ...MONO, color: 'var(--green)', wordBreak: 'break-all' }}>{d.to}</td>
                    <td>
                      <span className={'chip ' + (d.kind === 'changed' ? 'warn' : d.kind === 'added' ? 'ok' : 'bad')}>
                        {d.kind}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return iso.replace('T', ' ').slice(0, 16);
}

function rateText(rate: number | null): string {
  return rate == null ? '—' : `${(rate * 100).toFixed(1)}%`;
}

function statusChip(a: Automation) {
  if (a.status === 'archived') return <span className="chip">已归档</span>;
  if (a.breaker_open) return <span className="chip bad">熔断待人工恢复</span>;
  if (!a.enabled) return <span className="chip warn">暂停</span>;
  return <span className="chip ok">启用</span>;
}

function emptyRow(colSpan: number, text: string) {
  return (
    <tr>
      <td colSpan={colSpan} style={MUTED}>{text}</td>
    </tr>
  );
}

export default function Automations() {
  const store = useAutomations();
  const {
    items, meta, breakerRule, payloadLimit, selectedId, detail, triggers, runs, deliveries,
    ruleVersions, ruleVersionsError,
    error, loading, notice, secretOnce, fetchAll, select, create, saveSections, pause, resume,
    archive, setBreaker, addTrigger, toggleTrigger, deleteTrigger, rotateTrigger, previewCron,
    clearNotice,
  } = store;

  const [actionError, setActionError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);

  // ② Runbook 本地草稿（只有点「保存这一段」才提交：三段互不覆盖）
  const [runbookDraft, setRunbookDraft] = useState<Runbook>(EMPTY_RUNBOOK);
  // ② 负责人草稿
  const [ownerDraft, setOwnerDraft] = useState({ owner_track: 'agent', owner_id_ref: '' });
  // ⑤ 执行模式草稿
  const [execDraft, setExecDraft] = useState('run_only');
  // 新建表单
  const [form, setForm] = useState({
    name: '', owner_track: 'agent', owner_id_ref: '', exec_mode: 'run_only',
    runbook: { ...EMPTY_RUNBOOK },
  });
  // ③ schedule 新增表单（必须先预览 Next runs 才给保存）
  const [sched, setSched] = useState({ cron: '30 8 * * 1-5', timezone: 'Asia/Shanghai' });
  const [schedPreview, setSchedPreview] = useState<string[] | null>(null);
  // ④ webhook 新增表单（事件过滤：一行一个 `event` 或 `event:action1,action2`）
  const [hookFilter, setHookFilter] = useState('');

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // 选中行变了：把右侧草稿对齐到服务端当前值（否则保存会用旧值覆盖别段）
  useEffect(() => {
    if (!detail) return;
    setRunbookDraft({ ...EMPTY_RUNBOOK, ...(detail.runbook || {}) });
    setOwnerDraft({ owner_track: detail.owner_track, owner_id_ref: detail.owner_id_ref });
    setExecDraft(detail.exec_mode);
    setConfirmArchive(false);
    setSelectedRunId(null);
  }, [detail?.id, detail?.updated_at]);  // eslint-disable-line react-hooks/exhaustive-deps

  // 预览结果只对当前 cron/tz 有效：改任一段就作废（「不预览不给保存」）
  useEffect(() => { setSchedPreview(null); }, [sched.cron, sched.timezone]);

  const run = useCallback(async (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setActionError(null);
    clearNotice();
    const out = await fn();
    if (!out.ok) setActionError(out.error || '操作失败');
  }, [clearNotice]);

  const scheduleTriggers = useMemo(() => triggers.filter((t) => t.kind === 'schedule'), [triggers]);
  const webhookTriggers = useMemo(() => triggers.filter((t) => t.kind === 'webhook'), [triggers]);
  const selectedRun: AutomationRun | null = useMemo(
    () => runs.find((r) => r.id === selectedRunId) || null, [runs, selectedRunId]);

  // ── 写操作 ──────────────────────────────────────────────
  const submitRunbook = () => run(() => saveSections(detail!.id, { runbook: runbookDraft }));
  const submitOwner = () => run(() => saveSections(detail!.id, {
    owner_track: ownerDraft.owner_track, owner_id_ref: ownerDraft.owner_id_ref,
  }));
  const submitExecMode = () => run(() => saveSections(detail!.id, { exec_mode: execDraft }));

  const doPreview = async () => {
    if (!detail) return;
    setActionError(null);
    const out = await previewCron(detail.id, sched.cron, sched.timezone);
    if (!out.ok) { setSchedPreview(null); setActionError(out.error || '预览失败'); return; }
    setSchedPreview(out.next_runs || []);
  };

  const addSchedule = () => run(() => addTrigger(detail!.id, {
    kind: 'schedule', cron: sched.cron.trim(), timezone: sched.timezone,
  }));

  const addWebhook = () => run(() => addTrigger(detail!.id, {
    kind: 'webhook', event_filter: parseFilter(hookFilter),
  }));

  const submitCreate = async () => {
    setActionError(null);
    if (!form.name.trim()) { setActionError('名称不能为空'); return; }
    if (!form.owner_id_ref.trim()) { setActionError('负责人不能为空：Agent 或 Squad 二轨各须指一个目标'); return; }
    if (!form.runbook.goal.trim()) { setActionError('Runbook 目标不能为空'); return; }
    const out = await create({
      name: form.name.trim(),
      runbook: form.runbook,
      owner_track: form.owner_track,
      owner_id_ref: form.owner_id_ref.trim(),
      exec_mode: form.exec_mode,
    });
    if (out.ok) {
      setShowCreate(false);
      setForm({ name: '', owner_track: 'agent', owner_id_ref: '', exec_mode: 'run_only', runbook: { ...EMPTY_RUNBOOK } });
    } else {
      setActionError(out.error || '创建失败');
    }
  };

  return (
    <div>
      {/* 页级工具栏：只读元信息 + 页面级动作（页名在壳层 crumb 里） */}
      <section className="panel" aria-label="自动化清单（①）">
        <div className="toolbar">
          <span className="section-title">① 自动化清单 —— 名称 / 负责人轨 / 触发器摘要 / 执行模式 / 状态 / 近 7d 失败率 / 操作</span>
          <span className="chip mono">规则 {meta.total}</span>
          <span className="chip ok">启用 {meta.enabled}</span>
          <span className="chip warn">暂停 {meta.paused}</span>
          {meta.breaker_open > 0 && <span className="chip bad">熔断 {meta.breaker_open}</span>}
          <span className="chip">已归档 {meta.archived}</span>
          <span className="grow" />
          <button className="btn btn-ghost btn-sm"
                  onClick={() => run(async () => { await fetchAll(); return { ok: true }; })} title="刷新">
            <RefreshCw size={13} /> 刷新
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate((v) => !v)}
                  aria-expanded={showCreate}>
            <Plus size={13} /> 新建自动化
          </button>
        </div>

        <p className="page-note">
          一条自动化 = <b>Runbook</b>（目标 / 背景 / 约束 / 步骤）＋<b>负责人</b>（Agent 或 Squad 二轨，不可混指）＋
          <b> N 个触发器</b>（schedule / webhook）。三件事分账：Runbook 说清要干什么，负责人决定谁去干，
          触发器决定什么时候被叫醒。删除 = 归档：停未来触发，运行史与投递记录全部保留只读可查。
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table className="tbl compact" aria-label="自动化规则清单">
            <thead>
              <tr>
                <th scope="col">名称</th>
                <th scope="col">负责人轨</th>
                <th scope="col">触发器摘要</th>
                <th scope="col">执行模式</th>
                <th scope="col">状态</th>
                <th scope="col">近 7d 失败率</th>
                <th scope="col" style={{ textAlign: 'right' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id}
                    style={{ background: selectedId === a.id ? 'var(--bg-selected)' : undefined }}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{a.name}</div>
                    <div style={MUTED}>
                      #{a.id} · v{a.spec_version} · owner {a.owner_id}
                    </div>
                  </td>
                  <td>
                    <span className="chip mono">{a.owner_track}</span>
                    <div style={MUTED}>
                      {a.owner_id_ref}{a.owner_ref_name ? ` · ${a.owner_ref_name}` : ''}
                    </div>
                  </td>
                  <td title={a.trigger_summary}>
                    <div style={{ maxWidth: 190, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.trigger_summary}
                    </div>
                    <div style={MUTED}>
                      {a.next_runs.length > 0
                        ? `Next runs: ${a.next_runs.map(fmtNextRun).join(' · ')}`
                        : '无未来触发'}
                    </div>
                  </td>
                  <td>{EXEC_MODE_LABEL[a.exec_mode] || a.exec_mode}</td>
                  <td>{statusChip(a)}</td>
                  <td>
                    <span className={`chip ${a.failure_7d.breaker_gate ? 'bad' : ''}`}>
                      {rateText(a.failure_7d.rate)}
                    </span>
                    <div style={MUTED}>
                      {a.failure_7d.failed} 败 / {a.failure_7d.sample} 完结
                      {a.failure_7d.breaker_gate ? ' · 命中熔断门' : ' · 样本不足不进熔断'}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="btn btn-ghost btn-sm" aria-pressed={selectedId === a.id}
                            aria-label={`选中 ${a.name}`}
                            onClick={() => run(async () => { await select(a.id); return { ok: true }; })}>
                      详情
                    </button>
                    <button className="btn btn-ghost btn-sm" disabled
                            title="执行器未接入：Run now 会走同一 Runbook/负责人/执行模式，但本轮不派生成运行">
                      ▶ Run now
                    </button>
                    {a.enabled
                      ? <button className="btn btn-ghost btn-sm" onClick={() => run(() => pause(a.id, '人工暂停'))}>暂停</button>
                      : <button className="btn btn-ghost btn-sm"
                                disabled={a.status === 'archived'}
                                onClick={() => run(() => resume(a.id))}>恢复</button>}
                  </td>
                </tr>
              ))}
              {items.length === 0 && !loading && emptyRow(7,
                '还没有自动化。点「新建自动化」把 Runbook + 负责人 + 触发器填进去（0 个触发器也能建，只用 Run now）。')}
              {loading && emptyRow(7, '读取中…')}
            </tbody>
          </table>
        </div>

        {(actionError || error) && (
          <div role="alert" style={{ color: 'var(--red)', fontSize: 12, marginTop: 8, display: 'flex', gap: 6 }}>
            <AlertCircle size={14} /> {actionError || error}
          </div>
        )}
        {notice && <p className="page-note" role="status">{notice}</p>}
        {secretOnce && (
          <div className="page-note" role="status" style={{ ...MONO, wordBreak: 'break-all' }}>
            webhook URL（写-only · 只此一次）：{secretOnce.webhook_url}
            <br />{secretOnce.note}
          </div>
        )}
      </section>

      {/* 新建自动化（局部表单：三段仍各存各的账） */}
      {showCreate && (
        <section className="panel" aria-label="新建自动化">
          <div className="toolbar">
            <span className="section-title">新建自动化 —— Runbook ＋ 负责人 ＋ N 个触发器，各存各的账</span>
            <span className="grow" />
            <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>取消</button>
          </div>
          <div className="toolbar" style={{ flexWrap: 'wrap' }}>
            <input style={INPUT} aria-label="自动化名称" placeholder="名称（同工作区唯一）"
                   value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <select style={INPUT} aria-label="负责人轨" value={form.owner_track}
                    onChange={(e) => setForm({ ...form, owner_track: e.target.value })}>
              <option value="agent">Agent（直接入队）</option>
              <option value="squad">Squad（给 leader 入队 leader 任务）</option>
            </select>
            <input style={INPUT} aria-label="负责人引用" placeholder={form.owner_track === 'agent' ? 'Agent id' : 'Squad slug'}
                   value={form.owner_id_ref} onChange={(e) => setForm({ ...form, owner_id_ref: e.target.value })} />
            <select style={INPUT} aria-label="执行模式" value={form.exec_mode}
                    onChange={(e) => setForm({ ...form, exec_mode: e.target.value })}>
              <option value="run_only">run_only · 只运行（只进运行史）</option>
              <option value="create_issue">create_issue · 建任务（讨论/状态/运行挂任务）</option>
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginTop: 6 }}>
            {(['goal', 'background', 'constraints', 'steps'] as const).map((k) => (
              <label key={k} style={{ display: 'block' }}>
                <span style={MUTED}>{RUNBOOK_LABEL[k]}</span>
                <textarea style={TEXTAREA} aria-label={`新建 Runbook ${RUNBOOK_LABEL[k]}`}
                          value={form.runbook[k]}
                          onChange={(e) => setForm({ ...form, runbook: { ...form.runbook, [k]: e.target.value } })} />
              </label>
            ))}
          </div>
          <div className="toolbar" style={{ marginTop: 6 }}>
            <button className="btn btn-primary btn-sm" onClick={submitCreate}>保存（即 v1 快照）</button>
            <span style={MUTED}>0 个触发器也可以建（只用 Run now）；建完就是创建者，可编辑 / 启停 / 归档</span>
          </div>
        </section>
      )}

      {!detail && (
        <section className="panel" aria-label="未选中自动化">
          <p className="page-note">
            从上面清单选一条自动化，右侧显示它的<b>三段构成</b>、<b>触发器</b>、<b>两级账本</b>、
            <b>失败治理</b>、<b>权限两本账</b>与<b>基线对照</b>。
          </p>
        </section>
      )}

      {detail && (
        <>
          {/* ② 三段构成 */}
          <section className="panel" aria-label="三段构成（②）">
            <div className="toolbar">
              <span className="section-title">② 三段构成 —— Runbook ⟂ 负责人 ⟂ 触发器（三个独立段，互不覆盖）</span>
              <span className="chip mono">{detail.name} · v{detail.spec_version}</span>
              <span className="chip">exec_mode {detail.exec_mode}</span>
              <span className="grow" />
              <span style={MUTED}>每段各自「保存这一段」，不会顺手把别段一起写回</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              <div>
                <span className="section-title">Runbook（四段 · 每次运行读当前值）</span>
                {(['goal', 'background', 'constraints', 'steps'] as const).map((k) => (
                  <label key={k} style={{ display: 'block', marginTop: 4 }}>
                    <span style={MUTED}>{RUNBOOK_LABEL[k]}</span>
                    <textarea style={TEXTAREA} aria-label={`Runbook ${RUNBOOK_LABEL[k]}`}
                              value={runbookDraft[k]}
                              onChange={(e) => setRunbookDraft({ ...runbookDraft, [k]: e.target.value })} />
                  </label>
                ))}
                <div className="toolbar" style={{ marginTop: 4 }}>
                  <button className="btn btn-primary btn-sm" onClick={submitRunbook}>保存 Runbook</button>
                  <span style={MUTED}>改完立即对<b>此后</b>触发生效，<b>不回溯</b>在途 run</span>
                </div>
              </div>

              <div>
                <span className="section-title">负责人（二轨 · 单选 · 不可混指）</span>
                <div className="toolbar" style={{ marginTop: 4, flexWrap: 'wrap' }}>
                  <select style={INPUT} aria-label="负责人轨（编辑）" value={ownerDraft.owner_track}
                          onChange={(e) => setOwnerDraft({ ...ownerDraft, owner_track: e.target.value })}>
                    <option value="agent">Agent（直接入队；成本落该 Agent 归属团队）</option>
                    <option value="squad">Squad（给 leader 入队 leader 任务；成员不抢单）</option>
                  </select>
                  <input style={INPUT} aria-label="负责人引用（编辑）" value={ownerDraft.owner_id_ref}
                         onChange={(e) => setOwnerDraft({ ...ownerDraft, owner_id_ref: e.target.value })} />
                  <button className="btn btn-primary btn-sm" onClick={submitOwner}>保存负责人</button>
                </div>
                <p className="page-note">
                  一条规则只认一个负责人；要两条线跑就建两条规则，各自有版本与账。
                  被引用目标归档 / 当前调用者不可调用 → <code>403 not_callable · assignee_archived</code>，
                  原样给出，不降级成「保存成功」。
                </p>

                <span className="section-title">触发器（N 个 · 见 ③④，各存各的账）</span>
                <p className="page-note">
                  当前 {detail.trigger_count} 个：{detail.trigger_summary}。
                  「手动 Run now」是第三入口、不算触发器（不进触发器摘要列、不计触发器数）。
                </p>
              </div>
            </div>

            {/* v25 R25-4：规则版本账子节（接 GET /api/automations/{id}/rule-versions） */}
            <RuleVersionSection versions={ruleVersions} current={detail.spec_version} readError={ruleVersionsError} />
          </section>

          {/* ③ schedule */}
          <section className="panel" aria-label="schedule 触发器（③）">
            <div className="toolbar">
              <span className="section-title">③ schedule 触发器 —— 一行可多条 · 5 段 cron（无秒位）· IANA 时区 · Next runs 必显</span>
              <span className="chip mono">{scheduleTriggers.length} 条</span>
              <span className="grow" />
              <span style={MUTED}>服务端解析；非法表达式 422 直给错因，不静默存成「永不触发」</span>
            </div>

            <div className="toolbar" style={{ flexWrap: 'wrap' }}>
              <input style={{ ...INPUT, fontFamily: 'var(--font-mono)' }} aria-label="cron（5 段 分 时 日 月 周）"
                     placeholder="30 8 * * 1-5" value={sched.cron}
                     onChange={(e) => setSched({ ...sched, cron: e.target.value })} />
              <select style={INPUT} aria-label="cron 时区" value={sched.timezone}
                      onChange={(e) => setSched({ ...sched, timezone: e.target.value })}>
                {TZ_OPTIONS.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
              </select>
              <button className="btn btn-ghost btn-sm" onClick={doPreview}>预览 Next runs</button>
              <button className="btn btn-primary btn-sm" disabled={schedPreview == null}
                      title={schedPreview == null ? '不预览不给保存：先看接下来 3 次触发时刻' : '保存 schedule 触发器'}
                      onClick={addSchedule}>
                保存 schedule
              </button>
              <span style={MUTED}>5 段 = 分 时 日 月 周，没有秒位（最小粒度 1 分钟）；默认 Asia/Shanghai，非默认显式标注</span>
            </div>

            <div className="page-note" role="status">
              {schedPreview == null
                ? 'Next runs 预览（必显）：改任一段后需重新预览，未预览不给保存——「我以为每天跑，其实一条都不会触发」是 cron 最贵的错法。'
                : schedPreview.length === 0
                  ? '预览结果：无未来触发（该表达式在可预见窗口里不会命中）'
                  : `接下来 3 次：${schedPreview.map(fmtNextRun).join(' · ')}`}
            </div>

            <table className="tbl compact" aria-label="schedule 触发器列表">
              <thead>
                <tr>
                  <th scope="col">cron</th>
                  <th scope="col">时区</th>
                  <th scope="col">Next runs（服务端算）</th>
                  <th scope="col">启停</th>
                  <th scope="col" style={{ textAlign: 'right' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {scheduleTriggers.map((t) => (
                  <tr key={t.id}>
                    <td style={MONO}>{t.cron}</td>
                    <td>{t.timezone}</td>
                    <td>
                      {(t.next_runs || []).length > 0
                        ? <span style={MONO}>{(t.next_runs || []).map(fmtNextRun).join(' · ')}</span>
                        : <span style={MUTED}>—</span>}
                      {t.next_runs_note && <div style={MUTED}>{t.next_runs_note}</div>}
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm" aria-pressed={t.enabled}
                              aria-label={`${t.enabled ? '停用' : '启用'} schedule ${t.cron}`}
                              onClick={() => run(() => toggleTrigger(detail.id, t.id, !t.enabled))}>
                        {t.enabled ? '开' : '关'}
                      </button>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-ghost btn-sm" aria-label={`删除 schedule ${t.cron}`}
                              onClick={() => run(() => deleteTrigger(detail.id, t.id))}>
                        <Trash2 size={12} /> 删除
                      </button>
                    </td>
                  </tr>
                ))}
                {scheduleTriggers.length === 0 && emptyRow(5,
                  '还没有 schedule 触发器：这条规则不会被定时触发（只能 Run now 或靠 webhook）。')}
              </tbody>
            </table>
          </section>

          {/* ④ webhook */}
          <section className="panel" aria-label="webhook 触发器（④）">
            <div className="toolbar">
              <span className="section-title">④ webhook 触发器 —— 载荷上限 · 幂等 · 遮蔽与 Rotate · 事件过滤 · 六步推断 · 响应语义</span>
              <span className="chip mono">{webhookTriggers.length} 条</span>
              <span className="grow" />
              <span style={MUTED}>载荷 JSON ≤ {payloadLimit} 字节（{Math.round(payloadLimit / 1024)} KiB），超限 413</span>
            </div>

            <div className="toolbar" style={{ flexWrap: 'wrap' }}>
              <input style={{ ...INPUT, minWidth: 280 }} aria-label="webhook 事件过滤"
                     placeholder="事件过滤：一行一条，如 push 或 pull_request:opened,closed（留空 = 全收）"
                     value={hookFilter} onChange={(e) => setHookFilter(e.target.value)} />
              <button className="btn btn-primary btn-sm" onClick={addWebhook}>添加 webhook</button>
              <span style={MUTED}>空规则 = 全收（不是全拒）；任一行匹配即跑</span>
            </div>

            <table className="tbl compact" aria-label="webhook 触发器列表">
              <thead>
                <tr>
                  <th scope="col">token（遮蔽）</th>
                  <th scope="col">载荷上限</th>
                  <th scope="col">事件过滤</th>
                  <th scope="col">启停</th>
                  <th scope="col" style={{ textAlign: 'right' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {webhookTriggers.map((t) => (
                  <tr key={t.id}>
                    <td style={MONO}>{t.secret_preview || '（已轮换）'}</td>
                    <td>{t.payload_limit_human}</td>
                    <td>
                      {(t.event_filter || []).length === 0
                        ? <span className="chip ok">全收</span>
                        : (t.event_filter || []).map((f, i) => (
                          <span className="chip mono" key={i}>
                            {f.event}{f.actions.length > 0 ? `:${f.actions.join(',')}` : ''}
                          </span>
                        ))}
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm" aria-pressed={t.enabled}
                              aria-label={`${t.enabled ? '停用' : '启用'} webhook ${t.secret_preview}`}
                              onClick={() => run(() => toggleTrigger(detail.id, t.id, !t.enabled))}>
                        {t.enabled ? '开' : '关'}
                      </button>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button className="btn btn-ghost btn-sm" aria-label={`Rotate webhook ${t.secret_preview}`}
                              title="换新 URL；旧 URL 立即失效（写-only 不回显）"
                              onClick={() => run(() => rotateTrigger(detail.id, t.id))}>
                        Rotate
                      </button>
                      <button className="btn btn-ghost btn-sm" aria-label={`删除 webhook ${t.secret_preview}`}
                              onClick={() => run(() => deleteTrigger(detail.id, t.id))}>
                        <Trash2 size={12} /> 删除
                      </button>
                    </td>
                  </tr>
                ))}
                {webhookTriggers.length === 0 && emptyRow(5,
                  '还没有 webhook 触发器：外部系统没有入口投递（投递记录也会是空态）。')}
              </tbody>
            </table>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginTop: 8 }}>
              <div>
                <span className="section-title">六步事件推断（按序取第一个命中的）</span>
                <ol style={{ margin: '4px 0 0 16px', padding: 0, ...MUTED, fontSize: 12, lineHeight: 1.75 }}>
                  <li>载荷里的 <code>event</code> 字段（显式，最优先）</li>
                  <li><code>X-GitHub-Event</code> ＋ 正文 <code>action</code></li>
                  <li><code>X-Gitlab-Event</code></li>
                  <li><code>X-Event-Type</code></li>
                  <li>正文里的 <code>type</code> / <code>action</code></li>
                  <li>兜底 <code>webhook.received</code>（什么都没认出来，仍收、仍记账）</li>
                </ol>
                <p className="page-note">
                  幂等：<code>Idempotency-Key</code> 命中已见键 → 200 duplicate，只留投递记录、不新建运行；
                  <code>X-GitHub-Delivery</code> 另记一个去重键。<b>签名不符属「门」</b>，与业务失败分开显示。
                </p>
              </div>
              <div>
                <span className="section-title">响应语义：业务性「不跑」也回 200</span>
                <table className="tbl compact" aria-label="webhook 响应语义">
                  <thead>
                    <tr><th scope="col">响应</th><th scope="col">含义</th></tr>
                  </thead>
                  <tbody>
                    <tr><td><code>202</code> accepted</td><td>收下了并派生成运行；运行结果另在运行史里</td></tr>
                    <tr><td><code>200</code> skipped</td><td>规则在但这次不跑：触发器停用 / 规则暂停 / 熔断 / 归档</td></tr>
                    <tr><td><code>200</code> ignored</td><td>事件过滤未命中，看完就放下</td></tr>
                    <tr><td><code>200</code> duplicate</td><td>幂等键命中，已有那次在账上</td></tr>
                    <tr><td><code>400 / 401 / 404 / 413</code></td><td>技术性拒绝：非法 JSON / 签名不符 / token 失效 / 载荷超限</td></tr>
                  </tbody>
                </table>
                <p className="page-note">
                  为什么不跑也回 200：上游只对非 2xx 重试，把「过滤掉了」回成 4xx 会让 CI 反复重投。
                </p>
              </div>
            </div>
          </section>

          {/* ⑤ 执行模式 */}
          <section className="panel" aria-label="执行模式（⑤）">
            <div className="toolbar">
              <span className="section-title">⑤ 执行模式：create_issue ⟂ run_only —— 取舍句写在选择器旁边</span>
              <span className="grow" />
              <span className="chip mono">当前 {detail.exec_mode}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              <label style={{ display: 'block', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: 8 }}>
                <input type="radio" name="exec-mode" value="create_issue" aria-label="执行模式 create_issue"
                       checked={execDraft === 'create_issue'}
                       onChange={() => setExecDraft('create_issue')} />{' '}
                <b>create_issue</b>（建任务）
                <p className="page-note">
                  给<b>需要人看或跟人干</b>的活：讨论 / 状态 / 运行全部挂在任务上，看板与收件箱都能看到。
                  触发时负责人离线也<b>照建任务</b>（<code>runtime_offline</code> 暂存不丢）；没有结果时任务还在，可复盘可接手；
                  有<b>订阅者</b>字段（建单后通知谁）。
                </p>
              </label>
              <label style={{ display: 'block', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: 8 }}>
                <input type="radio" name="exec-mode" value="run_only" aria-label="执行模式 run_only"
                       checked={execDraft === 'run_only'}
                       onChange={() => setExecDraft('run_only')} />{' '}
                <b>run_only</b>（只运行）
                <p className="page-note">
                  给<b>只要结果、不留协作记录</b>的活：只进自动化运行史，<b>本次不生成任务</b>（界面明写，不谎报）。
                  负责人离线即 <code>skipped</code>、不留等待任务；没有结果就什么都不留。
                  <b>订阅者字段灰显</b>：不留任务 = 无处通知，要人知道就改 create_issue。
                </p>
              </label>
            </div>
            <div className="toolbar" style={{ marginTop: 6 }}>
              <button className="btn btn-primary btn-sm" onClick={submitExecMode}>保存执行模式</button>
              <span style={MUTED}>成功率口径两档同：分母 = 完结（完成 + 失败），replace 取消的 run 不计。</span>
            </div>
          </section>

          {/* ⑥ 两级账本 + Replay */}
          <section className="panel" aria-label="两级账本（⑥）">
            <div className="toolbar">
              <span className="section-title">⑥ 两级账本 + Replay —— 运行史是「跑了什么」，投递记录是「外面投了什么」</span>
              <span className="grow" />
              <span className="chip mono">运行 {runs.length}</span>
              <span className="chip mono">投递 {deliveries.length}</span>
            </div>

            <span className="section-title">第一级 · 自动化运行史（每条触发一行，含 skipped）</span>
            <table className="tbl compact" aria-label="自动化运行史">
              <thead>
                <tr>
                  <th scope="col">触发源</th>
                  <th scope="col">时间</th>
                  <th scope="col">状态</th>
                  <th scope="col">汇总 / 失败原因</th>
                  <th scope="col">规则版本</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Replay</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r: AutomationRun) => (
                  <tr key={r.id} style={{ background: selectedRunId === r.id ? 'var(--bg-selected)' : undefined }}>
                    <td>{r.trigger_label}</td>
                    <td style={MONO}>{fmtTime(r.started_at)}</td>
                    <td>
                      <span className={`chip ${r.status === 'failed' ? 'bad' : r.status === 'completed' ? 'ok' : ''}`}>
                        {r.status}
                      </span>
                    </td>
                    <td>
                      {r.summary || '—'}
                      {r.error && (
                        <div style={{ color: 'var(--red)', fontSize: 11 }}>
                          [{r.error_kind === 'gate' ? '门' : r.error_kind === 'work' ? '活' : '失败'}] {r.error}
                        </div>
                      )}
                    </td>
                    <td style={MONO}>v{r.spec_version}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-ghost btn-sm" aria-label={`查看回放 run ${r.id}`}
                              onClick={() => setSelectedRunId(r.id)}>回放</button>
                    </td>
                  </tr>
                ))}
                {runs.length === 0 && emptyRow(6, '这条规则还没有运行记录（空态：一次都没被触发过）。')}
              </tbody>
            </table>

            <span className="section-title" style={{ display: 'block', marginTop: 8 }}>
              第二级 · webhook 投递记录（每个到达一行，跑没跑都记）
            </span>
            <table className="tbl compact" aria-label="webhook 投递记录">
              <thead>
                <tr>
                  <th scope="col">投递号</th>
                  <th scope="col">解析后事件</th>
                  <th scope="col">响应</th>
                  <th scope="col">载荷</th>
                  <th scope="col">去重信息</th>
                  <th scope="col">时间 / 失败原因</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((d: AutomationDelivery) => (
                  <tr key={d.id}>
                    <td style={MONO}>d-{d.id}</td>
                    <td>{d.event || '—'}</td>
                    <td>
                      <span className={`chip ${d.response_code >= 400 ? 'bad' : d.status === 'accepted' ? 'ok' : ''}`}>
                        {d.response_code} {d.status}
                      </span>
                    </td>
                    <td style={MONO}>{d.payload_bytes} B</td>
                    <td style={MONO}>{d.dedup_key || '—'}</td>
                    <td>
                      <span style={MONO}>{fmtTime(d.received_at)}</span>
                      {d.error && <div style={{ color: 'var(--red)', fontSize: 11 }}>{d.error}</div>}
                      {!d.replayable && d.replay_block_reason && (
                        <div style={MUTED}>不可重放：{d.replay_block_reason}</div>
                      )}
                    </td>
                  </tr>
                ))}
                {deliveries.length === 0 && emptyRow(6,
                  '没有投递记录（这条规则没有 webhook 触发器，或还没人投过；空态不放 0 条假数据）。')}
              </tbody>
            </table>

            <span className="section-title" style={{ display: 'block', marginTop: 8 }}>Replay（只读视图）</span>
            {selectedRun ? (
              <div className="page-note" style={{ borderLeft: '2px solid var(--border)', paddingLeft: 8 }}>
                <div style={MONO}>run #{selectedRun.id} · {selectedRun.trigger_label} · {selectedRun.status} · v{selectedRun.spec_version}</div>
                <div>开始 {fmtTime(selectedRun.started_at)} / 结束 {fmtTime(selectedRun.finished_at)}</div>
                <div>汇总：{selectedRun.summary || '—'}</div>
                {selectedRun.error && <div style={{ color: 'var(--red)' }}>失败原因：{selectedRun.error}</div>}
                <div style={MUTED}>
                  只读回放：账本字段照原样摊开（重放永远新增不改旧、不参与去重）；
                  <b>执行器未接入</b>，这里不重跑、也不伪造运行事件。
                </div>
              </div>
            ) : (
              <p className="page-note">在运行史里点「回放」，看那一次运行的只读快照。</p>
            )}
          </section>

          {/* ⑦ 失败治理 */}
          <section className="panel" aria-label="失败治理（⑦）">
            <div className="toolbar">
              <span className="section-title">⑦ 失败治理：熔断 · 手动暂停 · 归档 —— 三件事三种后果</span>
              <span className="grow" />
              <span style={MUTED}>{breakerRule}</span>
            </div>
            <table className="tbl compact" aria-label="失败治理三态">
              <thead>
                <tr>
                  <th scope="col">方式</th>
                  <th scope="col">条件</th>
                  <th scope="col">停了什么（后果）</th>
                  <th scope="col">怎么恢复</th>
                  <th scope="col" style={{ textAlign: 'right' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>失败率熔断（自动）</td>
                  <td style={MUTED}>{breakerRule}</td>
                  <td>整条规则：schedule + webhook + Run now 全停{detail.breaker_reason ? `（原因：${detail.breaker_reason}）` : ''}</td>
                  <td>修复后<b>人工恢复</b>——止损非自愈，界面不放「自动重试恢复」</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {detail.breaker_open
                      ? <button className="btn btn-ghost btn-sm"
                                onClick={() => run(() => setBreaker(detail.id, false, ''))}>复位熔断</button>
                      : <button className="btn btn-ghost btn-sm"
                                onClick={() => run(() => setBreaker(detail.id, true, '人工演练熔断门'))}>打开熔断</button>}
                  </td>
                </tr>
                <tr>
                  <td>手动暂停（人）</td>
                  <td style={MUTED}>人点「暂停」；或负责人离线太久、人在收线箱升级后主动停</td>
                  <td>同上三件事一起停（<b>含 Run now</b>，别留一个能跑的口子）；在途 run 跑完为止、不撤回</td>
                  <td>人点恢复，立即重新接三个入口{detail.paused_reason && !detail.breaker_open ? `（暂停原因：${detail.paused_reason}）` : ''}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {detail.enabled
                      ? <button className="btn btn-ghost btn-sm" onClick={() => run(() => pause(detail.id, '人工暂停'))}>暂停</button>
                      : <button className="btn btn-ghost btn-sm" disabled={detail.status === 'archived'}
                                onClick={() => run(() => resume(detail.id))}>恢复</button>}
                  </td>
                </tr>
                <tr>
                  <td>删除 = 归档（破坏性）</td>
                  <td style={MUTED}>人点「归档」（二次确认；原因随快照保留）</td>
                  <td>停未来全部触发；<b>历史保留</b>（运行史与投递记录只读可查，可在审计里按本规则过滤）</td>
                  <td><b>没有「恢复触发」</b>：要再跑得新建一条规则（新 id、新 v1 快照）</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {detail.status === 'archived'
                      ? <span className="chip">已归档</span>
                      : confirmArchive
                        ? (
                          <span style={{ whiteSpace: 'nowrap' }}>
                            <button className="btn btn-primary btn-sm"
                                    onClick={() => run(() => archive(detail.id, '页面归档'))}>确认归档</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => setConfirmArchive(false)}>取消</button>
                          </span>
                        )
                        : <button className="btn btn-ghost btn-sm" onClick={() => setConfirmArchive(true)}>归档…</button>}
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="page-note">
              目标失效（附带）：负责人被归档 → 规则自动转 <code>disabled</code>，<b>不静默删行</b>；改指一个有效负责人后再启用。
            </p>
          </section>

          {/* ⑧ 权限两本账 */}
          <section className="panel" aria-label="权限两本账（⑧）">
            <div className="toolbar">
              <span className="section-title">⑧ 权限两本账 —— 「谁能管这条」与「这条能不能真跑」分开算</span>
              <span className="grow" />
              <span style={MUTED}>后端一次算好，界面只展示（不复制判定）</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: 8 }}>
                <span className="section-title">这本账：谁能管这条（编辑 / 启停 / 归档 / Rotate）</span>
                <div style={{ marginTop: 4 }}>
                  <span className={`chip ${detail.permissions.manage.allowed ? 'ok' : 'bad'}`}>
                    {detail.permissions.manage.allowed ? 'allowed' : detail.permissions.manage.reason}
                  </span>
                  <div style={MUTED}>{detail.permissions.manage.detail}</div>
                  <div style={MONO}>owner_id = {detail.owner_id} · 当前用户见 /api/auth/me</div>
                </div>
                <p className="page-note">
                  任何成员可建（建完自己就是创建者）；创建者 + 平台管理员可编辑 / 启停 / 归档 / Rotate。
                  协作者可管理但不可转授权。他人资源一律 404（不用状态码探测），Viewer 只读、写按钮不渲染。
                </p>
              </div>
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: 8 }}>
                <span className="section-title">那本账：这条能不能真跑（enabled + breaker）</span>
                <div style={{ marginTop: 4 }}>
                  <span className={`chip ${detail.permissions.run.allowed ? 'ok' : 'bad'}`}>
                    {detail.permissions.run.allowed ? 'can_run' : `不能真跑 · ${detail.permissions.run.reason}`}
                  </span>
                  <div style={MUTED}>{detail.permissions.run.detail}</div>
                  <div style={MONO}>
                    enabled={String(detail.enabled)} · breaker_open={String(detail.breaker_open)} · status={detail.status}
                  </div>
                </div>
                <p className="page-note">
                  能管自动化 ≠ 能跑它的 Agent：编辑权决定你能不能改这条规则；能不能真跑由每次触发时按链顶人类重过的
                  <b>可调用目标判定</b>说了算。所以「改对了规则仍然 <code>403 not_callable</code>」是合法结果，
                  两种「不行」（<code>permission_denied_editor</code> ⟂ <code>not_callable</code>）分开显示。
                  自动化不是后门：triage 受理门、配额硬限、人批门一律照过。
                </p>
              </div>
            </div>
          </section>

          {/* ⑨ 基线对照 */}
          <section className="panel" aria-label="基线对照（⑨）">
            <div className="toolbar">
              <span className="section-title">⑨ multica 文档基线 ⟂ agentflow 自扩展 —— 借来的口径与自己加的件分行写</span>
            </div>
            <table className="tbl compact" aria-label="基线对照表">
              <thead>
                <tr>
                  <th scope="col">条款</th>
                  <th scope="col">multica 文档基线</th>
                  <th scope="col">本页做法 / 定性</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>触发器类型</td>
                  <td>只有 schedule 与 webhook 两类；API 路径 = webhook URL / CLI，不单列</td>
                  <td>两类为基线；v14 的 <code>api</code> 型是 agentflow 自扩展，不假装是对方口径（本轮未落库，见遗留风险）</td>
                </tr>
                <tr>
                  <td>单触发器启停</td>
                  <td>整条规则可启停；单个触发器启停只有 CLI（已知缺口）</td>
                  <td><b>agentflow 自扩展</b>：触发器行直接给「开 / 关」开关</td>
                </tr>
                <tr>
                  <td>spec_version 版本账本</td>
                  <td>docs 未写版本账本，但<b>代码实证有</b>（只在实质发布追加不可变行，改名写描述不追加）</td>
                  <td>照读当前值，同时每次运行记规则版本快照（本页 v{detail.spec_version}）——快照是为回归/熔断能指回触发当时那份规则</td>
                </tr>
                <tr>
                  <td>手动 Run now</td>
                  <td>第三入口，不算触发器</td>
                  <td>同：不进触发器摘要列、不计触发器数，走同一 Runbook 与执行模式</td>
                </tr>
                <tr>
                  <td>执行模式两档</td>
                  <td>create_issue（讨论/状态/运行挂任务）⟂ run_only（只进运行史；离线即 skipped）</td>
                  <td>基线；本页补「订阅者字段在 run_only 下灰显」的界面后果</td>
                </tr>
                <tr>
                  <td>两级账本 + Replay</td>
                  <td>运行史 + webhook 投递记录；Replay 永远新增不改旧、不参与去重</td>
                  <td>基线；不可重放仅 rejected / 无 body 两类（queued 可重放）。<b>本轮 Replay 只读呈现</b>（执行器未接入）</td>
                </tr>
                <tr>
                  <td>失败率熔断</td>
                  <td>近 7 天 ≥50 次完结且失败率 ≥90% → 自动暂停并通知创建者，修复后人工恢复</td>
                  <td>同（阈值数值与小队页 ⑥ 注一致）</td>
                </tr>
                <tr>
                  <td>并发三态 / Quick Action / triage 门</td>
                  <td>并发三态 / Quick Action 仍未实证；triage_state 其代码已落地</td>
                  <td><b>agentflow 侧纪律</b>：skip / queue / replace 与禁 mention 出自本仓口径，不挂到基线上</td>
                </tr>
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}

const RUNBOOK_LABEL: Record<'goal' | 'background' | 'constraints' | 'steps', string> = {
  goal: '目标（做成什么 · 可判成败）',
  background: '背景（为什么这么干 · 上下文指针）',
  constraints: '约束（不许碰什么）',
  steps: '步骤（有序 · 可偏离但须在结论里说明）',
};

/** 事件过滤输入：一行一条；`event` 或 `event:action1,action2`；空 = 全收。 */
function parseFilter(raw: string): { event: string; actions: string[] }[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [event, actions] = line.split(':');
      return {
        event: (event || '').trim(),
        actions: (actions || '').split(',').map((a) => a.trim()).filter(Boolean),
      };
    })
    .filter((row) => row.event.length > 0);
}
