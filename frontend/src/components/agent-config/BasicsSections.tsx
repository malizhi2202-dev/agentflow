/**
 * 1 · 标识 / 2 · 域归属 / 13 · Access
 *
 * 三区共同点：以「只读事实 + 少量可写字段」为主。可写与否**按后端 PUT 白名单的真实收录**决定
 * ——`backend/routes/agents_api.py` 的 `api_update_agent` 只收 name/description/model_name/
 * model_config_json / system_prompt / role_def / sop / workflow_id / token_soft_limit /
 * token_hard_limit / domain_id / avatar_url / custom_env / custom_args / mcp_config /
 * thinking_level / service_tier / composio_toolkit_allowlist。
 * 不在表里的（别名、visibility、team_id、status）一律只读或标「未接入」，不做「能点但存不进去」的假入口。
 */
import { useEffect } from 'react';
import { Section, ReadRow, Unwired } from './Section';
import { F } from './fields';
import { showValue } from './model';
import { useDomains } from '../../stores/domains';

interface SectProps {
  data: any;
  patch: (p: any) => void;
  isNew: boolean;
}

function fmtTime(v: unknown): string {
  if (!v) return '—';
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? String(v) : d.toLocaleString('zh-CN');
}

export function IdentitySection({ data, patch, isNew }: SectProps) {
  return (
    <Section
      id="sec1" no={1} title="标识"
      note="名称/ID/状态/归属人与创建时间来自后端；「别名」后端无该列，如实标未接入（不塞一个存不进去的输入框）。"
      extra={<span className="chip">{isNew ? '新建 · 未落库' : 'ID ' + showValue(data.id)}</span>}
    >
      <div style={F.grid2}>
        <div>
          <label style={F.label} htmlFor="agent-name">名称</label>
          <input id="agent-name" value={data.name || ''} aria-label="名称"
            onChange={function (e) { patch({ name: e.target.value }); }} style={F.full} />
        </div>
        <div>
          <label style={F.label} htmlFor="agent-avatar">字母头像（展示用 · avatar_url）</label>
          <input id="agent-avatar" value={data.avatar_url || ''} aria-label="字母头像"
            placeholder="如 emoji:🧠"
            onChange={function (e) { patch({ avatar_url: e.target.value }); }} style={F.full} />
        </div>
      </div>
      <div style={{ marginTop: 10 }}>
        <label style={F.label} htmlFor="agent-desc">描述（仅展示 · 不进执行 prompt）</label>
        <input id="agent-desc" value={data.description || ''} aria-label="描述"
          onChange={function (e) { patch({ description: e.target.value }); }} style={F.full} />
      </div>

      <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
        <ReadRow label="ID" value={showValue(data.id)} mono />
        <ReadRow label="状态" value={<span className="chip">{data.status || 'standby'}</span>} />
        <ReadRow label="归属人" value={showValue(data.owner_id)} mono />
        <ReadRow label="创建时间" value={fmtTime(data.created_at)} />
        <ReadRow label="更新时间" value={fmtTime(data.updated_at)} />
      </div>

      <Unwired>别名（≤16 字符的列表短显名）：Agent 表无该列，后端也不收，故不渲染输入框。</Unwired>
    </Section>
  );
}

export function DomainSection({ data, patch }: SectProps) {
  const domains = useDomains();
  // 域列表只在首次进入时拉一次（同一 store，控制面页也用这份，不另开缓存）
  useEffect(function () { domains.fetchDomains(); }, []);
  const list = domains.domains || [];
  const cur = data.domain_id === null || data.domain_id === undefined || data.domain_id === '' ? '' : String(data.domain_id);
  return (
    <Section
      id="sec2" no={2} title="域归属"
      note="Domain 只是逻辑分组与共享边界，不是安全边界（PRODUCT-DESIGN 口径）；不选即 daemon 侧按「未分类」处理。"
      extra={<span className="chip info">可选 · 可空</span>}
    >
      <div style={F.grid2}>
        <div>
          <label style={F.label} htmlFor="agent-domain">所属域</label>
          <select id="agent-domain" aria-label="所属域" value={cur}
            onChange={function (e) { patch({ domain_id: e.target.value === '' ? null : parseInt(e.target.value, 10) }); }}
            style={F.full}>
            <option value="">未分类（domain_id = NULL）</option>
            {list.map(function (d: any) {
              return <option key={d.id} value={String(d.id)}>{d.name}</option>;
            })}
            {cur !== '' && !list.some(function (d: any) { return String(d.id) === cur; }) && (
              <option value={cur}>{'域 #' + cur + '（当前值 · 未在列表中）'}</option>
            )}
          </select>
          {domains.loading ? <p style={F.hint}>正在读取域列表…</p> : null}
          {list.length === 0 && !domains.loading ? (
            <p style={F.hint}>还没有任何域（到「隔离与域」页新建）——当前即「未分类」。</p>
          ) : null}
        </div>
        <div>
          <label style={F.label}>归属团队（team_id / owner_kind）</label>
          <ReadRow label="现值" value={showValue(data.team_id)} mono />
          <p style={F.hint}>换团队是「转移动作」（Admin 确认 + 必填原因），不是普通字段编辑，故本区只读。</p>
        </div>
      </div>
      <Unwired>
        归属团队 / owner_kind：`GET /api/agents/{'{id}'}` 的 to_dict 未返回 team_id，`PUT` 也不收该字段 ——
        接口不返回的值不做前端推断（不按 owner_id 猜团队）。
      </Unwired>
    </Section>
  );
}

export function AccessSection({ data }: SectProps) {
  return (
    <Section
      id="sec13" no={13} title="Access"
      note="可见性 ≠ 可运行：可见性只决定「能不能在列表里选到 / 被画布引用」，起 run 仍过执行与闸门判定。"
      extra={<span className="chip warn">只读</span>}
    >
      <div style={F.grid2}>
        <div>
          <ReadRow label="归属人" value={showValue(data.owner_id)} mono />
          <ReadRow label="可见性" value={<span className="chip">{data.visibility || 'private'}</span>} />
        </div>
        <div>
          <ReadRow label="归属团队" value={showValue(data.team_id)} mono />
          <ReadRow label="状态" value={<span className="chip">{data.status || 'standby'}</span>} />
        </div>
      </div>
      <Unwired>
        visibility / team_id：后端 PUT 白名单未收录这两项（只读回显来自 to_dict），
        故本区不做可编辑入口 —— 可见性变更目前只能走列表页的动作，团队转移需专门的转移端点（后端未实现）。
      </Unwired>
    </Section>
  );
}
