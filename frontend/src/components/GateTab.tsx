import { useState } from 'react';
import { gateDisplay } from '../hooks/useFileNames';

const ALL_GATES = ['G1 需求方向门', '需求质量门', 'G2 方案门', 'G2a UI设计门', 'Task 门', 'G3 代码门', '测试门', 'G4 审查门'];
const VOTE_ICON: Record<string, string> = { '✅': '✅', '❌': '❌', '⚪': '⚪', '⚠️': '⚠️' };
const VOTE_BG: Record<string, string> = { '✅': 'var(--green-bg)', '❌': 'var(--red-bg)', '⚪': 'var(--bg-card)', '⚠️': 'var(--orange-bg)' };

export default function GateTab({ gates }: { gates: any[] }) {
  if (!gates.length) return <p style={{ color: 'var(--text-muted)', padding: 20 }}>暂无门禁数据</p>;

  // 提取所有出现过的角色
  const allRoles: string[] = [];
  const seen = new Set<string>();
  gates.forEach((g: any) => {
    (g.votes || []).forEach((v: any) => {
      if (!seen.has(v.role)) { seen.add(v.role); allRoles.push(v.role); }
    });
  });

  // 构建矩阵
  const matrix: Record<string, Record<string, any>> = {};
  gates.forEach((g: any) => {
    const key = g.name || '';
    matrix[key] = { _result: g.result || 'pending', _question: g.question || '' };
    (g.votes || []).forEach((v: any) => {
      matrix[key][v.role] = { vote: v.vote, reason: v.reason || '' };
    });
  });

  return (
    <div style={{ overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'var(--font)' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '6px 10px', color: 'var(--text-muted)', fontWeight: 500, fontSize: 11, borderBottom: '1px solid var(--border)', minWidth: 100 }}>门禁</th>
            {allRoles.map(role => (
              <th key={role} style={{ textAlign: 'center', padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 500, fontSize: 11, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{role}</th>
            ))}
            <th style={{ textAlign: 'center', padding: '6px 10px', color: 'var(--text-muted)', fontWeight: 500, fontSize: 11, borderBottom: '1px solid var(--border)', width: 60 }}>结果</th>
          </tr>
        </thead>
        <tbody>
          {ALL_GATES.map(gateName => {
            const row = Object.entries(matrix).find(([k]) => k.includes(gateName.replace(/^G\d\s*/, '')) || gateName.includes(k) || k.includes(gateName.split(' ')[0]));
            const data = row ? row[1] : null;
            const resultText = data?._result || '';
            const passed = resultText.includes('通过') && !resultText.includes('条件');
            const rejected = resultText.includes('驳回') || resultText.includes('反对');
            const pending = !data;

            return (
              <tr key={gateName} style={{ opacity: pending ? 0.4 : 1, borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 10px', fontWeight: 600, fontSize: 12, color: pending ? 'var(--text-muted)' : 'var(--text)' }}>{gateDisplay(gateName)}</td>
                {allRoles.map(role => {
                  const v = data?.[role];
                  return (
                    <td key={role} style={{ textAlign: 'center', padding: '6px 4px', position: 'relative' }} title={v?.reason || ''}>
                      {v ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: 28, height: 28, borderRadius: 'var(--r-sm)',
                          background: VOTE_BG[v.vote] || 'var(--bg-card)',
                          fontSize: 14, cursor: v.reason ? 'pointer' : 'default',
                        }}>{VOTE_ICON[v.vote] || '—'}</span>
                      ) : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}
                      {v?.reason && (
                        <div style={{ display: 'none' }} className="tooltip-content">{v.reason}</div>
                      )}
                    </td>
                  );
                })}
                <td style={{ textAlign: 'center', padding: '6px 8px' }}>
                  {pending ? <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>等待</span> :
                   <span className={`badge ${passed ? 'badge-green' : rejected ? 'badge-red' : resultText.includes('条件') ? 'badge-orange' : 'badge-blue'}`}>
                    {passed ? '✅' : rejected ? '❌' : '⚠️'}
                  </span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* 详情：展开看理由 */}
      <details style={{ marginTop: 16 }}>
        <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)' }}>详细投票理由</summary>
        <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
          {gates.map((g: any, i: number) => (
            <div key={i} className="card" style={{ padding: '10px 12px' }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{gateDisplay(g.name)} — {g.question}</div>
              {(g.votes || []).map((v: any, j: number) => (
                <div key={j} style={{ display: 'flex', gap: 8, padding: '3px 0', fontSize: 12, borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontWeight: 600, minWidth: 90 }}>{v.role}</span>
                  <span>{VOTE_ICON[v.vote] || v.vote}</span>
                  <span style={{ color: 'var(--text-secondary)', flex: 1 }}>{v.reason}</span>
                </div>
              ))}
              <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{g.result}</div>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
