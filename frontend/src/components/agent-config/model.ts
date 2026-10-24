/**
 * 十六分区要落库的三块配置（环境变量 / CLI 参数 / MCP）的解析与序列化。
 *
 * 为什么单拎出来：这三块在原型里各有哨兵与校验口径（6 区 `****` 保留哨兵、7 区
 * 一次一行、8 区空 = 清空），而保存时又要同时写进 `model_config_json` 与对应的专用列。
 * 把规则写成纯函数，组件只管渲染，验收用例可以直接盯「提交了什么」。
 */

/** 掩码哨兵：界面显示与提交时都用这一颗（原型 6 区 ④「**** = 未改保留」） */
export const MASK = '****';

export interface EnvRow {
  key: string;
  /** 已存变量的值恒为 MASK，直到用户点「改值」 */
  value: string;
  /** true = 值未被改写，提交时回落到原始值（不把星号存进库） */
  masked: boolean;
}

/** 已存环境变量 → 行（值一律掩码；明文仍在 agent 响应里，只是界面不显示） */
export function envRowsFromEnv(env: unknown): EnvRow[] {
  if (!env || typeof env !== 'object' || Array.isArray(env)) return [];
  return Object.keys(env as Record<string, unknown>).map(function (k) {
    return { key: k, value: MASK, masked: true };
  });
}

/**
 * 行 → 提交用的键值对象。
 *
 * 口径（照原型，不发明）：
 * - 值仍是 MASK → 视为「不改原值」，回落到 original 里的现有值；原来没有这个键就不写；
 * - 键为空 → 跳过（空行不是变量）；
 * - 用户显式留空串 → 是「改成空值」，照写（清空必须是显式动作，不把留空当清空只有 MASK 这一条路）。
 */
export function envPayloadFromRows(rows: EnvRow[], original: unknown): Record<string, string> {
  const prev = (original && typeof original === 'object' && !Array.isArray(original))
    ? original as Record<string, unknown>
    : {};
  const out: Record<string, string> = {};
  for (const r of rows) {
    const key = (r.key || '').trim();
    if (!key) continue;
    if (r.masked && r.value === MASK) {
      if (typeof prev[key] === 'string') out[key] = prev[key] as string;
      continue;
    }
    out[key] = r.value;
  }
  return out;
}

/** 已存 CLI 参数（数组）→ 行；顺序即 argv 追加顺序 */
export function cliArgsFromList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(function (x) { return String(x); }) : [];
}

/** 行 → 提交用数组：只丢空行，**不 trim 值**（值含空格仍是单个字面量，原型 7 区明确不拆） */
export function cliArgsPayload(items: string[]): string[] {
  return items.filter(function (s) { return (s || '').length > 0; });
}

/** MCP 配置 → 编辑器文本（空 / null 都是空串） */
export function mcpTextFrom(value: unknown): string {
  if (value === null || value === undefined) return '';
  try {
    return JSON.stringify(value, null, 2);
  } catch (e) {
    return '';
  }
}

/**
 * 编辑器文本 → MCP 配置。
 * 空串 = 「清空」（原型 8 区 ②，落库 null）；JSON 不合法则**拦住保存**（fail-closed，
 * 不把半截 JSON 当配置存下去，也不静默丢掉）。
 */
export function parseMcpText(text: string): { ok: true; value: any } | { ok: false; error: string } {
  if (!text || !text.trim()) return { ok: true, value: null };
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (e: any) {
    return { ok: false, error: (e && e.message) ? String(e.message) : String(e) };
  }
}

/** 只读值渲染口径：null / undefined / 空串统一显示为给用户看的占位 */
export function showValue(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  return String(v);
}
