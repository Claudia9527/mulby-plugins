import { Plus, X } from 'lucide-react'
import { deriveTabTitle, isTabDirty, type EditorTab } from '../services/tabs'

interface TabBarProps {
  tabs: EditorTab[]
  activeTabId: string
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onNew: () => void
}

/**
 * The editor's tab strip. Presentational only — open/activate/close/new are
 * orchestrated by App so the single CodeMirror view can swap per-tab state.
 * Mouse handlers preventDefault on mousedown to keep the editor selection alive.
 */
export function TabBar({ tabs, activeTabId, onSelect, onClose, onNew }: TabBarProps) {
  return (
    <div className="tab-bar" role="tablist" aria-label="打开的文档">
      <div className="tab-strip">
        {tabs.map((tab) => {
          const title = deriveTabTitle(tab)
          const dirty = isTabDirty(tab)
          const active = tab.id === activeTabId
          return (
            <div
              key={tab.id}
              role="tab"
              aria-selected={active}
              className={`tab-item ${active ? 'active' : ''} ${dirty ? 'dirty' : ''}`}
              title={tab.filePath ?? title}
              onMouseDown={(event) => {
                if (event.button === 1) {
                  // Middle-click closes the tab.
                  event.preventDefault()
                  onClose(tab.id)
                  return
                }
                event.preventDefault()
                onSelect(tab.id)
              }}
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
