import {
  DEFAULT_SETTINGS,
  DEFAULT_STATS,
  STATE_KEY,
  type Settings,
  type Stats,
  type TodoItem,
  type TodoState,
} from '../types/todo'
import { normalizeSelectionTitle, parseQuickCapture } from './parseQuickCapture'

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
  const stats = { ...DEFAULT_STATS, ...(v.stats || {}) }
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
  return state.todos.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    if (a.done !== b.done) return a.done ? 1 : -1
    return b.updatedAt - a.updatedAt
  })
}

export async function getState(): Promise<TodoState> {
  return loadState()
}

export async function addTodo(title: string, note?: string): Promise<TodoItem> {
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
  }
  state.todos.unshift(item)
  await saveState(state)
  return item
}

export async function updateTodo(
  id: string,
  patch: Partial<Pick<TodoItem, 'title' | 'note' | 'done' | 'pinned' | 'focusMinutes'>>
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
  return new Date().toISOString().slice(0, 10)
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
  if (featureCode === 'quick-add') {
    title = parseQuickCapture(input || '')
  } else if (featureCode === 'capture-selection') {
    title = normalizeSelectionTitle(input || '')
  }

  if (!title) {
    return { ok: false, error: '未识别到待办内容' }
  }

  await addTodo(title)
  return { ok: true, title }
}
