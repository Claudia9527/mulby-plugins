import type { VibeContract } from '../lib/vibeContract'

export type VibeSessionState = 'initial' | 'contract' | 'generating' | 'ready' | 'error'

export interface VibeMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  /** 用户消息的识别意图（ask/create/modify/run/package/rollback），用于 UI 标签与纠正 */
  intent?: string
  /** assistant 消息：本回合内联的操作明细（由 timeline 事件汇总而来） */
  actions?: VibeAction[]
}

export interface VibeAction {
  /** 事件类别：read/write/build/load/error/note/ai */
  kind: string
  /** 一句话动作描述 */
  text: string
  /** 可选补充（如字节数、命中数） */
  detail?: string
}

export interface VibeSession {
  id: string
  pluginPath: string
  pluginName: string

  state: VibeSessionState
  contract: VibeContract | null

  messages: VibeMessage[]
  contextSummary: string

  sentence: string
  vibeMode: 'create' | 'edit'
  genDepth: 'full' | 'minimal'
  selectedModel: string

  createdAt: number
  lastActiveAt: number
  lastCommitHash?: string
}

/** 头脑风暴阶段：AI 为模糊需求发散出的候选插件方向 */
export interface BrainstormOption {
  title: string
  pitch: string
  trigger?: string
}

export interface SessionStorageStats {
  count: number
  totalBytes: number
  sessions: Array<{ id: string; name: string; bytes: number; lastActiveAt: number }>
}

export const MAX_SESSIONS = 20
// 每个会话持久化保留的最近消息条数。运行期内存里保留全部消息，
// 这里仅限制写入存储/重载后的上限——调大以便重新打开插件后仍能延续对话上下文。
export const MAX_MESSAGES_PERSISTED = 40
