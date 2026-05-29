import { useState } from 'react'
import type { DailyRecord } from '../../types/todo'
import { formatLocalDateKey } from '../../store/parseQuickCapture'

interface BarChartProps {
  data: DailyRecord[]
  range: 7 | 30
}

function getWeekdayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (d.getTime() === today.getTime()) return '今天'
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return weekdays[d.getDay()]
}

function getShortDateLabel(dateStr: string): string {
  const parts = dateStr.split('-')
  return `${parseInt(parts[1])}/${parseInt(parts[2])}`
}

export default function BarChart({ data, range }: BarChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const dates: string[] = []
  for (let i = range - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    dates.push(formatLocalDateKey(d))
  }

  const records = dates.map((date) => {
    const found = data.find((r) => r.date === date)
    return found || { date, pomodoroCount: 0, focusMinutes: 0, completedTodos: 0 }
  })

  const maxPomodoro = Math.max(1, ...records.map((r) => r.pomodoroCount))
  const maxHours = Math.max(1, ...records.map((r) => r.focusMinutes / 60))

  return (
    <div className="bar-chart">
      <div className="bar-chart__bars">
        {records.map((record, idx) => {
          const pomHeight = (record.pomodoroCount / maxPomodoro) * 100
          const focusHeight = ((record.focusMinutes / 60) / maxHours) * 100
          const label = range === 7 ? getWeekdayLabel(record.date) : getShortDateLabel(record.date)

          return (
            <div
              key={record.date}
              className="bar-chart__col"
              onMouseEnter={() => setHoverIdx(idx)}
              onMouseLeave={() => setHoverIdx(null)}
            >
              <div className="bar-chart__bar-group">
                <div
                  className="bar-chart__bar bar-chart__bar--pomodoro"
                  style={{ height: `${pomHeight}%` }}
                />
                <div
                  className="bar-chart__bar bar-chart__bar--focus"
                  style={{ height: `${focusHeight}%` }}
                />
              </div>
              <span className="bar-chart__label">{label}</span>
              {hoverIdx === idx && (
                <div className="bar-chart__tooltip">
                  {record.date} — {record.pomodoroCount}个番茄 · {(record.focusMinutes / 60).toFixed(1)}h
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="bar-chart__legend">
        <span><i className="bar-chart__legend-dot bar-chart__legend-dot--pomodoro" />番茄数</span>
        <span><i className="bar-chart__legend-dot bar-chart__legend-dot--focus" />专注时长(h)</span>
      </div>
    </div>
  )
}
