/**
 * 6 · 环境变量 / 7 · CLI 自定义参数 / 8 · MCP 服务绑定
 *
 * 三块都属于「运行时配置块」，后端落点是 `custom_env` / `custom_args` / `mcp_config` 三列
 * （v23 multica 迁移已建列，PUT 也收录），本页同时写进 `model_config_json.env_vars|cli_args|mcp_servers`
 * —— 一次 PUT 两个落点，原因见 `.specs/ui-parity/P3-agent-config.md`「双写口径」。
 *
 * 与原型的一处**如实差异**：原型让 env 走专用端点（`PUT /api/agents/{id}/env`，带 rev 乐观锁、
 * 常规全字段请求带 env 直接 400）。本仓后端**没有** `/{id}/env` 与 `/{id}/mcp` 这两个端点
 * （`backend/routes/agents_api.py` 只有 CRUD + run/stop/scheduled-tasks/tools），所以本页三块
 * 只能随同一次 PUT 提交；乐观锁与「带 env 即 400」的防误改口径未实现，已在分区说明与 DoD 里标出。
 */
import { Plus, X, Eye } from 'lucide-react';
import { Section, Unwired } from './Section';
import { F } from './fields';
import { MASK } from './model';
import type { EnvRow } from './model';

export function EnvVarsSection({ rows, setRows }: { rows: EnvRow[]; setRows: (next: EnvRow[]) => void }) {
  function upd(i: number, next: Partial<EnvRow>) {
    setRows(rows.map(function (r, idx) { return idx === i ? Object.assign({}, r, next) : r; }));
  }
  return (
    <Section
      id="sec6" no={6} title="环境变量"
      note="值恒掩码：已存变量的值在界面上一律显示为 ****（哨兵=未改保留），要看明文得显式点「改值」再输入；保存时 **** 会被当成「不动原值」。"
      extra={<span className="chip mono">{rows.length} 项</span>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rows.map(function (r, i) {
          return (
            <div key={i} style={F.envRow}>
              <input aria-label={'环境变量名 ' + (i + 1)} placeholder="KEY" value={r.key}
                onChange={function (e) { upd(i, { key: e.target.value }); }} style={F.full} />
              {/* 掩码用普通文本框承载（不是 password 框）：password 框在列表/表单里会被浏览器
                  当成凭据管理器目标反复弹提示，而这里要的就是「看得见的 **** 哨兵」 */}
              <input aria-label={'环境变量值 ' + (i + 1)} placeholder="VALUE" value={r.value}
                readOnly={r.masked}
                onChange={function (e) { upd(i, { value: e.target.value, masked: false }); }}
                style={Object.assign({}, F.full, { fontFamily: r.masked ? 'var(--font-mono)' : undefined })} />
              {r.masked ? (
                <button type="button" className="btn btn-ghost btn-sm" title="改值（解锁这一项）"
                  aria-label={'改值 ' + (i + 1)}
                  onClick={function () { upd(i, { masked: false, value: '' }); }}>
                  <Eye size={12} /> 改值
                </button>
              ) : (
                <button type="button" className="btn btn-ghost btn-sm" title="改回掩码（不保存改动）"
                  aria-label={'还原 ' + (i + 1)}
                  onClick={function () { upd(i, { masked: true, value: MASK }); }}>
                  还原
                </button>
              )}
              <button type="button" className="btn btn-ghost btn-sm" aria-label={'删除环境变量 ' + (i + 1)}
                title="删除这一行" onClick={function () { setRows(rows.filter(function (_x, idx) { return idx !== i; })); }}
                style={{ color: 'var(--red)' }}>
                <X size={12} />
              </button>
            </div>
          );
        })}
        <div>
          <button type="button" className="btn btn-ghost btn-sm"
            onClick={function () { setRows(rows.concat([{ key: '', value: '', masked: false }])); }}>
            <Plus size={12} /> 加一项
          </button>
        </div>
      </div>
      <Unwired>
        专用端点与乐观锁：原型要求 env 只走 `PUT /api/agents/{'{id}'}/env`（带 rev；常规全字段请求带 env 应被 400 拒收）。
        本仓无该端点，env 随本页一次 PUT 落到 `custom_env` —— 「防顺手改 env」的服务端闸门尚未实现。
      </Unwired>
    </Section>
  );
}

export function CliArgsSection({ items, setItems }: { items: string[]; setItems: (next: string[]) => void }) {
  return (
    <Section
      id="sec7" no={7} title="CLI 自定义参数"
      note="一次一行 = 一个 argv 项：值里带空格也仍是单个字面量（不做 shell 展开、不拆行）。顺序即追加顺序，顺序由固定段 → 平台协议段 → 自定义段恒定。"
      extra={<span className="chip mono">{items.length} 项</span>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map(function (v, i) {
          const hasSpace = /\s/.test(v);
          return (
            <div key={i} style={F.lineRow1}>
              <input aria-label={'CLI 参数 ' + (i + 1)} placeholder={'#' + (i + 1) + ' 例如 --sandbox'}
                value={v} onChange={function (e) { setItems(items.map(function (x, idx) { return idx === i ? e.target.value : x; })); }}
                style={Object.assign({}, F.full, { fontFamily: 'var(--font-mono)' })} />
              <button type="button" className="btn btn-ghost btn-sm" aria-label={'删除 CLI 参数 ' + (i + 1)}
                onClick={function () { setItems(items.filter(function (_x, idx) { return idx !== i; })); }}
                style={{ color: 'var(--red)' }}>
                <X size={12} />
              </button>
              {hasSpace ? (
                <p style={F.hint}>
                  {'⚠️ 第 ' + (i + 1) + ' 行含空格：它是一个 argv 项，不会被拆成两个。要传两个参数就拆成两行。'}
                </p>
              ) : null}
            </div>
          );
        })}
        <div>
          <button type="button" className="btn btn-ghost btn-sm"
            onClick={function () { setItems(items.concat([''])); }}>
            <Plus size={12} /> 加一项
          </button>
        </div>
      </div>
      <p style={F.hint}>凭据不要放这里：argv 可被同机进程从 `ps` / `/proc/&lt;pid&gt;/cmdline` 读到，凭据走 6 区环境变量。</p>
      <Unwired>launch 预览（保存前逐次重算 argv 既有段）：后端无 argv 组装预览端点，本页不伪造预览文本。</Unwired>
    </Section>
  );
}

export function McpSection({ text, setText, error }: { text: string; setText: (t: string) => void; error?: string | null }) {
  return (
    <Section
      id="sec8" no={8} title="MCP 服务绑定"
      note="整体替换口径：本框内容即生效配置，留空 = 清空（落库 null，运行时不再注入任何 MCP，技能自带的文件/抓取能力会退化）。"
      extra={<span className="chip mono">{text.trim() ? 'JSON' : '空 · 未绑定'}</span>}
    >
      <label style={F.label} htmlFor="agent-mcp">MCP 配置 JSON（整体替换）</label>
      <textarea id="agent-mcp" aria-label="MCP 配置 JSON" rows={8} value={text}
        onChange={function (e) { setText(e.target.value); }}
        placeholder={'{\n  "filesystem": {\n    "transport": "stdio",\n    "command": "mcp-server-filesystem",\n    "args": ["--root", "/srv/repo"]\n  }\n}'}
        style={Object.assign({}, F.mono, { minHeight: 140 })} />
      {error ? <p role="alert" style={F.err}>MCP JSON 解析失败：{error}</p> : null}
      <div style={F.row}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={function () { setText(''); }}>
          清空（= 解绑全部 MCP）
        </button>
        <span style={F.hint}>transport：stdio 带 command/args/env；http 带 url/header。两者都按敏感值处理（日志脱敏）。</span>
      </div>
      <Unwired>
        即存端点：原型是 `PUT /api/agents/{'{id}'}/mcp` 行尾即存；本仓无该端点，本区随本页一次 PUT 提交
        （`mcp_config` + `model_config_json.mcp_servers`），因此不落库前「放弃」就是真的放弃。
      </Unwired>
    </Section>
  );
}
