import { useCallback, useEffect, useRef, useState } from 'react'
import type { VibeSession, SessionStorageStats } from './types'
import { MAX_SESSIONS, MAX_MESSAGES_PERSISTED } from './types'

const SESSIONS_KEY = 'vibe-sessions'
const ACTIVE_KEY = 'vibe-active-session'

const storage = () => (window as any)?.mulby?.storage

function generateId(): string {
  return `vs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function trimMessages(session: VibeSession): VibeSession {
  if (session.messages.length <= MAX_MESSAGES_PERSISTED) return session
  return { ...session, messages: session.messages.slice(-MAX_MESSAGES_PERSISTED) }
}

function enforceLimits(sessions: VibeSession[]): VibeSession[] {
  const sorted = [...sessions].sort((a, b) => b.lastActiveAt - a.lastActiveAt)
  return sorted.slice(0, MAX_SESSIONS)
}

async function loadSessions(): Promise<VibeSession[]> {
  try {
    const raw = await storage()?.get?.(SESSIONS_KEY)
    if (!raw || !Array.isArray(raw)) return []
    return raw as VibeSession[]
  } catch {
    return []
  }
}

async function saveSessions(sessions: VibeSession[]): Promise<void> {
  try {
    const trimmed = enforceLimits(sessions.map(trimMessages))
    await storage()?.set?.(SESSIONS_KEY, trimmed)
  } catch { /* 静默失败 */ }
}

async function loadActiveId(): Promise<string | null> {
  try {
    return (await storage()?.get?.(ACTIVE_KEY)) || null
  } catch {
    return null
  }
}

async function saveActiveId(id: string | null): Promise<void> {
  try {
    await storage()?.set?.(ACTIVE_KEY, id)
  } catch { /* 静默失败 */ }
}

export function useVibeSession() {
  const [sessions, setSessions] = useState<VibeSession[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const activeSession = sessions.find((s) => s.id === activeId) || null

  useEffect(() => {
    let mounted = true
    void (async () => {
      const [list, id] = await Promise.all([loadSessions(), loadActiveId()])
      if (!mounted) return
      setSessions(list)
      setActiveId(id && list.some((s) => s.id === id) ? id : list[0]?.id || null)
      setLoaded(true)
    })()
    return () => { mounted = false }
  }, [])

  const persist = useCallback((nextSessions: VibeSession[], nextActiveId: string | null) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      void saveSessions(nextSessions)
      void saveActiveId(nextActiveId)
    }, 500)
  }, [])

  const createSession = useCallback((partial: Partial<VibeSession> & { pluginPath: string; pluginName: string }): VibeSession => {
    const now = Date.now()
    const session: VibeSession = {
      id: generateId(),
      state: 'initial',
      contract: null,
      messages: [],
      contextSummary: '',
      sentence: '',
      vibeMode: 'create',
      genDepth: 'full',
      selectedModel: '',
      createdAt: now,
      lastActiveAt: now,
      ...partial
    }
    setSessions((prev) => {
      const next = [session, ...prev.filter((s) => s.pluginPath !== session.pluginPath)]
      persist(next, session.id)
      return next
    })
    setActiveId(session.id)
    return session
  }, [persist])

  const updateSession = useCallback((id: string, patch: Partial<VibeSession>) => {
    setSessions((prev) => {
      const next = prev.map((s) => s.id === id ? { ...s, ...patch, lastActiveAt: Date.now() } : s)
      persist(next, activeId)
      return next
    })
  }, [persist, activeId])

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id)
      const newActiveId = activeId === id ? (next[0]?.id || null) : activeId
      setActiveId(newActiveId)
      persist(next, newActiveId)
      return next
    })
  }, [persist, activeId])

  const switchSession = useCallback((id: string) => {
    if (!sessions.some((s) => s.id === id)) return
    setActiveId(id)
    void saveActiveId(id)
  }, [sessions])

  const findByPath = useCallback((pluginPath: string): VibeSession | null => {
    return sessions.find((s) => s.pluginPath === pluginPath) || null
  }, [sessions])

  const getStats = useCallback((): SessionStorageStats => {
    const items = sessions.map((s) => ({
      id: s.id,
      name: s.pluginName,
      bytes: new Blob([JSON.stringify(trimMessages(s))]).size,
      lastActiveAt: s.lastActiveAt
    }))
    return {
      count: sessions.length,
      totalBytes: items.reduce((sum, i) => sum + i.bytes, 0),
      sessions: items.sort((a, b) => b.lastActiveAt - a.lastActiveAt)
    }
  }, [sessions])

  const clearAll = useCallback(async () => {
    setSessions([])
    setActiveId(null)
    await saveSessions([])
    await saveActiveId(null)
  }, [])

  return {
    sessions,
    activeSession,
    activeId,
    loaded,
    createSession,
    updateSession,
    deleteSession,
    switchSession,
    findByPath,
    getStats,
    clearAll
  }
}
