import type { TodoItem } from '../types/todo'

export interface ParsedTodo {
  title: string
  priority?: 'high' | 'medium' | 'low'
  dueDate?: number
}

const DAY_MS = 86400000

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

export function formatLocalDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getNextWeekday(dayOfWeek: number): number {
  const now = new Date()
  const today = now.getDay()
  let diff = dayOfWeek - today
  if (diff <= 0) diff += 7
  const target = new Date(now)
  target.setDate(now.getDate() + diff)
  return startOfDay(target)
}

const WEEKDAY_MAP: Record<string, number> = {
  '周一': 1, '周二': 2, '周三': 3, '周四': 4, '周五': 5, '周六': 6, '周日': 0,
  '星期一': 1, '星期二': 2, '星期三': 3, '星期四': 4, '星期五': 5, '星期六': 6, '星期日': 0,
}

function parseDateToken(token: string): number | undefined {
  const today = new Date()

  if (token === '今天' || token === '今日') return startOfDay(today)
  if (token === '明天' || token === '明日') return startOfDay(today) + DAY_MS
  if (token === '后天') return startOfDay(today) + DAY_MS * 2

  if (token.startsWith('下周') || token.startsWith('下')) {
    const dayName = token.replace(/^下周?/, '')
    const dayNum = WEEKDAY_MAP[`周${dayName}`] ?? WEEKDAY_MAP[dayName]
    if (dayNum !== undefined) {
      const base = getNextWeekday(dayNum)
      return base <= startOfDay(today) ? base + 7 * DAY_MS : base
    }
  }

  const weekday = WEEKDAY_MAP[token]
  if (weekday !== undefined) return getNextWeekday(weekday)

  const mdMatch = token.match(/^(\d{1,2})[./](\d{1,2})$/)
  if (mdMatch) {
    const month = parseInt(mdMatch[1], 10) - 1
    const day = parseInt(mdMatch[2], 10)
    const year = today.getFullYear()
    let target = new Date(year, month, day)
    if (target.getTime() < startOfDay(today)) {
      target = new Date(year + 1, month, day)
    }
    return target.getTime()
  }

  const ymdMatch = token.match(/^(\d{4})[./\-](\d{1,2})[./\-](\d{1,2})$/)
  if (ymdMatch) {
    return new Date(
      parseInt(ymdMatch[1], 10),
      parseInt(ymdMatch[2], 10) - 1,
      parseInt(ymdMatch[3], 10)
    ).getTime()
  }

  return undefined
}

export function parseQuickCapture(input: string): string | null {
  const m = input.trim().match(/^(?:todo|待办|td)\s+([\s\S]+)$/i)
  return m?.[1]?.trim() || null
}

export function parseTodoText(raw: string): ParsedTodo | null {
  let title = raw
  let priority: 'high' | 'medium' | 'low' | undefined
  let dueDate: number | undefined

  const dateMatch = title.match(/\s+@(\S+)$/)
  if (dateMatch) {
    const parsed = parseDateToken(dateMatch[1])
    if (parsed !== undefined) {
      dueDate = parsed
      title = title.slice(0, dateMatch.index!).trim()
    }
  }

  if (title.startsWith('!!!')) {
    priority = 'low'
    title = title.slice(3).trim()
  } else if (title.startsWith('!!')) {
    priority = 'medium'
    title = title.slice(2).trim()
  } else if (title.startsWith('!')) {
    priority = 'high'
    title = title.slice(1).trim()
  }

  if (!title) return null

  return { title, priority, dueDate }
}

export function parseQuickCaptureEnhanced(input: string): ParsedTodo | null {
  const raw = parseQuickCapture(input)
  if (!raw) return null
  return parseTodoText(raw)
}

export function normalizeSelectionTitle(input: string, maxLen = 500): string {
  const title = input.trim()
  if (title.length <= maxLen) return title
  return title.slice(0, maxLen)
}

export function getDueDateLabel(dueDate: number | undefined): { text: string; status: 'overdue' | 'today' | 'tomorrow' | 'soon' | 'normal' } | null {
  if (!dueDate) return null
  const today = startOfDay(new Date())
  const diff = dueDate - today

  if (diff < 0) {
    const days = Math.ceil(Math.abs(diff) / DAY_MS)
    return { text: `过期${days}天`, status: 'overdue' }
  }
  if (diff === 0) return { text: '今天', status: 'today' }
  if (diff === DAY_MS) return { text: '明天', status: 'tomorrow' }
  if (diff <= 7 * DAY_MS) {
    const target = new Date(dueDate)
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return { text: weekdays[target.getDay()], status: 'soon' }
  }
  const d = new Date(dueDate)
  return { text: `${d.getMonth() + 1}/${d.getDate()}`, status: 'normal' }
}

export function sortTodos(todos: TodoItem[]): TodoItem[] {
  return [...todos].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    if (a.done !== b.done) return a.done ? 1 : -1

    const orderA = getSortOrder(a.sortOrder)
    const orderB = getSortOrder(b.sortOrder)
    if (orderA !== orderB) return orderA - orderB

    if (!a.done && !b.done) {
      const today = startOfDay(new Date())
      const scoreA = getDueDateScore(a.dueDate, today)
      const scoreB = getDueDateScore(b.dueDate, today)
      if (scoreA !== scoreB) return scoreA - scoreB

      const prioA = getPriorityScore(a.priority)
      const prioB = getPriorityScore(b.priority)
      if (prioA !== prioB) return prioA - prioB
    }

    return b.updatedAt - a.updatedAt
  })
}

function getDueDateScore(dueDate: number | undefined, today: number): number {
  if (!dueDate) return 100
  const diff = dueDate - today
  if (diff < 0) return 0
  if (diff === 0) return 1
  if (diff === DAY_MS) return 2
  return 50
}

function getPriorityScore(priority: 'high' | 'medium' | 'low' | undefined): number {
  if (priority === 'high') return 0
  if (priority === 'medium') return 1
  if (priority === 'low') return 2
  return 3
}

function getSortOrder(sortOrder: number | undefined): number {
  return typeof sortOrder === 'number' && Number.isFinite(sortOrder) ? sortOrder : Number.POSITIVE_INFINITY
}
