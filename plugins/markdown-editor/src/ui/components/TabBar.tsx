import { useEffect, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { deriveTabTitle, isTabDirty, type EditorTab } from '../services/tabs'

interface TabBarProps {
  tabs: EditorTab[]
  activeTabId: string
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onNew: () => void
  /** Reorder: move `fromId` to the `before`/after side of `toId`. */
  onReorder: (fromId: string, toId: string, before: boolean) => void
  /** Right-click a tab → open its context menu at (x, y). */
  onContextMenu: (id: string, x: number, y: number) => void
}

/**
 * The editor's tab strip. Presentational only — open/activate/close/new are
 * orchestrated by App so the single CodeMirror view can swap per-tab state.
 * Tabs are draggable to reorder; left-click selects via onClick (NOT mousedown,
 * whose preventDefault would block native HTML5 drag). The active tab is scrolled
 * into view so keyboard cycling / opening files keeps it visible when overflowing.
 */
export function TabBar({ tabs, activeTabId, onSelect, onClose, onNew, onReorder, onContextMenu }: TabBarProps) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<{ id: string; before: boolean } | null>(null)
  const activeRef = useRef<HTMLDivElement | null>(null)
  const stripRef = useRef<HTMLDivElement | null>(null)

  // Keep the active tab visible when switching via keyboard / opening files.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
  }, [activeTabId])

  // The strip's scrollbar is hidden, so translate vertical wheel into horizontal
  // scrolling when the tabs overflow — lets mouse-only users reach hidden tabs.
  useEffect(() => {
    const strip = stripRef.current
    if (!strip) {
      return
    }
    const onWheel = (event: WheelEvent) => {
      if (event.deltaY === 0 || event.shiftKey) {
        return
      }
      if (strip.scrollWidth <= strip.clientWidth) {
        return
      }
      event.preventDefault()
      strip.scrollLeft += event.deltaY
    }
    strip.addEventListener('wheel', onWheel, { passive: false })
    return () => strip.removeEventListener('wheel', onWheel)
  }, [])

  const clearDrag = () => {
    setDragId(null)
    setDropTarget(null)
  }

  return (
    <div className="tab-bar" role="tablist" aria-label="打开的文档">
      <div className="tab-strip" ref={stripRef}>
        {tabs.map((tab) => {
          const title = deriveTabTitle(tab)
          const dirty = isTabDirty(tab)
          const active = tab.id === activeTabId
          const dropping = dropTarget?.id === tab.id
          const className = [
            'tab-item',
            active ? 'active' : '',
            dirty ? 'dirty' : '',
            dragId === tab.id ? 'dragging' : '',
            dropping ? (dropTarget?.before ? 'drop-before' : 'drop-after') : ''
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <div
              key={tab.id}
              ref={active ? activeRef : undefined}
              role="tab"
              aria-selected={active}
              draggable
              className={className}
              title={tab.filePath ?? title}
              onMouseDown={(event) => {
                // Middle-click closes the tab. (Left-click select is on onClick so
                // it doesn't preventDefault here and break the native drag.)
                if (event.button === 1) {
                  event.preventDefault()
                  onClose(tab.id)
                }
              }}
              onClick={() => onSelect(tab.id)}
              onContextMenu={(event) => {
                event.preventDefault()
                event.stopPropagation()
                onContextMenu(tab.id, event.clientX, event.clientY)
              }}
              onDragStart={(event) => {
                setDragId(tab.id)
                event.dataTransfer.effectAllowed = 'move'
                try {
                  event.dataTransfer.setData('text/plain', tab.id)
                } catch {
                  // Some environments restrict setData; drag still works via state.
                }
              }}
              onDragOver={(event) => {
                if (!dragId || dragId === tab.id) {
                  return
                }
                event.preventDefault()
                event.dataTransfer.dropEffect = 'move'
                const rect = event.currentTarget.getBoundingClientRect()
                const before = event.clientX < rect.left + rect.width / 2
                setDropTarget((prev) =>
                  prev && prev.id === tab.id && prev.before === before ? prev : { id: tab.id, before }
                )
              }}
              onDrop={(event) => {
                event.preventDefault()
                const from = dragId
                const target = dropTarget
                clearDrag()
                if (from && target && from !== target.id) {
                  onReorder(from, target.id, target.before)
                }
              }}
              onDragEnd={clearDrag}
            >
              <span className="tab-title">{title}</span>
              <button
                type="button"
                className="tab-close"
                aria-label={`关闭 ${title}`}
                title="关闭"
                onMouseDown={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                }}
                onClick={(event) => {
                  event.stopPropagation()
                  onClose(tab.id)
                }}
              >
                <span className="tab-dirty-dot" aria-hidden="true" />
                <X size={13} className="tab-close-x" />
              </button>
            </div>
          )
        })}
      </div>
      <button
        type="button"
        className="tab-new"
        aria-label="新建标签"
        title="新建标签 (Ctrl/Cmd+T)"
        onMouseDown={(event) => event.preventDefault()}
        onClick={onNew}
      >
        <Plus size={15} />
      </button>
    </div>
  )
}
