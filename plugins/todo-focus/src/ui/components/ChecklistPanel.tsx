import { useState } from 'react'
import type { ChecklistItem } from '../../types/todo'

interface ChecklistPanelProps {
  items: ChecklistItem[]
  onToggle: (id: string) => void
  onAdd: (text: string) => void
  onRemove: (id: string) => void
}

export default function ChecklistPanel({ items, onToggle, onAdd, onRemove }: ChecklistPanelProps) {
  const [newText, setNewText] = useState('')

  const submit = () => {
    const text = newText.trim()
    if (!text) return
    onAdd(text)
    setNewText('')
  }

  return (
    <div className="checklist" aria-label="子任务列表">
      {items.map((item) => (
        <div key={item.id} className={`checklist-item ${item.done ? 'done' : ''}`}>
          <button
            type="button"
            className={`checklist-check ${item.done ? 'checked' : ''}`}
            onClick={() => onToggle(item.id)}
            role="checkbox"
            aria-checked={item.done}
          >
            {item.done && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5L4.5 7.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
          <span className="checklist-text">{item.text}</span>
          <button
            type="button"
            className="checklist-delete"
            onClick={() => onRemove(item.id)}
            aria-label="删除子任务"
          >
            ×
          </button>
        </div>
      ))}
      {items.length < 20 && (
        <div className="checklist-add">
          <input
            placeholder="添加子任务…"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); submit() }
              if (e.key === 'Escape') setNewText('')
            }}
          />
        </div>
      )}
    </div>
  )
}
