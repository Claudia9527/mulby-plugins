import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, startTransition } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Bold,
  ClipboardPaste,
  CheckSquare,
  Code2,
  Copy,
  Eraser,
  FileDown,
  FileInput,
  Heading1,
  Heading2,
  Italic,
  Link2,
  List,
  Quote,
  Save,
  SeparatorHorizontal
} from 'lucide-react'
import { useMulby } from './hooks/useMulby'

const PLUGIN_ID = 'markdown-editor'
const STORAGE_DRAFT_KEY = 'draft:markdown-editor:v1'
const DEFAULT_EXPORT_NAME = 'markdown-note.md'
const EDITOR_PLACEHOLDER = [
  '# 在这里开始写 Markdown',
  '',
  '- 左侧编辑',
  '- 右侧实时预览',
  '- `Cmd/Ctrl + S` 可立即保存草稿'
].join('\n')

interface PluginInitData {
  pluginName: string
  featureCode: string
  input: string
  mode?: string
  route?: string
}

interface DraftPayload {
  content: string
  updatedAt: number
}

interface EditorChangeResult {
  nextContent: string
  selectionStart: number
  selectionEnd: number
}

function normalizeDraft(value: unknown): DraftPayload | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const content = 'content' in value && typeof value.content === 'string' ? value.content : null
  const updatedAt = 'updatedAt' in value && typeof value.updatedAt === 'number' ? value.updatedAt : 0
  if (content === null) {
    return null
  }

  return { content, updatedAt }
}

function basename(path: string) {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? path
}

function firstPathFromOpenDialog(result: unknown): string | undefined {
  if (Array.isArray(result) && typeof result[0] === 'string') {
    return result[0]
  }
  if (result && typeof result === 'object' && 'filePaths' in result) {
    const filePaths = (result as { filePaths?: string[] }).filePaths
    if (Array.isArray(filePaths) && typeof filePaths[0] === 'string') {
      return filePaths[0]
    }
  }
  return undefined
}

async function readFileAsUtf8(
  readFile: (path: string, encoding?: 'utf-8' | 'base64') => Promise<string | ArrayBuffer | Uint8Array>,
  path: string
) {
  const raw = await readFile(path, 'utf-8')
  if (typeof raw === 'string') {
    return raw
  }
  if (raw instanceof Uint8Array) {
    return new TextDecoder('utf-8').decode(raw)
  }
  if (raw instanceof ArrayBuffer) {
    return new TextDecoder('utf-8').decode(raw)
  }
  return ''
}

function formatTimestamp(value: number | null) {
  if (!value) {
    return '未保存'
  }

  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(value)
}

function wrapText(value: string, start: number, end: number, prefix: string, suffix: string, placeholder: string): EditorChangeResult {
  const selection = value.slice(start, end)
  const inner = selection || placeholder
  const replacement = `${prefix}${inner}${suffix}`
  return {
    nextContent: `${value.slice(0, start)}${replacement}${value.slice(end)}`,
    selectionStart: start + prefix.length,
    selectionEnd: start + prefix.length + inner.length
  }
}

function prefixSelectedLines(value: string, start: number, end: number, prefix: string): EditorChangeResult {
  const blockStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1
  const nextBreak = value.indexOf('\n', end)
  const blockEnd = nextBreak === -1 ? value.length : nextBreak
  const block = value.slice(blockStart, blockEnd)
  const replacement = block
    .split('\n')
    .map((line) => `${prefix}${line}`)
    .join('\n')

  return {
    nextContent: `${value.slice(0, blockStart)}${replacement}${value.slice(blockEnd)}`,
    selectionStart: blockStart,
    selectionEnd: blockStart + replacement.length
  }
}

function insertBlock(value: string, start: number, end: number, snippet: string, cursorOffset = 0): EditorChangeResult {
  return {
    nextContent: `${value.slice(0, start)}${snippet}${value.slice(end)}`,
    selectionStart: start + cursorOffset,
    selectionEnd: start + cursorOffset
  }
}

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [content, setContent] = useState('')
  const [hydrated, setHydrated] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [sourceLabel, setSourceLabel] = useState('新草稿')
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const lastPersistedRef = useRef('')
  const hasInitPayloadRef = useRef(false)
  const { clipboard, dialog, filesystem, notification, storage } = useMulby(PLUGIN_ID)
  const deferredContent = useDeferredValue(content)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const initialTheme = (params.get('theme') as 'light' | 'dark') || 'light'
    setTheme(initialTheme)
    document.documentElement.classList.toggle('dark', initialTheme === 'dark')

    window.mulby?.onThemeChange?.((nextTheme: 'light' | 'dark') => {
      setTheme(nextTheme)
      document.documentElement.classList.toggle('dark', nextTheme === 'dark')
    })

    window.mulby?.onPluginInit?.((data: PluginInitData) => {
      const incoming = data.input ?? ''
      if (!incoming.trim()) {
        return
      }

      hasInitPayloadRef.current = true
      setSourceLabel(data.featureCode === 'edit-selection' ? '来自划词内容' : '带参启动')
      setActiveFilePath(null)
      setSavedAt(null)
      lastPersistedRef.current = ''
      startTransition(() => {
        setContent(incoming)
      })
    })

    let cancelled = false

    async function loadDraft() {
      try {
        const draft = normalizeDraft(await storage.get(STORAGE_DRAFT_KEY))
        if (!cancelled && !hasInitPayloadRef.current && draft) {
          lastPersistedRef.current = draft.content
          setContent(draft.content)
          setSavedAt(draft.updatedAt)
          setSourceLabel('已恢复上次草稿')
        }
      } finally {
        if (!cancelled) {
          setHydrated(true)
        }
      }
    }

    void loadDraft()

    return () => {
      cancelled = true
    }
  }, [storage])

  const isDirty = hydrated && content !== lastPersistedRef.current
  const previewIsUpdating = deferredContent !== content

  const persistDraft = useCallback(async (showToast: boolean) => {
    setSaving(true)
    try {
      const now = Date.now()
      if (content.trim()) {
        await storage.set(STORAGE_DRAFT_KEY, { content, updatedAt: now })
      } else {
        await storage.remove(STORAGE_DRAFT_KEY)
      }
      lastPersistedRef.current = content
      setSavedAt(now)
      if (showToast) {
        notification.show(content.trim() ? '草稿已保存' : '空草稿已清除', 'success')
      }
    } catch (error) {
      console.error('[markdown-editor] persistDraft', error)
      notification.show('保存草稿失败', 'error')
    } finally {
      setSaving(false)
    }
  }, [content, notification, storage])

  useEffect(() => {
    if (!hydrated || !isDirty) {
      return
    }

    const timer = window.setTimeout(() => {
      void persistDraft(false)
    }, 600)

    return () => {
      window.clearTimeout(timer)
    }
  }, [hydrated, isDirty, persistDraft])

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void persistDraft(true)
      }
    }

    window.addEventListener('keydown', handleKeydown)
    return () => {
      window.removeEventListener('keydown', handleKeydown)
    }
  }, [persistDraft])

  const applyEditorChange = useCallback((transform: (value: string, start: number, end: number) => EditorChangeResult) => {
    const textarea = editorRef.current
    if (!textarea) {
      return
    }

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const next = transform(content, start, end)
    setContent(next.nextContent)

    window.requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(next.selectionStart, next.selectionEnd)
    })
  }, [content])

  const handleOpenFile = useCallback(async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: '打开 Markdown 文件',
        properties: ['openFile'],
        filters: [
          { name: 'Markdown', extensions: ['md', 'markdown', 'txt'] }
        ]
      })
      const path = firstPathFromOpenDialog(result)
      if (!path) {
        return
      }

      const fileContent = await readFileAsUtf8(filesystem.readFile, path)
      lastPersistedRef.current = ''
      setActiveFilePath(path)
      setSourceLabel(`载入 ${basename(path)}`)
      setSavedAt(null)
      startTransition(() => {
        setContent(fileContent)
      })
      notification.show('文件已载入', 'success')
    } catch (error) {
      console.error('[markdown-editor] handleOpenFile', error)
      notification.show('读取文件失败', 'error')
    }
  }, [dialog, filesystem, notification])

  const handleExportFile = useCallback(async () => {
    try {
      const target = await dialog.showSaveDialog({
        title: '导出 Markdown 文件',
        defaultPath: activeFilePath ?? DEFAULT_EXPORT_NAME,
        buttonLabel: '导出',
        filters: [
          { name: 'Markdown', extensions: ['md'] },
          { name: 'Text', extensions: ['txt'] }
        ]
      })

      if (!target) {
        return
      }

      await filesystem.writeFile(target, content, 'utf-8')
      setActiveFilePath(target)
      notification.show(`已导出到 ${basename(target)}`, 'success')
    } catch (error) {
      console.error('[markdown-editor] handleExportFile', error)
      notification.show('导出文件失败', 'error')
    }
  }, [activeFilePath, content, dialog, filesystem, notification])

  const handlePasteClipboard = useCallback(async () => {
    try {
      const text = await clipboard.readText()
      if (!text.trim()) {
        notification.show('剪贴板里没有可粘贴的文本', 'warning')
        return
      }

      const textarea = editorRef.current
      if (!textarea) {
        setContent(text)
      } else {
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const nextContent = `${content.slice(0, start)}${text}${content.slice(end)}`
        setContent(nextContent)
        window.requestAnimationFrame(() => {
          textarea.focus()
          const cursor = start + text.length
          textarea.setSelectionRange(cursor, cursor)
        })
      }

      setSourceLabel('来自剪贴板')
      notification.show('已插入剪贴板文本', 'success')
    } catch (error) {
      console.error('[markdown-editor] handlePasteClipboard', error)
      notification.show('读取剪贴板失败', 'error')
    }
  }, [clipboard, content, notification])

  const handleCopyMarkdown = useCallback(async () => {
    try {
      await clipboard.writeText(content)
      notification.show('Markdown 已复制到剪贴板', 'success')
    } catch (error) {
      console.error('[markdown-editor] handleCopyMarkdown', error)
      notification.show('复制失败', 'error')
    }
  }, [clipboard, content, notification])

  const handleClear = useCallback(() => {
    setContent('')
    setSourceLabel('新草稿')
    setActiveFilePath(null)
    notification.show('内容已清空', 'info')
    window.requestAnimationFrame(() => editorRef.current?.focus())
  }, [notification])

  const toolbarActions = useMemo(() => ([
    {
      label: 'H1',
      title: '一级标题',
      icon: Heading1,
      onClick: () => applyEditorChange((value, start, end) => prefixSelectedLines(value, start, end, '# '))
    },
    {
      label: 'H2',
      title: '二级标题',
      icon: Heading2,
      onClick: () => applyEditorChange((value, start, end) => prefixSelectedLines(value, start, end, '## '))
    },
    {
      label: '粗体',
      title: '加粗',
      icon: Bold,
      onClick: () => applyEditorChange((value, start, end) => wrapText(value, start, end, '**', '**', '加粗文本'))
    },
    {
      label: '斜体',
      title: '斜体',
      icon: Italic,
      onClick: () => applyEditorChange((value, start, end) => wrapText(value, start, end, '*', '*', '斜体文本'))
    },
    {
      label: '链接',
      title: '插入链接',
      icon: Link2,
      onClick: () => applyEditorChange((value, start, end) => {
        const selected = value.slice(start, end) || '链接文字'
        const snippet = `[${selected}](https://example.com)`
        return {
          nextContent: `${value.slice(0, start)}${snippet}${value.slice(end)}`,
          selectionStart: start + 1,
          selectionEnd: start + 1 + selected.length
        }
      })
    },
    {
      label: '引用',
      title: '引用块',
      icon: Quote,
      onClick: () => applyEditorChange((value, start, end) => prefixSelectedLines(value, start, end, '> '))
    },
    {
      label: '代码',
      title: '代码',
      icon: Code2,
      onClick: () => applyEditorChange((value, start, end) => {
        const selection = value.slice(start, end)
        if (selection.includes('\n')) {
          return wrapText(value, start, end, '```\n', '\n```', 'code block')
        }
        return wrapText(value, start, end, '`', '`', 'inline code')
      })
    },
    {
      label: '列表',
      title: '无序列表',
      icon: List,
      onClick: () => applyEditorChange((value, start, end) => prefixSelectedLines(value, start, end, '- '))
    },
    {
      label: '任务',
      title: '任务列表',
      icon: CheckSquare,
      onClick: () => applyEditorChange((value, start, end) => prefixSelectedLines(value, start, end, '- [ ] '))
    },
    {
      label: '分割线',
      title: '插入分割线',
      icon: SeparatorHorizontal,
      onClick: () => applyEditorChange((value, start, end) => insertBlock(value, start, end, '\n---\n'))
    }
  ]), [applyEditorChange])

  const lineCount = content.length === 0 ? 0 : content.split('\n').length
  const charCount = Array.from(content).length

  return (
    <div className={`app theme-${theme}`}>
      <header className="toolbar">
        <div className="toolbar-actions">
          <button type="button" className="action-btn" onClick={handleOpenFile}>
            <FileInput size={15} />
            打开
          </button>
          <button type="button" className="action-btn" onClick={handlePasteClipboard}>
            <ClipboardPaste size={15} />
            粘贴
          </button>
          <button type="button" className="action-btn action-btn-primary" onClick={() => void persistDraft(true)} disabled={saving}>
            <Save size={15} />
            {saving ? '保存中' : '保存草稿'}
          </button>
          <button type="button" className="action-btn" onClick={handleExportFile}>
            <FileDown size={15} />
            导出 .md
          </button>
          <button type="button" className="action-btn" onClick={() => void handleCopyMarkdown()}>
            <Copy size={15} />
            复制
          </button>
          <button type="button" className="action-btn action-btn-danger" onClick={handleClear}>
            <Eraser size={15} />
            清空
          </button>
        </div>

        <div className="toolbar-formatters">
          {toolbarActions.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.label}
                type="button"
                className="formatter-btn"
                onClick={item.onClick}
                title={item.title}
              >
                <Icon size={15} />
                {item.label}
              </button>
            )
          })}
        </div>
      </header>

      <section className="status-bar">
        <div className="status-group">
          <span className="status-pill">{sourceLabel}</span>
          <span className={`status-pill ${isDirty ? 'is-dirty' : 'is-saved'}`}>
            {isDirty ? '有未持久化修改' : `已保存 ${formatTimestamp(savedAt)}`}
          </span>
          {previewIsUpdating && <span className="status-pill">预览更新中</span>}
        </div>
        <div className="status-group status-group-metrics">
          <span>{lineCount} 行</span>
          <span>{charCount} 字符</span>
          <span>自动保存已开启</span>
        </div>
      </section>

      <main className="workspace">
        <section className="panel editor-panel">
          <div className="panel-head">
            <span>编辑区</span>
            <span className="panel-note">支持 `Cmd/Ctrl + S` 立即保存草稿</span>
          </div>
          <textarea
            ref={editorRef}
            className="editor"
            value={content}
            placeholder={EDITOR_PLACEHOLDER}
            spellCheck={false}
            onChange={(event) => setContent(event.target.value)}
          />
        </section>

        <section className="panel preview-panel">
          <div className="panel-head">
            <span>实时预览</span>
            <span className="panel-note">GFM 表格、任务列表与删除线已启用</span>
          </div>
          <div className="preview-shell">
            {deferredContent.trim() ? (
              <article className="preview-body markdown-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {deferredContent}
                </ReactMarkdown>
              </article>
            ) : (
              <div className="preview-empty">
                <h3>预览区域已就绪</h3>
                <p>开始在左侧输入 Markdown，右侧会实时渲染。</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
