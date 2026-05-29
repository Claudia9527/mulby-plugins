import { useCallback, useEffect, useRef, useState } from 'react'
import { BarChart3, Calendar, Copy, FileText, Loader2, ListPlus, Send, Sparkles } from 'lucide-react'
import type { TodoItem } from '../../types/todo'
import { useMulby } from '../hooks/useMulby'

const PLUGIN_ID = 'todo-focus'

interface AiAssistPanelProps {
  todos: TodoItem[]
  modelId: string
  onModelChange: (id: string) => void
  onImport: (titles: string[]) => Promise<void>
}

type BusyKind = 'chat' | 'split' | 'summary' | 'plan' | 'review' | null

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  titles?: string[]
}

function newMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function extractResponseText(content?: string | Array<{ type?: string; text?: string }>) {
  if (!content) return ''
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .filter((p) => p?.type === 'text' && typeof p.text === 'string')
    .map((p) => p.text)
    .join('')
}

function parseTitlesFromJson(text: string): string[] {
  const trimmed = text.trim()
  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => {
          if (typeof item === 'string') return item.trim()
          if (item && typeof item === 'object' && 'title' in item) {
            return String((item as { title: unknown }).title).trim()
          }
          return ''
        })
        .filter(Boolean)
    }
  } catch {
    // fallback: lines
  }
  return trimmed
    .split('\n')
    .map((l) => l.replace(/^[-*•\d.]+\s*/, '').trim())
    .filter((l) => l.length > 0)
}

function formatTitles(titles: string[]): string {
  return titles.map((title, index) => `${index + 1}. ${title}`).join('\n')
}

export default function AiAssistPanel({ todos, modelId, onModelChange, onImport }: AiAssistPanelProps) {
  const { ai, notification, clipboard } = useMulby(PLUGIN_ID)
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '我可以帮你拆解待办、总结今日重点、规划执行顺序，也可以直接对话。',
    },
  ])
  const [models, setModels] = useState<Array<{ id: string; label: string }>>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [busy, setBusy] = useState<BusyKind>(null)
  const abortedRef = useRef(false)
  const requestIdRef = useRef<string | null>(null)
  const modelsFetchedRef = useRef(false)
  const defaultModelAppliedRef = useRef(false)
  const onModelChangeRef = useRef(onModelChange)
  const modelIdRef = useRef(modelId)
  const endRef = useRef<HTMLDivElement>(null)

  onModelChangeRef.current = onModelChange
  modelIdRef.current = modelId

  const updateMessage = useCallback((id: string, patch: Partial<ChatMessage>) => {
    setMessages((prev) => prev.map((message) => (
      message.id === id ? { ...message, ...patch } : message
    )))
  }, [])

  const fetchModels = useCallback(async (applyDefault: boolean) => {
    try {
      setLoadingModels(true)
      const list = await ai.allModels?.()
      const normalized = Array.isArray(list)
        ? list
            .filter((m: { id?: string }) => m?.id)
            .map((m: { id: string; label?: string }) => ({ id: m.id, label: m.label || m.id }))
        : []
      setModels(normalized)
      if (applyDefault && !defaultModelAppliedRef.current && !modelIdRef.current && normalized[0]) {
        defaultModelAppliedRef.current = true
        onModelChangeRef.current(normalized[0].id)
      }
    } catch (err) {
      notification.show(err instanceof Error ? err.message : '加载模型失败', 'error')
    } finally {
      setLoadingModels(false)
    }
  }, [ai, notification])

  const runAi = useCallback(
    async (system: string, user: string, onChunk: (text: string) => void) => {
      if (!modelId) {
        notification.show('请先在设置中选择 AI 模型', 'warning')
        return ''
      }
      abortedRef.current = false
      requestIdRef.current = null
      const req = ai.call(
        {
          model: modelId,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        },
        (chunk) => {
          if ((chunk as unknown as { __requestId?: string }).__requestId) {
            requestIdRef.current = (chunk as unknown as { __requestId: string }).__requestId
            return
          }
          if (abortedRef.current) return
          if (chunk.chunkType === 'text' && typeof chunk.content === 'string') onChunk(chunk.content)
        }
      )
      const final = await req
      if (abortedRef.current) return ''
      return extractResponseText(final?.content)
    },
    [ai, modelId, notification]
  )

  useEffect(() => {
    if (modelsFetchedRef.current) return
    modelsFetchedRef.current = true
    void fetchModels(true)
  }, [fetchModels])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages, busy])

  const appendConversation = useCallback((userText: string) => {
    const assistantId = newMessageId()
    setMessages((prev) => [
      ...prev,
      { id: newMessageId(), role: 'user', content: userText },
      { id: assistantId, role: 'assistant', content: '' },
    ])
    return assistantId
  }, [])

  const streamAssistant = useCallback(
    async (kind: Exclude<BusyKind, null>, userText: string, system: string, user: string) => {
      const assistantId = appendConversation(userText)
      setBusy(kind)
      try {
        let acc = ''
        const result = await runAi(system, user, (chunk) => {
          acc += chunk
          updateMessage(assistantId, { content: acc })
        })
        updateMessage(assistantId, { content: result || acc || '没有收到有效回复。' })
      } catch (err) {
        if (!abortedRef.current) {
          const message = err instanceof Error ? err.message : 'AI 调用失败'
          updateMessage(assistantId, { content: `调用失败：${message}` })
          notification.show(message, 'error')
        }
      } finally {
        setBusy(null)
      }
    },
    [appendConversation, notification, runAi, updateMessage]
  )

  const handleSend = async () => {
    const text = draft.trim()
    if (!text) return
    setDraft('')
    await streamAssistant(
      'chat',
      text,
      '你是一个简洁的待办助理。结合用户当前待办语境回答，优先给出可执行建议，避免冗长。',
      text
    )
  }

  const handleSplit = async () => {
    const text = draft.trim()
    if (!text) {
      notification.show('请先输入要拆解的内容', 'warning')
      return
    }
    setDraft('')
    const assistantId = appendConversation(`拆解待办：\n${text}`)
    setBusy('split')
    try {
      let acc = ''
      const result = await runAi(
        '你是待办拆解助手。将用户文本拆成独立待办项，只输出 JSON 数组，每项为 {"title":"..."}，不要 markdown 或其它说明。',
        text,
        (chunk) => {
          acc += chunk
          const titles = parseTitlesFromJson(acc)
          updateMessage(assistantId, {
            content: titles.length ? `正在拆解...\n${formatTitles(titles)}` : acc,
            titles: titles.length ? titles : undefined,
          })
        }
      )
      const titles = parseTitlesFromJson(result || acc)
      updateMessage(assistantId, {
        content: titles.length ? `已拆出 ${titles.length} 条待办：\n${formatTitles(titles)}` : '没有拆出可导入的待办。',
        titles: titles.length ? titles : undefined,
      })
    } catch (err) {
      if (!abortedRef.current) {
        const message = err instanceof Error ? err.message : '拆解失败'
        updateMessage(assistantId, { content: `拆解失败：${message}` })
        notification.show(message, 'error')
      }
    } finally {
      setBusy(null)
    }
  }

  const handleSummary = async () => {
    const open = todos.filter((t) => !t.done)
    if (!open.length) { notification.show('没有未完成待办可总结', 'warning'); return }
    const list = open.map((t) => `- ${t.title}${t.priority ? ` [${t.priority}]` : ''}${t.dueDate ? ` 截止:${new Date(t.dueDate).toLocaleDateString()}` : ''}`).join('\n')
    await streamAssistant(
      'summary',
      '生成今日总结',
      '你是待办总结助手。根据列表输出 3-5 条简洁中文要点，帮助用户把握今日重点，不要废话。',
      list
    )
  }

  const handlePlan = async () => {
    const open = todos.filter((t) => !t.done)
    if (!open.length) { notification.show('没有未完成待办可规划', 'warning'); return }
    const list = open.map((t) => {
      let meta = `- ${t.title}`
      if (t.priority) meta += ` [优先级:${t.priority}]`
      if (t.dueDate) meta += ` [截止:${new Date(t.dueDate).toLocaleDateString()}]`
      if (t.focusMinutes) meta += ` [已投入:${t.focusMinutes}分钟]`
      return meta
    }).join('\n')
    await streamAssistant(
      'plan',
      '生成今日规划',
      '你是日程规划助手。根据用户的待办列表（含优先级、截止日期、已投入时间），生成今日建议执行顺序（3-5条），包含预估番茄数。输出简洁中文列表，每项格式：序号. 任务名 → 预计N个番茄。最后一行汇总预计总耗时。',
      list
    )
  }

  const handleReview = async () => {
    const done = todos.filter((t) => t.done)
    const open = todos.filter((t) => !t.done)
    const info = `已完成(${done.length}):\n${done.slice(0, 10).map((t) => `- ${t.title}`).join('\n')}\n\n未完成(${open.length}):\n${open.slice(0, 10).map((t) => `- ${t.title}${t.dueDate ? ` [截止:${new Date(t.dueDate).toLocaleDateString()}]` : ''}`).join('\n')}`
    await streamAssistant(
      'review',
      '生成效率复盘',
      '你是效率复盘助手。对比用户的已完成和未完成待办，输出：1) 完成情况统计 2) 未完成项提醒 3) 一句简短效率简评和建议。简洁中文输出。',
      info
    )
  }

  const handleImport = async (messageId: string, titles: string[]) => {
    if (!titles.length) return
    await onImport(titles)
    updateMessage(messageId, { titles: undefined, content: `已导入 ${titles.length} 条待办。\n${formatTitles(titles)}` })
    notification.show(`已导入 ${titles.length} 条待办`, 'success')
  }

  return (
    <section className="ai-panel">
      <div className="ai-panel__head">
        <div className="ai-panel__title">
          <Sparkles size={16} />
          <span>对话助手</span>
        </div>
        <button
          type="button"
          className="btn-ghost btn-sm"
          onClick={() => void fetchModels(false)}
          disabled={loadingModels}
        >
          {loadingModels ? <Loader2 size={12} className="spin" /> : models.length ? '刷新模型' : '加载模型'}
        </button>
      </div>

      <div className="ai-chat__messages" aria-live="polite">
        {messages.map((message) => (
          <div key={message.id} className={`ai-message ai-message--${message.role}`}>
            <div className="ai-message__bubble">
              <pre>{message.content || (message.role === 'assistant' && busy ? '正在思考...' : '')}</pre>
              {message.titles && message.titles.length > 0 && (
                <button
                  type="button"
                  className="btn-primary btn-sm ai-message__import"
                  onClick={() => void handleImport(message.id, message.titles || [])}
                >
                  一键导入 {message.titles.length} 条
                </button>
              )}
              {message.role === 'assistant' && message.content && (
                <button
                  type="button"
                  className="btn-ghost btn-sm ai-message__copy"
                  onClick={() => void clipboard.writeText(message.content).then(() => notification.show('已复制', 'success'))}
                >
                  <Copy size={12} />
                  复制
                </button>
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="ai-chat__actions">
        <button type="button" className="btn-secondary btn-sm" onClick={() => void handleSplit()} disabled={busy !== null}>
          {busy === 'split' ? <Loader2 size={14} className="spin" /> : <ListPlus size={14} />}
          拆解
        </button>
        <button type="button" className="btn-secondary btn-sm" onClick={() => void handleSummary()} disabled={busy !== null}>
          {busy === 'summary' ? <Loader2 size={14} className="spin" /> : <FileText size={14} />}
          总结
        </button>
        <button type="button" className="btn-secondary btn-sm" onClick={() => void handlePlan()} disabled={busy !== null}>
          {busy === 'plan' ? <Loader2 size={14} className="spin" /> : <Calendar size={14} />}
          规划
        </button>
        <button type="button" className="btn-secondary btn-sm" onClick={() => void handleReview()} disabled={busy !== null}>
          {busy === 'review' ? <Loader2 size={14} className="spin" /> : <BarChart3 size={14} />}
          复盘
        </button>
      </div>

      <div className="ai-chat__composer">
        <textarea
          className="input textarea ai-chat__input"
          placeholder="输入问题，或粘贴内容后点“拆解”..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void handleSend()
            }
          }}
          rows={3}
        />
        <div className="ai-chat__side">
          {models.length > 0 && (
            <select
              className="ai-chat__model-select"
              value={modelId}
              onChange={(e) => onModelChange(e.target.value)}
              aria-label="AI 模型"
              title="AI 模型"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          )}
          <button type="button" className="btn-primary ai-chat__send" onClick={() => void handleSend()} disabled={busy !== null || !draft.trim()}>
            {busy === 'chat' ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </section>
  )
}
