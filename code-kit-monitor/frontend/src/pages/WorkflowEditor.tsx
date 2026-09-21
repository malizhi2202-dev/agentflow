import { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Trash2, Save, ChevronUp, ChevronDown, Edit3, Settings, X, Users, GitBranch } from 'lucide-react';
import { cn, gateDisplay, useFileNames } from '../hooks/useFileNames';
import { useAuth } from '../stores/auth';

interface Stage { id: string; name: string; gate: string | null; prompt: string; order: number; }
interface Gate { id: string; name: string; experts: string[]; }
interface Workflow { stages: Stage[]; gates: Gate[]; }

export default function WorkflowEditor() {
  const { isAdmin, rolePermissions } = useAuth();
  const canWrite = isAdmin || rolePermissions.includes('project:write');
  const [wf, setWf] = useState<Workflow | null>(null);
  const [allRoles, setAllRoles] = useState<string[]>([]);
  const [editingGate, setEditingGate] = useState<string | null>(null);
  const [editingStage, setEditingStage] = useState<string | null>(null);
  const [showAddStage, setShowAddStage] = useState(false);
  const [newStage, setNewStage] = useState({ id: '', name: '', gate: '', prompt: '' });
  const [saved, setSaved] = useState(false);
  const { map: nameMap, fetch: fetchNames } = useFileNames();

  useEffect(() => {
    fetchNames();
    fetch('/api/admin/workflow').then(r => r.json()).then(d => {
      setWf(d.workflow); setAllRoles(d.all_roles || []);
    });
  }, []);

  const save = async (updated: Workflow) => {
    await fetch('/api/admin/workflow', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  if (!wf) return <div style={{ padding: 40, color: 'var(--text-weak)' }}>加载中...</div>;

  const updateStages = (stages: Stage[]) => { const u = { ...wf, stages }; setWf(u); save(u); };
  const updateGates = (gates: Gate[]) => { const u = { ...wf, gates }; setWf(u); save(u); };

  const moveStage = (idx: number, dir: number) => {
    const stages = [...wf.stages];
    const target = idx + dir;
    if (target < 0 || target >= stages.length) return;
    [stages[idx], stages[target]] = [stages[target], stages[idx]];
    stages.forEach((s, i) => s.order = i);
    updateStages(stages);
  };

  const deleteStage = (idx: number) => {
    updateStages(wf.stages.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i })));
  };

  const addStage = () => {
    if (!newStage.id || !newStage.name) return;
    const stages = [...wf.stages];
    stages.push({ id: newStage.id, name: newStage.name, gate: newStage.gate || null, prompt: newStage.prompt || `prompts/${newStage.id}.md`, order: stages.length });
    updateStages(stages);
    setShowAddStage(false); setNewStage({ id: '', name: '', gate: '', prompt: '' });
  };

  const insertStage = (afterIdx: number) => {
    if (!newStage.id || !newStage.name) return;
    const stages = [...wf.stages];
    stages.splice(afterIdx + 1, 0, { id: newStage.id, name: newStage.name, gate: newStage.gate || null, prompt: newStage.prompt || `prompts/${newStage.id}.md`, order: 0 });
    stages.forEach((s, i) => s.order = i);
    updateStages(stages);
    setShowAddStage(false); setNewStage({ id: '', name: '', gate: '', prompt: '' });
  };

  const toggleExpert = (gateId: string, expert: string) => {
    const gates = wf.gates.map(g => {
      if (g.id !== gateId) return g;
      const experts = g.experts.includes(expert) ? g.experts.filter(e => e !== expert) : [...g.experts, expert];
      return { ...g, experts };
    });
    updateGates(gates);
  };

  return (
    
      <div style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, fontFamily: 'var(--font-mono)' }}>工作流编辑器</h1>
            {saved && <span className="badge badge-green">已保存</span>}
          </div>
          {canWrite && <button className="btn btn-primary btn-sm" onClick={() => setShowAddStage(true)}><Plus size={14} /> 新增阶段</button>}
        </div>

        {/* 新增阶段表单 */}
        {showAddStage && (
          <div className="card" style={{ marginBottom: 16, border: '1px solid var(--blue)', background: 'var(--bg-panel)' }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'end' }}>
              <div><label style={{ fontSize: 11, color: 'var(--text-weak)' }}>阶段 ID</label><br /><input placeholder="如: 8-deploy" value={newStage.id} onChange={e => setNewStage({ ...newStage, id: e.target.value })} style={{ width: 160, marginTop: 2 }} /></div>
              <div><label style={{ fontSize: 11, color: 'var(--text-weak)' }}>名称</label><br /><input placeholder="如: 部署上线" value={newStage.name} onChange={e => setNewStage({ ...newStage, name: e.target.value })} style={{ width: 140, marginTop: 2 }} /></div>
              <div><label style={{ fontSize: 11, color: 'var(--text-weak)' }}>关联 Gate</label><br /><select value={newStage.gate} onChange={e => setNewStage({ ...newStage, gate: e.target.value })} style={{ width: 140, marginTop: 2 }}><option value="">无</option>{wf.gates.map(g => <option key={g.id} value={g.id}>{gateDisplay(g.name)}</option>)}</select></div>
              <div><label style={{ fontSize: 11, color: 'var(--text-weak)' }}>Prompt 文件</label><br /><input placeholder="prompts/xxx.md" value={newStage.prompt} onChange={e => setNewStage({ ...newStage, prompt: e.target.value })} style={{ width: 180, marginTop: 2 }} /></div>
              <button className="btn btn-primary btn-sm" onClick={addStage}><Plus size={12} /> 追加到末尾</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAddStage(false)}><X size={12} /></button>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* 左侧：阶段列表 */}
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><GitBranch size={14} /> 流程阶段 ({wf.stages.length})</h2>
            {wf.stages.map((stage, i) => (
              <div key={stage.id} className="card" style={{ marginBottom: 8, padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-weak)', minWidth: 22, textAlign: 'center' }}>{i}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>{stage.id}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{stage.name}</span>
                  {stage.gate && <span className="badge badge-purple">{stage.gate}</span>}
                  <span style={{ fontSize: 11, color: 'var(--text-weak)', fontFamily: 'var(--font-mono)', marginLeft: 'auto' }}>{cn(stage.prompt, nameMap)}</span>
                  {canWrite && <div style={{ display: 'flex', gap: 2, marginLeft: 4 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => moveStage(i, -1)} disabled={i === 0}><ChevronUp size={12} /></button>
                    <button className="btn btn-ghost btn-sm" onClick={() => moveStage(i, 1)} disabled={i === wf.stages.length - 1}><ChevronDown size={12} /></button>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setNewStage({ id: '', name: '', gate: '', prompt: '' }); setShowAddStage(true); }} title="在此后插入"><Plus size={12} /></button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => deleteStage(i)}><Trash2 size={12} /></button>
                  </div>}
                </div>
              </div>
            ))}
          </div>

          {/* 右侧：门禁专家团 */}
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Users size={14} /> 门禁专家团 ({wf.gates.length})</h2>
            {wf.gates.map(gate => {
              const isOpen = editingGate === gate.id;
              return (
                <div key={gate.id} className="card" style={{ marginBottom: 8, padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setEditingGate(isOpen ? null : gate.id)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="badge badge-purple">{gate.id}</span>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{gateDisplay(gate.name)}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-weak)' }}>({gate.experts.length}人)</span>
                    </div>
                    <Edit3 size={12} style={{ color: 'var(--text-weak)' }} />
                  </div>
                  {isOpen && (
                    <div style={{ marginTop: 10, borderTop: '1px solid var(--border-weak)', paddingTop: 10 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {allRoles.map(role => {
                          const inGate = gate.experts.includes(role);
                          return (
                            <button key={role} onClick={() => toggleExpert(gate.id, role)}
                              style={{
                                padding: '3px 8px', borderRadius: 'var(--radius-sm)', fontSize: 11, cursor: 'pointer', border: '1px solid',
                                background: inGate ? 'var(--blue-bg)' : 'transparent',
                                borderColor: inGate ? 'var(--blue)' : 'var(--border-normal)',
                                color: inGate ? 'var(--blue)' : 'var(--text-weak)',
                              }}>{inGate ? '✓ ' : '+ '}{role}</button>
                          );
                        })}
                      </div>
                      <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-weak)' }}>
                        当前：{gate.experts.map((e, i) => <span key={i} className="badge badge-blue" style={{ marginRight: 4 }}>{e}</span>)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
  );
}
