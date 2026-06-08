import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  flattenTree,
  type ChildrenByDir,
  type FsEntry,
  type TreeRow
} from '../services/fileTree'
import {
  addRecent,
  normalizeRecent,
  removeRecent as removeRecentEntry,
  type RecentEntry
} from '../services/recentFiles'
import {
  basename,
  dirname,
  ensureMarkdownName,
  isSameOrInside,
  validateName
} from '../services/filePath'
import { getFsBridge, isFsBridgeAvailable } from '../services/fsBridge'

const STORAGE_FM_ROOT = 'fm:markdown-editor:root:v1'
const STORAGE_FM_EXPANDED = 'fm:markdown-editor:expanded:v1'
const STORAGE_FM_RECENTS = 'fm:markdown-editor:recents:v1'

interface ExplorerStorage {
  get: (key: string) => Promise<unknown>
  set: (key: string, value: unknown) => Promise<void>
  remove: (key: string) => Promise<void>
}

interface ExplorerDialog {
  showOpenDialog: (options?: {
    title?: string
    defaultPath?: string
    buttonLabel?: string
    filters?: { name: string; extensions: string[] }[]
    properties?: ('openFile' | 'openDirectory' | 'multiSelections' | 'showHiddenFiles')[]
  }) => Promise<unknown>
  showMessageBox?: (options: {
    type?: 'none' | 'info' | 'error' | 'question' | 'warning'
    title?: string
    message: string
    detail?: string
    buttons?: string[]
    defaultId?: number
    cancelId?: number
  }) => Promise<{ response: number; checkboxChecked: boolean }>
}

interface ExplorerNotification {
  show: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void
}

interface ExplorerClipboard {
  writeText: (text: string) => Promise<void>
}

interface ExplorerDeps {
  storage: ExplorerStorage
  dialog: ExplorerDialog
  notification: ExplorerNotification
  clipboard: ExplorerClipboard
  /** Called after a rename so the editor can re-bind the active file path. */
  onFileRenamed?: (oldPath: string, newPath: string) => void
  /** Called after a delete so the editor can detach if the active file went away. */
  onFileDeleted?: (path: string) => void
}

function firstDirFromDialog(result: unknown): string | undefined {
  if (Array.isArray(result) && typeof result[0] === 'string') {
    return result[0]
  }
  if (result && typeof result === 'object' && 'filePaths' in result) {
    const paths = (result as { filePaths?: string[] }).filePaths
    if (Array.isArray(paths) && typeof paths[0] === 'string') {
      return paths[0]
    }
  }
  return undefined
}

/** Transient inline rename / create-input state shown in the tree. */
export interface InlineEdit {
  mode: 'create-file' | 'create-folder' | 'rename'
  parentDir: string
  targetPath?: string
  initialName: string
  isDirectory?: boolean
}

/** Cut/copy clipboard entry for paste. */
export interface ClipEntry {
  path: string
  name: string
  isDirectory: boolean
  op: 'cut' | 'copy'
}

export interface FileExplorerState {
  available: boolean
  rootPath: string | null
  rows: TreeRow[]
  recents: RecentEntry[]
  loading: boolean
  showOnlyMarkdown: boolean
  inlineEdit: InlineEdit | null
  openFolder: () => Promise<void>
  openRootPath: (path: string) => Promise<void>
  toggleDir: (path: string) => Promise<void>
  refresh: () => Promise<void>
  closeFolder: () => void
  noteRecentFile: (path: string) => void
  removeRecent: (path: string) => void
  clearRecents: () => void
  beginCreate: (kind: 'file' | 'folder', dir?: string) => Promise<void>
  beginRename: (entry: FsEntry) => void
  cancelInline: () => void
  commitInline: (
    name: string
  ) => Promise<{ kind: 'create-file' | 'create-folder' | 'rename'; path: string } | null>
  deleteEntry: (entry: FsEntry) => Promise<void>
  reveal: (path: string) => Promise<void>
  copyPath: (path: string) => Promise<void>
  clip: ClipEntry | null
  markCut: (entry: FsEntry) => void
  markCopy: (entry: FsEntry) => void
  pasteInto: (destDir: string) => Promise<void>
  moveEntry: (src: FsEntry, destDir: string) => Promise<string | null>
  duplicateEntry: (entry: FsEntry) => Promise<string | null>
}

/**
 * Owns the file-explorer tree state: the workspace root, lazily-loaded children
 * keyed by directory, the expanded set, and the recent files/folders list — all
 * persisted to storage. File IO goes through the preload fs bridge so paths that
 * never came from a native dialog are still readable.
 */
export function useFileExplorer({
  storage,
  dialog,
  notification,
  clipboard,
  onFileRenamed,
  onFileDeleted
}: ExplorerDeps): FileExplorerState {
  const [available] = useState(() => isFsBridgeAvailable())
  const [rootPath, setRootPath] = useState<string | null>(null)
  const [childrenByDir, setChildrenByDir] = useState<ChildrenByDir>({})
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const [recents, setRecents] = useState<RecentEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [inlineEdit, setInlineEdit] = useState<InlineEdit | null>(null)
  const [clip, setClip] = useState<ClipEntry | null>(null)
  // P1 ships markdown-only per product decision; kept as state for a future toggle.
  const [showOnlyMarkdown] = useState(true)

  const expandedRef = useRef(expanded)
  expandedRef.current = expanded
  const recentsRef = useRef(recents)
  recentsRef.current = recents
  const clipRef = useRef(clip)
  clipRef.current = clip
  const childrenByDirRef = useRef(childrenByDir)
  childrenByDirRef.current = childrenByDir
  const watchersRef = useRef<Map<string, () => void>>(new Map())

  const persistExpanded = useCallback(
    (next: Set<string>) => {
      void storage.set(STORAGE_FM_EXPANDED, Array.from(next)).catch(() => undefined)
    },
    [storage]
  )

  const persistRecents = useCallback(
    (next: RecentEntry[]) => {
      void storage.set(STORAGE_FM_RECENTS, next).catch(() => undefined)
    },
    [storage]
  )

  const loadDir = useCallback(
    async (dir: string): Promise<FsEntry[] | null> => {
      if (!isFsBridgeAvailable()) {
        return null
      }
      try {
        const entries = await getFsBridge().list(dir)
        setChildrenByDir((prev) => ({ ...prev, [dir]: entries }))
        return entries
      } catch (error) {
        console.error('[markdown-editor] loadDir', dir, error)
        return null
      }
    },
    []
  )

  const noteRecentFolder = useCallback(
    (path: string) => {
      const next = addRecent(recentsRef.current, { path, name: basename(path), kind: 'folder', at: Date.now() })
      setRecents(next)
      persistRecents(next)
    },
    [persistRecents]
  )

  const noteRecentFile = useCallback(
    (path: string) => {
      const next = addRecent(recentsRef.current, { path, name: basename(path), kind: 'file', at: Date.now() })
      setRecents(next)
      persistRecents(next)
    },
    [persistRecents]
  )

  const openRootPath = useCallback(
    async (path: string) => {
      setLoading(true)
      try {
        setRootPath(path)
        setExpanded(new Set())
        setChildrenByDir({})
        await loadDir(path)
        void storage.set(STORAGE_FM_ROOT, path).catch(() => undefined)
        void storage.set(STORAGE_FM_EXPANDED, []).catch(() => undefined)
        noteRecentFolder(path)
      } finally {
        setLoading(false)
      }
    },
    [loadDir, noteRecentFolder, storage]
  )

  const openFolder = useCallback(async () => {
    if (!available) {
      notification.show('文件系统桥未就绪，请重载插件', 'warning')
      return
    }
    try {
      const result = await dialog.showOpenDialog({
        title: '打开文件夹',
        properties: ['openDirectory']
      })
      const dir = firstDirFromDialog(result)
      if (!dir) {
        return
      }
      await openRootPath(dir)
    } catch (error) {
      console.error('[markdown-editor] openFolder', error)
      notification.show('打开文件夹失败', 'error')
    }
  }, [available, dialog, notification, openRootPath])

  const toggleDir = useCallback(
    async (path: string) => {
      const isOpen = expandedRef.current.has(path)
      const next = new Set(expandedRef.current)
      if (isOpen) {
        next.delete(path)
        setExpanded(next)
        persistExpanded(next)
        return
      }
      next.add(path)
      setExpanded(next)
      persistExpanded(next)
      if (!childrenByDir[path]) {
        await loadDir(path)
      }
    },
    [childrenByDir, loadDir, persistExpanded]
  )

  const refresh = useCallback(async () => {
    if (!rootPath) {
      return
    }
    setLoading(true)
    try {
      // Re-list the root plus every currently-loaded directory still in the tree.
      const dirs = [rootPath, ...Object.keys(childrenByDir).filter((d) => d !== rootPath)]
      await Promise.all(dirs.map((dir) => loadDir(dir)))
    } finally {
      setLoading(false)
    }
  }, [childrenByDir, loadDir, rootPath])

  const closeFolder = useCallback(() => {
    setRootPath(null)
    setChildrenByDir({})
    setExpanded(new Set())
    void storage.remove(STORAGE_FM_ROOT).catch(() => undefined)
    void storage.remove(STORAGE_FM_EXPANDED).catch(() => undefined)
  }, [storage])

  const removeRecent = useCallback(
    (path: string) => {
      const next = removeRecentEntry(recentsRef.current, path)
      setRecents(next)
      persistRecents(next)
    },
    [persistRecents]
  )

  const clearRecents = useCallback(() => {
    setRecents([])
    persistRecents([])
  }, [persistRecents])

  // Drop cached children + expanded flags for a directory subtree (after a
  // delete/rename so stale paths don't linger in the tree).
  const pruneUnder = useCallback((target: string) => {
    setChildrenByDir((prev) => {
      const next: ChildrenByDir = {}
      for (const [dir, entries] of Object.entries(prev)) {
        if (dir !== target && !isSameOrInside(target, dir)) {
          next[dir] = entries
        }
      }
      return next
    })
    setExpanded((prev) => {
      const next = new Set<string>()
      prev.forEach((p) => {
        if (p !== target && !isSameOrInside(target, p)) {
          next.add(p)
        }
      })
      return next
    })
  }, [])

  const beginCreate = useCallback(
    async (kind: 'file' | 'folder', dir?: string) => {
      const parentDir = dir ?? rootPath
      if (!parentDir) {
        return
      }
      // Ensure the target directory is expanded + loaded so the inline input shows.
      if (parentDir !== rootPath && !expandedRef.current.has(parentDir)) {
        const next = new Set(expandedRef.current)
        next.add(parentDir)
        setExpanded(next)
        persistExpanded(next)
      }
      if (parentDir !== rootPath && !childrenByDir[parentDir]) {
        await loadDir(parentDir)
      }
      setInlineEdit({
        mode: kind === 'file' ? 'create-file' : 'create-folder',
        parentDir,
        initialName: ''
      })
    },
    [childrenByDir, loadDir, persistExpanded, rootPath]
  )

  const beginRename = useCallback((entry: FsEntry) => {
    setInlineEdit({
      mode: 'rename',
      parentDir: dirname(entry.path),
      targetPath: entry.path,
      initialName: entry.name,
      isDirectory: entry.isDirectory
    })
  }, [])

  const cancelInline = useCallback(() => {
    setInlineEdit(null)
  }, [])

  const commitInline = useCallback(
    async (rawName: string) => {
      const edit = inlineEdit
      if (!edit) {
        return null
      }
      const trimmed = rawName.trim()
      if (!trimmed) {
        setInlineEdit(null)
        return null
      }
      const finalName = edit.mode === 'create-file' ? ensureMarkdownName(trimmed) : trimmed
      const invalid = validateName(finalName)
      if (invalid) {
        notification.show(invalid, 'warning')
        return null
      }
      try {
        const bridge = getFsBridge()
        if (edit.mode === 'create-file') {
          const path = await bridge.createFile(edit.parentDir, finalName, '')
          await loadDir(edit.parentDir)
          setInlineEdit(null)
          return { kind: 'create-file' as const, path }
        }
        if (edit.mode === 'create-folder') {
          const path = await bridge.createDir(edit.parentDir, finalName)
          await loadDir(edit.parentDir)
          setInlineEdit(null)
          return { kind: 'create-folder' as const, path }
        }
        // rename
        if (!edit.targetPath || finalName === edit.initialName) {
          setInlineEdit(null)
          return null
        }
        const newPath = await bridge.rename(edit.targetPath, finalName)
        if (edit.isDirectory) {
          pruneUnder(edit.targetPath)
        }
        await loadDir(edit.parentDir)
        onFileRenamed?.(edit.targetPath, newPath)
        const hit = recentsRef.current.find((r) => r.path === edit.targetPath)
        if (hit) {
          const updated = recentsRef.current.map((r) =>
            r.path === edit.targetPath ? { ...r, path: newPath, name: basename(newPath) } : r
          )
          setRecents(updated)
          persistRecents(updated)
        }
        setInlineEdit(null)
        return { kind: 'rename' as const, path: newPath }
      } catch (error) {
        console.error('[markdown-editor] commitInline', error)
        notification.show(error instanceof Error ? error.message : '操作失败', 'error')
        return null
      }
    },
    [inlineEdit, loadDir, notification, onFileRenamed, persistRecents, pruneUnder]
  )

  const deleteEntry = useCallback(
    async (entry: FsEntry) => {
      const confirm = dialog.showMessageBox
        ? await dialog.showMessageBox({
            type: 'warning',
            title: '移到废纸篓',
            message: `确定要把「${entry.name}」移到废纸篓吗？`,
            detail: entry.isDirectory ? '该文件夹及其内容都会被移到废纸篓。' : undefined,
            buttons: ['移到废纸篓', '取消'],
            defaultId: 0,
            cancelId: 1
          })
        : { response: 0, checkboxChecked: false }
      if (confirm.response !== 0) {
        return
      }
      try {
        await getFsBridge().trash(entry.path)
        if (entry.isDirectory) {
          pruneUnder(entry.path)
        }
        await loadDir(dirname(entry.path))
        const nextRecents = recentsRef.current.filter(
          (r) => r.path !== entry.path && !isSameOrInside(entry.path, r.path)
        )
        if (nextRecents.length !== recentsRef.current.length) {
          setRecents(nextRecents)
          persistRecents(nextRecents)
        }
        onFileDeleted?.(entry.path)
        notification.show('已移到废纸篓', 'success')
      } catch (error) {
        console.error('[markdown-editor] deleteEntry', error)
        notification.show(error instanceof Error ? error.message : '删除失败', 'error')
      }
    },
    [dialog, loadDir, notification, onFileDeleted, persistRecents, pruneUnder]
  )

  const reveal = useCallback(async (path: string) => {
    try {
      await getFsBridge().reveal(path)
    } catch (error) {
      console.error('[markdown-editor] reveal', error)
    }
  }, [])

  const copyPath = useCallback(
    async (path: string) => {
      try {
        await clipboard.writeText(path)
        notification.show('已复制路径', 'success')
      } catch (error) {
        console.error('[markdown-editor] copyPath', error)
      }
    },
    [clipboard, notification]
  )

  const markCut = useCallback((entry: FsEntry) => {
    setClip({ path: entry.path, name: entry.name, isDirectory: entry.isDirectory, op: 'cut' })
  }, [])

  const markCopy = useCallback((entry: FsEntry) => {
    setClip({ path: entry.path, name: entry.name, isDirectory: entry.isDirectory, op: 'copy' })
  }, [])

  const moveEntry = useCallback(
    async (src: FsEntry, destDir: string): Promise<string | null> => {
      const srcParent = dirname(src.path)
      if (srcParent === destDir) {
        return null
      }
      if (src.isDirectory && isSameOrInside(src.path, destDir)) {
        notification.show('不能把文件夹移动到它自己里面', 'warning')
        return null
      }
      try {
        const newPath = await getFsBridge().move(src.path, destDir)
        if (src.isDirectory) {
          pruneUnder(src.path)
        }
        await Promise.all([loadDir(srcParent), loadDir(destDir)])
        onFileRenamed?.(src.path, newPath)
        const hit = recentsRef.current.find((r) => r.path === src.path)
        if (hit) {
          const updated = recentsRef.current.map((r) =>
            r.path === src.path ? { ...r, path: newPath, name: basename(newPath) } : r
          )
          setRecents(updated)
          persistRecents(updated)
        }
        return newPath
      } catch (error) {
        console.error('[markdown-editor] moveEntry', error)
        notification.show(error instanceof Error ? error.message : '移动失败', 'error')
        return null
      }
    },
    [loadDir, notification, onFileRenamed, persistRecents, pruneUnder]
  )

  const pasteInto = useCallback(
    async (destDir: string) => {
      const c = clipRef.current
      if (!c) {
        return
      }
      if (c.op === 'cut') {
        const moved = await moveEntry(
          { path: c.path, name: c.name, isDirectory: c.isDirectory, isFile: !c.isDirectory },
          destDir
        )
        if (moved) {
          setClip(null)
        }
        return
      }
      if (c.isDirectory && isSameOrInside(c.path, destDir)) {
        notification.show('不能把文件夹复制到它自己里面', 'warning')
        return
      }
      try {
        await getFsBridge().copy(c.path, destDir)
        await loadDir(destDir)
        notification.show('已复制', 'success')
      } catch (error) {
        console.error('[markdown-editor] pasteInto', error)
        notification.show(error instanceof Error ? error.message : '复制失败', 'error')
      }
    },
    [loadDir, moveEntry, notification]
  )

  const duplicateEntry = useCallback(
    async (entry: FsEntry): Promise<string | null> => {
      try {
        const newPath = await getFsBridge().duplicate(entry.path)
        await loadDir(dirname(entry.path))
        return newPath
      } catch (error) {
        console.error('[markdown-editor] duplicateEntry', error)
        notification.show(error instanceof Error ? error.message : '创建副本失败', 'error')
        return null
      }
    },
    [loadDir, notification]
  )

  // Restore persisted root + expanded set + recents on mount.
  useEffect(() => {
    if (!available) {
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const [savedRoot, savedExpanded, savedRecents] = await Promise.all([
          storage.get(STORAGE_FM_ROOT),
          storage.get(STORAGE_FM_EXPANDED),
          storage.get(STORAGE_FM_RECENTS)
        ])
        if (cancelled) {
          return
        }
        setRecents(normalizeRecent(savedRecents))

        if (typeof savedRoot === 'string' && savedRoot) {
          const bridge = getFsBridge()
          const exists = await bridge.exists(savedRoot)
          if (cancelled || !exists) {
            return
          }
          setRootPath(savedRoot)
          await loadDir(savedRoot)
          // Restore expanded dirs that still exist, loading their children.
          if (Array.isArray(savedExpanded)) {
            const dirs = savedExpanded.filter((d): d is string => typeof d === 'string')
            const restored = new Set<string>()
            await Promise.all(
              dirs.map(async (dir) => {
                if (await bridge.exists(dir)) {
                  restored.add(dir)
                  await loadDir(dir)
                }
              })
            )
            if (!cancelled) {
              setExpanded(restored)
            }
          }
        }
      } catch (error) {
        console.error('[markdown-editor] restore explorer', error)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [available, loadDir, storage])

  // Watch all loaded directories so external file changes refresh the tree.
  // Keyed by the SET of loaded dirs so value-only refreshes don't churn watchers.
  const loadedDirsKey = useMemo(() => Object.keys(childrenByDir).sort().join('\n'), [childrenByDir])
  useEffect(() => {
    if (!available) {
      return
    }
    const desired = new Set(Object.keys(childrenByDirRef.current))
    const watchers = watchersRef.current
    for (const [dir, dispose] of Array.from(watchers.entries())) {
      if (!desired.has(dir)) {
        dispose()
        watchers.delete(dir)
      }
    }
    for (const dir of desired) {
      if (!watchers.has(dir)) {
        try {
          const dispose = getFsBridge().watch(dir, (changed) => {
            void loadDir(changed)
          })
          watchers.set(dir, dispose)
        } catch (error) {
          console.error('[markdown-editor] watch', dir, error)
        }
      }
    }
  }, [available, loadedDirsKey, loadDir])

  useEffect(
    () => () => {
      watchersRef.current.forEach((dispose) => dispose())
      watchersRef.current.clear()
    },
    []
  )

  const rows = useMemo(
    () => (rootPath ? flattenTree(rootPath, childrenByDir, expanded, { showOnlyMarkdown }) : []),
    [rootPath, childrenByDir, expanded, showOnlyMarkdown]
  )

  return {
    available,
    rootPath,
    rows,
    recents,
    loading,
    showOnlyMarkdown,
    inlineEdit,
    openFolder,
    openRootPath,
    toggleDir,
    refresh,
    closeFolder,
    noteRecentFile,
    removeRecent,
    clearRecents,
    beginCreate,
    beginRename,
    cancelInline,
    commitInline,
    deleteEntry,
    reveal,
    copyPath,
    clip,
    markCut,
    markCopy,
    pasteInto,
    moveEntry,
    duplicateEntry
  }
}
