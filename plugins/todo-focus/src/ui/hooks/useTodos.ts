import { useCallback, useEffect, useState } from 'react'
import type { Settings, Stats, TodoItem, TodoState } from '../../types/todo'
import { unwrapHostResult } from '../lib/hostResult'
import { useMulby } from './useMulby'

const PLUGIN_ID = 'todo-focus'

export function useTodos() {
  const { host, notification } = useMulby(PLUGIN_ID)
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const state = unwrapHostResult<TodoState>(await host.call('getState'))
      setTodos(state?.todos || [])
      setSettings(state?.settings ?? null)
      setStats(state?.stats ?? null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : '加载失败'
      notification.show(msg, 'error')
    } finally {
      setLoading(false)
    }
  }, [host, notification])

  useEffect(() => {
    void refresh()
    const onVis = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [refresh])

  const addTodo = useCallback(
    async (title: string, note?: string) => {
      const item = unwrapHostResult<TodoItem>(await host.call('addTodo', title, note))
      await refresh()
      return item
    },
    [host, refresh]
  )

  const updateTodo = useCallback(
    async (id: string, patch: Parameters<typeof host.call>[1] extends string ? never : object) => {
      await host.call('updateTodo', id, patch)
      await refresh()
    },
    [host, refresh]
  )

  const removeTodo = useCallback(
    async (id: string) => {
      await host.call('removeTodo', id)
      await refresh()
    },
    [host, refresh]
  )

  const toggleDone = useCallback(
    async (id: string) => {
      await host.call('toggleDone', id)
      await refresh()
    },
    [host, refresh]
  )

  const saveSettings = useCallback(
    async (patch: Partial<Settings>) => {
      const next = unwrapHostResult<Settings>(await host.call('saveSettings', patch))
      setSettings(next)
      return next
    },
    [host]
  )

  const recordPomodoro = useCallback(
    async (todoId?: string, minutes?: number) => {
      const next = unwrapHostResult<Stats>(await host.call('recordPomodoroComplete', todoId, minutes))
      setStats(next)
      await refresh()
      return next
    },
    [host, refresh]
  )

  return {
    todos,
    settings,
    stats,
    loading,
    refresh,
    addTodo,
    updateTodo,
    removeTodo,
    toggleDone,
    saveSettings,
    recordPomodoro,
  }
}
