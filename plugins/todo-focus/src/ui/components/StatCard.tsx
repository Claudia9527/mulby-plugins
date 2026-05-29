import type { ReactNode } from 'react'

interface StatCardProps {
  icon: ReactNode
  value: string
  label: string
  trend?: { direction: 'up' | 'down' | 'flat'; text: string }
}

export default function StatCard({ icon, value, label, trend }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-card__value">
        <span className="stat-card__icon">{icon}</span>
        {value}
      </div>
      <div className="stat-card__label">{label}</div>
      {trend && (
        <div className={`stat-card__trend stat-card__trend--${trend.direction}`}>
          {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'}
          {trend.text}
        </div>
      )}
    </div>
  )
}
