import { useEffect, useMemo, useState } from 'react';
import { Activity, Brain, ChevronDown, ChevronRight, Plus, RefreshCw, ShieldAlert } from 'lucide-react';
import {
  useRsi, LAYERS, MEMORY_STATUSES, DIMENSIONS,
  type Breaker, type Memory, type Proposal, type Switch,
} from '../stores/rsi';
import { useAuth } from '../stores/auth';

const panel: React.CSSProperties = {
  background: 'var(--bg-panel)', border: '1px solid var(--border)',
  borderRadius: 'var(--r-sm)', padding: 10,
};
const chip: React.CSSProperties = {
  display: 'inline-block', padding: '1px 6px', borderRadius: 10, fontSize: 10.5,
  border: '1px solid var(--border)', marginRight: 4,
};
const labelStyle: React.CSSProperties = { fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 };
const inputStyle: React.CSSProperties = { fontSize: 12, padding: '4px 7px', width: '100%' };

const MEM_STATUS_COLOR: Record<string, string> = {
  promoted: 'var(--green)', confounded: 'var(--orange)',
  quarantined: 'var(--orange)', no_entry: 'var(--text-muted)',
};
const PROP_STATUS_COLOR: Record<string, string> = {
  generated: 'var(--blue)', probed: 'var(--blue)', awaiting_approval: 'var(--orange)',
  published: 'var(--green)', collapsed: 'var(--red)', blocked: 'var(--red)',
  rejected: 'var(--red)', shadowing: 'var(--blue)',
};

function useWrite() {
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const run = async <T extends { ok: boolean; error?: string }>(
    fn: () => Promise<T>, okText?: string,
  ): Promise<T> => {
    setErr(null); setOk(null);
    const out = await fn();
    if (!out.ok) setErr(out.error || '操作失败');
    else if (okText) setOk(okText);
    return out;
  };
  return { err, ok, setErr, run };
}

/* ───────────────── 治理折叠区（开关 + 熔断）───────────────── */

function GovernanceFold({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const { switches, breakers, noiseFloor, govError, fetchGovernance, setSwitch, resetBreaker,
    tripBreaker } = useRsi();
  const { err, run } = useWrite();
  const [confirmReset, setConfirmReset] = useState<string | null>(null);
  const [tripName, setTripName] = useState('budget');
  const [tripReason, setTripReason] = useState('');

  useEffect(() => { fetchGovernance(); }, [fetchGovernance]);

  const paused = switches.filter((s) => !s.enabled).length;
  const tripped = breakers.filter((b) => b.status === 'open').length;

  return (
    <section style={{ ...panel, marginBottom: 10 }}>
      <button className="btn btn-ghost btn-sm" onClick={onToggle} aria-expanded={open}
              style={{ width: '100%', justifyContent: 'space-between', display: 'flex' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ShieldAlert size={14} />自动化治理（已暂停 {paused} · 熔断 {tripped}）
        </span>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {open && (
        <div style={{ marginTop: 8 }}>
          {govError && <div role="alert" style={{ color: 'var(--red)', fontSize: 11.5 }}>{govError}</div>}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>四类自动化开关（关闭 = 自动体已暂停）</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {switches.map((sw: Switch) => (
                <button key={sw.category} className="btn btn-ghost btn-sm"
                        title={sw.enabled ? '点击暂停该类自动体' : '点击恢复'}
                        onClick={() => run(() => setSwitch(sw.category, !sw.enabled))}
                        aria-pressed={sw.enabled}>
                  {sw.category}：
                  <span style={{ color: sw.enabled ? 'var(--green)' : 'var(--red)', marginLeft: 4 }}>
                    {sw.enabled ? '运行中' : '已暂停'}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
              熔断（噪声地板 {noiseFloor}）
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {breakers.map((b: Breaker) => (
                <span key={b.name} style={{ ...chip, color: b.status === 'open' ? 'var(--red)' : 'var(--text-secondary)' }}>
                  {b.name} · {b.status}
                  {b.status !== 'closed' && (
                    <button className="btn btn-ghost btn-sm" style={{ marginLeft: 4 }}
                            onClick={() => {
                              if (confirmReset !== b.name) { setConfirmReset(b.name); return; }
                              run(() => resetBreaker(b.name));
                              setConfirmReset(null);
                            }}>
                      {confirmReset === b.name ? '确认复位' : '复位'}
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ width: 130 }}>
              <label htmlFor="trip-name" style={labelStyle}>手动熔断器</label>
              <select id="trip-name" aria-label="熔断器" style={inputStyle} value={tripName}
                      onChange={(e) => setTripName(e.target.value)}>
                {breakers.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label htmlFor="trip-reason" style={labelStyle}>原因（必填）</label>
              <input id="trip-reason" aria-label="熔断原因" style={inputStyle} value={tripReason}
                     onChange={(e) => setTripReason(e.target.value)} />
            </div>
            <button className="btn btn-ghost btn-sm" disabled={!tripReason.trim()}
                    onClick={() => run(() => tripBreaker(tripName, tripReason.trim()), '已手动熔断')}>
              手动熔断
            </button>
          </div>
          {err && <div role="alert" style={{ color: 'var(--red)', fontSize: 11.5, marginTop: 6 }}>{err}</div>}
        </div>
      )}
    </section>
  );
}

/* ───────────────── 记忆 tab ───────────────── */

function WriteForm({ onDone }: { onDone: () => void }) {
  const proposeMemory = useRsi((s) => s.proposeMemory);
  const { err, setErr, run } = useWrite();
  const [layer, setLayer] = useState<string>('L1');
  const [kind, setKind] = useState('positive');
  const [cue, setCue] = useState('');
  const [lesson, setLesson] = useState('');
  const [evidenceText, setEvidenceText] = useState('');
  const [confounded, setConfounded] = useState(false);
  const [sourceSeq, setSourceSeq] = useState('');
  const [citesSeq, setCitesSeq] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const parseEvidence = (): { ref: string }[] | null => {
    const rows = evidenceText.split('\n').map((s) => s.trim()).filter(Boolean);
    return rows.map((ref) => ({ ref })); // shortcut: 只支持 {ref} 一行一条
  };

  const submit = async () => {
    const ev = parseEvidence();
    if (ev === null) { setErr('evidence 解析失败'); return; }
    const out = await run(() => proposeMemory({
      layer, kind, cue, lesson, evidence: ev,
      confounded,
      source_seq: Number(sourceSeq) || 0,
      cites_seq: Number(citesSeq) || 0,
      // 有证据且非 confounded 才算强证据；否则后端会强制 confounded
      evidence_is_strong: ev.length > 0 && !confounded,
    }));
    if (!out.ok) return;
    const data: any = out.data;
    // 注意不要在这里再 setResult(旧值) —— 会把刚算出的结论覆盖掉（用例抓到过）
    setResult(data?.stored
      ? `已入库：${data.status}`
      : `未入库：no_entry（缺 ${data.missing?.join(' / ') || '字段'}）——这是合法结论，不是失败`);
    setCue(''); setLesson(''); setEvidenceText('');
  };

  return (
    <section aria-label="写入记忆" style={{ ...panel, marginBottom: 10 }}>
      <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div>
          <label htmlFor="m-layer" style={labelStyle}>层级</label>
          <select id="m-layer" aria-label="记忆层级" style={inputStyle} value={layer} onChange={(e) => setLayer(e.target.value)}>
            {LAYERS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="m-kind" style={labelStyle}>kind</label>
          <select id="m-kind" aria-label="记忆类型" style={inputStyle} value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="positive">positive（正知识）</option>
            <option value="negative">negative（负知识）</option>
          </select>
        </div>
        <div>
          <label htmlFor="m-source-seq" style={labelStyle}>source_seq（本条任务序号）</label>
          <input id="m-source-seq" aria-label="source_seq" type="number" style={inputStyle} value={sourceSeq} onChange={(e) => setSourceSeq(e.target.value)} />
        </div>
        <div>
          <label htmlFor="m-cites-seq" style={labelStyle}>cites_seq（引用的最大任务序号）</label>
          <input id="m-cites-seq" aria-label="cites_seq" type="number" style={inputStyle} value={citesSeq} onChange={(e) => setCitesSeq(e.target.value)} />
        </div>
      </div>
      <div style={{ marginTop: 8 }}>
        <label htmlFor="m-cue" style={labelStyle}>cue（什么场景下想起来）</label>
        <input id="m-cue" aria-label="cue" style={inputStyle} value={cue} onChange={(e) => setCue(e.target.value)} />
      </div>
      <div style={{ marginTop: 8 }}>
        <label htmlFor="m-lesson" style={labelStyle}>lesson（学到什么）</label>
        <input id="m-lesson" aria-label="lesson" style={inputStyle} value={lesson} onChange={(e) => setLesson(e.target.value)} />
      </div>
      <div style={{ marginTop: 8 }}>
        <label htmlFor="m-evidence" style={labelStyle}>evidence（一行一条证据 ref）</label>
        <textarea id="m-evidence" aria-label="evidence" rows={3} style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }}
                  value={evidenceText} onChange={(e) => setEvidenceText(e.target.value)} />
      </div>
      <label style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 11.5, marginTop: 6 }}>
        <input type="checkbox" checked={confounded} onChange={(e) => setConfounded(e.target.checked)} />
        拿不准（confounded：默认值，宁可标不确定也不假装成立）
      </label>
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <button className="btn btn-primary btn-sm" onClick={submit}>写入记忆</button>
        <button className="btn btn-ghost btn-sm" onClick={onDone}>收起</button>
      </div>
      {err && <div role="alert" style={{ color: 'var(--red)', fontSize: 11.5, marginTop: 6 }}>{err}</div>}
      {result && <div role="status" style={{ color: 'var(--text-secondary)', fontSize: 11.5, marginTop: 6 }}>{result}</div>}
    </section>
  );
}

function MemoryTab() {
  const { memories, memoriesLoading, memoriesError, fetchMemories,
    reviews, reviewsMemoryId, reviewsError, fetchReviews,
    quarantine, candidates, fetchDecay } = useRsi();
  const [layer, setLayer] = useState('');
  const [status, setStatus] = useState('');
  const [showWrite, setShowWrite] = useState(false);
  const [sourceRef, setSourceRef] = useState('');
  const [govOpen, setGovOpen] = useState(false);
  const [days, setDays] = useState(90);
  const q = useWrite();

  useEffect(() => { fetchMemories({ layer: layer || undefined, status: status || undefined }); }, [layer, status, fetchMemories]);
  useEffect(() => { fetchDecay(days); }, [days, fetchDecay]);

  const selected = useMemo(() => memories.find((m) => m.id === reviewsMemoryId), [memories, reviewsMemoryId]);

  return (
    <div>
      <GovernanceFold open={govOpen} onToggle={() => setGovOpen((v) => !v)} />

      <header style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 8 }}>
        <div style={{ width: 120 }}>
          <label htmlFor="f-layer" style={labelStyle}>层级筛选</label>
          <select id="f-layer" aria-label="层级筛选" style={inputStyle} value={layer} onChange={(e) => setLayer(e.target.value)}>
            <option value="">全部</option>
            {LAYERS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div style={{ width: 150 }}>
          <label htmlFor="f-status" style={labelStyle}>状态筛选</label>
          <select id="f-status" aria-label="状态筛选" style={inputStyle} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">全部</option>
            {MEMORY_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary btn-sm" onClick={() => setShowWrite((v) => !v)} aria-expanded={showWrite}>
          <Plus size={13} style={{ marginRight: 4 }} />写入记忆
        </button>
      </header>

      {showWrite && <WriteForm onDone={() => setShowWrite(false)} />}
      {memoriesError && <div role="alert" style={{ color: 'var(--red)', fontSize: 12, marginBottom: 8 }}>{memoriesError}</div>}
      {!memoriesLoading && memories.length === 0 && !memoriesError && (
        <p style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>
          还没有记忆。写一条：cue 是什么场景、lesson 学到什么、evidence 是证据。
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(280px, 420px)', gap: 12 }}>
        <div>
          {memories.map((m: Memory) => (
            <div key={m.id} style={{ ...panel, marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 12.5 }}>{m.cue || '（无 cue）'}</span>
                <span style={{ ...chip, color: MEM_STATUS_COLOR[m.status] || 'var(--text-secondary)' }}>{m.status}</span>
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 11.5, marginTop: 2 }}>{m.lesson}</div>
              <div style={{ marginTop: 4 }}>
                <span style={chip}>{m.layer}</span>
                <span style={chip}>{m.kind}</span>
                {m.confounded && <span style={{ ...chip, color: 'var(--orange)' }}>confounded</span>}
                {m.pollution_flagged && <span style={{ ...chip, color: 'var(--red)' }}>污染标记</span>}
                {(m.source_seq > 0 || m.cites_seq > 0) && (
                  <span style={chip}>seq {m.cites_seq}→{m.source_seq}</span>
                )}
                <button className="btn btn-ghost btn-sm" onClick={() => fetchReviews(m.id)}>看评审</button>
              </div>
            </div>
          ))}
        </div>

        <div>
          <section style={{ ...panel, marginBottom: 8 }} aria-label="晋升评审">
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
              晋升评审账{selected ? `（记忆 #${selected.id}）` : ''}
            </div>
            {!selected && <div style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>选一条记忆看它的评审记录。</div>}
            {reviewsError && <div role="alert" style={{ color: 'var(--red)', fontSize: 11.5 }}>{reviewsError}</div>}
            {selected && reviews.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>暂无评审记录。</div>}
            {selected && reviews.map((r) => (
              <div key={r.id} style={{ borderTop: '1px solid var(--border)', padding: '4px 0', fontSize: 11.5 }}>
                <span style={{ ...chip, color: r.verdict === 'helped' ? 'var(--green)' : 'var(--text-secondary)' }}>{r.verdict}</span>
                <span style={chip}>字段完整 {r.fields_complete ? '✓' : '✗'}</span>
                <span style={chip}>因果 {r.causal_check ? '✓' : '✗'}</span>
                <span style={chip}>污染 {r.pollution_scan ? '有' : '无'}</span>
                <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>{r.reviewer || '—'} · {r.note || '—'}</div>
              </div>
            ))}
          </section>

          <section style={{ ...panel, marginBottom: 8 }} aria-label="检疫">
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>按来源检疫（撤回）</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label htmlFor="q-ref" style={labelStyle}>source_ref</label>
                <input id="q-ref" aria-label="source_ref" style={inputStyle} value={sourceRef} onChange={(e) => setSourceRef(e.target.value)} />
              </div>
              <button className="btn btn-ghost btn-sm" disabled={!sourceRef.trim()}
                      onClick={() => q.run(() => quarantine(sourceRef.trim()), '已检疫')}>检疫</button>
            </div>
            {q.ok && <div role="status" style={{ color: 'var(--text-secondary)', fontSize: 11.5, marginTop: 4 }}>{q.ok}</div>}
            {q.err && <div role="alert" style={{ color: 'var(--red)', fontSize: 11.5, marginTop: 4 }}>{q.err}</div>}
          </section>

          <section style={panel} aria-label="衰减队列">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>衰减候选（只列不删）</span>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                天数
                <input aria-label="衰减天数" type="number" min={1} value={days}
                       onChange={(e) => setDays(Number(e.target.value) || 1)}
                       style={{ width: 64, marginLeft: 4, fontSize: 11 }} />
              </label>
            </div>
            {candidates.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 11.5, marginTop: 4 }}>暂无候选。</div>}
            {candidates.map((c) => (
              <div key={c.id} style={{ fontSize: 11.5, color: 'var(--text-secondary)', borderTop: '1px solid var(--border)', padding: '3px 0' }}>
                #{c.id} {c.cue || '（无 cue）'} · 衰减分 {c.decay_score}
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}

/* ───────────────── 提案 tab ───────────────── */

function ProposalActions({ p }: { p: Proposal }) {
  const { recordProbe, recordShadow, signoff, publish, fetchSurfaces } = useRsi();
  const isAdmin = useAuth((s) => s.isAdmin);
  const { err, ok, run } = useWrite();
  const [steps, setSteps] = useState('');
  const [tokens, setTokens] = useState('');
  const [judge, setJudge] = useState('');
  const [golden, setGolden] = useState(false);
  const [crossVendor, setCrossVendor] = useState(false);
  const [passRate, setPassRate] = useState('');
  const [baseline, setBaseline] = useState('');
  const [confirmPublish, setConfirmPublish] = useState(false);

  useEffect(() => { fetchSurfaces(); }, [fetchSurfaces]);

  const terminalHint = useMemo(() => {
    if (p.status === 'collapsed') return '已塌缩：提升低于噪声地板，不算改进（终态）。';
    if (p.status === 'blocked') return '已阻塞：探针超出预算帽（终态，需人工处理）。';
    if (p.status === 'published') return '已发布：实际应用仍走既有 Apply。';
    if (p.status === 'rejected') return '已驳回（终态）。';
    return null;
  }, [p.status]);

  return (
    <div style={{ borderTop: '1px solid var(--border)', marginTop: 6, paddingTop: 6 }}>
      {terminalHint && <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{terminalHint}</div>}

      {p.status === 'generated' && (
        <div aria-label="探针录入" style={{ display: 'flex', gap: 6, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ width: 90 }}>
            <label htmlFor={`probe-steps-${p.id}`} style={labelStyle}>steps</label>
            <input id={`probe-steps-${p.id}`} aria-label="探针步数" type="number" style={inputStyle} value={steps} onChange={(e) => setSteps(e.target.value)} />
          </div>
          <div style={{ width: 110 }}>
            <label htmlFor={`probe-tokens-${p.id}`} style={labelStyle}>tokens</label>
            <input id={`probe-tokens-${p.id}`} aria-label="探针 token 数" type="number" style={inputStyle} value={tokens} onChange={(e) => setTokens(e.target.value)} />
          </div>
          <button className="btn btn-ghost btn-sm"
                  onClick={() => run(() => recordProbe(p.id, Number(steps) || 0, Number(tokens) || 0), '探针已记录（弱证据，不作发布依据）')}>
            记录探针
          </button>
        </div>
      )}

      {(p.status === 'probed' || p.status === 'generated') && (
        <div aria-label="影子重放录入" style={{ marginTop: 6 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ width: 150 }}>
              <label htmlFor={`judge-${p.id}`} style={labelStyle}>judge 模型（异厂系）</label>
              <input id={`judge-${p.id}`} aria-label="judge 模型" style={inputStyle} value={judge} onChange={(e) => setJudge(e.target.value)} />
            </div>
            <div style={{ width: 90 }}>
              <label htmlFor={`pass-${p.id}`} style={labelStyle}>pass_rate</label>
              <input id={`pass-${p.id}`} aria-label="pass_rate" type="number" step="0.01" style={inputStyle} value={passRate} onChange={(e) => setPassRate(e.target.value)} />
            </div>
            <div style={{ width: 90 }}>
              <label htmlFor={`base-${p.id}`} style={labelStyle}>baseline</label>
              <input id={`base-${p.id}`} aria-label="baseline" type="number" step="0.01" style={inputStyle} value={baseline} onChange={(e) => setBaseline(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 11.5 }}>
              <input type="checkbox" checked={golden} onChange={(e) => setGolden(e.target.checked)} />金标已冻结
            </label>
            <label style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 11.5 }}>
              <input type="checkbox" checked={crossVendor} onChange={(e) => setCrossVendor(e.target.checked)} />judge 来自异厂系
            </label>
            <button className="btn btn-ghost btn-sm"
                    onClick={() => run(() => recordShadow(p.id, {
                      judge_model: judge, golden_set_frozen: golden, cross_vendor: crossVendor,
                      pass_rate: Number(passRate) || 0, baseline: Number(baseline) || 0,
                    }), '影子重放已记录')}>
              记录影子重放
            </button>
          </div>
        </div>
      )}

      {p.dimension === 'domain' && p.status === 'awaiting_approval' && (
        <div style={{ marginTop: 6, fontSize: 11.5, color: 'var(--orange)' }}>
          领域类提案：需域成员会签后才能发布（当前会签 {(p.domain_signoffs || []).length} 人）。
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: 6 }} onClick={() => run(() => signoff(p.id), '已会签')}>我会签</button>
        </div>
      )}

      {p.status === 'awaiting_approval' && (
        <div style={{ marginTop: 6 }}>
          <button className="btn btn-primary btn-sm" disabled={!isAdmin}
                  title={!isAdmin ? '只有平台管理员可以发布提案' : undefined}
                  onClick={async () => {
                    if (!confirmPublish) { setConfirmPublish(true); return; }
                    await run(() => publish(p.id), '已发布');
                    setConfirmPublish(false);
                  }}>
            {confirmPublish ? '确认发布（人批）' : '人批发布'}
          </button>
        </div>
      )}

      {err && <div role="alert" style={{ color: 'var(--red)', fontSize: 11.5, marginTop: 4 }}>{err}</div>}
      {ok && <div role="status" style={{ color: 'var(--text-secondary)', fontSize: 11.5, marginTop: 4 }}>{ok}</div>}
    </div>
  );
}

function ProposalTab() {
  const { proposals, proposalsLoading, proposalsError, fetchProposals, surfaces, createProposal,
    fetchSurfaces, createSurface, updateSurface, deleteSurface } = useRsi();
  const isAdmin = useAuth((s) => s.isAdmin);
  const [showSurface, setShowSurface] = useState(false);
  const [surfaceNameNew, setSurfaceNameNew] = useState('');
  const [surfacePaths, setSurfacePaths] = useState('prompts/');
  const [editingSurface, setEditingSurface] = useState<number | null>(null);
  const [editSurfacePaths, setEditSurfacePaths] = useState('');
  const { err, run } = useWrite();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [dimension, setDimension] = useState<string>('invariant');
  const [surfaceName, setSurfaceName] = useState('');
  const [target, setTarget] = useState('');
  const [budgetSteps, setBudgetSteps] = useState('10');
  const [budgetTokens, setBudgetTokens] = useState('20000');

  // surfaces 必须在这里拉：提案列表为空时 ProposalActions 不渲染，若只在那边拉，
  // 新建表单的"可改面"下拉会是空的 → 创建按钮永远禁用（用例抓到）。
  useEffect(() => { fetchProposals(); fetchSurfaces(); }, [fetchProposals, fetchSurfaces]);

  return (
    <div>
      <header style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>共 {proposals.length} 条</span>
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost btn-sm" onClick={() => fetchProposals()}>
          <RefreshCw size={13} style={{ marginRight: 4 }} />刷新
        </button>
        {isAdmin && (
          <button className="btn btn-ghost btn-sm" onClick={() => setShowSurface((v) => !v)} aria-expanded={showSurface}>
            新建可改面
          </button>
        )}
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate((v) => !v)} aria-expanded={showCreate}>
          <Plus size={13} style={{ marginRight: 4 }} />新建提案
        </button>
      </header>

      {showSurface && isAdmin && (
        <section aria-label="新建可改面" style={{ ...panel, marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ width: 160 }}>
              <label htmlFor="sf-name" style={labelStyle}>surface 名称</label>
              <input id="sf-name" aria-label="surface 名称" style={inputStyle} value={surfaceNameNew}
                     onChange={(e) => setSurfaceNameNew(e.target.value)} />
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label htmlFor="sf-paths" style={labelStyle}>白名单路径前缀（逗号分隔）</label>
              <input id="sf-paths" aria-label="白名单路径" style={inputStyle} value={surfacePaths}
                     onChange={(e) => setSurfacePaths(e.target.value)} />
            </div>
            <button className="btn btn-ghost btn-sm" disabled={!surfaceNameNew.trim()}
                    onClick={() => run(
                      () => createSurface(surfaceNameNew.trim(),
                        surfacePaths.split(',').map((x) => x.trim()).filter(Boolean)),
                      '可改面已创建')}>创建</button>
          </div>
          <p style={{ fontSize: 10.5, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            scripts/ plugins/ hooks/ 永久禁改；代码层（backend/、frontend/src/）提案一律拒绝。
          </p>
          {err && <div role="alert" style={{ color: 'var(--red)', fontSize: 11.5 }}>{err}</div>}
        </section>
      )}

      {isAdmin && surfaces.length > 0 && (
        <section aria-label="已有可改面" style={{ ...panel, marginBottom: 10 }}>
          <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginBottom: 4 }}>已有可改面</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <tbody>
              {surfaces.map((sf) => (
                <tr key={sf.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '4px 6px', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{sf.name}</td>
                  <td style={{ padding: '4px 6px', color: 'var(--text-muted)' }}>
                    {editingSurface === sf.id ? (
                      <input aria-label="白名单路径（编辑）" style={inputStyle} value={editSurfacePaths}
                             onChange={(e) => setEditSurfacePaths(e.target.value)} />
                    ) : (
                      sf.allow_edit.join(', ') || '（空）'
                    )}
                  </td>
                  <td style={{ padding: '4px 6px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {editingSurface === sf.id ? (
                      <>
                        <button className="btn btn-primary btn-sm"
                                onClick={() => run(async () => {
                                  const out = await updateSurface(sf.id, editSurfacePaths.split(',').map((x) => x.trim()).filter(Boolean));
                                  if (out.ok) setEditingSurface(null);
                                  return out;
                                }, '可改面已更新')}>保存</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingSurface(null)}>取消</button>
                      </>
                    ) : (
                      <>
                        <button className="btn btn-ghost btn-sm" aria-label={`编辑可改面 ${sf.name}`}
                                onClick={() => { setEditingSurface(sf.id); setEditSurfacePaths(sf.allow_edit.join(', ')); }}>
                          编辑
                        </button>
                        <button className="btn btn-ghost btn-sm" aria-label={`删除可改面 ${sf.name}`}
                                onClick={() => run(() => deleteSurface(sf.id), '可改面已删除')}>删除</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {showCreate && (
        <section aria-label="新建提案" style={{ ...panel, marginBottom: 10 }}>
          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
            <div>
              <label htmlFor="p-title" style={labelStyle}>标题</label>
              <input id="p-title" aria-label="提案标题" style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label htmlFor="p-dim" style={labelStyle}>维度（INV⟂DOM）</label>
              <select id="p-dim" aria-label="提案维度" style={inputStyle} value={dimension} onChange={(e) => setDimension(e.target.value)}>
                {DIMENSIONS.map((d) => <option key={d} value={d}>{d === 'invariant' ? '不变量类' : '领域类'}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="p-surface" style={labelStyle}>可改面</label>
              <select id="p-surface" aria-label="可改面" style={inputStyle} value={surfaceName} onChange={(e) => setSurfaceName(e.target.value)}>
                <option value="">选择 surface</option>
                {surfaces.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="p-target" style={labelStyle}>目标路径（须在可改面白名单内）</label>
              <input id="p-target" aria-label="目标路径" style={inputStyle} value={target} onChange={(e) => setTarget(e.target.value)} />
            </div>
            <div>
              <label htmlFor="p-steps" style={labelStyle}>budget_steps (≤50)</label>
              <input id="p-steps" aria-label="budget_steps" type="number" style={inputStyle} value={budgetSteps} onChange={(e) => setBudgetSteps(e.target.value)} />
            </div>
            <div>
              <label htmlFor="p-tokens" style={labelStyle}>budget_tokens (≤200000)</label>
              <input id="p-tokens" aria-label="budget_tokens" type="number" style={inputStyle} value={budgetTokens} onChange={(e) => setBudgetTokens(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button className="btn btn-primary btn-sm" disabled={!title.trim() || !surfaceName || !target.trim()}
                    onClick={() => run(() => createProposal({
                      title, dimension, surface_name: surfaceName, target,
                      budget_steps: Number(budgetSteps) || 10, budget_tokens: Number(budgetTokens) || 20000,
                    }), '提案已创建')}>
              创建提案
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>收起</button>
          </div>
          {err && <div role="alert" style={{ color: 'var(--red)', fontSize: 11.5, marginTop: 6 }}>{err}</div>}
        </section>
      )}

      {proposalsError && <div role="alert" style={{ color: 'var(--red)', fontSize: 12, marginBottom: 8 }}>{proposalsError}</div>}
      {!proposalsLoading && proposals.length === 0 && !proposalsError && (
        <p style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>
          还没有提案。提案 = 对四类产物的改进草案，发布前必须过人批。
        </p>
      )}

      {proposals.map((p) => (
        <article key={p.id} style={{ ...panel, marginBottom: 8 }} aria-label={`提案 ${p.title}`}>
          <header style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
            <strong style={{ fontSize: 13 }}>{p.title}</strong>
            <span style={{ ...chip, color: PROP_STATUS_COLOR[p.status] || 'var(--text-secondary)' }}>{p.status}</span>
            <span style={chip}>{p.dimension}</span>
            <span style={chip}>{p.surface_name} · {p.target}</span>
            <span style={chip}>预算 {p.budget.steps} 步 / {p.budget.tokens} tok</span>
            <span style={chip}>已用 {p.used.steps} / {p.used.tokens}</span>
          </header>
          <ProposalActions p={p} />
        </article>
      ))}
    </div>
  );
}

/* ───────────────── 页面 ───────────────── */

export default function Memory() {
  const [tab, setTab] = useState<'memories' | 'proposals'>('memories');
  const fetchMemories = useRsi((s) => s.fetchMemories);
  const fetchProposals = useRsi((s) => s.fetchProposals);

  return (
    <div style={{ padding: 16 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 16, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Brain size={16} />记忆中心
        </h2>
        <div role="tablist" aria-label="记忆或提案" style={{ display: 'flex', gap: 4 }}>
          {(['memories', 'proposals'] as const).map((k) => (
            <button key={k} role="tab" aria-selected={tab === k} tabIndex={tab === k ? 0 : -1}
                    className="btn btn-ghost btn-sm"
                    style={{ color: tab === k ? 'var(--blue)' : 'var(--text-secondary)', fontWeight: tab === k ? 600 : 400 }}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowRight') { e.preventDefault(); setTab('proposals'); }
                      if (e.key === 'ArrowLeft') { e.preventDefault(); setTab('memories'); }
                    }}
                    onClick={() => setTab(k)}>
              {k === 'memories' ? '记忆' : '提案'}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost btn-sm" onClick={() => { fetchMemories(); fetchProposals(); }}>
          <Activity size={13} style={{ marginRight: 4 }} />刷新
        </button>
      </header>
      {tab === 'memories' ? <MemoryTab /> : <ProposalTab />}
    </div>
  );
}
