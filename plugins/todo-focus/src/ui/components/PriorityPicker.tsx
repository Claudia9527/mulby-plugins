import { useEffect, useRef } from 'react'
import { ArrowDownCircle, CircleAlert, CircleOff, MinusCircle, Zap, type LucideIcon } from 'lucide-react'

interface PriorityPickerProps {
  value?: 'high' | 'medium' | 'low'
  onChange: (value: 'high' | 'medium' | 'low' | undefined) => void
  onClose: () => void
}

type PriorityOption = {
  id: 'high' | 'medium' | 'low' | undefined
  icon: LucideIcon
  className: string
  label: string
  desc: string
  key: string
}

const OPTIONS: readonly PriorityOption[] = [
  { id: 'high', icon: CircleAlert, className: 'priority-icon--high', label: '高', desc: '紧急重要', key: '1' },
  { id: 'medium', icon: MinusCircle, className: 'priority-icon--medium', label: '中', desc: '需要关注', key: '2' },
  { id: 'low', icon: ArrowDownCircle, className: 'priority-icon--low', label: '低', desc: '有空再做', key: '3' },
  { id: undefined, icon: CircleOff, className: 'priority-icon--none', label: '无', desc: '不设优先级', key: '0' },
]

export default function PriorityPicker({ value, onChange, onClose }: PriorityPickerProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      const opt = OPTIONS.find((o) => o.key === e.key)
      if (opt) { onChange(opt.id); onClose() }
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [onChange, onClose])

  return (
    <div ref={ref} className="picker-popover" role="dialog" aria-label="选择优先级">
      <div className="picker-popover__title">
        <Zap size={14} />
        优先级
      </div>
      {OPTIONS.map((opt) => {
        const Icon = opt.icon
        return (
          <button
            key={opt.key}
            type="button"
            className={`picker-option ${value === opt.id ? 'picker-option--active' : ''}`}
            onClick={() => { onChange(opt.id); onClose() }}
          >
            <Icon size={14} className={`picker-option__dot ${opt.className}`} />
            <span className="picker-option__label">{opt.label}</span>
            <span className="picker-option__desc">— {opt.desc}</span>
          </button>
        )
      })}
    </div>
  )
}
