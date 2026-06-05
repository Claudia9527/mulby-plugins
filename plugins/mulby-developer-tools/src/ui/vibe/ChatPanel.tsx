import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Sparkles, MessageSquare } from 'lucide-react'
import { useSession } from './SessionProvider'
import type { VibeMessage, VibeSessionState } from './types'

const PLACEHOLDER: Record<VibeSessionState, string> = {
  initial: '描述你想做的插件…',
  contract: '对契约有什么修改意见？',
  generating: 'AI 正在生成中，请稍候…',
  ready: '描述要修改的内容，例如：点击按钮没反应、界面太丑改成暗色…',
  error: '描述问题或让 AI 修复…'
}

interface Props {
  onSend: (text: string) => void
  disabled?: boolean
  busy?: boolean
  messages?: VibeMessage[]
}

export function ChatPanel({ onSend, disabled, busy, messages }: Props) {
  const { activeSession, activeId, updateSession } = useSession()
  const [text, setText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const state: VibeSessionState = activeSession?.state || 'initial'
  const allMessages = messages || activeSession?.messages || []

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [allMessages.length])

  const send = () => {
    const t = text.trim()
    if (!t || disabled || busy) return
    onSend(t)
    if (activeId) {
      const msg: VibeMessage = { id: `m-${Date.now()}`, role: 'user', content: t, timestamp: Date.now() }
      updateSession(activeId, { messages: [...(activeSession?.messages || []), msg] })
    }
    setText('')
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="border-t border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/50">
      {allMessages.length > 0 && (
        <div className="max-h-32 overflow-auto px-4 pt-2 space-y-1.5">
          {allMessages.slice(-5).map((msg) => (
            <div key={msg.id} className={`text-[11px] flex items-start gap-1.5 ${msg.role === 'user' ? 'text-slate-600 dark:text-slate-300' : 'text-emerald-600 dark:text-emerald-400'}`}>
              <span className="shrink-0 mt-0.5">
                {msg.role === 'user' ? <MessageSquare size={10} /> : <Sparkles size={10} />}
              </span>
              <span className="break-words line-clamp-2">{msg.content}</span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}
      <div className="flex items-end gap-2 px-4 py-2.5">
        <textarea
          ref={textareaRef}
          className="input-base min-h-[36px] max-h-24 leading-relaxed flex-1 resize-none text-[13px]"
          placeholder={PLACEHOLDER[state]}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || busy || state === 'generating'}
          rows={1}
        />
        <button
          className="btn-primary shrink-0 h-9 px-3"
          onClick={send}
          disabled={disabled || busy || !text.trim() || state === 'generating'}
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </div>
      <div className="px-4 pb-1.5 text-[10px] text-slate-400 dark:text-slate-500">
        ⌘/Ctrl + Enter 发送 · 对话贯穿全程，任何阶段可用
      </div>
    </div>
  )
}
