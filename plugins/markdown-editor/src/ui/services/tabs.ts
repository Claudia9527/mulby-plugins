// Pure data model + helpers for the multi-tab editor. The React state and the
// per-tab CodeMirror EditorState snapshots live in hooks/useTabs.ts; everything
// here is side-effect free so it can be unit tested.

export interface EditorTab {
  id: string
  /** Bound file path, or null for an untitled (draft) tab. */
  filePath: string | null
  /** Live markdown mirror — drives the tab title dirty dot and restore on switch. */
  content: string
  /** Saved baseline; a tab is dirty when content !== savedContent. */
  savedContent: string
  savedAt: number | null
}

let tabSeq = 0

/** Monotonic, collision-free tab id (timestamp + counter). */
export function makeTabId(): string {
  tabSeq += 1
  return `tab-${Date.now().toString(36)}-${tabSeq.toString(36)}`
}

/** A fresh untitled, empty, clean tab. */
export function createBlankTab(): EditorTab {
  return { id: makeTabId(), filePath: null, content: '', savedContent: '', savedAt: null }
}

/** Display title: the file name for bound tabs, otherwise "未命名". */
export function deriveTabTitle(tab: Pick<EditorTab, 'filePath'>): string {
  const path = tab.filePath
  if (!path) {
    return '未命名'
  }
  return path.split(/[\\/]/).filter(Boolean).pop() ?? path
}

/** A tab is dirty when its live content diverges from the saved baseline. */
export function isTabDirty(tab: Pick<EditorTab, 'content' | 'savedContent'>): boolean {
  return tab.content !== tab.savedContent
}

/** First tab bound to `path` (used to activate an already-open file). */
export function findTabByPath(tabs: EditorTab[], path: string): EditorTab | undefined {
  return tabs.find((tab) => tab.filePath === path)
}

/**
 * Which tab should become active after `closingId` is removed. Closing a
 * background tab keeps the current active tab; closing the active tab moves to
 * the right neighbor (then the left). Returns null when nothing remains.
 */
export function nextActiveTabId(
  tabs: EditorTab[],
  closingId: string,
  activeId: string
): string | null {
  if (activeId !== closingId) {
    return tabs.some((tab) => tab.id === activeId) ? activeId : tabs[0]?.id ?? null
  }
  const index = tabs.findIndex((tab) => tab.id === closingId)
  if (index < 0) {
    return tabs[0]?.id ?? null
  }
  const neighbor = tabs[index + 1] ?? tabs[index - 1]
  return neighbor ? neighbor.id : null
}
