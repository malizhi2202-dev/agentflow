/**
 * 金标集管理卡（v25 R25-6 · 原型「冻结金标 + 异厂系 judge」的平台校验落点）
 *
 * 口径（RULINGS R7-1 / D10）：金标此前是影子重放表单里**调用方自报的两个布尔**——
 * 平台不校验等于门禁可绕过。本卡把「金标集」做成真实体：
 * - 列表：名称 / kind / 用例条数（cases_count，全文不回流列表）/ 产出厂牌 produced_by / 冻结态；
 * - 新建 + 冻结 = 管理员动作（POST /golden-sets、POST /golden-sets/{id}/freeze）；
 * - **冻结后 cases 不可改**（frozen 行选不进影子重放的「平台校验」下拉——只有已冻结集可引用）；
 * - 影子重放处（Memory.tsx 提案动作）引用 frozen 集 → gate_evidence=platform_validated；
 *   不引用则回退自报布尔并如实标 self_declared（双口径过渡，见 D10 结案注）。
 */
import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Lock, Plus } from 'lucide-react';

import { useRsi } from '../../stores/rsi';
import { useAuth } from '../../stores/auth';

const inputStyle: React.CSSProperties = { width: '100%', fontSize: 12, padding: '4px 6px' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 };
const chip: React.CSSProperties = { display: 'inline-block', fontSize: 10.5, padding: '1px 6px', border: '1px solid var(--border)', borderRadius: 10, marginRight: 4 };

export default function GoldenSetsCard() {
  const { goldenSets, goldenSetsError, fetchGoldenSets, createGoldenSet, freezeGoldenSet } = useRsi();
  const isAdmin = useAuth((s) => s.isAdmin);
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState('');
  const [kind, setKind] = useState('eval_set');
  const [producedBy, setProducedBy] = useState('');
  const [casesText, setCasesText] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { fetchGoldenSets(); }, [fetchGoldenSets]);

  const frozenCount = useMemo(() => goldenSets.filter((g) => g.frozen).length, [goldenSets]);

  const submitNew = async () => {
    setErr(null); setNotice(null);
    if (!name.trim() || !producedBy.trim()) { setErr('名称与产出厂牌必填（异厂判定的基准）'); return; }
    const cases = casesText.split('\n').map((s) => s.trim()).filter(Boolean);
    setBusy(true);
    const out = await createGoldenSet({ name: name.trim(), kind, produced_by: producedBy.trim(), cases });
    setBusy(false);
    if (!out.ok) { setErr(out.error || '创建失败'); return; }
    setNotice(`金标集已创建（${cases.length} 条用例）——**冻结后**才可被影子重放引用做平台校验`);
    setName(''); setProducedBy(''); setCasesText(''); setShowNew(false);
  };

  const doFreeze = async (id: number) => {
    setErr(null); setNotice(null);
    const out = await freezeGoldenSet(id);
    if (!out.ok) { setErr(out.error || '冻结失败'); return; }
    setNotice(`金标集 #${id} 已冻结：cases 锁死，可被影子重放引用（异厂判定 fail-closed）`);
  };

  return (
    <section className="panel" aria-label="金标集" style={{ marginTop: 12 }}>
      <div className="toolbar">
        <span className="section-title">金标集（Golden Set）—— 「冻结金标 + 异厂 judge」的平台校验落点</span>
        <span className="chip mono">集 {goldenSets.length}</span>
        <span className="chip ok">已冻结 {frozenCount}</span>
        <span className="grow" />
        {isAdmin && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowNew((v) => !v)} aria-expanded={showNew}>
            <Plus size={13} style={{ marginRight: 4 }} />新建金标集
          </button>
        )}
      </div>

      <p className="page-note">
        <b>为何要真实体</b>（R25-6 / D10 结案）：此前「金标已冻结 / judge 来自异厂」是**调用方自报布尔**，
        平台不校验——门禁可绕过。现在影子重放可引用**已冻结**金标集（gate_evidence=platform_validated：
        冻结查账 + judge 厂牌 == produced_by ⇒ 拒、识别不了也拒）；不引用则回退自报并如实标 self_declared。
        用例全文不回列表（防污染：金标内容绝不回流记忆管道）。
      </p>

      {showNew && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 4, padding: 8, marginTop: 6 }}>
          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
            <div>
              <label htmlFor="gs-name" style={labelStyle}>名称（必填）</label>
              <input id="gs-name" aria-label="金标集名称" style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label htmlFor="gs-kind" style={labelStyle}>kind</label>
              <select id="gs-kind" aria-label="金标集类型" style={inputStyle} value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="eval_set">eval_set（评测集）</option>
                <option value="regression">regression（回归集）</option>
              </select>
            </div>
            <div>
              <label htmlFor="gs-produced" style={labelStyle}>产出厂牌 produced_by（必填 · 异厂判定基准）</label>
              <input id="gs-produced" aria-label="产出厂牌" style={inputStyle} value={producedBy} onChange={(e) => setProducedBy(e.target.value)} placeholder="例 anthropic" />
            </div>
          </div>
          <div style={{ marginTop: 6 }}>
            <label htmlFor="gs-cases" style={labelStyle}>cases（一行一条，创建后仍可改，冻结后锁死）</label>
            <textarea id="gs-cases" aria-label="金标用例" rows={3} style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }}
                      value={casesText} onChange={(e) => setCasesText(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <button className="btn btn-primary btn-sm" disabled={busy} onClick={submitNew}>{busy ? '提交中…' : '创建'}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowNew(false)}>收起</button>
          </div>
        </div>
      )}

      {goldenSetsError && <div role="alert" style={{ color: 'var(--red)', fontSize: 11.5, marginTop: 6, display: 'flex', gap: 6 }}><AlertCircle size={13} /> {goldenSetsError}</div>}
      {goldenSets.length === 0 && !goldenSetsError && (
        <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>还没有金标集。{isAdmin ? '' : '（新建/冻结仅管理员）'}</p>
      )}
      {goldenSets.map((g) => (
        <div key={g.id} style={{ borderTop: '1px solid var(--border)', padding: '5px 0', fontSize: 11.5 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <b style={{ fontSize: 12.5 }}>{g.name}</b>
            <span style={chip}>{g.kind}</span>
            <span style={chip} title="用例条数（全文不回列表）">{g.cases_count} 条</span>
            <span style={chip} title="金标产出厂牌：judge 同厂 ⇒ 影子门拒">产出厂牌 {g.produced_by || '—'}</span>
            {g.frozen
              ? <span style={{ ...chip, color: 'var(--green)' }}>已冻结{g.frozen_by ? ` · ${g.frozen_by}` : ''}</span>
              : <span style={{ ...chip, color: 'var(--orange)' }}>未冻结（不可作平台校验）</span>}
            {g.eval_mark && <span style={{ ...chip, fontFamily: 'var(--font-mono)' }} title="内容指纹（防污染结构面比对）">{String(g.eval_mark).slice(0, 10)}…</span>}
            <span className="grow" />
            {!g.frozen && isAdmin && (
              <button className="btn btn-ghost btn-sm" onClick={() => doFreeze(g.id)} title="冻结后 cases 锁死，可被影子重放引用">
                <Lock size={11} /> 冻结
              </button>
            )}
          </div>
        </div>
      ))}
      {err && <div role="alert" style={{ color: 'var(--red)', fontSize: 11.5, marginTop: 6 }}>{err}</div>}
      {notice && <div role="status" style={{ color: 'var(--text-secondary)', fontSize: 11.5, marginTop: 6 }}>{notice}</div>}
    </section>
  );
}
