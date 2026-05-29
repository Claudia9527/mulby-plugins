export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

export interface TodoItem {
  id: string
  title: string
  note?: string
  done: boolean
  createdAt: number
  updatedAt: number
  focusMinutes?: number
  pinned?: boolean
  dueDate?: number
  priority?: 'high' | 'medium' | 'low'
  checklist?: ChecklistItem[]
  sortOrder?: number
}

export interface DailyRecord {
  date: string
  pomodoroCount: number
  focusMinutes: number
  completedTodos: number
}

export interface Settings {
  pomodoroMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  aiModelId: string
  activeTodoId?: string
}

export interface Stats {
  pomodoroToday: number
  pomodoroTotal: number
  focusMinutesToday: number
  lastStatsDate?: string
  dailyHistory: DailyRecord[]
}

export interface TodoState {
  todos: TodoItem[]
  settings: Settings
  stats: Stats
}

export const STATE_KEY = 'todo-focus.state.v1'

export const DEFAULT_SETTINGS: Settings = {
  pomodoroMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  aiModelId: '',
}

export const DEFAULT_STATS: Stats = {
  pomodoroToday: 0,
  pomodoroTotal: 0,
  focusMinutesToday: 0,
  dailyHistory: [],
}
