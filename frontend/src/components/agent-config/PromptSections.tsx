/**
 * 3 · 指令与开场白
 *
 * 人设三件（system_prompt / role_def / sop）是 T-05 落库字段，也是 `PUT /api/agents/{id}`
 * 真收录的三个键 —— 这里保留原页的三块文本域，只是搬进编号分区。
 *
 * 开场白（prompts[]，label + prompt，≤3 条）与「平台维护层」在后端都没有字段：
 * 前者 Agent 表无列，后者随部署版本拼在指令之前（不走接口）。两者都**只标未接入**，
 * 不做一个「填了也存不进去」的表单。
 */
import { Section, Unwired } from './Section';
import { F } from './fields';

export function PromptSection({ data, patch }: { data: any; patch: (p: any) => void; isNew: boolean }) {
  return (
    <Section
      id="sec3" no={3} title="指令与开场白"
      note="进执行 prompt 的只有本区三项；改了名字/描述不影响 run 行为。凭据不写进指令，一律走 6 区环境变量。"
      extra={<span className="chip info">用户层 · 可编辑</span>}
    >
      <div>
        <label style={F.label} htmlFor="agent-sysprompt">系统 Prompt（指令 · 职责 / 边界 / 交付要求）</label>
        <textarea id="agent-sysprompt" aria-label="系统 Prompt" rows={6} value={data.system_prompt || ''}
          onChange={function (e) { patch({ system_prompt: e.target.value }); }}
          style={Object.assign({}, F.mono, { minHeight: 120 })}
          placeholder={'你是一个资深的代码审查员。\n\n核心原则：\n- 逐行审查代码质量和安全性\n- 引用具体行号给出建议'} />
      </div>
      <div style={{ marginTop: 10 }}>
        <label style={F.label} htmlFor="agent-roledef">角色定义（role_def · 性情 / 职责 / 不能做）</label>
        <textarea id="agent-roledef" aria-label="角色定义" rows={4} value={data.role_def || ''}
          onChange={function (e) { patch({ role_def: e.target.value }); }}
          style={Object.assign({}, F.mono, { minHeight: 80 })}
          placeholder={'性情: 严谨、边界思维\n\n职责: 代码审查、安全扫描\n\n不能做: 不直接修改代码'} />
      </div>
      <div style={{ marginTop: 10 }}>
        <label style={F.label} htmlFor="agent-sop">SOP / 调用方式（sop）</label>
        <textarea id="agent-sop" aria-label="SOP" rows={3} value={data.sop || ''}
          onChange={function (e) { patch({ sop: e.target.value }); }}
          style={Object.assign({}, F.mono, { minHeight: 60 })}
          placeholder={'触发: on_project_create\n输入: requirement_doc\n输出: review_report'} />
      </div>

      <Unwired>
        会话开场白（prompts[]，≤3 条 · 每条第 label + prompt 必填）与「平台维护层」（随部署拼接在指令之前的只读段）：
        Agent 表无对应列，`PUT /api/agents/{'{id}'}` 也不收 —— 本区只占位标注，不造示例开场白。
      </Unwired>
    </Section>
  );
}
