import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, EyeOff, Settings } from 'lucide-react'
import { useMulby } from '../hooks/useMulby'
import SettingsPanel from './SettingsPanel'
import type { BookEntry, ReaderSettings } from '../App'

const PLUGIN_ID = 'novel-reader'

export default function Reader({ book, content, settings, onBack, onSettingsChange }: {
  book: BookEntry
  content: string
  settings: ReaderSettings
  onBack: () => void
  onSettingsChange: (s: ReaderSettings) => void
}) {
  const { host, window: mulbyWindow } = useMulby(PLUGIN_ID)
  const call = (method: string, ...args: unknown[]) =>
    host.call(method, ...args).then((r: any) => r.data)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollProgress, setScrollProgress] = useState(book.progress)
  const [showSettings, setShowSettings] = useState(false)
  const restoringRef = useRef(false)

  // Restore scroll position
  useEffect(() => {
    async function restore() {
      restoringRef.current = true
      const savedProgress = await call('getProgress', book.id)
      if (containerRef.current && savedProgress > 0) {
        const el = containerRef.current
        const maxScroll = el.scrollHeight - el.clientHeight
        el.scrollTop = maxScroll * savedProgress
      }
      requestAnimationFrame(() => { restoringRef.current = false })
    }
    restore()
  }, [book.id, content])

  // Track scroll progress
  const handleScroll = useCallback(() => {
    if (restoringRef.current) return
    const el = containerRef.current
    if (!el) return
    const maxScroll = el.scrollHeight - el.clientHeight
    const progress = maxScroll > 0 ? el.scrollTop / maxScroll : 0
    setScrollProgress(progress)
  }, [])

  // Debounced save progress
  useEffect(() => {
    const timer = setTimeout(() => {
      call('saveProgress', book.id, scrollProgress)
    }, 500)
    return () => clearTimeout(timer)
  }, [scrollProgress, book.id, host])

  // Boss key
  const handleBossKey = useCallback(() => {
    mulbyWindow.hide(true)
  }, [mulbyWindow])

  // Keyboard: PageUp/PageDown, ArrowUp/Down
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const el = containerRef.current
      if (!el) return
      const step = el.clientHeight * 0.8
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault()
        el.scrollBy({ top: step, behavior: 'smooth' })
      }
      if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault()
        el.scrollBy({ top: -step, behavior: 'smooth' })
      }
      if (e.key === 'Escape') {
        handleBossKey()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleBossKey])

  const percent = Math.round(scrollProgress * 100)

  return (
    <div className="flex flex-col h-full">
      {/* Title bar */}
      <div
        className="shrink-0 flex items-center gap-3 px-4 py-2 border-b border-[var(--border)]"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <button
          className="p-1.5 rounded-lg hover:bg-[var(--border)] transition-colors"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          onClick={onBack}
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="flex-1 text-sm font-medium text-[var(--text-1)] truncate">{book.title}</h2>
        <span className="text-xs text-[var(--text-3)]">{percent}%</span>
      </div>

      {/* Reading area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-8 py-6 select-text"
        onScroll={handleScroll}
        style={{ userSelect: 'text' }}
      >
        <div
          className="max-w-2xl mx-auto whitespace-pre-wrap break-words leading-relaxed"
          style={{
            fontSize: `${settings.fontSize}px`,
            lineHeight: settings.lineHeight,
            color: 'var(--text-1)',
          }}
        >
          {content || <span className="text-[var(--text-3)]">文件内容为空</span>}
        </div>

        {/* End marker with progress */}
        <div className="max-w-2xl mx-auto mt-12 pb-8 text-center">
          <p className="text-xs text-[var(--text-3)]">
            {percent === 100 ? '已读完' : `已阅读 ${percent}%`}
          </p>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2 border-t border-[var(--border)] bg-[var(--surface)]">
        <span className="text-xs text-[var(--text-3)]">
          进度 {percent}%
        </span>
        <div className="flex items-center gap-2">
          <button
            className="p-2 rounded-lg hover:bg-[var(--border)] transition-colors text-[var(--text-2)]"
            title="返回书架"
            onClick={onBack}
          >
            <ArrowLeft size={16} />
          </button>
          <button
            className="p-2 rounded-lg hover:bg-[var(--border)] transition-colors text-[var(--text-2)]"
            title="设置"
            onClick={() => setShowSettings(true)}
          >
            <Settings size={16} />
          </button>
          <button
            className="p-2 rounded-lg hover:bg-[var(--border)] transition-colors text-[var(--text-2)]"
            title="老板键 (Esc)"
            onClick={handleBossKey}
          >
            <EyeOff size={16} />
          </button>
        </div>
      </div>

      {/* Settings modal */}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onChange={onSettingsChange}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}
