/**
 * 工作栏（v26-agent-ui · 原型 agent-detail.html `v-work` 的实现落点）
 *
 * 「指派给本 Agent」任务表（GET /api/tasks?assignee_kind=agent&assignee_id=）+ 定时任务（附区，
 * 从原「编辑」标签的尾部迁到此处——它本就是「工作」语义，不进 16 分区也不进草稿）。
 *
 * v1 差异登记（RULINGS §五点六 R26-4）：
 * - 权限口径：非 admin 看他人 Agent 的任务表可能为空（后端 tasks_api 只放行 我建/指派给我的 member）——
 *   如实注明「仅显示与你有关的任务」，不假装全量；
 * - 改状态弹层 / run 回放深链 / 入队并发槽位提示：本栏 v1 只做只读列表 + 定时任务 CRUD，
 *   看板同款操作集留在 看板 页，不复制一份可写 UI（编辑口唯一纪律）。
 */
import { useEffect, useState } from 'react';
import { useCollab, type Task } from '../../stores/collab';
import { ScheduledTasksSection } from '../agent-config/ExtraSections';

var mono: React.CSSProperties = { fontSize: 11, fontFamily: 'var(--font-mono)' };

export default function WorkPane({ agent, onOpenBoard }: {
  agent: any;
  /** 跳看板（任务全量 + 同款操作集）；壳层注入，本栏不自己 navigate */
  onOpenBoard?: () => void;
}) {
  const fetchTasksForAgent = useCollab(function (s) { return s.fetchTasksForAgent; });
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(function () {
    if (!agent?.id) return;
    let alive = true;
    fetchTasksForAgent(agent.id).then(function (r) {
      if (!alive) return;
      if (r.error) { setErr(r.error); setTasks([]); }
      else { setErr(null); setTasks(r.tasks); }
    });
    return function () { alive = false; };
  }, [agent?.id, fetchTasksForAgent]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(260px, 320px)', gap: 28, alignItems: 'start' }} aria-label="工作">
      <main aria-label="工作主工作区" style={{ minWidth: 0 }}>
        <div className="panel">
          <div className="toolbar" style={{ marginBottom: 6 }}>
            <span className="section-title" style={{ fontSize: 13 }}>指派给本 Agent 的任务</span>
            <span className="chip mono">{tasks === null ? '读取中…' : tasks.length + ' 条'}</span>
            <span className="grow" />
            {onOpenBoard && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={onOpenBoard}>打开看板 →</button>
            )}
          </div>
          <p className="page-note" style={{ margin: '0 0 8px' }}>
            仅显示与你有关的任务（后端按 owner 轨过滤 · 非 admin 可能为空，非「Agent 无任务」）。
            改状态/标 done/取消的操作集在看板同款抽屉完成，本栏不重复一份可写 UI。
          </p>
          {err ? <p role="alert" style={{ color: 'var(--red)', fontSize: 12, margin: '0 0 8px' }}>任务读取失败：{err}</p> : null}
          <table className="tbl compact">
            <thead><tr><th>任务</th><th>状态</th><th>负责人</th><th>更新</th></tr></thead>
            <tbody>
              {(tasks || []).map(function (t) {
                return (
                  <tr key={t.id}>
                    <td style={{ fontSize: 12 }}>{t.title}</td>
                    <td><span className={'chip ' + (t.status_category === 'done' || t.status_category === 'closed' ? 'ok' : t.status === 'blocked' ? 'warn' : t.status_category === 'started' ? 'info' : '')}>{t.status}</span></td>
                    <td style={mono}>{t.assignee_kind === 'agent' ? '本 Agent' : t.assignee_kind || '—'}</td>
                    <td style={mono}>{t.updated_at ? new Date(t.updated_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  </tr>
                );
              })}
              {tasks !== null && tasks.length === 0 && !err && (
                <tr><td colSpan={4} style={{ color: 'var(--text-muted)' }}>没有与你相关的、指派给本 Agent 的任务。</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      <aside aria-label="工作辅助信息" style={{ minWidth: 0 }}>
        <ScheduledTasksSection agentId={agent?.id} isNew={!agent?.id} />
      </aside>
    </div>
  );
}
