import { useEffect, useMemo, useState } from 'react';
import { Archive, Plus, RefreshCw, Users, X } from 'lucide-react';
import {
  useTeams, MEMBER_ROLES, ASSET_KINDS, ASSET_LABEL,
  type AssetKind, type MemberRole, type Squad, type TeamStatus,
} from '../stores/teams';
import { useAuth } from '../stores/auth';

const panel: React.CSSProperties = {
  background: 'var(--bg-panel)', border: '1px solid var(--border)',
  borderRadius: 'var(--r-sm)', padding: 10,
};
const chip: React.CSSProperties = {
  display: 'inline-block', padding: '1px 6px', borderRadius: 10,
  fontSize: 10.5, border: '1px solid var(--border)', marginRight: 4,
};
const labelStyle: React.CSSProperties = { fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 };
const inputStyle: React.CSSProperties = { fontSize: 12, padding: '4px 7px', width: '100%' };

const STATUS_COLOR: Record<TeamStatus, string> = {
  active: 'var(--green)', paused: 'var(--orange)', archived: 'var(--red)',
};
const STATUS_LABEL: Record<TeamStatus, string> = {
  active: '运行中', paused: '已暂停', archived: '已归档',
};

function useWrite() {
  const [err, setErr] = useState<string | null>(null);
  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setErr(null);
    const out = await fn();
    if (!out.ok) setErr(out.error || '操作失败');
    return out;
  };
  return { err, setErr, run };
}

/* ────────────────────────── 团队 tab ────────────────────────── */

function TeamCreateForm({ onDone }: { onDone: () => void }) {
  const createTeam = useTeams((s) => s.createTeam);
  const { err, run } = useWrite();
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [maxMembers, setMaxMembers] = useState('');
  const [slugError, setSlugError] = useState<string | null>(null);

  const submit = async () => {
    const re = /^[a-z][a-z0-9-]{1,31}$/;
    if (!re.test(slug)) {
      setSlugError('slug 必须匹配 ^[a-z][a-z0-9-]{1,31}$（小写字母开头，可含数字与短横线）');
      return; // 前端先拦，不发请求（AC-3）
    }
    setSlugError(null);
    const quotas: any = {};
    if (maxMembers.trim()) quotas.max_members = Number(maxMembers);
    const out = await run(() => createTeam({
      slug, name, description, quotas: Object.keys(quotas).length ? quotas : undefined,
    }));
    if (out.ok) onDone();
  };

  return (
    <section aria-label="新建团队" style={{ ...panel, marginBottom: 10 }}>
      <div style={{ display: 'grid', gap: 8 }}>
        <div>
          <label htmlFor="team-slug" style={labelStyle}>slug（唯一，创建后不改）</label>
          <input id="team-slug" aria-label="团队 slug" style={inputStyle} value={slug}
                 onChange={(e) => setSlug(e.target.value)} placeholder="agentflow-core" />
          {slugError && <div role="alert" style={{ color: 'var(--red)', fontSize: 11, marginTop: 2 }}>{slugError}</div>}
        </div>
        <div>
          <label htmlFor="team-name" style={labelStyle}>团队名称</label>
          <input id="team-name" aria-label="团队名称" style={inputStyle} value={name}
                 onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label htmlFor="team-desc" style={labelStyle}>描述（可空）</label>
          <input id="team-desc" aria-label="团队描述" style={inputStyle} value={description}
                 onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label htmlFor="team-max-members" style={labelStyle}>成员上限（可空，默认后端值）</label>
          <input id="team-max-members" aria-label="成员上限" type="number" min={1} style={inputStyle}
                 value={maxMembers} onChange={(e) => setMaxMembers(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-primary btn-sm" onClick={submit}>创建团队</button>
          <button className="btn btn-ghost btn-sm" onClick={onDone}>取消</button>
        </div>
        {err && <div role="alert" style={{ color: 'var(--red)', fontSize: 11.5 }}>{err}</div>}
      </div>
    </section>
  );
}

function TeamDetail({ teamRef }: { teamRef: string }) {
  const { detail, detailError, detailLoading, addMember, removeMember, transferOwner,
    claimAsset, releaseAsset, setTeamStatus, clearDetail } = useTeams();
  const currentUser = useAuth((s) => s.currentUser);
  const add = useWrite();
  const danger = useWrite();

  const [userId, setUserId] = useState('');
  const [role, setRole] = useState<MemberRole>('member');
  const [kind, setKind] = useState<AssetKind>('agents');
  const [assetId, setAssetId] = useState('');
  const [newOwner, setNewOwner] = useState('');
  const [confirmTransfer, setConfirmTransfer] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') clearDetail(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [clearDetail]);

  if (detailLoading && !detail) return <aside style={panel}>加载中…</aside>;
  if (detailError) return <aside style={panel} role="alert">{detailError}</aside>;
  if (!detail) return null;

  const { team, members, assets } = detail;
  const myRole = members.find((m) => m.user_id === currentUser?.id)?.role;
  const archived = team.status === 'archived';
  // 五类资产平铺成一张带 kind 的列表——释放时必须用**各自的 kind**，
  // 早期版本对 agents/workflows 混排却统一传 'agents'（会把工作流按 Agent 释放），已修。
  const assetRows = ASSET_KINDS.flatMap(
    (k) => (assets?.[k] || []).map((a) => ({ ...a, kind: k })),
  );
  const disabledReason = archived ? '团队已归档：只停未来指派与变更' : undefined;

  return (
    <aside aria-label="团队详情" style={{ ...panel, position: 'relative' }}>
      <button className="btn btn-ghost btn-sm" style={{ position: 'absolute', top: 6, right: 6 }}
              onClick={clearDetail} aria-label="关闭详情" title="关闭详情（Esc）">
        <X size={13} />
      </button>

      <header style={{ marginBottom: 8 }}>
        <h3 style={{ fontSize: 14, margin: 0 }}>{team.name}</h3>
        <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{team.slug}</div>
        <div style={{ marginTop: 6 }}>
          <span style={{ ...chip, color: STATUS_COLOR[team.status] }}>{STATUS_LABEL[team.status]}</span>
          <span style={chip}>owner · {team.owner_user_id}</span>
          {myRole && <span style={chip}>我的角色 · {myRole}</span>}
        </div>
      </header>

      <section aria-label="成员" style={{ marginBottom: 10 }}>
        <h4 style={{ fontSize: 12, margin: '0 0 6px', color: 'var(--text-secondary)' }}>
          成员（{members.length} / 上限 {team.quota.max_members}）
        </h4>
        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '3px 0', fontFamily: 'var(--font-mono)' }}>{m.user_id}</td>
                <td style={{ padding: '3px 0', color: 'var(--text-secondary)' }}>{m.role}</td>
                <td style={{ padding: '3px 0', textAlign: 'right' }}>
                  <button className="btn btn-ghost btn-sm" disabled={archived || m.role === 'owner'}
                          title={m.role === 'owner' ? 'owner 只能通过转让产生，不能直接移除' : disabledReason}
                          onClick={() => add.run(() => removeMember(team.slug, m.user_id))}>
                    移除
                  </button>
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr><td colSpan={3} style={{ padding: 6, color: 'var(--text-muted)' }}>还没有成员。</td></tr>
            )}
          </tbody>
        </table>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', marginTop: 6 }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="add-member" style={labelStyle}>成员 user id</label>
            <input id="add-member" aria-label="成员 user id" style={inputStyle} value={userId}
                   onChange={(e) => setUserId(e.target.value)} />
          </div>
          <div style={{ width: 110 }}>
            <label htmlFor="add-role" style={labelStyle}>角色</label>
            <select id="add-role" aria-label="成员角色" style={inputStyle} value={role}
                    onChange={(e) => setRole(e.target.value as MemberRole)}>
              {MEMBER_ROLES.filter((r) => r !== 'owner').map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <button className="btn btn-ghost btn-sm" disabled={!userId.trim() || archived} title={disabledReason}
                  onClick={() => add.run(() => addMember(team.slug, userId.trim(), role))}>
            添加成员
          </button>
        </div>
        {add.err && <div role="alert" style={{ color: 'var(--red)', fontSize: 11.5, marginTop: 4 }}>{add.err}</div>}
      </section>

      <section aria-label="资产与配额" style={{ marginBottom: 10 }}>
        <h4 style={{ fontSize: 12, margin: '0 0 6px', color: 'var(--text-secondary)' }}>资产与配额</h4>
        <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {ASSET_KINDS.map((k) => (
            <span key={k} style={chip}>{ASSET_LABEL[k]} {(assets?.[k] || []).length}</span>
          ))}
          <div style={{ marginTop: 4 }}>
            配额：Agent {team.quota.max_agents} · 工作流 {team.quota.max_workflows} · 成员 {team.quota.max_members}
          </div>
        </div>
        {assetRows.length > 0 && (
          <ul style={{ margin: '6px 0', paddingLeft: 16, fontSize: 11.5 }}>
            {assetRows.map((a) => (
              <li key={`${a.kind}-${a.id}`}>
                <span style={{ color: 'var(--text-muted)' }}>{ASSET_LABEL[a.kind]} · </span>
                {a.name || `#${a.id}`}
                <button className="btn btn-ghost btn-sm" style={{ marginLeft: 6 }} disabled={archived}
                        title={disabledReason}
                        onClick={() => releaseAsset(team.slug, a.kind, a.id)}>
                  释放
                </button>
              </li>
            ))}
          </ul>
        )}
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
          <div style={{ width: 140 }}>
            <label htmlFor="asset-kind" style={labelStyle}>资产类型</label>
            <select id="asset-kind" aria-label="资产类型" style={inputStyle} value={kind}
                    onChange={(e) => setKind(e.target.value as AssetKind)}>
              {ASSET_KINDS.map((k) => <option key={k} value={k}>{ASSET_LABEL[k]}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="asset-id" style={labelStyle}>资产 ID</label>
            <input id="asset-id" aria-label="资产 ID" type="number" style={inputStyle} value={assetId}
                   onChange={(e) => setAssetId(e.target.value)} />
          </div>
          <button className="btn btn-ghost btn-sm" disabled={!assetId || archived} title={disabledReason}
                  onClick={() => danger.run(() => claimAsset(team.slug, kind, Number(assetId)))}>
            挂载
          </button>
        </div>
        {/* shortcut: 资产候选列表待后端「未归属资产」端点上线后换成选择器；当前手填 id */}
        <p style={{ fontSize: 10.5, color: 'var(--text-muted)', margin: '4px 0 0' }}>
          当前需手填资产 ID；候选选择器待后端「未归属资产」列表上线。
        </p>
        {danger.err && <div role="alert" style={{ color: 'var(--red)', fontSize: 11.5, marginTop: 4 }}>{danger.err}</div>}
      </section>

      <section aria-label="危险区" style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
        <h4 style={{ fontSize: 12, margin: '0 0 6px', color: 'var(--orange)' }}>危险区</h4>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {(['active', 'paused', 'archived'] as TeamStatus[]).filter((s) => s !== team.status).map((s) => (
            <button key={s} className="btn btn-ghost btn-sm"
                    onClick={async () => {
                      if (s === 'archived' && !confirmArchive) { setConfirmArchive(true); return; }
                      await danger.run(() => setTeamStatus(team.slug, s));
                      setConfirmArchive(false);
                    }}>
              {s === 'archived' && confirmArchive ? '确认归档（不可恢复）' : `切换到 ${STATUS_LABEL[s]}`}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label htmlFor="new-owner" style={labelStyle}>转让 owner 给</label>
            <input id="new-owner" aria-label="新 owner 用户 id" style={inputStyle} value={newOwner}
                   onChange={(e) => setNewOwner(e.target.value)} />
          </div>
          <label style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 11.5 }}>
            <input type="checkbox" checked={confirmTransfer}
                   onChange={(e) => setConfirmTransfer(e.target.checked)} />
            我确认转让后自己降为 admin
          </label>
          <button className="btn btn-ghost btn-sm" disabled={!newOwner.trim() || !confirmTransfer}
                  title={!confirmTransfer ? '需要先勾选确认' : undefined}
                  onClick={() => danger.run(() => transferOwner(team.slug, newOwner.trim(), true))}>
            转让 owner
          </button>
        </div>
      </section>
    </aside>
  );
}

/* ────────────────────────── 小隊 tab ────────────────────────── */

function SquadCreateForm({ onDone }: { onDone: () => void }) {
  const createSquad = useTeams((s) => s.createSquad);
  const { err, run } = useWrite();
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [leaderId, setLeaderId] = useState('');
  const [instructions, setInstructions] = useState('');

  return (
    <section aria-label="新建小队" style={{ ...panel, marginBottom: 10 }}>
      <div style={{ display: 'grid', gap: 8 }}>
        <div>
          <label htmlFor="squad-slug" style={labelStyle}>slug</label>
          <input id="squad-slug" aria-label="小队 slug" style={inputStyle} value={slug}
                 onChange={(e) => setSlug(e.target.value)} placeholder="code-review" />
        </div>
        <div>
          <label htmlFor="squad-name" style={labelStyle}>小队名称</label>
          <input id="squad-name" aria-label="小队名称" style={inputStyle} value={name}
                 onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label htmlFor="squad-leader" style={labelStyle}>leader Agent ID（必填，未归档的 Agent）</label>
          <input id="squad-leader" aria-label="leader Agent ID" type="number" style={inputStyle}
                 value={leaderId} onChange={(e) => setLeaderId(e.target.value)} />
        </div>
        <div>
          <label htmlFor="squad-instructions" style={labelStyle}>自由指令（注入 briefing，可空）</label>
          <input id="squad-instructions" aria-label="小队指令" style={inputStyle} value={instructions}
                 onChange={(e) => setInstructions(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-primary btn-sm" disabled={!leaderId}
                  onClick={async () => {
                    const out = await run(() => createSquad({
                      slug, name, leader_agent_id: Number(leaderId), instructions,
                    }));
                    if (out.ok) onDone();
                  }}>
            创建小队
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onDone}>取消</button>
        </div>
        {err && <div role="alert" style={{ color: 'var(--red)', fontSize: 11.5 }}>{err}</div>}
      </div>
    </section>
  );
}

function SquadCard({ squad }: { squad: Squad }) {
  const { addSquadMember, removeSquadMember, archiveSquad } = useTeams();
  const { err, run } = useWrite();
  const [kind, setKind] = useState<'agent' | 'member'>('agent');
  const [memberId, setMemberId] = useState('');
  const [confirmArchive, setConfirmArchive] = useState(false);
  const archived = squad.status === 'archived';

  return (
    <article style={{ ...panel, marginBottom: 8 }} aria-label={`小队 ${squad.name}`}>
      <header style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <strong style={{ fontSize: 13 }}>{squad.name}</strong>
        <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{squad.slug}</span>
        <span style={{ ...chip, color: archived ? 'var(--red)' : 'var(--green)' }}>
          {archived ? '已归档' : '运行中'}
        </span>
        <span style={chip}>leader · {squad.leader_name || `#${squad.leader_agent_id}`}</span>
        <span style={chip}>成员 {(squad.members || []).length}</span>
      </header>

      <ul style={{ margin: '6px 0', paddingLeft: 16, fontSize: 11.5 }}>
        {(squad.members || []).map((m) => (
          <li key={m.id}>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{m.member_id}</span>
            <span style={{ color: 'var(--text-muted)' }}> · {m.member_kind === 'agent' ? 'Agent' : '人'}</span>
            <button className="btn btn-ghost btn-sm" style={{ marginLeft: 6 }} disabled={archived}
                    onClick={() => run(() => removeSquadMember(squad.slug, m.member_kind, m.member_id))}>
              移出
            </button>
          </li>
        ))}
        {(squad.members || []).length === 0 && (
          <li style={{ color: 'var(--text-muted)' }}>成员池为空（入池不授予调用权）。</li>
        )}
      </ul>

      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ width: 110 }}>
          <label htmlFor={`sq-kind-${squad.id}`} style={labelStyle}>类型</label>
          <select id={`sq-kind-${squad.id}`} aria-label="成员类型" style={inputStyle} value={kind}
                  onChange={(e) => setKind(e.target.value as 'agent' | 'member')}>
            <option value="agent">Agent</option>
            <option value="member">人</option>
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 120 }}>
          <label htmlFor={`sq-mid-${squad.id}`} style={labelStyle}>成员 ID</label>
          <input id={`sq-mid-${squad.id}`} aria-label="成员 ID" style={inputStyle} value={memberId}
                 onChange={(e) => setMemberId(e.target.value)} />
        </div>
        <button className="btn btn-ghost btn-sm" disabled={!memberId.trim() || archived}
                onClick={() => run(() => addSquadMember(squad.slug, kind, memberId.trim()))}>
          入池
        </button>
        <button className="btn btn-ghost btn-sm" disabled={archived}
                onClick={async () => {
                  if (!confirmArchive) { setConfirmArchive(true); return; }
                  await run(() => archiveSquad(squad.slug, ''));
                  setConfirmArchive(false);
                }}>
          <Archive size={13} style={{ marginRight: 4 }} />
          {confirmArchive ? '确认归档（只停未来指派）' : '归档小队'}
        </button>
      </div>
      {err && <div role="alert" style={{ color: 'var(--red)', fontSize: 11.5, marginTop: 4 }}>{err}</div>}
    </article>
  );
}

/* ────────────────────────── 页面 ────────────────────────── */

export default function Teams() {
  const {
    teams, teamsLoading, teamsError, fetchTeams,
    squads, squadsLoading, squadsError, fetchSquads, detail,
  } = useTeams();
  const fetchTeamDetail = useTeams((s) => s.fetchTeamDetail);
  const [tab, setTab] = useState<'teams' | 'squads'>('teams');
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => { fetchTeams(); fetchSquads(); }, [fetchTeams, fetchSquads]);

  const openTeam = async (slug: string) => {
    setSelected(slug);
    await fetchTeamDetail(slug);
  };

  const body = useMemo(() => {
    if (tab === 'squads') {
      return (
        <div>
          {squadsError && <div role="alert" style={{ color: 'var(--red)', fontSize: 12.5, marginBottom: 8 }}>{squadsError}</div>}
          {!squadsLoading && squads.length === 0 && !squadsError && (
            <p style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>
              还没有小队。小队是「这次谁一起干」的编组，1 个 leader Agent + 混编成员。
            </p>
          )}
          {squads.map((s) => <SquadCard key={s.id} squad={s} />)}
        </div>
      );
    }
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 300px) 1fr', gap: 12 }}>
        <div>
          {teamsError && <div role="alert" style={{ color: 'var(--red)', fontSize: 12.5, marginBottom: 8 }}>{teamsError}</div>}
          {!teamsLoading && teams.length === 0 && !teamsError && (
            <p style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>
              还没有团队。团队是「谁的资产」的容器，建一个再把资产归拢进来。
            </p>
          )}
          {showCreate && <TeamCreateForm onDone={() => setShowCreate(false)} />}
          {teams.map((t) => (
            <button key={t.id} onClick={() => openTeam(t.slug)}
                    aria-label={`打开团队 ${t.name}`}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
                      background: selected === t.slug ? 'var(--bg-selected)' : 'var(--bg-panel)',
                      border: `1px solid ${selected === t.slug ? 'var(--blue-border)' : 'var(--border)'}`,
                      borderRadius: 'var(--r-sm)', padding: '8px 10px', marginBottom: 8,
                      color: 'var(--text)',
                    }}>
              <div style={{ fontWeight: 600, fontSize: 12.5 }}>{t.name}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-muted)' }}>{t.slug}</div>
              <div style={{ marginTop: 4 }}>
                <span style={{ ...chip, color: STATUS_COLOR[t.status] }}>{STATUS_LABEL[t.status]}</span>
                <span style={chip}>成员 {t.member_count ?? 0}</span>
              </div>
            </button>
          ))}
        </div>
        <div>
          {detail ? <TeamDetail teamRef={selected || ''} /> : (
            <p style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>选一个团队看成员、资产与配额。</p>
          )}
        </div>
      </div>
    );
  }, [tab, teams, teamsError, teamsLoading, showCreate, selected, detail, squads, squadsError, squadsLoading]);

  return (
    <div style={{ padding: 16 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 16, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Users size={16} />团队与小隊
        </h2>
        <div role="tablist" aria-label="团队或小队" style={{ display: 'flex', gap: 4 }}>
          {(['teams', 'squads'] as const).map((k) => (
            <button key={k} role="tab" aria-selected={tab === k}
                    className="btn btn-ghost btn-sm"
                    style={{ color: tab === k ? 'var(--blue)' : 'var(--text-secondary)', fontWeight: tab === k ? 600 : 400 }}
                    onClick={() => setTab(k)}>
              {k === 'teams' ? '团队' : '小队'}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost btn-sm" onClick={() => { fetchTeams(); fetchSquads(); }}
                disabled={teamsLoading || squadsLoading}>
          <RefreshCw size={13} style={{ marginRight: 4 }} />刷新
        </button>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate((v) => !v)} aria-expanded={showCreate}>
          <Plus size={13} style={{ marginRight: 4 }} />{tab === 'teams' ? '新建团队' : '新建小队'}
        </button>
      </header>

      {tab === 'squads' && showCreate && <SquadCreateForm onDone={() => setShowCreate(false)} />}
      {body}
    </div>
  );
}
