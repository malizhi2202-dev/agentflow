/**
 * run 状态 chip。
 *
 * 为什么要一个组件：消息行、会话行、详情栏三处都要显示 run 状态，
 * 各写一份 `<span className={...}>` 早晚会出现「这里 green 那里 ok」。
 * 规范：chip 用 `ui.css` 的语义色类（ok/bad/warn/info），文字里同时给出
 * 状态 token（queued/running/done/failed）与中文，**不只靠颜色**。
 */
import { RUN_STATE_LABEL, RUN_STATE_TONE, type RunState } from './chatSemantics';

export default function RunStatusChip({
  state,
  prefixRun,
  title,
}: {
  state: RunState;
  /** 传了就在状态前加一个 mono 的 run 标识 chip（消息行用） */
  prefixRun?: string;
  title?: string;
}) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }} title={title}>
      {prefixRun && <span className="chip mono">run {prefixRun}</span>}
      <span className={`chip ${RUN_STATE_TONE[state]}`}>
        {state} · {RUN_STATE_LABEL[state]}
      </span>
    </span>
  );
}
