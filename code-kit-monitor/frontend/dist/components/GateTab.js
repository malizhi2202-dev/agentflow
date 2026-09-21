import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { gateDisplay } from '../hooks/useFileNames';
const ALL_GATES = ['G1 需求方向门', '需求质量门', 'G2 方案门', 'G2a UI设计门', 'Task 门', 'G3 代码门', '测试门', 'G4 审查门'];
const VOTE_ICON = { '✅': '✅', '❌': '❌', '⚪': '⚪', '⚠️': '⚠️' };
const VOTE_BG = { '✅': 'var(--green-bg)', '❌': 'var(--red-bg)', '⚪': 'var(--bg-card)', '⚠️': 'var(--orange-bg)' };
export default function GateTab({ gates }) {
    if (!gates.length)
        return _jsx("p", { style: { color: 'var(--text-muted)', padding: 20 }, children: "\u6682\u65E0\u95E8\u7981\u6570\u636E" });
    // 提取所有出现过的角色
    const allRoles = [];
    const seen = new Set();
    gates.forEach((g) => {
        (g.votes || []).forEach((v) => {
            if (!seen.has(v.role)) {
                seen.add(v.role);
                allRoles.push(v.role);
            }
        });
    });
    // 构建矩阵
    const matrix = {};
    gates.forEach((g) => {
        const key = g.name || '';
        matrix[key] = { _result: g.result || 'pending', _question: g.question || '' };
        (g.votes || []).forEach((v) => {
            matrix[key][v.role] = { vote: v.vote, reason: v.reason || '' };
        });
    });
    return (_jsxs("div", { style: { overflow: 'auto' }, children: [_jsxs("table", { style: { width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'var(--font)' }, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { style: { textAlign: 'left', padding: '6px 10px', color: 'var(--text-muted)', fontWeight: 500, fontSize: 11, borderBottom: '1px solid var(--border)', minWidth: 100 }, children: "\u95E8\u7981" }), allRoles.map(role => (_jsx("th", { style: { textAlign: 'center', padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 500, fontSize: 11, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }, children: role }, role))), _jsx("th", { style: { textAlign: 'center', padding: '6px 10px', color: 'var(--text-muted)', fontWeight: 500, fontSize: 11, borderBottom: '1px solid var(--border)', width: 60 }, children: "\u7ED3\u679C" })] }) }), _jsx("tbody", { children: ALL_GATES.map(gateName => {
                            const row = Object.entries(matrix).find(([k]) => k.includes(gateName.replace(/^G\d\s*/, '')) || gateName.includes(k) || k.includes(gateName.split(' ')[0]));
                            const data = row ? row[1] : null;
                            const resultText = data?._result || '';
                            const passed = resultText.includes('通过') && !resultText.includes('条件');
                            const rejected = resultText.includes('驳回') || resultText.includes('反对');
                            const pending = !data;
                            return (_jsxs("tr", { style: { opacity: pending ? 0.4 : 1, borderBottom: '1px solid var(--border)' }, children: [_jsx("td", { style: { padding: '8px 10px', fontWeight: 600, fontSize: 12, color: pending ? 'var(--text-muted)' : 'var(--text)' }, children: gateDisplay(gateName) }), allRoles.map(role => {
                                        const v = data?.[role];
                                        return (_jsxs("td", { style: { textAlign: 'center', padding: '6px 4px', position: 'relative' }, title: v?.reason || '', children: [v ? (_jsx("span", { style: {
                                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                        width: 28, height: 28, borderRadius: 'var(--r-sm)',
                                                        background: VOTE_BG[v.vote] || 'var(--bg-card)',
                                                        fontSize: 14, cursor: v.reason ? 'pointer' : 'default',
                                                    }, children: VOTE_ICON[v.vote] || '—' })) : _jsx("span", { style: { color: 'var(--text-muted)', fontSize: 11 }, children: "\u2014" }), v?.reason && (_jsx("div", { style: { display: 'none' }, className: "tooltip-content", children: v.reason }))] }, role));
                                    }), _jsx("td", { style: { textAlign: 'center', padding: '6px 8px' }, children: pending ? _jsx("span", { style: { color: 'var(--text-muted)', fontSize: 10 }, children: "\u7B49\u5F85" }) :
                                            _jsx("span", { className: `badge ${passed ? 'badge-green' : rejected ? 'badge-red' : resultText.includes('条件') ? 'badge-orange' : 'badge-blue'}`, children: passed ? '✅' : rejected ? '❌' : '⚠️' }) })] }, gateName));
                        }) })] }), _jsxs("details", { style: { marginTop: 16 }, children: [_jsx("summary", { style: { cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)' }, children: "\u8BE6\u7EC6\u6295\u7968\u7406\u7531" }), _jsx("div", { style: { marginTop: 8, display: 'grid', gap: 8 }, children: gates.map((g, i) => (_jsxs("div", { className: "card", style: { padding: '10px 12px' }, children: [_jsxs("div", { style: { fontWeight: 600, fontSize: 13, marginBottom: 6 }, children: [gateDisplay(g.name), " \u2014 ", g.question] }), (g.votes || []).map((v, j) => (_jsxs("div", { style: { display: 'flex', gap: 8, padding: '3px 0', fontSize: 12, borderBottom: '1px solid var(--border)' }, children: [_jsx("span", { style: { fontWeight: 600, minWidth: 90 }, children: v.role }), _jsx("span", { children: VOTE_ICON[v.vote] || v.vote }), _jsx("span", { style: { color: 'var(--text-secondary)', flex: 1 }, children: v.reason })] }, j))), _jsx("div", { style: { marginTop: 4, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }, children: g.result })] }, i))) })] })] }));
}
