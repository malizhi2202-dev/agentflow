import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { CheckCircle, Circle, Users, ChevronDown, ChevronRight, ArrowRight, GitCommit } from 'lucide-react';
const STAGES = [
    { id: '0-change', name: '变更提案', what: '把模糊想法变成 CHANGE.md', tasks: ['生成 change-id', '反问澄清需求', '架构级预检', '视觉调性预选'], experts: ['高级产品经理', '资深用户评测员', '架构师', '安全审计师'], autoAction: 'G1 全票/多数通过 → 自动进入 1-requirement' },
    { id: '1-requirement', name: '需求分析', what: '写 REQUIREMENT.md + 更新 CONTEXT.md', tasks: ['用户故事(US)', '验收准则(AC)', 'v1/v2/out 范围切分', '非功能性需求', '提取域语言'], experts: ['高级产品经理', '资深用户评测员', '架构师', '安全审计师'], autoAction: '需求门通过 → 自动进入 2-design' },
    { id: '2-design', name: '技术设计', what: '产出 DESIGN.md + 技术栈 + ADR', tasks: ['技术栈预选', '既有架构对齐', '技术决策(ADR)', '数据流/架构图', '风险分析(≥3条)'], experts: ['架构师(M)', '研发负责人', '领域专家', '安全审计师'], autoAction: 'G2 通过 → 自动进入 2a(前端)/3-task' },
    { id: '2a-ui-design', name: 'UI 设计', what: '产出 UI-DESIGN.md · 视觉+交互', tasks: ['美学方向 4 问', '5 维决策', 'Design Tokens', '组件规约(≥5)', 'Anti-slop 自检'], experts: ['资深UI设计师', '资深用户体验官', '前端架构师', '无障碍专家'], autoAction: 'G2a 通过 → 自动进入 3-task' },
    { id: '3-task', name: '任务拆分', what: '产出 TASK.md · 波次+自动化投票', tasks: ['原子任务拆分', '波次划分', '边界声明', 'verify+done', '逐task 🤖/👤 投票'], experts: ['工程效能专家', '架构师', '研发负责人', '资深测试工程师'], autoAction: 'Task门通过 → 自动进入 4-dev · 🤖自动执行 · 👤暂停等人' },
    { id: '4-dev', name: '开发执行', what: '逐 task TDD 实现 + SUMMARY', tasks: ['<auto>字段检查', '沿用抽象 grep', 'TDD: RED→GREEN→REFACTOR', '6维 self-review', 'diff 边界 verify'], experts: ['研发负责人(M)', '架构师', '资深测试工程师', '安全审计师'], autoAction: '每task提交后 → 🤖自动下一task / 👤暂停等人 · 全部完成 → G3 自动审核' },
    { id: '5-test', name: '测试验证', what: '产出 TEST.md · 5 轮金字塔', tasks: ['第1轮·功能', '第2轮·性能', '第3轮·安全', '第4轮·兼容', '第5轮·可观测'], experts: ['资深测试工程师', '研发负责人', '高级产品经理', '资深用户体验官'], autoAction: '测试门通过 → 自动进入 6-review · 🔴问题自动回 4-dev' },
    { id: '6-review', name: '代码审查', what: '产出 REVIEW.md · 三轮审查', tasks: ['第一轮·Spec合规', '第二轮·代码质量(6维)', '第三轮·UI视觉', '第四轮·技术债(可选)', '产出 fix 任务'], experts: ['资深测试工程师(M)', '架构师', '领域专家', '安全审计师'], autoAction: 'G4 通过 → 自动进入 7-integration · Critical 自动回 4-dev' },
    { id: '7-integration', name: '集成归档', what: '全量测试 + UAT + 归档', tasks: ['全量单测/e2e/build', '人工 UAT', '失败诊断+fix-plan', '提名 LESSONS', '归档到 archive/'], experts: ['Verifier + Release', 'UAT 人工确认'], autoAction: '归档完成 → git 自动提交 · 📦 移入 archive/' },
];
const EXPERT_COLORS = {
    '高级产品经理': 'var(--orange)', '资深用户评测员': 'var(--blue)', '架构师': 'var(--blue)',
    '安全审计师': 'var(--red)', '研发负责人': 'var(--blue)', '领域专家': 'var(--green)',
    '资深UI设计师': 'var(--purple)', '资深用户体验官': 'var(--purple)',
    '前端架构师': 'var(--blue)', '无障碍专家': 'var(--green)',
    '工程效能专家': 'var(--orange)', '资深测试工程师': 'var(--green)',
};
export default function WorkflowTab({ data }) {
    const [expanded, setExpanded] = useState(null);
    const currentIdx = STAGES.findIndex(s => data.phase === s.id || data.phase?.startsWith(s.id));
    return (_jsx("div", { children: STAGES.map((stage, i) => {
            const done = i < currentIdx;
            const current = i === currentIdx;
            const pending = i > currentIdx;
            const isOpen = expanded === stage.id;
            const dotColor = done ? 'var(--green)' : current ? 'var(--blue)' : 'var(--text-weak)';
            const cardBorder = current ? 'var(--blue)' : done ? 'var(--border-strong)' : 'var(--border-weak)';
            const opacity = pending ? 0.5 : 1;
            return (_jsxs("div", { style: { display: 'flex', gap: 12, marginBottom: 2 }, children: [_jsxs("div", { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: 32, flexShrink: 0, paddingTop: 12 }, children: [done ? _jsx(CheckCircle, { size: 18, style: { color: 'var(--green)' } })
                                : current ? _jsx("div", { style: { width: 18, height: 18, borderRadius: '50%', background: 'var(--blue)', boxShadow: '0 0 8px var(--blue)' } })
                                    : _jsx(Circle, { size: 18, style: { color: 'var(--text-weak)' } }), i < STAGES.length - 1 && _jsx("div", { style: { width: 2, flex: 1, minHeight: 16, background: i < currentIdx ? 'var(--green)' : 'var(--border-weak)', marginTop: 4 } })] }), _jsxs("div", { onClick: () => setExpanded(isOpen ? null : stage.id), className: "card card-clickable", style: { flex: 1, marginBottom: 6, borderLeft: `3px solid ${cardBorder}`, opacity, padding: '12px 14px' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("span", { style: { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-weak)', minWidth: 24 }, children: stage.id }), _jsx("span", { style: { fontWeight: 600, fontSize: 13 }, children: stage.name }), current && _jsx("span", { className: "badge badge-blue", children: "\u5F53\u524D" }), done && _jsx("span", { className: "badge badge-green", children: "\u5B8C\u6210" })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 6 }, children: [_jsx("span", { style: { fontSize: 11, color: 'var(--text-weak)' }, children: stage.what }), isOpen ? _jsx(ChevronDown, { size: 14, style: { color: 'var(--text-weak)' } }) : _jsx(ChevronRight, { size: 14, style: { color: 'var(--text-weak)' } })] })] }), isOpen && (_jsxs("div", { style: { marginTop: 10, borderTop: '1px solid var(--border-weak)', paddingTop: 10 }, children: [_jsxs("div", { style: { background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }, children: [_jsx(ArrowRight, { size: 13, style: { color: 'var(--blue)', flexShrink: 0 } }), stage.autoAction, stage.id === '3-task' && _jsx(GitCommit, { size: 12, style: { color: 'var(--blue)' } })] }), _jsxs("div", { style: { marginBottom: 10 }, children: [_jsx("div", { style: { fontSize: 11, color: 'var(--text-weak)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.03 }, children: "\uD83D\uDCCB \u5B50\u4EFB\u52A1" }), _jsx("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 16px' }, children: stage.tasks.map((t, j) => (_jsxs("div", { style: { fontSize: 12, color: 'var(--text-secondary)', padding: '2px 0', display: 'flex', alignItems: 'center', gap: 6 }, children: [_jsx("span", { style: { width: 5, height: 5, borderRadius: '50%', background: dotColor, flexShrink: 0 } }), t] }, j))) })] }), _jsxs("div", { children: [_jsxs("div", { style: { fontSize: 11, color: 'var(--text-weak)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.03, display: 'flex', alignItems: 'center', gap: 4 }, children: [_jsx(Users, { size: 12 }), " \u5BA1\u6838\u4E13\u5BB6"] }), _jsx("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 4 }, children: stage.experts.map((expert, j) => {
                                                    const name = expert.replace('(M)', '');
                                                    const isMaster = expert.includes('(M)');
                                                    return (_jsx("span", { style: {
                                                            fontSize: 10, padding: '2px 7px', borderRadius: 'var(--radius-sm)',
                                                            background: (EXPERT_COLORS[name] || 'var(--text-weak)') + '20',
                                                            color: EXPERT_COLORS[name] || 'var(--text-weak)',
                                                            fontWeight: isMaster ? 700 : 500,
                                                            border: isMaster ? `1px solid ${EXPERT_COLORS[name] || 'var(--text-weak)'}` : 'none',
                                                        }, children: expert }, j));
                                                }) })] })] }))] })] }, stage.id));
        }) }));
}
