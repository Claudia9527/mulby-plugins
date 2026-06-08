// Pure (de)serialization for multi-tab session restore. The active document set
// is persisted so reopening the plugin restores the previous tabs + active tab.
// Clean file tabs store only their path (reloaded from disk on restore); untitled
// and dirty tabs store their content so unsaved work survives a reload.

import type { EditorTab } from './tabs'

export interface PersistedTab {
  filePath: string | null
  /** Live content; null for clean file tabs (content is reloaded from disk). */
  content: string | null
  /** Saved baseline; null for clean file tabs. */
  savedContent: string | null
  savedAt: number | null
}

export interface PersistedSession {
  version: 1
  activeIndex: number
  tabs: PersistedTab[]
}

const SESSION_VERSION = 1

/** Serialize open tabs + the active tab for session restore. */
export function serializeSession(tabs: EditorTab[], activeId: string): PersistedSession {
  const activeIndex = Math.max(0, tabs.findIndex((tab) => tab.id === activeId))
  return {
    version: SESSION_VERSION,
    activeIndex,
    tabs: tabs.map((tab) => {
      const dirty = tab.content !== tab.savedContent
      // Keep content for untitled or dirty tabs (hot-exit); clean file tabs are
      // reloaded from disk, so their content is omitted to keep the blob small.
      const keepContent = !tab.filePath || dirty
      return {
        filePath: tab.filePath,
        content: keepContent ? tab.content : null,
        savedContent: keepContent ? tab.savedContent : null,
        savedAt: tab.savedAt
      }
    })
  }
}

/** Validate persisted session data into a clean PersistedSession (or null). */
export function normalizeSession(value: unknown): PersistedSession | null {
  if (!value || typeof value !== 'object') {
    return null
  }
  const obj = value as Record<string, unknown>
  if (!Array.isArray(obj.tabs)) {
    return null
  }
  const tabs: PersistedTab[] = []
  for (const raw of obj.tabs) {
    if (!raw || typeof raw !== 'object') {
      continue
    }
    const item = raw as Record<string, unknown>
    const filePath = typeof item.filePath === 'string' && item.filePath ? item.filePath : null
    const content = typeof item.content === 'string' ? item.content : null
    const savedContent = typeof item.savedContent === 'string' ? item.savedContent : null
    const savedAt = typeof item.savedAt === 'number' ? item.savedAt : null
    // A tab is only worth restoring if it has a file to reload or some content.
    if (!filePath && content == null) {
      continue
    }
    tabs.push({ filePath, content, savedContent, savedAt })
  }
  if (tabs.length === 0) {
    return null
  }
  const rawIndex = typeof obj.activeIndex === 'number' ? Math.floor(obj.activeIndex) : 0
  const activeIndex = Math.min(Math.max(0, rawIndex), tabs.length - 1)
  return { version: SESSION_VERSION, activeIndex, tabs }
}
