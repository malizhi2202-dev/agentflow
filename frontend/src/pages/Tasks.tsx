/**
 * 任务看板（原型 6.20 `board.html` + 5 个变体）— change ui-parity · P3-3
 *
 * 页面层级：PageHeader → 摘要 / 辅助状态 → 筛选工具栏 → 主看板；
 * 写操作仍由任务卡片与表单承载，后端请求和两轴语义保持不变。
 *
 * 两轴正交（状态 = 到哪一步 / 受理 = 这算不算活）分开显示；状态标签不授予行为；
 * done 的「需证据 + 同伴复核」是**警告式**建议，不是硬拦。
 *
 * 变体落点：
 * - `board__task-new`   → `components/task/NewTaskForm.tsx`（必填/可空 + 三轨 + 创建≠派单）
 * - `board__mark-done`  → `components/task/MarkDoneForm.tsx`（证据 label + ref，空证据仍可完成）
 * - `board__af-109` / `board__af-116` → `BoardFilters` 的真实请求过滤
 * - `board__assign-*` → `components/task/AssigneePicker.tsx`（三轨切换 + 失败文案透传）
 *
 * 列头保留 h3（既有用例按 heading 断言列名）；页面级 h1 由 PageHeader 唯一承载。
 */
import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Circle, Clock, Plus, RefreshCw } from 'lucide-react';

import { COLUMNS, useCollab, type Task } from '../stores/collab';
import BoardFilters, {
  EMPTY_FILTERS, activeFilters, type BoardFiltersState,
} from '../components/task/BoardFilters';
import NewTaskForm from '../components/task/NewTaskForm';
import TaskCard from '../components/task/TaskCard';
import PageHeader from '../components/ui/PageHeader';
import { STATUS_BEHAVIOR_NOTE, TRIAGE_GATE_NOTE } from '../components/task/axis';

/** 列头注（原型锚行为清单的四条，逐条对着列说话）。 */
const COLUMN_NOTES: Record<string, string> = {
  unstarted: '停车闸：闸内不入队、不派生执行；待受理禁止派生执行（@点名除外）',
  started: '进入「进行中」≠ 自动启动 Agent；本列里只有真的收到运行请求的才在跑',
  review: '审核中：自动化运行到此结束，done 留人（验收 → 完成 / 打回 → 进行中）',
  done: 'done 需证据 + 同伴复核（警告式，缺证据记为可疑完成）；cancelled 必填理由',
};

export default function Tasks() {
  const { tasks, tasksLoading, tasksError, fetchTasks, createTask, assign } = useCollab();
  const [filters, setFilters] = useState<BoardFiltersState>({ ...EMPTY_FILTERS });
  const [showCreate, setShowCreate] = useState(false);

  // 过滤真打端点：需我处理 = 与我有关 + 已受理；负责人含 Agent = assignee_kind=agent
  const query = {
    mine: filters.urgent || undefined,
    triageState: filters.urgent ? ('triaged' as const) : undefined,
    assigneeKind: filters.agentAssignee ? ('agent' as const) : undefined,
  };
  const { mine: queryMine, triageState: queryTriage, assigneeKind: queryKind } = query;
  useEffect(() => {
    void fetchTasks({ mine: queryMine, triageState: queryTriage, assigneeKind: queryKind });
  }, [queryMine, queryTriage, queryKind, fetchTasks]);

  const grouped = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const col of COLUMNS) map[col.key] = [];
    for (const task of tasks) {
      const col = COLUMNS.find((c) => c.statuses.includes(task.status));
      (map[col ? col.key : 'unstarted'] ||= []).push(task);
    }
    return map;
  }, [tasks]);

  const active = activeFilters(filters);
  /** 受理门是否已接入后端：当前没有派生执行入口 → 如实标「未接入」，不造假门。 */
  const triageGateWired = false;
  const refresh = () => { void fetchTasks(query); };

  return (
    <div style={{ padding: 16 }}>
      <PageHeader
        title="任务"
        context="任务列表 · 四列看板"
        summary="状态回答「到哪一步」，受理回答「这算不算活」；筛选、指派、完成和新建都沿用现有任务语义。"
        action={(
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowCreate((v) => !v)}
            aria-expanded={showCreate}
            aria-controls="new-task-form"
          >
            <Plus size={13} style={{ marginRight: 4 }} />新建任务
          </button>
        )}
      />

      <div className="toolbar" aria-label="任务辅助操作" style={{ marginBottom: 8 }}>
        <span className="chip mono">看板 · 四列 = 语义锚</span>
        <span className={`chip ${triageGateWired ? 'ok' : 'warn'}`} title={TRIAGE_GATE_NOTE}>
          受理门 · {triageGateWired ? '已接入' : '后端未接入'}
        </span>
        <div className="grow" />
        <button
          className="btn btn-ghost btn-sm"
          onClick={refresh}
          disabled={tasksLoading}
          aria-label="刷新任务"
        >
          <RefreshCw size={13} style={{ marginRight: 4 }} />刷新
        </button>
      </div>

      <BoardFilters value={filters} onChange={setFilters} total={tasks.length} />

      {active.length > 0 && (
        <p className="page-note" role="status" style={{ marginTop: 4 }}>
          当前视图：{active.map((f) => `${f.label}（${f.hint}）`).join(' · ')}——
          过滤状态始终可见，逐条可清（✕）或一键「清除全部过滤」。
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: 28, alignItems: 'start', marginTop: 20 }}>
        <main aria-label="任务主工作区" style={{ minWidth: 0 }}>
          {showCreate && (
            <div id="new-task-form">
              <NewTaskForm onCreate={createTask}
                           onAssign={(id, k, who, start) => assign(id, k, who, start)}
                           onCancel={() => setShowCreate(false)} />
            </div>
          )}

          {tasksError && (
            <div role="alert" style={{ marginBottom: 10, color: 'var(--red)', fontSize: 12.5, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <AlertCircle size={14} /> <span>{tasksError}</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={refresh} disabled={tasksLoading}>
                重试
              </button>
            </div>
          )}

          {tasksLoading && (
            <p role="status" aria-live="polite" style={{ color: 'var(--text-secondary)', fontSize: 12.5 }}>
              正在加载任务…
            </p>
          )}

          {!tasksLoading && tasks.length === 0 && !tasksError && (
            active.length > 0
              ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>
                  当前视图下没有任务；可逐条清除过滤或「清除全部过滤」看全量。
                </p>
              )
              : (
                <div aria-label="任务空态">
                  <p style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>还没有任务。点「新建任务」开始。</p>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
                    <Plus size={13} style={{ marginRight: 4 }} />开始创建任务
                  </button>
                </div>
              )
          )}

          {tasks.length > 0 && (
            <section aria-label="任务看板" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
              {COLUMNS.map((col) => (
                <section key={col.key} aria-label={col.label} style={{ minWidth: 0 }}>
                  <h3 style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 2px', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {col.key === 'done' ? <CheckCircle2 size={13} /> : col.key === 'started' ? <Clock size={13} /> : <Circle size={13} />}
                    {col.label}
                    <span style={{ color: 'var(--text-muted)' }}>({(grouped[col.key] || []).length})</span>
                  </h3>
                  <p className="page-note" style={{ marginBottom: 6 }}>{COLUMN_NOTES[col.key]}</p>
                  {(grouped[col.key] || []).map((task) => <TaskCard key={task.id} task={task} />)}
                </section>
              ))}
            </section>
          )}
        </main>

        <aside aria-label="任务辅助信息" style={{ minWidth: 0 }}>
          <h2 className="section-title" style={{ marginTop: 0 }}>任务语义与门禁</h2>
          <p className="page-note">
            <strong>状态</strong>答「到哪一步」（未开始 / 进行中 / 完成 / 关闭）；
            <strong>受理</strong>答「这算不算活」（待受理 / 已受理），改状态不动受理态。
          </p>
          <p className="page-note">{STATUS_BEHAVIOR_NOTE}</p>
          <p className="page-note">{TRIAGE_GATE_NOTE}</p>
        </aside>
      </div>
    </div>
  );
}
