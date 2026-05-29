import {
  DEFAULT_SETTINGS,
  DEFAULT_STATS,
  STATE_KEY,
  type ChecklistItem,
  type DailyRecord,
  type Settings,
  type Stats,
  type TodoItem,
  type TodoState,
} from '../types/todo'
import { formatLocalDateKey, normalizeSelectionTitle, parseQuickCaptureEnhanced, sortTodos } from './parseQuickCapture'

declare const mulby: { storage: { get: (k: string) => Promise<unknown>; set: (k: string, v: unknown) => Promise<void> } }

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function normalizeState(raw: unknown): TodoState {
  if (!raw || typeof raw !== 'object') {
    return { todos: [], settings: { ...DEFAULT_SETTINGS }, stats: { ...DEFAULT_STATS } }
  }
  const v = raw as Partial<TodoState>
  const todos = Array.isArray(v.todos)
    ? v.todos.filter((t): t is TodoItem => t && typeof t === 'object' && typeof t.id === 'string')
    : []
  const settings = { ...DEFAULT_SETTINGS, ...(v.settings || {}) }
  const rawStats = v.stats || {}
  const stats: Stats = {
    ...DEFAULT_STATS,
    ...rawStats,
    dailyHistory: Array.isArray((rawStats as Stats).dailyHistory) ? (rawStats as Stats).dailyHistory : [],
  }
  return { todos, settings, stats }
}

export async function loadState(): Promise<TodoState> {
  const raw = await mulby.storage.get(STATE_KEY)
  return normalizeState(raw)
}

export async function saveState(state: TodoState): Promise<void> {
  await mulby.storage.set(STATE_KEY, state)
}

export async function listTodos(): Promise<TodoItem[]> {
  const state = await loadState()
  return sortTodos(state.todos)
}

export async function getState(): Promise<TodoState> {
  return loadState()
}

export async function addTodo(
  title: string,
  note?: string,
  priority?: 'high' | 'medium' | 'low',
  dueDate?: number
): Promise<TodoItem> {
  const trimmed = title.trim()
  if (!trimmed) throw new Error('标题不能为空')
  const state = await loadState()
  const now = Date.now()
  const item: TodoItem = {
    id: newId(),
    title: trimmed,
    note: note?.trim() || undefined,
    done: false,
    createdAt: now,
    updatedAt: now,
    focusMinutes: 0,
    priority,
    dueDate,
  }
  state.todos.unshift(item)
  await saveState(state)
  return item
}

export async function updateTodo(
  id: string,
  patch: Partial<Pick<TodoItem, 'title' | 'note' | 'done' | 'pinned' | 'focusMinutes' | 'priority' | 'dueDate' | 'checklist' | 'sortOrder'>>
): Promise<TodoItem | null> {
  const state = await loadState()
  const idx = state.todos.findIndex((t) => t.id === id)
  if (idx === -1) return null
  const current = state.todos[idx]
  const next: TodoItem = {
    ...current,
    ...patch,
    updatedAt: Date.now(),
  }
  if (patch.title !== undefined) next.title = patch.title.trim() || current.title

  if (patch.done && !current.done) {
    recordCompletedTodo(state.stats)
  }

  state.todos[idx] = next
  await saveState(state)
  return next
}

export async function removeTodo(id: string): Promise<boolean> {
  const state = await loadState()
  const before = state.todos.length
  state.todos = state.todos.filter((t) => t.id !== id)
  if (state.todos.length === before) return false
  if (state.settings.activeTodoId === id) {
    state.settings.activeTodoId = undefined
  }
  await saveState(state)
  return true
}

export async function toggleDone(id: string): Promise<TodoItem | null> {
  const state = await loadState()
  const item = state.todos.find((t) => t.id === id)
  if (!item) return null
  return updateTodo(id, { done: !item.done })
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const state = await loadState()
  state.settings = { ...state.settings, ...patch }
  await saveState(state)
  return state.settings
}

function todayKey(): string {
  return formatLocalDateKey(new Date())
}

function ensureTodayRecord(stats: Stats): DailyRecord {
  const day = todayKey()
  let record = stats.dailyHistory.find((r) => r.date === day)
  if (!record) {
    record = { date: day, pomodoroCount: 0, focusMinutes: 0, completedTodos: 0 }
    stats.dailyHistory.push(record)
    if (stats.dailyHistory.length > 90) {
      stats.dailyHistory = stats.dailyHistory.slice(-90)
    }
  }
  return record
}

function recordCompletedTodo(stats: Stats): void {
  const record = ensureTodayRecord(stats)
  record.completedTodos += 1
}

export async function recordPomodoroComplete(todoId?: string, minutes?: number): Promise<Stats> {
  const state = await loadState()
  const day = todayKey()
  if (state.stats.lastStatsDate !== day) {
    state.stats.pomodoroToday = 0
    state.stats.focusMinutesToday = 0
    state.stats.lastStatsDate = day
  }

  const mins = Math.max(1, Math.round(minutes || state.settings.pomodoroMinutes))
  state.stats.pomodoroToday += 1
  state.stats.pomodoroTotal += 1
  state.stats.focusMinutesToday += mins

  const record = ensureTodayRecord(state.stats)
  record.pomodoroCount += 1
  record.focusMinutes += mins

  if (todoId) {
    const item = state.todos.find((t) => t.id === todoId)
    if (item) {
      item.focusMinutes = (item.focusMinutes || 0) + mins
      item.updatedAt = Date.now()
    }
  }

  await saveState(state)
  return state.stats
}

export async function addTodoFromInput(
  featureCode: string,
  input: string
): Promise<{ ok: boolean; title?: string; error?: string }> {
  let title: string | null = null
  let priority: 'high' | 'medium' | 'low' | undefined
  let dueDate: number | undefined

  if (featureCode === 'quick-add') {
    const parsed = parseQuickCaptureEnhanced(input || '')
    if (parsed) {
      title = parsed.title
      priority = parsed.priority
      dueDate = parsed.dueDate
    }
  } else if (featureCode === 'capture-selection') {
    title = normalizeSelectionTitle(input || '')
  }

  if (!title) {
    return { ok: false, error: '未识别到待办内容' }
  }

  await addTodo(title, undefined, priority, dueDate)
  return { ok: true, title }
}

export async function addChecklistItem(todoId: string, text: string): Promise<TodoItem | null> {
  const state = await loadState()
  const item = state.todos.find((t) => t.id === todoId)
  if (!item) return null

  const checklist = item.checklist || []
  if (checklist.length >= 20) return item

  const trimmed = text.trim()
  if (!trimmed) return item

  const newItem: ChecklistItem = { id: newId(), text: trimmed, done: false }
  checklist.push(newItem)
  item.checklist = checklist
  item.updatedAt = Date.now()
  await saveState(state)
  return item
}

export async function toggleChecklistItem(todoId: string, checklistId: string): Promise<TodoItem | null> {
  const state = await loadState()
  const item = state.todos.find((t) => t.id === todoId)
  if (!item || !item.checklist) return null

  const ci = item.checklist.find((c) => c.id === checklistId)
  if (!ci) return null

  ci.done = !ci.done
  item.updatedAt = Date.now()

  const allDone = item.checklist.length > 0 && item.checklist.every((c) => c.done)
  if (allDone && !item.done) {
    item.done = true
    recordCompletedTodo(state.stats)
  }

  await saveState(state)
  return item
}

export async function removeChecklistItem(todoId: string, checklistId: string): Promise<TodoItem | null> {
  const state = await loadState()
  const item = state.todos.find((t) => t.id === todoId)
  if (!item || !item.checklist) return null

  item.checklist = item.checklist.filter((c) => c.id !== checklistId)
  item.updatedAt = Date.now()
  await saveState(state)
  return item
}

export async function importAsChecklist(todoId: string, titles: string[]): Promise<TodoItem | null> {
  const state = await loadState()
  const item = state.todos.find((t) => t.id === todoId)
  if (!item) return null

  const checklist = item.checklist || []
  for (const text of titles) {
    if (checklist.length >= 20) break
    const trimmed = text.trim()
    if (!trimmed) continue
    checklist.push({ id: newId(), text: trimmed, done: false })
  }
  item.checklist = checklist
  item.updatedAt = Date.now()
  await saveState(state)
  return item
}

export async function reorderTodos(todoIds: string[]): Promise<void> {
  const state = await loadState()
  todoIds.forEach((id, index) => {
    const item = state.todos.find((t) => t.id === id)
    if (item) item.sortOrder = index
  })
  await saveState(state)
}

export async function getStats(): Promise<Stats> {
  const state = await loadState()
  return state.stats
}
