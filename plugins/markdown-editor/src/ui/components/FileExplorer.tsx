import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  ChevronRight,
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
import type { FsEntry } from '../services/fileTree'
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
 * VS Code / Obsidian-style file tree sidebar. Renders the recent list plus the
 * lazily-loaded workspace tree, with inline create/rename inputs and a themed
 * right-click menu. All file IO is owned by the explorer hook.
 */
export function FileExplorer({ state, activeFilePath, onOpenFile }: FileExplorerProps) {
  const [recentOpen, setRecentOpen] = useState(true)
  const [menu, setMenu] = useState<{ x: number; y: number; entry: FsEntry | null } | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const dragSrcRef = useRef<FsEntry | null>(null)

  const edit = state.inlineEdit

  // A drag is a valid drop into destDir when the source isn't already there and
  // a folder isn't being dropped into itself or a descendant.
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

  const handleCommit = (name: string) => {
    void state.commitInline(name).then((result) => {
      if (result?.kind === 'create-file') {
        onOpenFile(result.path)
      }
    })
  }

  // Directory a new entry should be created under, given the right-clicked entry.
  const createDirFor = (entry: FsEntry | null): string | undefined => {
    if (!entry) {
      return state.rootPath ?? undefined
    }
    return entry.isDirectory ? entry.path : dirname(entry.path)
  }

  const buildMenu = (entry: FsEntry | null): MenuItem[] => {
    const items: MenuItem[] = []
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
        if (entry) {
          onOpenFile(entry.path)
        }
        break
      case 'new-file':
        void state.beginCreate('file', createDirFor(entry))
        break
      case 'new-folder':
        void state.beginCreate('folder', createDirFor(entry))
        break
      case 'cut':
        if (entry) {
          state.markCut(entry)
        }
        break
      case 'copy':
        if (entry) {
          state.markCopy(entry)
        }
        break
      case 'duplicate':
        if (entry) {
          void state.duplicateEntry(entry)
        }
        break
      case 'paste': {
        const dir = entry ? (entry.isDirectory ? entry.path : dirname(entry.path)) : state.rootPath
        if (dir) {
          void state.pasteInto(dir)
        }
        break
      }
      case 'rename':
        if (entry) {
          state.beginRename(entry)
        }
        break
      case 'delete':
        if (entry) {
          void state.deleteEntry(entry)
        }
        break
      case 'reveal': {
        const target = entry?.path ?? state.rootPath
        if (target) {
          void state.reveal(target)
        }
        break
      }
      case 'copy-path': {
        const target = entry?.path ?? state.rootPath
        if (target) {
          void state.copyPath(target)
        }
        break
      }
      case 'refresh':
        void state.refresh()
        break
      default:
        break
    }
  }

  const openMenu = (e: React.MouseEvent, entry: FsEntry | null) => {
    e.preventDefault()
    e.stopPropagation()
    setMenu({ x: e.clientX, y: e.clientY, entry })
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

  const inlineInputRow = (depth: number, kind: 'create-file' | 'create-folder') => (
    <div className="fm-row" style={{ paddingLeft: INDENT_BASE + depth * INDENT_STEP }} key="__inline_create">
      <span className="fm-twistie-slot is-leaf" />
      <span className="fm-row-icon">
        {kind === 'create-folder' ? <Folder size={14} /> : <FileText size={14} />}
      </span>
      <InlineNameInput initialName="" onCommit={handleCommit} onCancel={state.cancelInline} />
    </div>
  )

  const renderTreeRows = (): ReactNode[] => {
    const out: ReactNode[] = []
    const createMode = edit && edit.mode !== 'rename' ? edit.mode : null
    const createParent = edit && edit.mode !== 'rename' ? edit.parentDir : null
    if (createMode && createParent === state.rootPath) {
      out.push(inlineInputRow(0, createMode))
    }
    for (const row of state.rows) {
      const isRenaming = edit?.mode === 'rename' && edit.targetPath === row.entry.path
      const isActive = !row.entry.isDirectory && row.entry.path === activeFilePath
      out.push(
        <div
          key={row.entry.path}
          role="treeitem"
          aria-level={row.depth + 1}
          aria-expanded={row.hasChildren ? row.expanded : undefined}
          className={`fm-row ${isActive ? 'active' : ''} ${row.entry.isDirectory ? 'is-dir' : 'is-file'} ${
            dropTarget === row.entry.path ? 'fm-drop-target' : ''
          } ${state.clip?.op === 'cut' && state.clip.path === row.entry.path ? 'fm-cut' : ''}`}
          style={{ paddingLeft: INDENT_BASE + row.depth * INDENT_STEP }}
          title={row.entry.path}
          draggable={!isRenaming}
          onDragStart={(e) => {
            dragSrcRef.current = row.entry
            e.dataTransfer.effectAllowed = 'move'
            try {
              e.dataTransfer.setData('text/plain', row.entry.path)
            } catch {
              // some environments disallow setData; the ref carries the source
            }
          }}
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
            row.entry.isDirectory
              ? () => setDropTarget((t) => (t === row.entry.path ? null : t))
              : undefined
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
          onContextMenu={(e) => openMenu(e, row.entry)}
          onClick={() => {
            if (isRenaming) {
              return
            }
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
            <span className="fm-row-label">{row.entry.name}</span>
          )}
        </div>
      )
      if (createMode && createParent === row.entry.path) {
        out.push(inlineInputRow(row.depth + 1, createMode))
      }
    }
    return out
  }

  return (
    <div className="fm-panel">
      <div className="fm-toolbar">
        <button
          type="button"
          className="fm-tool-btn"
          title="打开文件夹"
          aria-label="打开文件夹"
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
          disabled={!state.rootPath}
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
          disabled={!state.rootPath}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => void state.beginCreate('folder')}
        >
          <FolderPlus size={15} />
        </button>
        <button
          type="button"
          className="fm-tool-btn"
          title="刷新"
          aria-label="刷新"
          disabled={!state.rootPath}
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
        {!state.rootPath ? (
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
          <>
            <div
              className={`fm-root-header ${dropTarget === state.rootPath ? 'fm-drop-target' : ''}`}
              title={state.rootPath}
              onContextMenu={(e) => openMenu(e, null)}
              onDragOver={(e) => {
                if (state.rootPath && canDropInto(state.rootPath)) {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  setDropTarget(state.rootPath)
                }
              }}
              onDragLeave={() => setDropTarget((t) => (t === state.rootPath ? null : t))}
              onDrop={(e) => {
                e.preventDefault()
                const src = dragSrcRef.current
                setDropTarget(null)
                dragSrcRef.current = null
                if (src && state.rootPath) {
                  void state.moveEntry(src, state.rootPath)
                }
              }}
            >
              <FolderOpen size={13} />
              <span className="fm-root-name">{basename(state.rootPath)}</span>
              <button
                type="button"
                className="fm-row-action"
                title="关闭文件夹"
                aria-label="关闭文件夹"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => state.closeFolder()}
              >
                <X size={12} />
              </button>
            </div>
            {state.rows.length === 0 && !(edit && edit.mode !== 'rename') ? (
              <div className="fm-empty-inline">此文件夹没有 Markdown 文件</div>
            ) : (
              <div
                className="fm-rows"
                role="tree"
                aria-label="文件树"
                onContextMenu={(e) => openMenu(e, null)}
                onDragOver={(e) => {
                  if (state.rootPath && canDropInto(state.rootPath)) {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  const src = dragSrcRef.current
                  setDropTarget(null)
                  dragSrcRef.current = null
                  if (src && state.rootPath) {
                    void state.moveEntry(src, state.rootPath)
                  }
                }}
              >
                {renderTreeRows()}
              </div>
            )}
          </>
        )}
      </div>

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={buildMenu(menu.entry)}
          onSelect={handleMenuSelect}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  )
}
