import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Plus, Trash2, HardDrive } from 'lucide-react'
import { useSession } from './SessionProvider'
import type { VibeSession, VibeSessionState } from './types'

const STATE_LABEL: Record<VibeSessionState, string> = {
  initial: '描述中',
  contract: '契约',
  generating: '生成中',
  ready: '就绪',
  error: '异常'
}

const STATE_DOT: Record<VibeSessionState, string> = {
  initial: 'bg-slate-400',
  contract: 'bg-amber-400',
  generating: 'bg-blue-400 animate-pulse',
  ready: 'bg-emerald-400',
  error: 'bg-rose-400'
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return '刚刚'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} 小时前`
  return `${Math.floor(diff / 86400_000)} 天前`
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

interface Props {
  onNewSession?: () => void
}

export function SessionSwitcher({ onNewSession }: Props) {
  const { sessions, activeSession, activeId, switchSession, deleteSession, getStats } = useSession()
  const [open, setOpen] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (!activeSession && sessions.length === 0) return null

  const stats = showStats ? getStats() : null

  return (
    <div className="relative" ref={dropRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors text-left max-w-[260px]"
      >
        {activeSession ? (
          <>
            <span className={`w-2 h-2 rounded-full shrink-0 ${STATE_DOT[activeSession.state]}`} />
            <span className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">
              {activeSession.pluginName}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
              {STATE_LABEL[activeSession.state]}
            </span>
          </>
        ) : (
          <span className="text-xs text-slate-400">无活跃会话</span>
        )}
        <ChevronDown size={12} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="max-h-64 overflow-auto">
            {sessions.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-slate-400">暂无会话</div>
            ) : (
              sessions.map((s) => (
                <SessionItem
                  key={s.id}
                  session={s}
                  active={s.id === activeId}
                  onSelect={() => { switchSession(s.id); setOpen(false) }}
                  onDelete={() => deleteSession(s.id)}
                />
              ))
            )}
          </div>
          <div className="border-t border-slate-200 dark:border-slate-700 flex items-center">
            <button
              onClick={() => { onNewSession?.(); setOpen(false) }}
              className="flex-1 flex items-center gap-1.5 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              <Plus size={13} /> 新建会话
            </button>
            <button
              onClick={() => setShowStats((v) => !v)}
              className="px-3 py-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              title="存储占用"
            >
              <HardDrive size={13} />
            </button>
          </div>
          {showStats && stats && (
            <div className="border-t border-slate-200 dark:border-slate-700 px-3 py-2 text-[10px] text-slate-400 dark:text-slate-500">
              {stats.count} 个会话 · 总占用 {formatBytes(stats.totalBytes)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SessionItem({ session, active, onSelect, onDelete }: { session: VibeSession; active: boolean; onSelect: () => void; onDelete: () => void }) {
  return (
    <div
      onClick={onSelect}
      className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${active ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${STATE_DOT[session.state]}`} />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{session.pluginName}</div>
        <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
          {STATE_LABEL[session.state]} · {relativeTime(session.lastActiveAt)}
        </div>
      </div>
      {!active && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900/30 text-slate-400 hover:text-rose-500 transition-colors"
          title="删除会话"
        >
          <Trash2 size={12} />
        </button>
      )}
    </div>
  )
}
