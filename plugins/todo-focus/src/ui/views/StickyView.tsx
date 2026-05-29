import { useCallback, useEffect, useState } from 'react'
import { Check, Circle, GripVertical } from 'lucide-react'
import { useTodos } from '../hooks/useTodos'
import { useMulby } from '../hooks/useMulby'
import PriorityDot from '../components/PriorityDot'
import DueBadge from '../components/DueBadge'
import { sortTodos } from '../../store/parseQuickCapture'

const PLUGIN_ID = 'todo-focus'

export default function StickyView() {
  const { todos, loading, toggleDone, addTodo, reorderTodos } = useTodos()
  const { window: win, notification } = useMulby(PLUGIN_ID)

  const [newTitle, setNewTitle] = useState('')
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  const open = sortTodos(todos).filter((t) => !t.done)

  useEffect(() => {
    void win?.setAlwaysOnTop?.(true)
    void win?.setSize?.(320, 480)
    void win?.setBackgroundThrottling?.(false)
  }, [win])

  const handleAdd = useCallback(async () => {
    const title = newTitle.trim()
    if (!title) return
    await addTodo(title)
    setNewTitle('')
    notification.show('已添加', 'success')
  }, [newTitle, addTodo, notification])

  const handleDragStart = (idx: number) => {
    setDragIdx(idx)
  }

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    setDragOverIdx(idx)
  }

  const handleDrop = (idx: number) => {
    if (dragIdx === null || dragIdx === idx) {
      setDragIdx(null)
      setDragOverIdx(null)
      return
    }
    const next = [...open]
    const [moved] = next.splice(dragIdx, 1)
    if (moved) {
      next.splice(idx, 0, moved)
      void reorderTodos(next.map((item) => item.id))
    }
    setDragIdx(null)
    setDragOverIdx(null)
  }

  if (loading) {
    return <div className="sticky-view loading">加载中…</div>
  }

  return (
    <div className="sticky-view">
      <header className="sticky-header">
        <h1>待办便签</h1>
        <span className="sticky-count">{open.length} 项</span>
      </header>

      <input
        className="sticky-input"
        placeholder="快速添加…"
        value={newTitle}
        onChange={(e) => setNewTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void handleAdd()
          if (e.key === 'Escape') setNewTitle('')
        }}
      />

      {open.length === 0 ? (
        <p className="sticky-empty">暂无未完成待办</p>
      ) : (
        <ul className="sticky-list">
          {open.map((item, idx) => (
            <li
              key={item.id}
              className={`sticky-li ${dragOverIdx === idx ? 'drag-over' : ''}`}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={() => handleDrop(idx)}
              onDragEnd={() => { setDragIdx(null); setDragOverIdx(null) }}
            >
              <span className="sticky-grip">
                <GripVertical size={12} />
              </span>
              <button
                type="button"
                className="sticky-row"
                onClick={() => void toggleDone(item.id)}
              >
                <span className="sticky-check">{item.done ? <Check size={14} /> : <Circle size={14} />}</span>
                <PriorityDot priority={item.priority} size={6} />
                <span className="sticky-title">{item.title}</span>
                <DueBadge dueDate={item.dueDate} done={item.done} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <footer className="sticky-footer">拖拽排序 · 单击完成</footer>
    </div>
  )
}
