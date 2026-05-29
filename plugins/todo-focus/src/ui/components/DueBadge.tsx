import { getDueDateLabel } from '../../store/parseQuickCapture'

interface DueBadgeProps {
  dueDate?: number
  done?: boolean
}

export default function DueBadge({ dueDate, done }: DueBadgeProps) {
  if (!dueDate || done) return null
  const info = getDueDateLabel(dueDate)
  if (!info) return null

  return (
    <span
      className={`due-badge due-badge--${info.status}`}
      aria-label={`截止日期: ${info.text}`}
    >
      {info.text}
    </span>
  )
}
