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
  chapterCount: number
  totalChars: number
  indexing: boolean
}

export interface ReaderSettings {
  fontSize: number
  lineHeight: number
  theme: 'light' | 'dark' | 'sepia'
}

export default function App() {
  const { host } = useMulby(PLUGIN_ID)
  const call = async (method: string, ...args: unknown[]) => {
    const result = await host.call(method, ...args)
    return (result as any)?.data
  }
  const [view, setView] = useState<'bookshelf' | 'reader'>('bookshelf')
  const [currentBook, setCurrentBook] = useState<BookEntry | null>(null)
  const [hydrated, setHydrated] = useState(false)

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
        // Use defaults
      } finally {
        setHydrated(true)
      }
    }
    init()
  }, [])

  useEffect(() => {
    document.documentElement.classList.remove('dark', 'sepia')
    if (settings.theme !== 'light') {
      document.documentElement.classList.add(settings.theme)
    }
  }, [settings.theme])

  const importAndOpen = useCallback(async (filePath: string) => {
    try {
      const result = await call('importBook', filePath)
      if (result?.book) {
        setCurrentBook(result.book)
        setView('reader')
      }
    } catch (err) {
      console.error('[novel-reader] importAndOpen failed:', err)
    }
  }, [host])

  const importOnly = useCallback(async (filePath: string) => {
    await call('importBook', filePath)
  }, [host])

  // Handle file trigger from Mulby
  useEffect(() => {
    window.mulby?.onPluginInit?.((data: PluginInitData) => {
      if (data.featureCode === 'open-file' && data.input) {
        importAndOpen(data.input.trim())
      }
    })
  }, [importAndOpen])

  const handleOpenBook = useCallback((book: BookEntry) => {
    setCurrentBook(book)
    setView('reader')
  }, [])

  const handleBackToShelf = useCallback(() => {
    setView('bookshelf')
    setCurrentBook(null)
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
        settings={settings}
        onBack={handleBackToShelf}
        onSettingsChange={handleSettingsChange}
      />
    )
  }

  return <Bookshelf onOpenBook={handleOpenBook} onImportBook={importOnly} />
}
