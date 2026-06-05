import type { VibeContract } from '../lib/vibeContract'

export type VibeSessionState = 'initial' | 'contract' | 'generating' | 'ready' | 'error'

export interface VibeMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  actions?: VibeAction[]
}

export interface VibeAction {
  type: 'file_changed' | 'build' | 'load' | 'error' | 'fix'
  detail: string
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

export interface SessionStorageStats {
  count: number
  totalBytes: number
  sessions: Array<{ id: string; name: string; bytes: number; lastActiveAt: number }>
}

export const MAX_SESSIONS = 20
export const MAX_MESSAGES_PERSISTED = 5
