import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, Circle, Pin, Trash2, HelpCircle } from 'lucide-react'
import type { TodoItem } from '../../types/todo'
import { useTodos } from '../hooks/useTodos'
import AiAssistPanel from '../components/AiAssistPanel'
import { useMulby } from '../hooks/useMulby'

const PLUGIN_ID = 'todo-focus'

type FilterMode = 'all' | 'active' | 'done'

interface ListViewProps {
  initialInput?: string
}

export default function ListView({ initialInput = '' }: ListViewProps) {
  const {
    todos,
    settings,
    stats,
    loading,
    addTodo,
    updateTodo,
    removeTodo,
    toggleDone,
    saveSettings,
  } = useTodos()
  const { plugin, notification } = useMulby(PLUGIN_ID)

  const [newTitle, setNewTitle] = useState(initialInput)
  const [filter, setFilter] = useState<FilterMode>('active')
  const [filterText, setFilterText] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [showHelp, setShowHelp] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const newInputRef = useRef<HTMLInputElement>(null)
  const filterRef = useRef<HTMLInputElement>(null)
  const editRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    let list = todos
    if (filter === 'active') list = list.filter((t) => !t.done)
    if (filter === 'done') list = list.filter((t) => t.done)
    const q = filterText.trim().toLowerCase()
    if (q) list = list.filter((t) => t.title.toLowerCase().includes(q))
    return list
  }, [todos, filter, filterText])

  useEffect(() => {
    if (activeIndex >= filtered.length) {
      setActiveIndex(Math.max(0, filtered.length - 1))
    }
  }, [filtered.length, activeIndex])

  const submitNew = useCallback(async () => {
    const title = newTitle.trim()
    if (!title) return
    await addTodo(title)
    setNewTitle('')
    notification.show('已添加', 'success')
    newInputRef.current?.focus()
  }, [addTodo, newTitle, notification])

  const startEdit = useCallback((item: TodoItem) => {
    setEditingId(item.id)
    setEditTitle(item.title)
    setTimeout(() => editRef.current?.focus(), 0)
  }, [])

  const commitEdit = useCallback(async () => {
    if (!editingId) return
    const title = editTitle.trim()
    if (title) await updateTodo(editingId, { title })
    setEditingId(null)
  }, [editingId, editTitle, updateTodo])

  const handleDelete = useCallback(
    async (id: string, force = false) => {
      if (!force && pendingDeleteId !== id) {
        setPendingDeleteId(id)
        notification.show('再按 d 确认删除', 'info')
        return
      }
      await removeTodo(id)
      setPendingDeleteId(null)
    },
    [pendingDeleteId, removeTodo, notification]
  )

  const openFeature = useCallback(
    async (featureCode: string) => {
      try {
        await plugin.run?.(PLUGIN_ID, featureCode)
      } catch {
        notification.show(`请在 Mulby 中搜索「${featureCode === 'sticky' ? '便签' : '专注'}」打开`, 'info')
      }
    },
    [plugin, notification]
  )

  const handleImport = useCallback(
    async (titles: string[]) => {
      for (const title of titles) {
        await addTodo(title)
      }
    },
    [addTodo]
  )

  const handleModelChange = useCallback(
    (id: string) => {
      void saveSettings({ aiModelId: id })
    },
    [saveSettings]
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'

      if (filterOpen && e.key === 'Escape') {
        setFilterOpen(false)
        return
      }

      if (editingId) {
        if (e.key === 'Enter') {
          e.preventDefault()
          void commitEdit()
        }
        if (e.key === 'Escape') {
          setEditingId(null)
        }
        return
      }

      if (inInput && !e.altKey && !(e.key === '/' && !filterOpen)) return

      const mod = e.metaKey || e.ctrlKey

      if (mod && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        newInputRef.current?.focus()
        return
      }

      if (e.key === '?' && !inInput) {
        e.preventDefault()
        setShowHelp((h) => !h)
        return
      }

      if (e.key === 'n' && !inInput) {
        e.preventDefault()
        newInputRef.current?.focus()
        return
      }

      if (e.key === '/' && !inInput) {
        e.preventDefault()
        setFilterOpen(true)
        setTimeout(() => filterRef.current?.focus(), 0)
        return
      }

      if (e.key === 'f' && !inInput) {
        e.preventDefault()
        void openFeature('focus')
        return
      }

      if (e.key === 's' && !inInput) {
        e.preventDefault()
        void openFeature('sticky')
        return
      }

      if (e.key === '1' && !inInput) {
        setFilter('all')
        return
      }
      if (e.key === '2' && !inInput) {
        setFilter('active')
        return
      }
      if (e.key === '3' && !inInput) {
        setFilter('done')
        return
      }

      if (!filtered.length) return

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
        return
      }
      if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
        return
      }

      const current = filtered[activeIndex]
      if (!current) return

      if (e.key === ' ') {
        e.preventDefault()
        void toggleDone(current.id)
        return
      }

      if (e.key === 'Enter') {
        e.preventDefault()
        void toggleDone(current.id)
        return
      }

      if (e.key === 'e') {
        e.preventDefault()
        startEdit(current)
        return
      }

      if (e.key === 'd') {
        e.preventDefault()
        void handleDelete(current.id, e.shiftKey)
        return
      }

      if (e.key === 'p') {
        e.preventDefault()
        void updateTodo(current.id, { pinned: !current.pinned })
        void saveSettings({ activeTodoId: current.id })
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    filtered,
    activeIndex,
    editingId,
    filterOpen,
    commitEdit,
    toggleDone,
    startEdit,
    handleDelete,
    updateTodo,
    saveSettings,
    openFeature,
  ])

  if (loading) {
    return <div className="loading">加载中…</div>
  }

  return (
    <div className="list-view">
      <header className="header">
        <div>
          <h1 className="header-title">待办番茄</h1>
          <p className="header-sub">
            今日番茄 {stats?.pomodoroToday ?? 0} · 专注 {stats?.focusMinutesToday ?? 0} 分钟
          </p>
        </div>
        <button type="button" className="btn-ghost" onClick={() => setShowHelp((h) => !h)} aria-label="快捷键">
          <HelpCircle size={18} />
        </button>
      </header>

      {showHelp && (
        <div className="help-bar">
          n 新建 · j/k 移动 · Enter/Space 完成 · e 编辑 · d 删除 · p 置顶焦点 · / 搜索 · f 专注 · s 便签 · 1/2/3 筛选
        </div>
      )}

      <div className="composer">
        <input
          ref={newInputRef}
          className="input"
          placeholder="添加待办，Enter 保存"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submitNew()
            if (e.key === 'Escape') setNewTitle('')
          }}
        />
        <button type="button" className="btn-primary" onClick={() => void submitNew()}>
          添加
        </button>
      </div>

      {filterOpen && (
        <input
          ref={filterRef}
          className="input filter-input"
          placeholder="过滤待办…"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && setFilterOpen(false)}
        />
      )}

      <div className="tabs" role="tablist">
        {(['all', 'active', 'done'] as const).map((mode, i) => (
          <button
            key={mode}
            type="button"
            role="tab"
            className={`tab ${filter === mode ? 'active' : ''}`}
            onClick={() => setFilter(mode)}
          >
            {mode === 'all' ? '全部' : mode === 'active' ? '进行中' : '已完成'}
            <span className="tab-kbd">{i + 1}</span>
          </button>
        ))}
      </div>

      <ul className="todo-list" role="listbox" aria-label="待办列表">
        {filtered.length === 0 ? (
          <li className="empty">暂无待办，按 n 开始添加</li>
        ) : (
          filtered.map((item, index) => (
            <li
              key={item.id}
              id={`todo-${item.id}`}
              role="option"
              aria-selected={index === activeIndex}
              className={`todo-item ${index === activeIndex ? 'active' : ''} ${item.done ? 'done' : ''}`}
              onClick={() => setActiveIndex(index)}
              onDoubleClick={() => startEdit(item)}
            >
              <button
                type="button"
                className="todo-check"
                onClick={(e) => {
                  e.stopPropagation()
                  void toggleDone(item.id)
                }}
                aria-label={item.done ? '标为未完成' : '完成'}
              >
                {item.done ? <Check size={16} /> : <Circle size={16} />}
              </button>

              {editingId === item.id ? (
                <input
                  ref={editRef}
                  className="input todo-edit"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={() => void commitEdit()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void commitEdit()
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                />
              ) : (
                <span className="todo-title">
                  {item.pinned && <Pin size={12} className="pin-icon" />}
                  {item.title}
                </span>
              )}

              <button
                type="button"
                className="btn-icon"
                onClick={(e) => {
                  e.stopPropagation()
                  void handleDelete(item.id, e.shiftKey)
                }}
                aria-label="删除"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))
        )}
      </ul>

      <AiAssistPanel
        todos={todos}
        modelId={settings?.aiModelId || ''}
        onModelChange={handleModelChange}
        onImport={handleImport}
      />
    </div>
  )
}
