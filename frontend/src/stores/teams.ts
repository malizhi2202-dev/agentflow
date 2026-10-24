/**
 * 团队与小隊状态层（波 4 的 API × 界面挂载）
 *
 * 口径（主档 §2.11 / §6.29，RULINGS R5-3/R5-4/R5-6）：
 * - **Team** = 组织层资源容器（成员四档 + 五类资产 + 配额），**不可指派**；
 * - **Squad** = 执行层可指派编组（1 leader Agent + 混编），**不拥有资产**、与 Team 无外键；
 * - **非成员 404**：后端已按可见性过滤列表，前端**不做二次授权判断**（D5）。
 *
 * 读写分工沿用 `stores/collab.ts`：GET 走 `safeFetch`（5s 缓存 + 去重），
 * 写走 `dedupedFetch` 并**读取后端 detail**（`safeFetch` 会把它压成 "Server error: 400"）。
 */
import { create } from 'zustand';
import { safeFetch, dedupedFetch, invalidateCache } from '../utils/requestDedup';

export type TeamStatus = 'active' | 'paused' | 'archived';
export const MEMBER_ROLES = ['owner', 'admin', 'member', 'viewer'] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];
export const ASSET_KINDS = ['agents', 'workflows', 'tools', 'knowledge_sources', 'domains'] as const;
export type AssetKind = (typeof ASSET_KINDS)[number];

export const ASSET_LABEL: Record<AssetKind, string> = {
  agents: 'Agent', workflows: '工作流', tools: '工具',
  knowledge_sources: '知识源', domains: '域',
};

export interface TeamQuota {
  token_soft_limit: number; token_hard_limit: number;
  max_agents: number; max_workflows: number; max_members: number;
}

export interface TeamSummary {
  id: number; slug: string; name: string; description: string;
  owner_user_id: string; status: TeamStatus; quota: TeamQuota;
  member_count?: number; asset_counts?: Record<string, number>;
  role?: MemberRole | null;
  created_at: string; updated_at: string;
}

export interface TeamMember { id: number; team_id: number; user_id: string; role: MemberRole; created_at: string }
export interface AssetRow { id: number; name: string; owner_id: string | null; owner_kind: string; team_id: number | null }
export type AssetMap = Record<AssetKind, AssetRow[]>;
export interface TeamDetail { team: TeamSummary; members: TeamMember[]; assets: AssetMap }

export interface SquadMember { id: number; squad_id: number; member_kind: 'agent' | 'member'; member_id: string }
export interface Squad {
  id: number; slug: string; name: string; leader_agent_id: number;
  instructions: string; status: string; created_by: string;
  archive_reason: string; archived_at: string | null;
  leader_name?: string | null; leader_archived?: boolean;
  members?: SquadMember[];
  created_at: string; updated_at: string;
}

type WriteResult = { ok: boolean; data?: any; error?: string };

async function writeJson(url: string, body?: unknown, method: 'POST' | 'DELETE' = 'POST'): Promise<WriteResult> {
  try {
    const res = await dedupedFetch(url, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    invalidateCache();
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, data, error: data?.detail || `请求失败 (${res.status})` };
    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, error: err?.message || '网络错误' };
  }
}

interface TeamsState {
  teams: TeamSummary[];
  teamsError: string | null;
  teamsLoading: boolean;
  detail: TeamDetail | null;
  detailError: string | null;
  detailLoading: boolean;
  squads: Squad[];
  squadsError: string | null;
  squadsLoading: boolean;

  fetchTeams: () => Promise<void>;
  createTeam: (payload: {
    slug: string; name: string; description?: string;
    quotas?: Partial<Pick<TeamQuota, 'max_agents' | 'max_workflows' | 'max_members'>>;
  }) => Promise<WriteResult>;
  fetchTeamDetail: (ref: string) => Promise<void>;
  clearDetail: () => void;
  setTeamStatus: (ref: string, status: TeamStatus) => Promise<WriteResult>;
  addMember: (ref: string, userId: string, role: MemberRole) => Promise<WriteResult>;
  removeMember: (ref: string, userId: string) => Promise<WriteResult>;
  transferOwner: (ref: string, newOwner: string, confirm: boolean) => Promise<WriteResult>;
  claimAsset: (ref: string, kind: AssetKind, assetId: number) => Promise<WriteResult>;
  releaseAsset: (ref: string, kind: AssetKind, assetId: number) => Promise<WriteResult>;

  fetchSquads: () => Promise<void>;
  createSquad: (payload: { slug: string; name: string; leader_agent_id: number; instructions?: string }) => Promise<WriteResult>;
  addSquadMember: (ref: string, kind: 'agent' | 'member', memberId: string) => Promise<WriteResult>;
  removeSquadMember: (ref: string, kind: 'agent' | 'member', memberId: string) => Promise<WriteResult>;
  archiveSquad: (ref: string, reason: string) => Promise<WriteResult>;
}

export const useTeams = create<TeamsState>((set, get) => ({
  teams: [], teamsError: null, teamsLoading: false,
  detail: null, detailError: null, detailLoading: false,
  squads: [], squadsError: null, squadsLoading: false,

  fetchTeams: async () => {
    set({ teamsLoading: true, teamsError: null });
    const result = await safeFetch('/api/teams');
    if (!result.ok) {
      set({ teamsLoading: false, teamsError: result.error || '团队读取失败' });
      return;
    }
    set({ teams: result.data?.teams || [], teamsLoading: false, teamsError: null });
  },

  createTeam: async (payload) => {
    const out = await writeJson('/api/teams', payload);
    if (out.ok) {
      await get().fetchTeams();
      const slug = out.data?.team?.slug;
      if (slug) await get().fetchTeamDetail(slug);
    }
    return out;
  },

  fetchTeamDetail: async (ref) => {
    set({ detailLoading: true, detailError: null });
    const result = await safeFetch(`/api/teams/${encodeURIComponent(ref)}`);
    if (!result.ok) {
      set({ detailLoading: false, detailError: result.error || '团队详情读取失败' });
      return;
    }
    set({
      detail: {
        team: result.data?.team,
        members: result.data?.members || [],
        assets: result.data?.assets || {},
      },
      detailLoading: false, detailError: null,
    });
  },

  clearDetail: () => set({ detail: null, detailError: null }),

  setTeamStatus: async (ref, status) => {
    const out = await writeJson(`/api/teams/${encodeURIComponent(ref)}/status`, { status });
    if (out.ok) { await get().fetchTeams(); await get().fetchTeamDetail(ref); }
    return out;
  },

  addMember: async (ref, userId, role) => {
    const out = await writeJson(`/api/teams/${encodeURIComponent(ref)}/members`, { user_id: userId, role });
    if (out.ok) { await get().fetchTeamDetail(ref); await get().fetchTeams(); }
    return out;
  },

  removeMember: async (ref, userId) => {
    const out = await writeJson(
      `/api/teams/${encodeURIComponent(ref)}/members/${encodeURIComponent(userId)}`, undefined, 'DELETE',
    );
    if (out.ok) { await get().fetchTeamDetail(ref); await get().fetchTeams(); }
    return out;
  },

  transferOwner: async (ref, newOwner, confirm) => {
    const out = await writeJson(`/api/teams/${encodeURIComponent(ref)}/transfer-owner`, {
      new_owner: newOwner, confirm,
    });
    if (out.ok) { await get().fetchTeamDetail(ref); await get().fetchTeams(); }
    return out;
  },

  claimAsset: async (ref, kind, assetId) => {
    const out = await writeJson(
      `/api/teams/${encodeURIComponent(ref)}/assets/${kind}/${assetId}/claim`, {},
    );
    if (out.ok) { await get().fetchTeamDetail(ref); await get().fetchTeams(); }
    return out;
  },

  releaseAsset: async (ref, kind, assetId) => {
    const out = await writeJson(
      `/api/teams/${encodeURIComponent(ref)}/assets/${kind}/${assetId}/release`, {},
    );
    if (out.ok) { await get().fetchTeamDetail(ref); await get().fetchTeams(); }
    return out;
  },

  fetchSquads: async () => {
    set({ squadsLoading: true, squadsError: null });
    const result = await safeFetch('/api/squads');
    if (!result.ok) {
      set({ squadsLoading: false, squadsError: result.error || '小队读取失败' });
      return;
    }
    set({ squads: result.data?.squads || [], squadsLoading: false, squadsError: null });
  },

  createSquad: async (payload) => {
    const out = await writeJson('/api/squads', payload);
    if (out.ok) await get().fetchSquads();
    return out;
  },

  addSquadMember: async (ref, kind, memberId) => {
    const out = await writeJson(`/api/squads/${encodeURIComponent(ref)}/members`, {
      member_kind: kind, member_id: memberId,
    });
    if (out.ok) await get().fetchSquads();
    return out;
  },

  removeSquadMember: async (ref, kind, memberId) => {
    const out = await writeJson(
      `/api/squads/${encodeURIComponent(ref)}/members/${kind}/${encodeURIComponent(memberId)}`,
      undefined, 'DELETE',
    );
    if (out.ok) await get().fetchSquads();
    return out;
  },

  archiveSquad: async (ref, _reason) => {
    // 后端 archive_squad(squad) 不收 reason（归档原因由审计侧记），这里保持无 body
    const out = await writeJson(`/api/squads/${encodeURIComponent(ref)}/archive`);
    if (out.ok) await get().fetchSquads();
    return out;
  },
}));
