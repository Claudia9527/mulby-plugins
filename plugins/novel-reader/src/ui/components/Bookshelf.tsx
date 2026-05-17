import { useCallback, useEffect, useState } from 'react'
import { BookOpen, Plus, Trash2 } from 'lucide-react'
import { useMulby } from '../hooks/useMulby'
import type { BookEntry } from '../App'

const PLUGIN_ID = 'novel-reader'
const COVER_COLORS = [
  'bg-amber-600', 'bg-emerald-600', 'bg-blue-600', 'bg-rose-600',
  'bg-violet-600', 'bg-teal-600', 'bg-orange-600', 'bg-cyan-600',
]

function coverColor(title: string): string {
  let hash = 0
  for (let i = 0; i < title.length; i++) hash = ((hash << 5) - hash) + title.charCodeAt(i)
  return COVER_COLORS[Math.abs(hash) % COVER_COLORS.length]
}

function coverChar(title: string): string {
  return title.charAt(0).toUpperCase()
}

export default function Bookshelf({ onOpenBook, onOpenFile }: {
  onOpenBook: (book: BookEntry) => void
  onOpenFile: (filePath: string) => void
}) {
  const { host, dialog } = useMulby(PLUGIN_ID)
  const call = (method: string, ...args: unknown[]) =>
    host.call(method, ...args).then((r: any) => r.data)
  const [books, setBooks] = useState<BookEntry[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const list = await call('getBookList')
        setBooks(list ?? [])
      } catch {
        setBooks([])
      } finally {
        setHydrated(true)
      }
    })()
  }, [host])

  const handleAddBook = useCallback(async () => {
    const result = await dialog.showOpenDialog({
      title: '选择小说文件',
      filters: [{ name: '文本文件', extensions: ['txt'] }],
      properties: ['openFile'],
    })
    if (result?.length) {
      const filePath = result[0]
      onOpenFile(filePath)

      // Refresh list
      const list = await call('getBookList')
      setBooks(list ?? [])
    }
  }, [dialog, host, onOpenFile])

  const handleRemoveBook = useCallback(async (bookId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await call('removeBook', bookId)
    const list = await host.invoke('getBookList')
    setBooks(list ?? [])
  }, [host])

  if (!hydrated) return null

  return (
    <div className="flex flex-col h-full p-6 overflow-y-auto">
      <h1 className="text-2xl font-bold mb-6 text-[var(--text-1)]">我的书架</h1>

      {books.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-[var(--text-3)]">
          <BookOpen size={48} strokeWidth={1.5} />
          <p>书架空空如也，添加一本小说开始阅读吧</p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4 mb-6">
          {books.map((book) => (
            <div
              key={book.id}
              className="group cursor-pointer rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--surface)] hover:shadow-lg transition-shadow"
              onClick={() => onOpenBook(book)}
            >
              <div className={`${coverColor(book.title)} h-32 flex items-center justify-center relative`}>
                <span className="text-4xl font-bold text-white/90">{coverChar(book.title)}</span>
                <button
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/30 text-white/70 hover:text-white hover:bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => handleRemoveBook(book.id, e)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-[var(--text-1)] truncate">{book.title}</p>
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full bg-[var(--border)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--accent)]"
                      style={{ width: `${Math.round(book.progress * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-[var(--text-3)]">
                    {Math.round(book.progress * 100)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleAddBook}
        className="flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-[var(--border)] text-[var(--text-3)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors"
      >
        <Plus size={20} />
        <span>添加小说</span>
      </button>
    </div>
  )
}
