import { useEffect, useRef, useState } from 'react'
import { Calendar } from 'lucide-react'

interface DatePickerProps {
  value?: number
  onChange: (value: number | undefined) => void
  onClose: () => void
}

const DAY_MS = 86400000

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

function getNextMonday(): number {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? 1 : 8 - day
  const target = new Date(now)
  target.setDate(now.getDate() + diff)
  return startOfDay(target)
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function DatePicker({ value, onChange, onClose }: DatePickerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [showCalendar, setShowCalendar] = useState(false)
  const [viewMonth, setViewMonth] = useState(() => {
    const d = value ? new Date(value) : new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  const today = startOfDay(new Date())
  const quickOptions = [
    { label: '今天', value: today },
    { label: '明天', value: today + DAY_MS },
    { label: '后天', value: today + DAY_MS * 2 },
    { label: '下周一', value: getNextMonday() },
  ]

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const daysInMonth = new Date(viewMonth.year, viewMonth.month + 1, 0).getDate()
  const firstDayOfWeek = new Date(viewMonth.year, viewMonth.month, 1).getDay()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const prevMonth = () => {
    setViewMonth((v) => v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 })
  }
  const nextMonth = () => {
    setViewMonth((v) => v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 })
  }

  const selectDay = (day: number) => {
    const ts = new Date(viewMonth.year, viewMonth.month, day).getTime()
    onChange(ts)
    onClose()
  }

  return (
    <div ref={ref} className="picker-popover date-picker" role="dialog" aria-label="选择截止日期">
      <div className="picker-popover__title">
        <Calendar size={14} />
        截止日期
      </div>
      <div className="date-picker__quick">
        {quickOptions.map((opt) => (
          <button
            key={opt.label}
            type="button"
            className="date-picker__quick-btn"
            onClick={() => { onChange(opt.value); onClose() }}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className="date-picker__divider" />
      {!showCalendar ? (
        <button type="button" className="date-picker__expand" onClick={() => setShowCalendar(true)}>
          {value ? `已选: ${formatDate(value)}` : '自定义日期…'}
        </button>
      ) : (
        <div className="date-picker__calendar">
          <div className="date-picker__nav">
            <button type="button" onClick={prevMonth}>‹</button>
            <span>{viewMonth.year} 年 {viewMonth.month + 1} 月</span>
            <button type="button" onClick={nextMonth}>›</button>
          </div>
          <div className="date-picker__grid">
            {['日', '一', '二', '三', '四', '五', '六'].map((d) => (
              <span key={d} className="date-picker__weekday">{d}</span>
            ))}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <span key={`empty-${i}`} />
            ))}
            {days.map((day) => {
              const ts = new Date(viewMonth.year, viewMonth.month, day).getTime()
              const isToday = ts === today
              const isSelected = value && ts === startOfDay(new Date(value))
              const isPast = ts < today
              return (
                <button
                  key={day}
                  type="button"
                  className={`date-picker__day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${isPast ? 'past' : ''}`}
                  onClick={() => selectDay(day)}
                  disabled={isPast}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>
      )}
      {value && (
        <button type="button" className="date-picker__clear" onClick={() => { onChange(undefined); onClose() }}>
          清除日期
        </button>
      )}
    </div>
  )
}
