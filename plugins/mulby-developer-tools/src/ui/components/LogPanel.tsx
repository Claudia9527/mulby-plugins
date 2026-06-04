import { useEffect, useRef } from 'react'
import { Terminal, Trash2 } from 'lucide-react'
import type { LogEntry } from '../types'

const levelColor: Record<string, string> = {
  info: 'text-slate-500 dark:text-slate-400',
  success: 'text-emerald-600 dark:text-emerald-400',
  error: 'text-rose-600 dark:text-rose-400',
  warn: 'text-amber-600 dark:text-amber-400'
}

export function LogPanel({ logs, onClear }: { logs: LogEntry[]; onClear: () => void }) {
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <Terminal size={14} /> 诊断日志
        </div>
        <button onClick={onClear} className="btn-ghost !px-2 !py-1 text-xs" disabled={logs.length === 0}>
          <Trash2 size={12} /> 清空
        </button>
      </div>
      <div className="flex-1 overflow-auto px-3 py-2 mono text-[12px] leading-relaxed bg-slate-50/60 dark:bg-black/30">
        {logs.length === 0 ? (
          <div className="text-slate-400 dark:text-slate-600 italic">暂无日志，执行构建/打包/创建后将在此显示流式输出。</div>
        ) : (
          logs.map((l) => (
            <div key={l.id} className="whitespace-pre-wrap break-words">
              <span className="text-slate-400 dark:text-slate-600 mr-2">
                {new Date(l.ts).toLocaleTimeString('zh-CN', { hour12: false })}
              </span>
              <span className={levelColor[l.level] || levelColor.info}>{l.text}</span>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
    </div>
  )
}
