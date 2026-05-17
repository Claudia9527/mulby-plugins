import { useCallback, useEffect, useState } from 'react'
import Bookshelf from './components/Bookshelf'
import Reader from './components/Reader'
import { useMulby } from './hooks/useMulby'

const PLUGIN_ID = 'novel-reader'

export interface BookEntry {
  id: string
  title: string
  filePath: string
  addedAt: number
  lastReadAt: number
  progress: number
}

export interface ReaderSettings {
  fontSize: number
  lineHeight: number
  theme: 'light' | 'dark' | 'sepia'
}

export default function App() {
  const { host, storage } = useMulby(PLUGIN_ID)
  const call = (method: string, ...args: unknown[]) =>
    host.call(method, ...args).then((r: any) => r.data)
  const [view, setView] = useState<'bookshelf' | 'reader'>('bookshelf')
  const [currentBook, setCurrentBook] = useState<BookEntry | null>(null)
  const [content, setContent] = useState('')
  const [hydrated, setHydrated] = useState(false)

  // Settings persistence
  const [settings, setSettings] = useState<ReaderSettings>({
    fontSize: 18,
    lineHeight: 1.8,
    theme: 'light',
  })

  useEffect(() => {
    async function init() {
      try {
        const saved = await call('getSettings')
        if (saved) setSettings(saved)
      } catch {
        // Use defaults if backend not available
      } finally {
        setHydrated(true)
      }
    }
    init()
  }, [])

  // Apply theme class
  useEffect(() => {
    document.documentElement.classList.remove('dark', 'sepia')
    if (settings.theme !== 'light') {
      document.documentElement.classList.add(settings.theme)
    }
  }, [settings.theme])

  // Handle file trigger from Mulby
  useEffect(() => {
    window.mulby?.onPluginInit?.((data: PluginInitData) => {
      if (data.featureCode === 'open-file' && data.input) {
        const filePath = data.input.trim()
        openBookByPath(filePath)
      }
    })
  }, [])

  const openBookByPath = useCallback(async (filePath: string) => {
    try {
      const text = await call('openFile', filePath)
      const book = await call('addBook', filePath)
      setContent(text)
      setCurrentBook(book)
      setView('reader')
    } catch (err) {
      console.error('[novel-reader] openBookByPath failed:', err)
    }
  }, [host])

  const handleOpenBook = useCallback(async (book: BookEntry) => {
    const text = await call('openFile', book.filePath)
    setContent(text)
    setCurrentBook(book)
    setView('reader')
  }, [host])

  const handleBackToShelf = useCallback(() => {
    setView('bookshelf')
    setCurrentBook(null)
    setContent('')
  }, [])

  const handleSettingsChange = useCallback(async (next: ReaderSettings) => {
    setSettings(next)
    await call('saveSettings', next)
  }, [host])

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--text-3)]">
        加载中...
      </div>
    )
  }

  if (view === 'reader' && currentBook) {
    return (
      <Reader
        book={currentBook}
        content={content}
        settings={settings}
        onBack={handleBackToShelf}
        onSettingsChange={handleSettingsChange}
      />
    )
  }

  return <Bookshelf onOpenBook={handleOpenBook} onOpenFile={openBookByPath} />
}
