import { useCallback, useRef, useState } from 'react'

export interface HistoryState<T> {
  state: T
  set: (next: T | ((current: T) => T), options?: { commit?: boolean }) => void
  reset: (next: T) => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
}

interface InternalHistory<T> {
  past: T[]
  present: T
  future: T[]
}

const MAX_HISTORY = 100

export function useHistoryState<T>(initial: T): HistoryState<T> {
  const [history, setHistory] = useState<InternalHistory<T>>({ past: [], present: initial, future: [] })
  const presentRef = useRef(initial)
  presentRef.current = history.present

  const set = useCallback((next: T | ((current: T) => T), options?: { commit?: boolean }) => {
    const commit = options?.commit ?? true
    setHistory((current) => {
      const resolved = typeof next === 'function' ? (next as (value: T) => T)(current.present) : next
      if (Object.is(resolved, current.present)) return current
      if (!commit) {
        return { ...current, present: resolved, future: [] }
      }
      const past = [...current.past, current.present]
      if (past.length > MAX_HISTORY) past.shift()
      return { past, present: resolved, future: [] }
    })
  }, [])

  const reset = useCallback((next: T) => {
    setHistory({ past: [], present: next, future: [] })
  }, [])

  const undo = useCallback(() => {
    setHistory((current) => {
      if (!current.past.length) return current
      const previous = current.past[current.past.length - 1]
      return {
        past: current.past.slice(0, -1),
        present: previous,
        future: [current.present, ...current.future]
      }
    })
  }, [])

  const redo = useCallback(() => {
    setHistory((current) => {
      if (!current.future.length) return current
      const next = current.future[0]
      return {
        past: [...current.past, current.present],
        present: next,
        future: current.future.slice(1)
      }
    })
  }, [])

  return {
    state: history.present,
    set,
    reset,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0
  }
}
