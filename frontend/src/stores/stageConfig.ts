import { create } from 'zustand';

/** 阶段定义（前端侧）：id / 显示名 / 产物文件（null = 该阶段无固定产物）/ 顺序 */
export interface StageDef { id: string; name: string; file: string | null; order: number }

/**
 * 默认阶段表 = 后端 stage_config.DEFAULT_WORKFLOW 的镜像，仅作**首屏兜底**。
 * 真实来源是 `GET /api/admin/workflow`（后端单一事实源，P0-6）；拿到后覆盖本表。
 * 注意：这里只镜像 id/name/file，不复制 `what/tasks` 这类编辑性文案（那属界面内容）。
 */
export const DEFAULT_STAGES: StageDef[] = [
  { id: '0-change', name: '变更提案', file: 'CHANGE.md', order: 0 },
  { id: '1-requirement', name: '需求分析', file: 'REQUIREMENT.md', order: 1 },
  { id: '2-design', name: '技术设计', file: 'DESIGN.md', order: 2 },
  { id: '2a-ui-design', name: 'UI 设计', file: 'UI-DESIGN.md', order: 3 },
  { id: '3-task', name: '任务拆分', file: 'TASK.md', order: 4 },
  { id: '4-dev', name: '开发执行', file: null, order: 5 },
  { id: '5-test', name: '测试验证', file: 'TEST.md', order: 6 },
  { id: '6-review', name: '代码审查', file: 'REVIEW.md', order: 7 },
  { id: '7-integration', name: '集成归档', file: null, order: 8 },
];

const FILE_BY_ID: Record<string, string | null> = Object.fromEntries(
  DEFAULT_STAGES.map((s) => [s.id, s.file]),
);

/**
 * 把后端返回的 `workflow.stages` 归一化成前端 StageDef[]。
 * 纯函数（便于单测）：非法/空输入 → 抛错，由调用方回退默认表（不静默半套）。
 */
export function normalizeStages(raw: unknown): StageDef[] {
  if (!Array.isArray(raw) || raw.length === 0) throw new Error('阶段配置为空或非数组');
  const seen = new Set<string>();
  const out: StageDef[] = [];
  raw.forEach((r: any, i: number) => {
    if (!r || typeof r.id !== 'string' || !r.id) throw new Error(`第 ${i} 个阶段缺少 id`);
    if (seen.has(r.id)) throw new Error(`阶段 id 重复: ${r.id}`);
    seen.add(r.id);
    out.push({
      id: r.id,
      name: typeof r.name === 'string' && r.name ? r.name : r.id,
      order: typeof r.order === 'number' ? r.order : i,
      file: r.id in FILE_BY_ID ? FILE_BY_ID[r.id] : null,
    });
  });
  return out.sort((a, b) => a.order - b.order);
}

interface StageConfigState {
  stages: StageDef[];
  loaded: boolean;
  error: string | null;
  fetchStageConfig: () => Promise<void>;
}

export const useStageConfig = create<StageConfigState>((set, get) => ({
  stages: DEFAULT_STAGES,
  loaded: false,
  error: null,
  fetchStageConfig: async () => {
    if (get().loaded) return;
    try {
      const r = await fetch('/api/admin/workflow');
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const d = await r.json();
      set({ stages: normalizeStages(d?.workflow?.stages), loaded: true, error: null });
    } catch (e: any) {
      // 配置不可用不阻塞界面：保留默认表并记录原因（页面上不弹错，避免噪音）
      set({ loaded: true, error: String(e?.message || e) });
    }
  },
}));

/** 便捷取用：id → 名称 */
export function stageName(stages: StageDef[], id?: string | null): string {
  if (!id) return '';
  return stages.find((s) => s.id === id)?.name ?? id;
}
