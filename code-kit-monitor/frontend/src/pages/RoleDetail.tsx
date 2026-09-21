import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Trash2, Plus, X, ShieldAlert } from 'lucide-react';

interface RoleData {
  id?: number; name: string; based_on: string; temperament: string;
  responsibilities: string[];
  triggers: { gate: string; topic: string }[];
  boundaries_can: string[];
  boundaries_cannot: string[];
  evaluation: { step: string; title: string; items: string[] }[];
  inputs: string[]; outputs: string[];
  gate_pre: string; gate_post: string; io_filter: string;
}

var emptyRole = function(): RoleData {
  return {
    name: '', based_on: '', temperament: '',
    responsibilities: [], triggers: [], boundaries_can: [], boundaries_cannot: [],
    evaluation: [], inputs: [], outputs: [],
    gate_pre: '', gate_post: '', io_filter: 'none'
  };
};

export default function RoleDetail({ role, templates, onBack, onSave, onDelete }: {
  role: RoleData | null; templates: any[]; onBack: () => void;
  onSave: (data: RoleData) => void; onDelete?: () => void;
}) {
  var [data, setData] = useState<RoleData>(role || emptyRole());
  var [saved, setSaved] = useState(false);
  var [newTrigger, setNewTrigger] = useState({ gate: '', topic: '' });
  var [newCan, setNewCan] = useState('');
  var [newCannot, setNewCannot] = useState('');
  var [newInput, setNewInput] = useState('');
  var [newOutput, setNewOutput] = useState('');
  var [newEval, setNewEval] = useState({ step: '', title: '', items: '' });
  var [newResp, setNewResp] = useState('');

  useEffect(function() {
    if (role) {
      // 确保所有数组字段都有值
      setData({
        name: role.name || '', based_on: role.based_on || '', temperament: role.temperament || '',
        responsibilities: role.responsibilities || [],
        triggers: role.triggers || [],
        boundaries_can: role.boundaries_can || [],
        boundaries_cannot: role.boundaries_cannot || [],
        evaluation: role.evaluation || [],
        inputs: role.inputs || [], outputs: role.outputs || [],
        gate_pre: role.gate_pre || '', gate_post: role.gate_post || '', io_filter: role.io_filter || 'none',
        id: role.id,
      });
    }
  }, [role]);

  var handleSave = function() {
    onSave(data); setSaved(true); setTimeout(function() { setSaved(false); }, 1500);
  };

  var addArray = function(field: string, value: string) {
    if (!value.trim()) return;
    var arr = (data as any)[field] || [];
    (data as any)[field] = arr.concat([value.trim()]);
    setData(Object.assign({}, data));
  };
  var removeArray = function(field: string, idx: number) {
    var arr = (data as any)[field].slice();
    arr.splice(idx, 1);
    (data as any)[field] = arr;
    setData(Object.assign({}, data));
  };

  var isNew = !role || !role.id;
  var name = data.name || '未命名';

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={onBack} style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><ArrowLeft size={18} /></button>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, margin: 0, flex: 1 }}>{isNew ? '创建角色' : '编辑角色: ' + name}</h1>
        {saved && <span style={{ fontSize: 11, color: 'var(--green)', padding: '4px 10px', background: 'var(--green-bg)', borderRadius: 4 }}>已保存</span>}
      </div>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {/* 左侧编辑区 */}
        <div style={{ flex: '1 1 500px', maxWidth: 650, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>角色名称</label>
              <input value={data.name} onChange={function(e) { setData(Object.assign({}, data, { name: e.target.value })); }} style={inp} placeholder="例: 我的代码审查员" />
            </div>
            <div>
              <label style={lbl}>基于模板</label>
              <select value={data.based_on} onChange={function(e) { setData(Object.assign({}, data, { based_on: e.target.value })); }} style={inp}>
                <option value="">自定义</option>
                {templates.map(function(t) { return <option key={t.id} value={t.id}>{t.name}</option>; })}
              </select>
            </div>
          </div>

          <div>
            <label style={lbl}>性情 / 核心原则</label>
            <textarea value={data.temperament} onChange={function(e) { setData(Object.assign({}, data, { temperament: e.target.value })); }} rows={4} style={{ ...inp, resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.6 }} placeholder={'角色的思维模式和核心原则\n例: 谨慎、合规意识、攻防思维\n\n核心原则:\n> 假设每条数据都可能被泄露，每个入口都可能被攻击'} />
          </div>

          <div>
            <label style={lbl}>职责</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
              {(data.responsibilities || []).map(function(r, i) {
                return <span key={i} style={{ padding: '3px 8px', background: 'var(--blue-bg)', color: 'var(--blue)', borderRadius: 3, fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>{r} <X size={10} style={{ cursor: 'pointer' }} onClick={function() { removeArray('responsibilities', i); }} /></span>;
              })}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={newResp} onChange={function(e) { setNewResp(e.target.value); }} onKeyDown={function(e) { if (e.key === 'Enter') { addArray('responsibilities', newResp); setNewResp(''); } }} style={{ ...inp, flex: 1 }} placeholder="添加职责..." />
              <button onClick={function() { addArray('responsibilities', newResp); setNewResp(''); }} style={{ padding: '8px 12px', background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}><Plus size={12} /></button>
            </div>
          </div>

          <div>
            <label style={lbl}>触发场景</label>
            {(data.triggers || []).map(function(t, i) {
              return (
                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', minWidth: 80 }}>{t.gate}:</span>
                  <span style={{ fontSize: 12, flex: 1 }}>{t.topic}</span>
                  <X size={12} style={{ cursor: 'pointer', color: 'var(--color-danger)' }} onClick={function() { var arr = data.triggers.slice(); arr.splice(i, 1); setData(Object.assign({}, data, { triggers: arr })); }} />
                </div>
              );
            })}
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <input value={newTrigger.gate} onChange={function(e) { setNewTrigger({ gate: e.target.value, topic: newTrigger.topic }); }} style={{ ...inp, width: 120 }} placeholder="门禁" />
              <input value={newTrigger.topic} onChange={function(e) { setNewTrigger({ gate: newTrigger.gate, topic: e.target.value }); }} style={{ ...inp, flex: 1 }} placeholder="核心议题" />
              <button onClick={function() { if (newTrigger.gate) { setData(Object.assign({}, data, { triggers: data.triggers.concat([newTrigger]) })); setNewTrigger({ gate: '', topic: '' }); } }} style={{ padding: '8px 12px', background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}><Plus size={12} /></button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ ...lbl, color: 'var(--green)' }}>✅ 能做</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
                {(data.boundaries_can || []).map(function(c, i) {
                  return <span key={i} style={{ padding: '3px 8px', background: 'var(--green-bg)', color: 'var(--green)', borderRadius: 3, fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>{c} <X size={10} style={{ cursor: 'pointer' }} onClick={function() { removeArray('boundaries_can', i); }} /></span>;
                })}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <input value={newCan} onChange={function(e) { setNewCan(e.target.value); }} onKeyDown={function(e) { if (e.key === 'Enter') { addArray('boundaries_can', newCan); setNewCan(''); } }} style={{ ...inp, flex: 1 }} placeholder="添加..." />
                <button onClick={function() { addArray('boundaries_can', newCan); setNewCan(''); }} style={{ padding: '8px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer' }}><Plus size={12} /></button>
              </div>
            </div>
            <div>
              <label style={{ ...lbl, color: 'var(--red)' }}>❌ 不能做</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
                {(data.boundaries_cannot || []).map(function(c, i) {
                  return <span key={i} style={{ padding: '3px 8px', background: 'var(--red-bg)', color: 'var(--red)', borderRadius: 3, fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>{c} <X size={10} style={{ cursor: 'pointer' }} onClick={function() { removeArray('boundaries_cannot', i); }} /></span>;
                })}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <input value={newCannot} onChange={function(e) { setNewCannot(e.target.value); }} onKeyDown={function(e) { if (e.key === 'Enter') { addArray('boundaries_cannot', newCannot); setNewCannot(''); } }} style={{ ...inp, flex: 1 }} placeholder="添加..." />
                <button onClick={function() { addArray('boundaries_cannot', newCannot); setNewCannot(''); }} style={{ padding: '8px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer' }}><Plus size={12} /></button>
              </div>
            </div>
          </div>

          <div>
            <label style={lbl}>评估框架</label>
            {(data.evaluation || []).map(function(ev, i) {
              return (
                <div key={i} style={{ background: 'var(--bg-input)', borderRadius: 6, padding: 10, marginBottom: 6 }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                    <input value={ev.step} onChange={function(e) { var arr = data.evaluation.slice(); arr[i] = Object.assign({}, arr[i], { step: e.target.value }); setData(Object.assign({}, data, { evaluation: arr })); }} style={{ ...inp, width: 80 }} placeholder="步骤" />
                    <input value={ev.title} onChange={function(e) { var arr = data.evaluation.slice(); arr[i] = Object.assign({}, arr[i], { title: e.target.value }); setData(Object.assign({}, data, { evaluation: arr })); }} style={{ ...inp, flex: 1 }} placeholder="标题" />
                    <X size={14} style={{ cursor: 'pointer', color: 'var(--color-danger)' }} onClick={function() { var arr = data.evaluation.slice(); arr.splice(i, 1); setData(Object.assign({}, data, { evaluation: arr })); }} />
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <input value={(ev.items || []).join(', ')} onChange={function(e) { var arr = data.evaluation.slice(); arr[i] = Object.assign({}, arr[i], { items: e.target.value.split(',').map(function(s) { return s.trim(); }) }); setData(Object.assign({}, data, { evaluation: arr })); }} style={{ ...inp, flex: 1, fontSize: 11 }} placeholder="检查项（逗号分隔）" />
                  </div>
                </div>
              );
            })}
            <button onClick={function() { setData(Object.assign({}, data, { evaluation: data.evaluation.concat([{ step: String(data.evaluation.length + 1), title: '', items: [] }]) })); }} style={{ padding: '6px 10px', background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}><Plus size={11} /> 添加评估步骤</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>输入文件</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
                {(data.inputs || []).map(function(c, i) {
                  return <span key={i} style={{ padding: '3px 8px', background: 'var(--bg-card)', borderRadius: 3, fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>{c} <X size={10} style={{ cursor: 'pointer' }} onClick={function() { removeArray('inputs', i); }} /></span>;
                })}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <input value={newInput} onChange={function(e) { setNewInput(e.target.value); }} onKeyDown={function(e) { if (e.key === 'Enter') { addArray('inputs', newInput); setNewInput(''); } }} style={{ ...inp, flex: 1 }} placeholder="例: CHANGE.md" />
                <button onClick={function() { addArray('inputs', newInput); setNewInput(''); }} style={{ padding: '8px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer' }}><Plus size={12} /></button>
              </div>
            </div>
            <div>
              <label style={lbl}>输出格式</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
                {(data.outputs || []).map(function(c, i) {
                  return <span key={i} style={{ padding: '3px 8px', background: 'var(--bg-card)', borderRadius: 3, fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>{c} <X size={10} style={{ cursor: 'pointer' }} onClick={function() { removeArray('outputs', i); }} /></span>;
                })}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <input value={newOutput} onChange={function(e) { setNewOutput(e.target.value); }} onKeyDown={function(e) { if (e.key === 'Enter') { addArray('outputs', newOutput); setNewOutput(''); } }} style={{ ...inp, flex: 1 }} placeholder="例: ✅/❌ + 证据" />
                <button onClick={function() { addArray('outputs', newOutput); setNewOutput(''); }} style={{ padding: '8px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer' }}><Plus size={12} /></button>
              </div>
            </div>
          </div>

          <details style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><ShieldAlert size={14} /> 🛡️ 安全闸门（点击展开）</summary>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
              <input value={data.gate_pre} onChange={function(e) { setData(Object.assign({}, data, { gate_pre: e.target.value })); }} style={inp} placeholder="前置校验规则" />
              <input value={data.gate_post} onChange={function(e) { setData(Object.assign({}, data, { gate_post: e.target.value })); }} style={inp} placeholder="后置校验规则" />
              <select value={data.io_filter} onChange={function(e) { setData(Object.assign({}, data, { io_filter: e.target.value })); }} style={inp}>
                <option value="none">I/O不过滤</option><option value="sanitize">基础过滤</option><option value="strict">严格过滤</option>
              </select>
            </div>
          </details>

          <div style={{ display: 'flex', gap: 8, paddingTop: 8 }}>
            <button onClick={handleSave} style={{ padding: '10px 24px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><Save size={14} /> 保存角色</button>
            {onDelete && <button onClick={onDelete} style={{ padding: '10px 16px', background: 'none', color: 'var(--color-danger)', border: '1px solid var(--color-danger)', borderRadius: 4, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Trash2 size={14} /> 删除角色</button>}
          </div>
        </div>

        {/* 右侧预览 */}
        <div style={{ flex: '0 0 320px', position: 'sticky', top: 24, alignSelf: 'flex-start' }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 8, padding: 20, border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: 6 }}>👁 角色预览</h3>
            {data.based_on && <div style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, background: 'var(--blue-bg)', color: 'var(--blue)', display: 'inline-block', marginBottom: 8 }}>基于: {templates.find(function(t) { return t.id === data.based_on; })?.name || data.based_on}</div>}
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 12, fontStyle: 'italic' }}>{data.temperament || '（未填写性情/核心原则）'}</div>

            {data.responsibilities.length > 0 && <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 4 }}>职责</div>
              {data.responsibilities.map(function(r, i) { return <div key={i} style={{ fontSize: 11, paddingLeft: 12 }}>· {r}</div>; })}
            </div>}

            {data.triggers.length > 0 && <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 4 }}>触发场景</div>
              {data.triggers.map(function(t, i) { return <div key={i} style={{ fontSize: 10, paddingLeft: 12, fontFamily: 'var(--font-mono)' }}>{t.gate}: {t.topic}</div>; })}
            </div>}

            <div style={{ display: 'flex', gap: 12 }}>
              {data.boundaries_can.length > 0 && <div style={{ marginBottom: 8, flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--green)', marginBottom: 4 }}>✅ 能做</div>
                {data.boundaries_can.map(function(c, i) { return <div key={i} style={{ fontSize: 10, paddingLeft: 12 }}>· {c}</div>; })}
              </div>}
              {data.boundaries_cannot.length > 0 && <div style={{ marginBottom: 8, flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--red)', marginBottom: 4 }}>❌ 不能做</div>
                {data.boundaries_cannot.map(function(c, i) { return <div key={i} style={{ fontSize: 10, paddingLeft: 12 }}>· {c}</div>; })}
              </div>}
            </div>

            {data.evaluation.length > 0 && <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 4 }}>评估框架</div>
              {data.evaluation.map(function(ev, i) { return <div key={i} style={{ fontSize: 10, paddingLeft: 12, marginBottom: 4 }}>步骤{ev.step}·{ev.title}: {(ev.items || []).join(', ')}</div>; })}
            </div>}

            {data.inputs.length > 0 && <div style={{ marginBottom: 4, fontSize: 10, color: 'var(--text-dim)' }}>输入: {data.inputs.join(' · ')}</div>}
            {data.outputs.length > 0 && <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>输出: {data.outputs.join(' · ')}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

var lbl: React.CSSProperties = { fontSize: 11, fontWeight: 500, color: 'var(--text-dim)', display: 'block', marginBottom: 4 };
var inp: React.CSSProperties = { width: '100%', padding: '8px', background: 'var(--bg-input)', color: 'var(--color-text)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, boxSizing: 'border-box' };
