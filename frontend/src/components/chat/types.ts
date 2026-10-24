/**
 * 对话中心的视图类型（单一事实源）。
 *
 * 为什么单独一个文件：`Message` / `Conversation` 既要被 store 用、又要被 ChatWindow 与
 * 拆分出来的 chat/* 组件用。此前它们写死在 ChatWindow.tsx 与 stores/chat.ts 两处，
 * 语义类拆件后会出现第三处副本；这里收口成一份，ChatWindow 只做 `export type` 转发
 * （既有用例仍可 `import type { Message } from '../components/ChatWindow'`）。
 */

export type ChatRole = 'user' | 'agent' | 'system';

/** 一条对话消息。**一条消息 = 一个 run**，所以 run 的状态就挂在这条消息上。 */
export interface Message {
  id: number;
  role: ChatRole;
  content: string;
  /**
   * 后端 `messages.status`（`models/message.py:MSG_STATUSES = pending/processing/done/error`）。
   * 保留原始字符串而不是收窄成枚举：后端加状态值时页面不该崩，映射见 chatSemantics.runStateOf。
   */
  status: string;
  created_at: string;
  /**
   * run 标识。后端 messages 表暂无 run_id 列 → 可空，缺省由消息 id 承载
   * （见 chatSemantics.runLabel / RUN_ID_NOTE）。后端补列后无需改页面。
   */
  run_id?: string | null;
  /** 失败原因。后端 `chat_service` 只把原始 error 放在响应体，消息行本身可空 → 可空。 */
  failure_reason?: string | null;
}

export interface Conversation {
  id: number;
  agent_id: number;
  owner_id: string;
  channel_type: string;
  title: string;
  last_message?: Message | null;
  created_at: string;
  updated_at: string;
  /**
   * 归档时间。**后端会话表暂无该列**（`models/conversation.py`），因此页面在缺列时
   * 不进入只读态、只把「归档 = 只读」的门禁口径常驻可见。列/端点补齐后自动生效。
   */
  archived_at?: string | null;
}

/** 会话列表/切换器需要的 Agent 最小字段（`GET /api/agents` 的 to_dict 子集）。 */
export interface AgentLite {
  id: number;
  name: string;
  status?: string;
  runtime?: string;
  model_name?: string;
}

/** 运行时注册表行（`GET /api/runtimes`，services/runtime_registry.list_runtimes）。 */
export interface RuntimeLite {
  id: number;
  cli: string;
  status: 'online' | 'offline';
  machine_name?: string;
}

/** 项目最小字段（`GET /api/projects` 的 to_dict 子集）。 */
export interface ProjectLite {
  id: number;
  name: string;
  description?: string;
  status?: string;
}
