/**
 * 标记完成（附证据 + 同伴复核）—— 原型变体 `board__mark-done`
 *
 * 口径（§1.6.5 ③）：
 * - done **需证据 + 同伴复核**，但这是**建议层**：空手完成照样能提交，
 *   后端会回 `evidence_warned=true` + 警告文案，界面把它记成「可疑完成」并把
 *   「补证据 + 请同伴复核」提示留给用户——**不硬拦**（硬性 400 会破坏既有流程）。
 * - 证据 = label（做了什么） + ref（输出粘贴 / 运行链接），原型 3 条；这里给 3 行。
 * - 复核人字段后端未接入（work_item 无 reviewer 列）→ 如实标注「未接入」，不造输入框。
 */
import { useState } from 'react';

import { EVIDENCE_ADVISORY } from './axis';

export interface EvidenceDraft {
  label: string;
  ref: string;
}

const EMPTY_ROWS: EvidenceDraft[] = [
  { label: '', ref: '' },
  { label: '', ref: '' },
  { label: '', ref: '' },
];

export default function MarkDoneForm({
  taskTitle,
  onSubmit,
  onCancel,
}: {
  taskTitle: string;
  /** evidence=undefined 表示「没填任何证据」——由后端按已存证据判定，不替它猜。 */
  onSubmit: (evidence?: { label: string; ref: string }[]) => Promise<{
    ok: boolean; error?: string; warning?: string | null;
  }>;
  onCancel: () => void;
}) {
  const [rows, setRows] = useState<EvidenceDraft[]>(EMPTY_ROWS.map((r) => ({ ...r })));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const setRow = (idx: number, key: keyof EvidenceDraft, value: string) => {
    setRows((prev) => prev.map((r, i) => {
      if (i !== idx) return r;
      return key === 'label' ? { ...r, label: value } : { ...r, ref: value };
    }));
  };

  const collected = rows
    .map((r) => ({ label: r.label.trim(), ref: r.ref.trim() }))
    .filter((r) => r.label || r.ref);

  const submit = async (withEvidence: boolean) => {
    setErr(null);
    setWarning(null);
    setBusy(true);
    const out = await onSubmit(withEvidence && collected.length > 0 ? collected : undefined);
    setBusy(false);
    if (!out.ok) {
      setErr(out.error || '标记完成失败');
      return;
    }
    setWarning(out.warning ?? null);
  };

  return (
    <div className="panel" style={{ marginTop: 8 }} aria-label="标记完成（附证据）">
      <p className="section-title">标记完成 · {taskTitle}</p>
      <p className="page-note" style={{ marginBottom: 6 }}>
        done 需证据 + 同伴复核；空手完成会被记为「可疑完成」并推给复核人（不阻断提交）。
      </p>

      {rows.map((row, i) => (
        <div key={i} className="toolbar" style={{ marginBottom: 4 }}>
          <span className="chip mono">证据 {i + 1}</span>
          <input
            aria-label={`证据 ${i + 1} 描述`}
            value={row.label}
            onChange={(e) => setRow(i, 'label', e.target.value)}
            placeholder="做了什么（例：npx tsc --noEmit → 0 errors）"
            style={{ fontSize: 12, padding: '3px 6px', flex: '1 1 220px' }}
          />
          <input
            aria-label={`证据 ${i + 1} 引用`}
            value={row.ref}
            onChange={(e) => setRow(i, 'ref', e.target.value)}
            placeholder="输出粘贴 / 运行链接（例：run-8849）"
            style={{ fontSize: 12, padding: '3px 6px', flex: '1 1 180px' }}
          />
        </div>
      ))}

      <p className="page-note">
        复核人：后端未接入（work_item 无 reviewer 列）——本表单只提示「{EVIDENCE_ADVISORY}」，
        不伪造复核人输入框。
      </p>

      <div className="toolbar" style={{ marginTop: 6 }}>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={busy}
          onClick={() => submit(true)}
        >
          确认完成
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={busy}
          onClick={() => submit(false)}
          title="不填证据直接完成：记为可疑完成并给「补证据 + 请同伴复核」提醒"
        >
          无证据提交（记为可疑完成）
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
          取消
        </button>
        <span className="grow" />
        <span className="chip mono">已填 {collected.length} 条</span>
      </div>

      {err && (
        <div role="alert" style={{ marginTop: 6, color: 'var(--red)', fontSize: 11.5 }}>{err}</div>
      )}
      {warning && (
        <div role="alert" className="chip warn" style={{ marginTop: 6 }}>
          {warning} · {EVIDENCE_ADVISORY}
        </div>
      )}
    </div>
  );
}
