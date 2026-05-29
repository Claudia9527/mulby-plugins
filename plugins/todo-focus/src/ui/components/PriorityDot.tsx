interface PriorityDotProps {
  priority?: 'high' | 'medium' | 'low'
  size?: number
}

export default function PriorityDot({ priority, size = 8 }: PriorityDotProps) {
  if (!priority) return null
  const cls = `priority-dot priority-dot--${priority}`
  return (
    <span
      className={cls}
      style={{ width: size, height: size }}
      aria-label={priority === 'high' ? '高优先级' : priority === 'medium' ? '中优先级' : '低优先级'}
    />
  )
}
