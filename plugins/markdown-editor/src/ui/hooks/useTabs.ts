import { useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react'
import type { EditorState } from '@codemirror/state'
import { createBlankTab, type EditorTab } from '../services/tabs'

/** Per-tab CodeMirror snapshot: full editor state (history + selection) + scroll. */
export interface TabSnapshot {
  state: EditorState
  scrollTop: number
}

export interface TabsController {
  tabs: EditorTab[]
  setTabs: Dispatch<SetStateAction<EditorTab[]>>
  activeTabId: string
  setActiveTabId: Dispatch<SetStateAction<string>>
  /** Latest tabs/active id, for reads inside callbacks (avoids stale closures). */
  tabsRef: MutableRefObject<EditorTab[]>
  activeTabIdRef: MutableRefObject<string>
  /** Editor state snapshots, keyed by tab id (kept out of React state). */
  snapshotsRef: MutableRefObject<Map<string, TabSnapshot>>
}

/**
 * Owns the tab registry: the tabs array, the active id, and the per-tab editor
 * state snapshots. Editor orchestration (snapshot on leave, swap on enter) lives
 * in App, which drives the single CodeMirror view through these primitives.
 */
export function useTabs(): TabsController {
  const [tabs, setTabs] = useState<EditorTab[]>(() => [createBlankTab()])
  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0].id)
  const tabsRef = useRef(tabs)
  const activeTabIdRef = useRef(activeTabId)
  const snapshotsRef = useRef<Map<string, TabSnapshot>>(new Map())
  tabsRef.current = tabs
  activeTabIdRef.current = activeTabId
  return { tabs, setTabs, activeTabId, setActiveTabId, tabsRef, activeTabIdRef, snapshotsRef }
}
