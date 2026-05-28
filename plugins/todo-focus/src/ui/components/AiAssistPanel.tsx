import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Sparkles, ListPlus, FileText } from 'lucide-react'
import type { TodoItem } from '../../types/todo'
import { useMulby } from '../hooks/useMulby'

const PLUGIN_ID = 'todo-focus'

interface AiAssistPanelProps {
  todos: TodoItem[]
  modelId: string
  onModelChange: (id: string) => void
  onImport: (titles: string[]) => Promise<void>
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

export default function AiAssistPanel({ todos, modelId, onModelChange, onImport }: AiAssistPanelProps) {
  const { ai, notification, clipboard } = useMulby(PLUGIN_ID)
  const [draft, setDraft] = useState('')
  const [preview, setPreview] = useState<string[]>([])
  const [summary, setSummary] = useState('')
  const [models, setModels] = useState<Array<{ id: string; label: string }>>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [busy, setBusy] = useState<'split' | 'summary' | null>(null)
  const abortedRef = useRef(false)
  const requestIdRef = useRef<string | null>(null)
  const modelsFetchedRef = useRef(false)
  const defaultModelAppliedRef = useRef(false)
  const onModelChangeRef = useRef(onModelChange)
  const modelIdRef = useRef(modelId)

  onModelChangeRef.current = onModelChange
  modelIdRef.current = modelId

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
      if (
        applyDefault &&
        !defaultModelAppliedRef.current &&
        !modelIdRef.current &&
        normalized[0]
      ) {
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
        (chunk: { __requestId?: string; chunkType?: string; content?: string }) => {
          if (chunk.__requestId) {
            requestIdRef.current = chunk.__requestId
            return
          }
          if (abortedRef.current) return
          if (chunk.chunkType === 'text' && chunk.content) onChunk(chunk.content)
        }
      )
      const final = await req
      if (abortedRef.current) return ''
      return extractResponseText(final?.content)
    },
    [ai, modelId, notification]
  )

  const handleSplit = async () => {
    if (!draft.trim()) return
    setBusy('split')
    setPreview([])
    try {
      let acc = ''
      const result = await runAi(
        '你是待办拆解助手。将用户文本拆成独立待办项，只输出 JSON 数组，每项为 {"title":"..."}，不要 markdown 或其它说明。',
        draft,
        (t) => {
          acc += t
          setPreview(parseTitlesFromJson(acc))
        }
      )
      const titles = parseTitlesFromJson(result || acc)
      setPreview(titles)
    } catch (err) {
      if (!abortedRef.current) {
        notification.show(err instanceof Error ? err.message : '拆解失败', 'error')
      }
    } finally {
      setBusy(null)
    }
  }

  const handleSummary = async () => {
    const open = todos.filter((t) => !t.done)
    if (!open.length) {
      notification.show('没有未完成待办可总结', 'warning')
      return
    }
    setBusy('summary')
    setSummary('')
    const list = open.map((t) => `- ${t.title}`).join('\n')
    try {
      let acc = ''
      await runAi(
        '你是待办总结助手。根据列表输出 3-5 条简洁中文要点（bullet），帮助用户把握今日重点，不要废话。',
        list,
        (t) => {
          acc += t
          setSummary(acc)
        }
      )
    } catch (err) {
      if (!abortedRef.current) {
        notification.show(err instanceof Error ? err.message : '总结失败', 'error')
      }
    } finally {
      setBusy(null)
    }
  }

  useEffect(() => {
    if (modelsFetchedRef.current) return
    modelsFetchedRef.current = true
    void fetchModels(true)
  }, [fetchModels])

  const handleImport = async () => {
    if (!preview.length) return
    await onImport(preview)
    setPreview([])
    setDraft('')
    notification.show(`已导入 ${preview.length} 条待办`, 'success')
  }

  return (
    <section className="ai-panel">
      <div className="ai-panel__head">
        <Sparkles size={16} />
        <span>AI 助手</span>
        <button
          type="button"
          className="btn-ghost btn-sm"
          onClick={() => void fetchModels(false)}
          disabled={loadingModels}
        >
          {loadingModels ? <Loader2 size={12} className="spin" /> : models.length ? '刷新模型' : '加载模型'}
        </button>
      </div>

      {models.length > 0 && (
        <select
          className="input select"
          value={modelId}
          onChange={(e) => onModelChange(e.target.value)}
          aria-label="AI 模型"
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      )}

      <textarea
        className="input textarea"
        placeholder="粘贴会议纪要、灵感碎片，AI 拆成待办…"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={3}
      />

      <div className="ai-panel__actions">
        <button type="button" className="btn-secondary btn-sm" onClick={() => void handleSplit()} disabled={busy !== null}>
          {busy === 'split' ? <Loader2 size={14} className="spin" /> : <ListPlus size={14} />}
          智能拆解
        </button>
        <button type="button" className="btn-secondary btn-sm" onClick={() => void handleSummary()} disabled={busy !== null}>
          {busy === 'summary' ? <Loader2 size={14} className="spin" /> : <FileText size={14} />}
          今日总结
        </button>
      </div>

      {preview.length > 0 && (
        <div className="ai-preview">
          <p className="ai-preview__title">预览 ({preview.length})</p>
          <ul>
            {preview.map((t, i) => (
              <li key={`${t}-${i}`}>{t}</li>
            ))}
          </ul>
          <button type="button" className="btn-primary btn-sm" onClick={() => void handleImport()}>
            一键导入
          </button>
        </div>
      )}

      {summary && (
        <div className="ai-summary">
          <pre>{summary}</pre>
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => void clipboard.writeText(summary).then(() => notification.show('已复制', 'success'))}
          >
            复制摘要
          </button>
        </div>
      )}
    </section>
  )
}
