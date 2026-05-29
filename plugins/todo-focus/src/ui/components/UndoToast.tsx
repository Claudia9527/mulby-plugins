import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { TodoItem } from '../../types/todo'

interface UndoToastProps {
  item: TodoItem
  onUndo: () => void
  onExpire: () => void
  duration?: number
}

export default function UndoToast({ item, onUndo, onExpire, duration = 5000 }: UndoToastProps) {
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true)
      setTimeout(onExpire, 200)
    }, duration)
    return () => clearTimeout(timer)
  }, [duration, onExpire])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault()
        onUndo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onUndo])

  const title = item.title.length > 20 ? item.title.slice(0, 20) + '…' : item.title

  return (
    <div className={`undo-toast ${exiting ? 'undo-toast--exit' : ''}`} role="alert" aria-live="polite">
      <Trash2 size={16} className="undo-toast__icon" />
      <span className="undo-toast__text">已删除「{title}」</span>
      <button type="button" className="undo-toast__btn" onClick={onUndo}>撤销</button>
      <div className="undo-toast__progress" style={{ animationDuration: `${duration}ms` }} />
    </div>
  )
}
