import { useMemo, useState } from 'react'
import { BarChart3, CheckCircle2, Clock3, Timer } from 'lucide-react'
import type { DailyRecord, Stats } from '../../types/todo'
import StatCard from '../components/StatCard'
import BarChart from '../components/BarChart'

interface StatsViewProps {
  stats: Stats | null
}

function getWeekData(history: DailyRecord[], weeksAgo: number): DailyRecord[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(today)
  start.setDate(start.getDate() - 6 - weeksAgo * 7)
  const end = new Date(today)
  end.setDate(end.getDate() - weeksAgo * 7)

  return history.filter((r) => {
    const d = new Date(r.date + 'T00:00:00')
    return d >= start && d <= end
  })
}

export default function StatsView({ stats }: StatsViewProps) {
  const [range, setRange] = useState<7 | 30>(7)

  const history = stats?.dailyHistory || []

  const thisWeek = useMemo(() => getWeekData(history, 0), [history])
  const lastWeek = useMemo(() => getWeekData(history, 1), [history])

  const thisWeekPomodoro = thisWeek.reduce((a, r) => a + r.pomodoroCount, 0)
  const lastWeekPomodoro = lastWeek.reduce((a, r) => a + r.pomodoroCount, 0)
  const thisWeekFocus = thisWeek.reduce((a, r) => a + r.focusMinutes, 0)
  const lastWeekFocus = lastWeek.reduce((a, r) => a + r.focusMinutes, 0)
  const thisWeekTodos = thisWeek.reduce((a, r) => a + r.completedTodos, 0)
  const lastWeekTodos = lastWeek.reduce((a, r) => a + r.completedTodos, 0)

  const trendPom = lastWeekPomodoro > 0
    ? { direction: (thisWeekPomodoro > lastWeekPomodoro ? 'up' : thisWeekPomodoro < lastWeekPomodoro ? 'down' : 'flat') as 'up' | 'down' | 'flat', text: `vs 上周` }
    : undefined
  const trendFocus = lastWeekFocus > 0
    ? { direction: (thisWeekFocus > lastWeekFocus ? 'up' : thisWeekFocus < lastWeekFocus ? 'down' : 'flat') as 'up' | 'down' | 'flat', text: `vs 上周` }
    : undefined
  const trendTodos = lastWeekTodos > 0
    ? { direction: (thisWeekTodos > lastWeekTodos ? 'up' : thisWeekTodos < lastWeekTodos ? 'down' : 'flat') as 'up' | 'down' | 'flat', text: `vs 上周` }
    : undefined

  const rangeData = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = new Date(today)
    start.setDate(start.getDate() - range + 1)
    return history.filter((r) => new Date(r.date + 'T00:00:00') >= start)
  }, [history, range])

  const totalPomodoro = rangeData.reduce((a, r) => a + r.pomodoroCount, 0)
  const avgPomodoro = range > 0 ? (totalPomodoro / range).toFixed(1) : '0'
  const totalCompleted = rangeData.reduce((a, r) => a + r.completedTodos, 0)

  return (
    <div className="stats-view">
      <div className="stats-cards">
        <StatCard
          icon={<Timer size={16} />}
          value={String(thisWeekPomodoro)}
          label="本周番茄"
          trend={trendPom}
        />
        <StatCard
          icon={<Clock3 size={16} />}
          value={`${(thisWeekFocus / 60).toFixed(1)}h`}
          label="本周专注"
          trend={trendFocus}
        />
        <StatCard
          icon={<CheckCircle2 size={16} />}
          value={String(thisWeekTodos)}
          label="完成待办"
          trend={trendTodos}
        />
      </div>

      <div className="stats-range">
        <button
          type="button"
          className={`stats-range__btn ${range === 7 ? 'active' : ''}`}
          onClick={() => setRange(7)}
        >
          7天
        </button>
        <button
          type="button"
          className={`stats-range__btn ${range === 30 ? 'active' : ''}`}
          onClick={() => setRange(30)}
        >
          30天
        </button>
      </div>

      <BarChart data={history} range={range} />

      <div className="stats-detail">
        <BarChart3 size={14} />
        完成待办 {totalCompleted} 项 · 平均 {avgPomodoro} 番茄/天
      </div>
    </div>
  )
}
