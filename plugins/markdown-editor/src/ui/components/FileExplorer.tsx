import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import {
  ChevronRight,
  ChevronsDownUp,
  Crosshair,
  File as FileIcon,
  FilePlus,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  RefreshCw,
  X
} from 'lucide-react'
import type { FileExplorerState } from '../hooks/useFileExplorer'
import type { FsEntry, TreeRow } from '../services/fileTree'
import { basename, dirname, isMarkdownFile, isSameOrInside } from '../services/filePath'
import { ContextMenu } from './ContextMenu'
import type { MenuItem } from '../services/contextMenu'

interface FileExplorerProps {
  state: FileExplorerState
  activeFilePath: string | null
  onOpenFile: (path: string) => void
}

const INDENT_BASE = 6
const INDENT_STEP = 14
const ROW_H = 26
// Above this many visible rows the tree windows its rendering for performance.
const VIRTUAL_THRESHOLD = 80
const OVERSCAN = 8

/** Inline text input for renaming / creating an entry directly in the tree. */
function InlineNameInput({
  initialName,
  onCommit,
  onCancel
}: {
  initialName: string
  onCommit: (name: string) => void
  onCancel: () => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  const committed = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) {
      return
    }
    el.focus()
    el.select()
  }, [])

  const commit = () => {
    if (committed.current) {
      return
    }
    committed.current = true
    onCommit(ref.current?.value ?? '')
  }

  return (
    <input
      ref={ref}
      className="fm-inline-input"
      type="text"
      defaultValue={initialName}
      spellCheck={false}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Enter') {
          e.preventDefault()
          commit()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          committed.current = true
          onCancel()
        }
      }}
      onBlur={commit}
      onClick={(e) => e.stopPropagation()}
    />
  )
}

/**
 * VS Code / Obsidian-style file tree sidebar: recent list + lazily-loaded
 * workspace tree with inline create/rename, themed right-click menu, drag-drop
 * move, keyboard navigation, and windowed rendering for large trees. File IO is
 * owned by the explorer hook.
 */
export function FileExplorer({ state, activeFilePath, onOpenFile }: FileExplorerProps) {
  const [recentOpen, setRecentOpen] = useState(true)
  const [menu, setMenu] = useState<{ x: number; y: number; entry: FsEntry | null; isRoot: boolean } | null>(
    null
  )
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const [focusedPath, setFocusedPath] = useState<string | null>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportH, setViewportH] = useState(480)
  const dragSrcRef = useRef<FsEntry | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const typeaheadRef = useRef<{ buffer: string; at: number }>({ buffer: '', at: 0 })

  const edit = state.inlineEdit
  const rows = state.rows
  const roots = state.roots
  const pinnedRoot = state.pinnedRoot
  const hasRoots = roots.length > 0

  // Measure the scroll viewport so virtualization knows how many rows fit.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) {
      return
    }
    setViewportH(el.clientHeight)
    const ro = new ResizeObserver(() => setViewportH(el.clientHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [hasRoots])

  // Keep keyboard focus aligned with the active file when it changes externally.
  useEffect(() => {
    if (activeFilePath) {
      setFocusedPath(activeFilePath)
    }
  }, [activeFilePath])

  // Scroll the active file into view when it (or the visible set) changes.
  useEffect(() => {
    if (!activeFilePath) {
      return
    }
    const idx = rows.findIndex((r) => r.entry.path === activeFilePath)
    const el = scrollRef.current
    if (idx < 0 || !el) {
      return
    }
    const top = idx * ROW_H
    if (top < el.scrollTop || top + ROW_H > el.scrollTop + el.clientHeight) {
      el.scrollTop = Math.max(0, top - el.clientHeight / 2)
    }
  }, [activeFilePath, rows])

  const handleCommit = (name: string) => {
    void state.commitInline(name).then((result) => {
      if (result?.kind === 'create-file') {
        onOpenFile(result.path)
      }
    })
  }

  const createDirFor = (entry: FsEntry | null): string | undefined => {
    if (!entry) {
      return undefined // let the hook pick the default root
    }
    return entry.isDirectory ? entry.path : dirname(entry.path)
  }

  const canDropInto = (destDir: string): boolean => {
    const src = dragSrcRef.current
    if (!src) {
      return false
    }
    if (dirname(src.path) === destDir) {
      return false
    }
    return !(src.isDirectory && isSameOrInside(src.path, destDir))
  }

  const buildMenu = (entry: FsEntry | null, isRoot: boolean): MenuItem[] => {
    const items: MenuItem[] = []
    // Root header: workspace-level actions only (no cut/copy/rename/delete).
    if (isRoot && entry) {
      items.push({ id: 'new-file', label: '新建文件' })
      items.push({ id: 'new-folder', label: '新建文件夹' })
      items.push({ id: 'paste', label: '粘贴', disabled: !state.clip })
      items.push({ id: 'sep-sys', separator: true })
      items.push({ id: 'reveal', label: '在系统中显示' })
      items.push({ id: 'copy-path', label: '复制路径' })
      items.push({ id: 'refresh', label: '刷新' })
      if (entry.path !== pinnedRoot) {
        items.push({ id: 'sep-root', separator: true })
        items.push({ id: 'remove-root', label: '从工作区移除', danger: true })
      }
      return items
    }
    if (entry && !entry.isDirectory) {
      items.push({ id: 'open', label: '打开' })
      items.push({ id: 'sep-open', separator: true })
    }
    items.push({ id: 'new-file', label: '新建文件' })
    items.push({ id: 'new-folder', label: '新建文件夹' })
    if (entry?.isDirectory || !entry) {
      items.push({ id: 'paste', label: '粘贴', disabled: !state.clip })
    }
    if (entry) {
      items.push({ id: 'sep-clip', separator: true })
      items.push({ id: 'cut', label: '剪切' })
      items.push({ id: 'copy', label: '复制' })
      items.push({ id: 'duplicate', label: '创建副本' })
      items.push({ id: 'sep-edit', separator: true })
      items.push({ id: 'rename', label: '重命名' })
      items.push({ id: 'delete', label: '移到废纸篓', danger: true })
    }
    items.push({ id: 'sep-sys', separator: true })
    items.push({ id: 'reveal', label: '在系统中显示' })
    items.push({ id: 'copy-path', label: '复制路径' })
    if (!entry) {
      items.push({ id: 'sep-refresh', separator: true })
      items.push({ id: 'refresh', label: '刷新' })
    }
    return items
  }

  const handleMenuSelect = (id: string) => {
    const entry = menu?.entry ?? null
    switch (id) {
      case 'open':
        if (entry) onOpenFile(entry.path)
        break
      case 'new-file':
        void state.beginCreate('file', createDirFor(entry))
        break
      case 'new-folder':
        void state.beginCreate('folder', createDirFor(entry))
        break
      case 'cut':
        if (entry) state.markCut(entry)
        break
      case 'copy':
        if (entry) state.markCopy(entry)
        break
      case 'duplicate':
        if (entry) void state.duplicateEntry(entry)
        break
      case 'paste': {
        const dir = entry ? (entry.isDirectory ? entry.path : dirname(entry.path)) : roots[0]
        if (dir) void state.pasteInto(dir)
        break
      }
      case 'rename':
        if (entry) state.beginRename(entry)
        break
      case 'delete':
        if (entry) void state.deleteEntry(entry)
        break
      case 'remove-root':
        if (entry) state.removeRoot(entry.path)
        break
      case 'reveal': {
        const target = entry?.path ?? roots[0]
        if (target) void state.reveal(target)
        break
      }
      case 'copy-path': {
        const target = entry?.path ?? roots[0]
        if (target) void state.copyPath(target)
        break
      }
      case 'refresh':
        void state.refresh()
        break
      default:
        break
    }
  }

  const openMenu = (e: React.MouseEvent, entry: FsEntry | null, isRoot = false) => {
    e.preventDefault()
    e.stopPropagation()
    setMenu({ x: e.clientX, y: e.clientY, entry, isRoot })
  }

  // ── Keyboard navigation (roving focus on the tree) ─────────────────────
  const focusIndex = focusedPath ? rows.findIndex((r) => r.entry.path === focusedPath) : -1

  const scrollIndexIntoView = (idx: number) => {
    const el = scrollRef.current
    if (!el || idx < 0) {
      return
    }
    const top = idx * ROW_H
    if (top < el.scrollTop) {
      el.scrollTop = top
    } else if (top + ROW_H > el.scrollTop + el.clientHeight) {
      el.scrollTop = top - el.clientHeight + ROW_H
    }
  }

  const focusRow = (idx: number) => {
    if (idx < 0 || idx >= rows.length) {
      return
    }
    setFocusedPath(rows[idx].entry.path)
    scrollIndexIntoView(idx)
  }

  const handleTreeKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (edit || rows.length === 0) {
      return
    }
    const idx = focusIndex
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      focusRow(idx < 0 ? 0 : Math.min(rows.length - 1, idx + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      focusRow(idx < 0 ? rows.length - 1 : Math.max(0, idx - 1))
    } else if (e.key === 'Home') {
      e.preventDefault()
      focusRow(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      focusRow(rows.length - 1)
    } else if (e.key === 'ArrowRight') {
      if (idx < 0) {
        return
      }
      e.preventDefault()
      const row = rows[idx]
      if (row.entry.isDirectory && !row.expanded) {
        void state.toggleDir(row.entry.path)
      } else if (row.entry.isDirectory && row.expanded) {
        focusRow(idx + 1)
      }
    } else if (e.key === 'ArrowLeft') {
      if (idx < 0) {
        return
      }
      e.preventDefault()
      const row = rows[idx]
      if (row.entry.isDirectory && row.expanded) {
        void state.toggleDir(row.entry.path)
      } else {
        for (let i = idx - 1; i >= 0; i -= 1) {
          if (rows[i].depth < row.depth) {
            focusRow(i)
            break
          }
        }
      }
    } else if (e.key === 'Enter') {
      if (idx < 0) {
        return
      }
      e.preventDefault()
      const row = rows[idx]
      if (row.entry.isDirectory) {
        void state.toggleDir(row.entry.path)
      } else {
        onOpenFile(row.entry.path)
      }
    } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      // Typeahead: jump to the next row whose name starts with the typed prefix.
      const now = Date.now()
      const ta = typeaheadRef.current
      ta.buffer = now - ta.at > 600 ? e.key : ta.buffer + e.key
      ta.at = now
      const prefix = ta.buffer.toLowerCase()
      const start = idx < 0 ? 0 : idx
      for (let step = 1; step <= rows.length; step += 1) {
        const i = (start + step) % rows.length
        if (rows[i].entry.name.toLowerCase().startsWith(prefix)) {
          focusRow(i)
          break
        }
      }
    }
  }

  const renderRow = (row: TreeRow): ReactNode => {
    const isRoot = !!row.isRoot
    const isPinned = isRoot && row.entry.path === pinnedRoot
    const isRenaming = edit?.mode === 'rename' && edit.targetPath === row.entry.path
    const isActive = !row.entry.isDirectory && row.entry.path === activeFilePath
    const isFocused = row.entry.path === focusedPath
    const isCut = state.clip?.op === 'cut' && state.clip.path === row.entry.path
    const label = isPinned ? '草稿' : row.entry.name
    return (
      <div
        key={row.entry.path}
        role="treeitem"
        aria-level={row.depth + 1}
        aria-expanded={row.hasChildren ? row.expanded : undefined}
        aria-selected={isActive}
        className={`fm-row ${isRoot ? 'fm-root-row' : ''} ${isPinned ? 'fm-pinned-root' : ''} ${
          isActive ? 'active' : ''
        } ${isFocused ? 'fm-focused' : ''} ${row.entry.isDirectory ? 'is-dir' : 'is-file'} ${
          dropTarget === row.entry.path ? 'fm-drop-target' : ''
        } ${isCut ? 'fm-cut' : ''}`}
        style={{ paddingLeft: INDENT_BASE + row.depth * INDENT_STEP, height: ROW_H }}
        title={isPinned ? `草稿（自动保存）: ${row.entry.path}` : row.entry.path}
        draggable={!isRenaming && !isRoot}
        onDragStart={
          isRoot
            ? undefined
            : (e) => {
                dragSrcRef.current = row.entry
                e.dataTransfer.effectAllowed = 'move'
                try {
                  e.dataTransfer.setData('text/plain', row.entry.path)
                } catch {
                  // some environments disallow setData; the ref carries the source
                }
              }
        }
        onDragEnd={() => {
          dragSrcRef.current = null
          setDropTarget(null)
        }}
        onDragOver={
          row.entry.isDirectory
            ? (e) => {
                if (canDropInto(row.entry.path)) {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  setDropTarget(row.entry.path)
                }
              }
            : undefined
        }
        onDragLeave={
          row.entry.isDirectory ? () => setDropTarget((t) => (t === row.entry.path ? null : t)) : undefined
        }
        onDrop={
          row.entry.isDirectory
            ? (e) => {
                e.preventDefault()
                e.stopPropagation()
                const src = dragSrcRef.current
                setDropTarget(null)
                dragSrcRef.current = null
                if (src) {
                  void state.moveEntry(src, row.entry.path)
                }
              }
            : undefined
        }
        onContextMenu={(e) => openMenu(e, row.entry, isRoot)}
        onClick={() => {
          if (isRenaming) {
            return
          }
          setFocusedPath(row.entry.path)
          if (row.entry.isDirectory) {
            void state.toggleDir(row.entry.path)
          } else {
            onOpenFile(row.entry.path)
          }
        }}
      >
        <span className={`fm-twistie-slot ${row.hasChildren ? '' : 'is-leaf'}`}>
          {row.hasChildren && (
            <ChevronRight size={13} className={`fm-twistie ${row.expanded ? 'open' : ''}`} />
          )}
        </span>
        <span className="fm-row-icon">
          {row.entry.isDirectory ? (
            row.expanded ? (
              <FolderOpen size={14} />
            ) : (
              <Folder size={14} />
            )
          ) : isMarkdownFile(row.entry.name) ? (
            <FileText size={14} />
          ) : (
            <FileIcon size={14} />
          )}
        </span>
        {isRenaming ? (
          <InlineNameInput
            initialName={edit?.initialName ?? row.entry.name}
            onCommit={handleCommit}
            onCancel={state.cancelInline}
          />
        ) : (
          <span className="fm-row-label">{label}</span>
        )}
        {isRoot && !isPinned && (
          <button
            type="button"
            className="fm-row-action"
            title="从工作区移除"
            aria-label="从工作区移除"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation()
              state.removeRoot(row.entry.path)
            }}
          >
            <X size={12} />
          </button>
        )}
      </div>
    )
  }

  const inlineInputRow = (depth: number, kind: 'create-file' | 'create-folder') => (
    <div
      className="fm-row"
      style={{ paddingLeft: INDENT_BASE + depth * INDENT_STEP, height: ROW_H }}
      key="__inline_create"
    >
      <span className="fm-twistie-slot is-leaf" />
      <span className="fm-row-icon">
        {kind === 'create-folder' ? <Folder size={14} /> : <FileText size={14} />}
      </span>
      <InlineNameInput initialName="" onCommit={handleCommit} onCancel={state.cancelInline} />
    </div>
  )

  // Full (non-windowed) render with inline create/rename inputs injected. The
  // create input is nested under its parent row (root rows included).
  const renderAllRows = (): ReactNode[] => {
    const out: ReactNode[] = []
    const createMode = edit && edit.mode !== 'rename' ? edit.mode : null
    const createParent = edit && edit.mode !== 'rename' ? edit.parentDir : null
    for (const row of rows) {
      out.push(renderRow(row))
      if (createMode && createParent === row.entry.path) {
        out.push(inlineInputRow(row.depth + 1, createMode))
      }
    }
    return out
  }

  // Windowed render for large trees (disabled while an inline input is active).
  const renderWindowedRows = (): ReactNode => {
    const total = rows.length
    const start = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN)
    const end = Math.min(total, Math.ceil((scrollTop + viewportH) / ROW_H) + OVERSCAN)
    const slice = rows.slice(start, end)
    return (
      <div style={{ paddingTop: start * ROW_H, paddingBottom: (total - end) * ROW_H }}>
        {slice.map(renderRow)}
      </div>
    )
  }

  if (!state.available) {
    return (
      <div className="fm-panel">
        <div className="fm-empty">
          <p>文件系统桥未就绪</p>
          <p className="fm-empty-hint">请重新加载插件后再试</p>
        </div>
      </div>
    )
  }

  const virtualize = rows.length > VIRTUAL_THRESHOLD && !edit

  return (
    <div className="fm-panel">
      <div className="fm-toolbar">
        <button
          type="button"
          className="fm-tool-btn"
          title="添加文件夹到工作区"
          aria-label="添加文件夹到工作区"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => void state.openFolder()}
        >
          <FolderOpen size={15} />
        </button>
        <button
          type="button"
          className="fm-tool-btn"
          title="新建文件"
          aria-label="新建文件"
          disabled={!hasRoots}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => void state.beginCreate('file')}
        >
          <FilePlus size={15} />
        </button>
        <button
          type="button"
          className="fm-tool-btn"
          title="新建文件夹"
          aria-label="新建文件夹"
          disabled={!hasRoots}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => void state.beginCreate('folder')}
        >
          <FolderPlus size={15} />
        </button>
        <button
          type="button"
          className="fm-tool-btn"
          title="定位当前文件"
          aria-label="定位当前文件"
          disabled={!hasRoots || !activeFilePath}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            if (activeFilePath) void state.revealPath(activeFilePath)
          }}
        >
          <Crosshair size={14} />
        </button>
        <button
          type="button"
          className="fm-tool-btn"
          title="折叠全部"
          aria-label="折叠全部"
          disabled={!hasRoots}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => state.collapseAll()}
        >
          <ChevronsDownUp size={14} />
        </button>
        <button
          type="button"
          className="fm-tool-btn"
          title="刷新"
          aria-label="刷新"
          disabled={!hasRoots}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => void state.refresh()}
        >
          <RefreshCw size={14} className={state.loading ? 'fm-spin' : ''} />
        </button>
      </div>

      {state.recents.length > 0 && (
        <div className="fm-section">
          <button
            type="button"
            className="fm-section-header"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setRecentOpen((v) => !v)}
          >
            <ChevronRight size={13} className={`fm-twistie ${recentOpen ? 'open' : ''}`} />
            <span className="fm-section-title">最近</span>
          </button>
          {recentOpen && (
            <div className="fm-recent-list">
              {state.recents.map((item) => (
                <div
                  key={item.path}
                  className={`fm-row fm-recent-row ${activeFilePath === item.path ? 'active' : ''}`}
                  title={item.path}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() =>
                    item.kind === 'folder' ? void state.openRootPath(item.path) : onOpenFile(item.path)
                  }
                >
                  <span className="fm-row-icon">
                    {item.kind === 'folder' ? <Folder size={14} /> : <FileText size={14} />}
                  </span>
                  <span className="fm-row-label">{item.name || basename(item.path)}</span>
                  <button
                    type="button"
                    className="fm-row-action"
                    title="从最近移除"
                    aria-label="从最近移除"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => {
                      e.stopPropagation()
                      state.removeRecent(item.path)
                    }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="fm-tree">
        {!hasRoots ? (
          <div className="fm-empty">
            <p>未打开文件夹</p>
            <button
              type="button"
              className="fm-open-btn"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => void state.openFolder()}
            >
              <FolderOpen size={14} />
              <span>打开文件夹</span>
            </button>
          </div>
        ) : (
          <div
            className="fm-rows"
            role="tree"
            aria-label="文件树"
            tabIndex={0}
            ref={scrollRef}
            onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
            onKeyDown={handleTreeKeyDown}
            onContextMenu={(e) => openMenu(e, null)}
          >
            {virtualize ? renderWindowedRows() : renderAllRows()}
          </div>
        )}
      </div>

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={buildMenu(menu.entry, menu.isRoot)}
          onSelect={handleMenuSelect}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  )
}
