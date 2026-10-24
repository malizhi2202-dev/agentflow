/**
 * ② 调度底座卡组（原型 `control-plane.html`「调度底座」）
 *
 * 原则：**能读到的写数据，读不到的一律标「未接入 / 该字段后端未提供」**。
 * 当前 `/api/control-plane/cluster` 只如实给出：副本 id、部署模式、租约 TTL、租约行、
 * 队列深度（total / leased / by_label）、调和退避行数、进程内残项、采样时刻。
 * 它**没有**：重连宽限期、排队 run 过期阈值、runtime 回收记录、心跳周期、
 * 离线清理阈值、重试政策、单 daemon / 单 Agent 并发上限 —— 这些按原型属政策口径，
 * 实现未落地就显式标未接入，不允许拿原型里的演示数字冒充现状。
 */
import type { ReactNode } from 'react';
import { AlertCircle, Radio } from 'lucide-react';
import { useControlPlane, type ClusterStatus } from '../../stores/controlPlane';

export const NOT_PROVIDED = '未接入';

const LEASE_NAMES: Record<string, string> = {
  'cron-scheduler': '定时任务循环',
  'runtime-watcher': 'runtime 监控',
  'reconcile-loop': '调和循环',
};

function block(title: string, children: ReactNode) {
  return (
    <div
      style={{
        border: '1px solid var(--border)', borderRadius: 6, padding: 10,
        background: 'var(--bg-card)',
      }}
    >
      <div className="section-title" style={{ marginBottom: 6 }}>{title}</div>
      {children}
    </div>
  );
}

/** 一行「字段 → 值」；缺字段时值位置写「未接入 · 该字段后端未提供」 */
function Fact({ label, value, missing }: { label: string; value?: ReactNode; missing?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: 11.5, lineHeight: 1.8 }}>
      <span style={{ color: 'var(--text-muted)', minWidth: 96 }}>{label}</span>
      <span style={{ color: missing ? 'var(--orange, #c80)' : 'var(--text)' }}>
        {missing ? `${NOT_PROVIDED} · 该字段后端未提供` : value}
      </span>
    </div>
  );
}

export default function SchedulerBaseCard() {
  const { cluster } = useControlPlane();
  const c: ClusterStatus | null = cluster;
  const leases = c
    ? Object.entries(c.leases || {}).map(([name, row]) => ({ ...row, name: row?.name || name }))
    : [];
  const activeLeases = leases.filter((l) => l.active);

  return (
    <section className="panel" aria-label="调度底座">
      <div className="toolbar">
        <span className="section-title">调度底座 —— 双通道坦白句 · 排队 run 过期双条件 · reclaim 与离线清理 · 重试政策 · 并发上限</span>
        <span className="chip mono">部署 {c ? c.deploy_mode : NOT_PROVIDED}</span>
        <span className="chip info">队列 {c ? c.queue.total : NOT_PROVIDED}</span>
        <span className="chip">单例循环 {c ? `${activeLeases.length} 活` : NOT_PROVIDED}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 8, marginTop: 8 }}>
        {/* 1. 双通道坦白句 */}
        {block('双通道坦白句（先说清楚，别让人信错东西）', (
          <p className="page-note" style={{ margin: 0 }}>
            <b>推送通道（WebSocket）只负责快，数据库才是终态</b>——客户端重连后必须重新查询校准；
            每条推送通道都配<b>轮询兜底</b>，单次断线不会让排队任务卡死。本页队列 / 探针 / 调和三区同此一条口径：
            断线期间以刷新后回读到的库值为准，不以推送顺序为准。
            <br />
            当前回读到的库值：
            <b> 队列 {c ? c.queue.total : NOT_PROVIDED} 条</b>
            （执行中 {c ? c.queue.leased : NOT_PROVIDED}）·
            采样时刻 <span style={{ fontFamily: 'var(--font-mono)' }}>{c ? new Date(c.checked_at).toLocaleString('zh-CN') : NOT_PROVIDED}</span>
          </p>
        ))}

        {/* 2. 排队 run 过期双条件 */}
        {block('排队 run 的过期判定 · 双条件（机器忙 ≠ 机器没了）', (
          <>
            <p className="page-note" style={{ margin: 0 }}>
              <b>runtime 静默超过 reconnect 宽限期</b> <b>且</b> 该 run 自己<b>排队同样久</b>，
              两条同时成立才把排队 run 判失败。只看前一条会把「机器只是忙」误杀成「机器没了」；
              只看后一条会让刚醒过来的机器背上不该背的历史欠账。
              本页队列里任何一行都<b>不会因单条件被摘掉</b>。
            </p>
            <Fact label="重连宽限期" missing />
            <Fact label="队列行判定字段" missing />
          </>
        ))}

        {/* 3. reclaim 与离线清理 */}
        {block('Runtime 回收与清理（reclaim）', (
          <>
            <p className="page-note" style={{ margin: 0 }}>
              reclaim / 离线判定 / 清理三件都是<b>状态收敛</b>级别的自动动作——不改写历史数据、不动 schema。
            </p>
            <Fact
              label="单例租约 TTL"
              value={c ? <span style={{ fontFamily: 'var(--font-mono)' }}>{c.lease_ttl_seconds}s（过期可被其它副本重取）</span> : undefined}
              missing={!c}
            />
            <Fact label="runtime_recovery 回收记录" missing />
            <Fact label="心跳周期" missing />
            <Fact label="离线 >N 天自动清理" missing />
            {c && leases.length > 0 && (
              <div style={{ marginTop: 6, overflowX: 'auto' }}>
                <table className="tbl compact" aria-label="单例循环租约（来自 /api/control-plane/cluster）">
                  <thead>
                    <tr><th>单例循环</th><th>持有副本</th><th>态</th><th>到期</th></tr>
                  </thead>
                  <tbody>
                    {leases.map((l) => (
                      <tr key={`lease-${l.name}`}>
                        <td>{LEASE_NAMES[l.name] || l.name}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5 }}>{l.owner || '—'}</td>
                        <td><span className={'chip ' + (l.active ? 'ok' : 'warn')}>{l.active ? '有效' : '已过期'}</span></td>
                        <td style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                          {l.expires_at ? new Date(l.expires_at).toLocaleTimeString('zh-CN') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ))}

        {/* 4. 重试政策 */}
        {block('重试政策（自动只给环境抖动类）', (
          <>
            <p className="page-note" style={{ margin: 0 }}>
              一句话边界：<b>自动重试的资格只跟「重一次有可能不一样」绑定，不跟「失败次数少」绑定</b>；
              配置 / 授权 / 额度 / 上下文溢出类是<b>修复动作</b>，未修复前重试只是把同一份失败再烧一遍
              （修复后走失败三件套：Retry with context / Edit as advanced form / 升级到人）。
            </p>
            <Fact label="环境抖动分类" missing />
            <Fact label="退避序列 / 次数" missing />
            <Fact label="run_only 是否重试" missing />
          </>
        ))}

        {/* 5. 并发上限 */}
        {block('并发上限（人话版）', (
          <>
            <p className="page-note" style={{ margin: 0 }}>
              政策口径：<b>生效 = 两者取小</b>——单 daemon（一台机器）上限与单 Agent 上限<b>同时生效、取较小值</b>，
              不会互相挤占成隐性超卖；改哪一条都只影响下一轮派单，<b>不打断在途 run</b>。
            </p>
            <Fact label="单 daemon 上限" missing />
            <Fact label="单 Agent 上限" missing />
            <p className="page-note" style={{ marginTop: 4 }}>
              说明：单 Agent 并发位真实存在于 Agent 配置（`max_concurrency`，由 `PUT /api/control-plane/schedule` 写入），
              但<b>本页读到的副本事实里没有该字段</b>，故不在此处展示数字。
            </p>
          </>
        ))}

        {/* 6. 副本事实（全部真数据） */}
        {block('副本与单例事实（真实读取，非演示值）', (
          <>
            <Fact label="当前副本" value={<span style={{ fontFamily: 'var(--font-mono)' }}>{c ? c.instance_id : undefined}</span>} missing={!c} />
            <Fact label="部署模式" value={c ? c.deploy_mode : undefined} missing={!c} />
            <Fact label="队列深度" value={c ? `${c.queue.total} 条（执行中 ${c.queue.leased}）` : undefined} missing={!c} />
            <Fact label="按标签分布" value={c ? (Object.keys(c.queue.by_label || {}).length === 0 ? '—' : Object.entries(c.queue.by_label).map(([k, v]) => `${k || 'unknown'} ${v}`).join(' · ')) : undefined} missing={!c} />
            <Fact label="调和退避行" value={c ? `${c.reconcile_backoff_rows} 行` : undefined} missing={!c} />
            {c && c.process_local && c.process_local.length > 0 && (
              <p className="page-note" style={{ marginTop: 4 }}>
                <Radio size={11} /> 仍属<b>进程内</b>（多副本下不共享）：{c.process_local.join('；')}
              </p>
            )}
          </>
        ))}
      </div>

      {!c && (
        <div role="alert" style={{ color: 'var(--orange, #c80)', fontSize: 12, marginTop: 8, display: 'flex', gap: 6 }}>
          <AlertCircle size={14} /> {NOT_PROVIDED} · 未读到 /api/control-plane/cluster 的副本事实，上述字段无法呈现
        </div>
      )}
    </section>
  );
}
