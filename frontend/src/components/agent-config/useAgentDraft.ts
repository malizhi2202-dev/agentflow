/**
 * Agent 草稿的唯一容器层（change: v26-agent-ui，从 AgentConfigEditor 整体搬家）
 *
 * 为什么提到壳层：详情/创建 tab 化后，「能力」「设置」两栏各自切子栏、还可能跳概览/工作——
 * 草稿态若在渲染面或某个 pane 里，切换即卸载、改动即蒸发，CFG-06「一次 PUT + 双写六键」的
 * 口径会当场崩。**受控态只能住在永不卸载的壳层**（AgentDetail 本文件调用、把 draft 传下去）。
 *
 * 口径不变：保存必须一次提交（常规字段 + model_config_json 三键 + 专用列双写一起 PUT）；
 * 「放弃改动」只复位三块受控态（常规字段与即时落库的东西本就不归它管——延续现状）。
 * dirty 是粗记号（碰过即真），不做字段级 diff、不做切栏拦截：pane 切换不弃态，
 * 唯一失态路径是离开详情页（卸载即弃，与改造前一致）。
 */
import { useState } from 'react';
import {
  envRowsFromEnv, envPayloadFromRows, cliArgsFromList, cliArgsPayload,
  mcpTextFrom, parseMcpText,
} from './model';
import type { EnvRow } from './model';

/** 已存配置的三个来源：专用列优先，回落到 model_config_json 里同名块（两处都写，读时任意一处命中即可） */
function initialEnv(agent: any): EnvRow[] {
  const byColumn = agent && agent.custom_env;
  const byJson = agent && agent.model_config_json && agent.model_config_json.env_vars;
  return envRowsFromEnv(byColumn && Object.keys(byColumn).length ? byColumn : byJson);
}
function initialCli(agent: any): string[] {
  const byColumn = agent && agent.custom_args;
  const byJson = agent && agent.model_config_json && agent.model_config_json.cli_args;
  return cliArgsFromList(Array.isArray(byColumn) ? byColumn : byJson);
}
function initialMcp(agent: any): any {
  if (agent && agent.mcp_config !== undefined && agent.mcp_config !== null) return agent.mcp_config;
  const byJson = agent && agent.model_config_json && agent.model_config_json.mcp_servers;
  return byJson === undefined ? null : byJson;
}

export interface AgentDraft {
  envRows: EnvRow[];
  setEnvRows: (v: EnvRow[] | ((p: EnvRow[]) => EnvRow[])) => void;
  cliArgs: string[];
  setCliArgs: (v: string[] | ((p: string[]) => string[])) => void;
  mcpText: string;
  setMcpText: (v: string) => void;
  mcpError: string | null;
  localError: string | null;
  saving: boolean;
  savedAt: string | null;
  dirty: boolean;
  /** 常规字段（壳层 data）被碰过也要标 dirty——由壳层 patch 调用 */
  touch: () => void;
  reset: () => void;
  /**
   * 一次提交：常规字段 + `model_config_json` 三键（env_vars / cli_args / mcp_servers）一起 PUT。
   *
   * 双写口径（为什么要同时写专用列）：`PUT /api/agents/{id}` 的白名单里既有 `model_config_json`
   * 也有 `custom_env / custom_args / mcp_config`；前者是通用配置块，后者是 v23 迁移建的专用列
   * （其它页面/后端服务读的是它）。只写一边会造成「本页可见、别处不生效」，所以两边同源同值。
   */
  commit: (data: any, onSave: (payload: any) => void) => Promise<void>;
}

export function useAgentDraft(agent: any): AgentDraft {
  const agentId: number | undefined = agent && agent.id ? agent.id : undefined;

  const [envRows, _setEnvRows] = useState<EnvRow[]>(function () { return initialEnv(agent); });
  const [cliArgs, _setCliArgs] = useState<string[]>(function () { return initialCli(agent); });
  const [mcpText, _setMcpText] = useState<string>(function () { return mcpTextFrom(initialMcp(agent)); });
  const [mcpError, setMcpError] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const touch = function () { setDirty(true); };
  const setEnvRows = function (v: any) { touch(); _setEnvRows(v); };
  const setCliArgs = function (v: any) { touch(); _setCliArgs(v); };
  const setMcpText = function (v: string) { touch(); _setMcpText(v); };

  function reset() {
    _setEnvRows(initialEnv(agent));
    _setCliArgs(initialCli(agent));
    _setMcpText(mcpTextFrom(initialMcp(agent)));
    setMcpError(null);
    setLocalError(null);
    setDirty(false);
  }

  async function commit(data: any, onSave: (payload: any) => void) {
    setLocalError(null);
    setSavedAt(null);
    const mcp = parseMcpText(mcpText);
    if (!mcp.ok) {
      // fail-closed：JSON 半截不提交，也不静默丢弃用户已写内容
      setMcpError(mcp.error);
      setLocalError('「8 · MCP 服务绑定」JSON 解析失败：' + mcp.error);
      return;
    }
    setMcpError(null);

    const originEnv = (agent && agent.custom_env && Object.keys(agent.custom_env).length)
      ? agent.custom_env
      : (agent && agent.model_config_json && agent.model_config_json.env_vars);
    const envObj = envPayloadFromRows(envRows, originEnv);
    const argsArr = cliArgsPayload(cliArgs);
    const baseJson = (agent && agent.model_config_json) || {};
    const modelConfigJson = Object.assign({}, baseJson, {
      env_vars: envObj,
      cli_args: argsArr,
      mcp_servers: mcp.value,
    });

    const payload: any = {
      name: data.name || '',
      description: data.description || '',
      runtime: data.runtime || '',
      model_name: data.model_name || '',
      system_prompt: data.system_prompt || '',
      role_def: data.role_def || '',
      sop: data.sop || '',
      token_soft_limit: data.token_soft_limit,
      token_hard_limit: data.token_hard_limit,
      domain_id: (data.domain_id === undefined || data.domain_id === '') ? null : data.domain_id,
      avatar_url: data.avatar_url || '',
      thinking_level: data.thinking_level || '',
      service_tier: data.service_tier || '',
      model_config_json: modelConfigJson,
      custom_env: envObj,
      custom_args: argsArr,
      mcp_config: mcp.value,
    };

    if (agentId) {
      setSaving(true);
      try {
        const res = await fetch('/api/agents/' + agentId, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          // 后端 detail 原样透传（400「不支持的 runtime」/ 404 / 运行中不可删等），不改写成「保存失败」
          const body = await res.json().catch(function () { return { detail: '保存失败 (' + res.status + ')' }; });
          const detail = body && body.detail !== undefined ? body.detail : ('保存失败 (' + res.status + ')');
          setLocalError(typeof detail === 'string' ? detail : JSON.stringify(detail));
          return;
        }
      } catch (e: any) {
        setLocalError('保存失败（网络错误）：' + ((e && e.message) || String(e)));
        return;
      } finally {
        setSaving(false);
      }
    }

    // 壳层仍需拿到同一份期望态（列表页用它刷新 / 关闭覆盖态），保持既有 onSave 契约不变
    onSave(payload);
    setDirty(false);
    setSavedAt(new Date().toLocaleTimeString('zh-CN'));
  }

  return {
    envRows, setEnvRows, cliArgs, setCliArgs, mcpText, setMcpText,
    mcpError, localError, saving, savedAt, dirty,
    touch, reset, commit,
  };
}
