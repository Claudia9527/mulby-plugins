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

/**
 * Reorder tabs by moving `fromId` next to `toId`. `before` chooses the left
 * (true) or right (false) side of the target — the drop indicator side. Returns
 * a new array, or the original when ids are equal / missing (no-op).
 */
export function moveTab(tabs: EditorTab[], fromId: string, toId: string, before: boolean): EditorTab[] {
  if (fromId === toId) {
    return tabs
  }
  const from = tabs.find((tab) => tab.id === fromId)
  if (!from) {
    return tabs
  }
  const without = tabs.filter((tab) => tab.id !== fromId)
  const targetIndex = without.findIndex((tab) => tab.id === toId)
  if (targetIndex < 0) {
    return tabs
  }
  const insertAt = before ? targetIndex : targetIndex + 1
  return [...without.slice(0, insertAt), from, ...without.slice(insertAt)]
}

/**
 * Partition `ids` into tabs safe to close now (clean) and tabs kept open because
 * they have unsaved edits (dirty). Used by close-others / close-all so a batch
 * close never silently discards unsaved work.
 */
export function splitClosableTabs(
  tabs: EditorTab[],
  ids: string[]
): { closable: string[]; dirty: string[] } {
  const wanted = new Set(ids)
  const closable: string[] = []
  const dirty: string[] = []
  for (const tab of tabs) {
    if (!wanted.has(tab.id)) {
      continue
    }
    if (isTabDirty(tab)) {
      dirty.push(tab.id)
    } else {
      closable.push(tab.id)
    }
  }
  return { closable, dirty }
}

/**
 * Remove `closeIds` from `tabs` and pick the next active tab. The active tab
 * stays active when it survives; otherwise `preferActiveId` wins when it
 * survives, else the nearest neighbor after (then before) the old active
 * position. Returns `nextActiveId: null` when nothing remains (the caller then
 * opens a fresh blank tab).
 */
export function applyCloseTabs(
  tabs: EditorTab[],
  closeIds: string[],
  activeId: string,
  preferActiveId?: string
): { remaining: EditorTab[]; nextActiveId: string | null } {
  const closeSet = new Set(closeIds)
  const remaining = tabs.filter((tab) => !closeSet.has(tab.id))
  if (remaining.length === 0) {
    return { remaining, nextActiveId: null }
  }
  if (!closeSet.has(activeId)) {
    return { remaining, nextActiveId: activeId }
  }
  if (preferActiveId && remaining.some((tab) => tab.id === preferActiveId)) {
    return { remaining, nextActiveId: preferActiveId }
  }
  const oldIndex = tabs.findIndex((tab) => tab.id === activeId)
  const after = tabs.slice(oldIndex + 1).find((tab) => !closeSet.has(tab.id))
  const before = [...tabs.slice(0, Math.max(0, oldIndex))].reverse().find((tab) => !closeSet.has(tab.id))
  return { remaining, nextActiveId: (after ?? before ?? remaining[0]).id }
}
