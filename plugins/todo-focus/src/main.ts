/// <reference path="./types/mulby.d.ts" />
import { addTodoFromInput } from './store/todoStore'
import * as store from './store/todoStore'

declare const mulby: {
  notification: { show: (msg: string, type?: string) => void }
}

type PluginContext = BackendPluginContext

export function onLoad() {
  console.log('[todo-focus] loaded')
}

export function onUnload() {
  console.log('[todo-focus] unloaded')
}

export function onEnable() {
  console.log('[todo-focus] enabled')
}

export function onDisable() {
  console.log('[todo-focus] disabled')
}

export async function run(context: PluginContext) {
  const code = context.featureCode || ''
  const input = context.input || ''

  if (code === 'quick-add' || code === 'capture-selection') {
    const result = await addTodoFromInput(code, input)
    if (!result.ok) {
      mulby.notification.show(result.error || '未识别到待办内容', 'warning')
      return
    }
    mulby.notification.show(`已添加：${result.title}`)
    return
  }

  if (code === 'main') {
    return
  }
}

export const rpc = {
  async listTodos() {
    return store.listTodos()
  },

  async getState() {
    return store.getState()
  },

  async getStats() {
    return store.getStats()
  },

  async addTodo(title: string, note?: string, priority?: 'high' | 'medium' | 'low', dueDate?: number) {
    return store.addTodo(title, note, priority, dueDate)
  },

  async updateTodo(
    id: string,
    patch: {
      title?: string
      note?: string
      done?: boolean
      pinned?: boolean
      focusMinutes?: number
      priority?: 'high' | 'medium' | 'low'
      dueDate?: number
      checklist?: Array<{ id: string; text: string; done: boolean }>
      sortOrder?: number
    }
  ) {
    return store.updateTodo(id, patch)
  },

  async removeTodo(id: string) {
    return store.removeTodo(id)
  },

  async toggleDone(id: string) {
    return store.toggleDone(id)
  },

  async saveSettings(patch: {
    pomodoroMinutes?: number
    shortBreakMinutes?: number
    longBreakMinutes?: number
    aiModelId?: string
    activeTodoId?: string
  }) {
    return store.saveSettings(patch)
  },

  async recordPomodoroComplete(todoId?: string, minutes?: number) {
    return store.recordPomodoroComplete(todoId, minutes)
  },

  async addChecklistItem(todoId: string, text: string) {
    return store.addChecklistItem(todoId, text)
  },

  async toggleChecklistItem(todoId: string, checklistId: string) {
    return store.toggleChecklistItem(todoId, checklistId)
  },

  async removeChecklistItem(todoId: string, checklistId: string) {
    return store.removeChecklistItem(todoId, checklistId)
  },

  async importAsChecklist(todoId: string, titles: string[]) {
    return store.importAsChecklist(todoId, titles)
  },

  async reorderTodos(todoIds: string[]) {
    return store.reorderTodos(todoIds)
  },
}

const plugin = { onLoad, onUnload, onEnable, onDisable, run, rpc }
export default plugin
