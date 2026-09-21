import { create } from 'zustand';
export const useFileNames = create((set) => ({
    map: {},
    loaded: false,
    fetch: async () => {
        try {
            const res = await fetch('/api/admin/file-names');
            const data = await res.json();
            set({ map: data || {}, loaded: true });
        }
        catch {
            set({ loaded: true });
        }
    },
}));
// 便捷函数：路径 → 中文名，无映射返回原名
export function cn(path, map) {
    return map[path] || path;
}
// 产物文件名 → 中文映射（内置，不需要 API）
const ARTIFACT_NAMES = {
    'CHANGE.md': '变更提案',
    'REQUIREMENT.md': '需求文档',
    'DESIGN.md': '技术设计',
    'UI-DESIGN.md': 'UI设计',
    'TASK.md': '任务清单',
    'TEST.md': '测试文档',
    'REVIEW.md': '审查报告',
};
export function artifactName(fname) {
    if (ARTIFACT_NAMES[fname])
        return ARTIFACT_NAMES[fname];
    if (fname.includes('-SUMMARY'))
        return `任务总结 (${fname.replace('-SUMMARY.md', '')})`;
    return fname;
}
// 门禁名称 → 「方向评审 · G1」格式，简洁明了
export const GATE_DISPLAY = {
    'G1 需求方向门': '方向评审 · G1',
    'G1 需求门': '方向评审 · G1',
    '需求质量门': '需求评审 · G1',
    '需求门': '需求评审 · G1',
    'G2 方案门': '方案评审 · G2',
    'G2a UI设计门': 'UI评审 · G2a',
    'Task 门': '任务规划 · Task',
    'G3 代码门': '代码评审 · G3',
    '测试门': '测试评审 · G3',
    'G4 审查门': '综合终审 · G4',
};
export function gateDisplay(name) {
    if (GATE_DISPLAY[name])
        return GATE_DISPLAY[name];
    for (const [key, val] of Object.entries(GATE_DISPLAY)) {
        if (name.includes(key.replace(/^G\d\w*\s*/, '')) || key.includes(name.replace(/^G\d\w*\s*/, '')))
            return val;
    }
    return name;
}
