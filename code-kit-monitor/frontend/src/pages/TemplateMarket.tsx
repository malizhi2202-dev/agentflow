import React, { useEffect, useState } from 'react';
import { useOrchestration } from '../stores/orchestration';
import { Plus, Rocket, Download } from 'lucide-react';

export default function TemplateMarket() {
  const { templates, fetchTemplates, deployTemplate } = useOrchestration();
  const [deployId, setDeployId] = useState<number | null>(null);
  const [deployValues, setDeployValues] = useState<Record<string, string>>({});
  const [deployResult, setDeployResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDeploy = async (id: number) => {
    setLoading(true);
    const result = await deployTemplate(id, deployValues);
    setDeployResult(result);
    setLoading(false);
    if (result.ok) {
      setDeployId(null);
      setDeployValues({});
      fetchTemplates();
    }
  };

  if (templates.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        <p style={{ fontSize: 14 }}>暂无模板</p>
        <p style={{ fontSize: 11 }}>从编排页保存第一个模板</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 600, marginBottom: 16 }}>模板市场</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
        {templates.map((tpl: any) => (
          <div
            key={tpl.id}
            className="card card-clickable"
            style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{tpl.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{tpl.description || '-'}</div>
              </div>
              {tpl.published && (
                <span className="badge badge-green">已发布</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-muted)' }}>
              <span>{tpl.params?.length || 0} 参数</span>
              <span>{tpl.deploy_count || 0} 次部署</span>
            </div>
            <button
              className="btn btn-primary"
              style={{ alignSelf: 'flex-start', marginTop: 4 }}
              onClick={() => setDeployId(tpl.id)}
            >
              <Rocket size={12} /> 一键部署
            </button>

            {deployId === tpl.id && (
              <div style={{ marginTop: 8, padding: 12, background: 'var(--bg-input)', borderRadius: 'var(--r-md)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>填写参数</div>
                {(tpl.params || []).map((p: string) => (
                  <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", minWidth: 120, color: 'var(--text-secondary)' }}>{p}</label>
                    <input
                      style={{ flex: 1 }}
                      value={deployValues[p] || ''}
                      onChange={(e) => setDeployValues({ ...deployValues, [p]: e.target.value })}
                      placeholder={`输入 ${p}`}
                    />
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-primary" disabled={loading} onClick={() => handleDeploy(tpl.id)}>
                    {loading ? '部署中...' : '确认部署'}
                  </button>
                  <button className="btn" onClick={() => { setDeployId(null); setDeployValues({}); }}>
                    取消
                  </button>
                </div>
              </div>
            )}

            {deployResult && deployResult.ok && deployId !== tpl.id && (
              <div style={{ fontSize: 11, color: '#5cb878', marginTop: 4 }}>
                ✅ 部署成功！编排 ID: {deployResult.orchestration_id}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
