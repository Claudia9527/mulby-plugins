import { useEffect, useReducer, useCallback, useRef } from 'react'
import { useMulby } from './hooks/useMulby'
import { CATEGORIES } from './constants'
import type { HotItem, HotListResponse } from './types'
import { CategoryTabs } from './components/CategoryTabs'
import { PlatformTabs } from './components/PlatformTabs'
import { HotList } from './components/HotList'
import { WebviewReader } from './components/WebviewReader'
import { StatusBar } from './components/StatusBar'

interface AppState {
  categoryIndex: number
  platformIndex: number
  selectedIndex: number
  loading: boolean
  error: string | null
  hotData: Record<string, HotListResponse>
  readingItem: HotItem | null
  filterText: string
}

type Action =
  | { type: 'SET_CATEGORY'; index: number }
  | { type: 'SET_PLATFORM'; index: number }
  | { type: 'SET_SELECTED'; index: number }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_HOT_DATA'; platform: string; data: HotListResponse }
  | { type: 'SET_READING'; item: HotItem | null }
  | { type: 'SET_FILTER'; text: string }

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_CATEGORY':
      return { ...state, categoryIndex: action.index, platformIndex: 0, selectedIndex: 0, filterText: '' }
    case 'SET_PLATFORM':
      return { ...state, platformIndex: action.index, selectedIndex: 0, filterText: '' }
    case 'SET_SELECTED':
      return { ...state, selectedIndex: action.index }
    case 'SET_LOADING':
      return { ...state, loading: action.loading }
    case 'SET_ERROR':
      return { ...state, error: action.error }
    case 'SET_HOT_DATA':
      return { ...state, hotData: { ...state.hotData, [action.platform]: action.data } }
    case 'SET_READING':
      return { ...state, readingItem: action.item }
    case 'SET_FILTER':
      return { ...state, filterText: action.text, selectedIndex: 0 }
    default:
      return state
  }
}

const initialState: AppState = {
  categoryIndex: 0,
  platformIndex: 0,
  selectedIndex: 0,
  loading: false,
  error: null,
  hotData: {},
  readingItem: null,
  filterText: '',
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const { host, shell, subInput } = useMulby('hot-trending')
  const listRef = useRef<HTMLDivElement>(null)
  const subInputDisposers = useRef<Array<() => void>>([])
  const isDetached = useRef(false)

  const currentCategory = CATEGORIES[state.categoryIndex]
  const currentPlatform = currentCategory?.platforms[state.platformIndex]

  const currentData = currentPlatform ? state.hotData[currentPlatform.id] : null
  const filteredItems = currentData?.data?.filter((item) =>
    state.filterText ? item.title.toLowerCase().includes(state.filterText.toLowerCase()) : true
  ) || []

  const fetchData = useCallback(async (platformId: string) => {
    dispatch({ type: 'SET_LOADING', loading: true })
    dispatch({ type: 'SET_ERROR', error: null })
    try {
      const result = await host.call('fetchHotList', platformId)
      if (result.success && result.data) {
        dispatch({ type: 'SET_HOT_DATA', platform: platformId, data: result.data as HotListResponse })
      } else {
        dispatch({ type: 'SET_ERROR', error: '获取数据失败' })
      }
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', error: err.message || '网络错误' })
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false })
    }
  }, [host])

  const openInWebview = useCallback((item: HotItem) => {
    if (!item.url) return
    dispatch({ type: 'SET_READING', item })
  }, [])

  const closeWebview = useCallback(() => {
    dispatch({ type: 'SET_READING', item: null })
  }, [])

  const openExternal = useCallback((url: string) => {
    shell.openExternal(url)
  }, [shell])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const initialTheme = (params.get('theme') as 'light' | 'dark') || 'light'
    document.documentElement.classList.toggle('dark', initialTheme === 'dark')
    window.mulby?.onThemeChange?.((newTheme: 'light' | 'dark') => {
      document.documentElement.classList.toggle('dark', newTheme === 'dark')
    })
  }, [])

  useEffect(() => {
    if (currentPlatform && !state.hotData[currentPlatform.id]) {
      fetchData(currentPlatform.id)
    }
  }, [currentPlatform?.id, fetchData])

  useEffect(() => {
    const setupSubInput = async () => {
      try {
        const mode = await window.mulby?.window?.getMode?.()
        isDetached.current = mode === 'detached'
        if (mode !== 'detached') {
          await subInput.set('搜索热搜内容...', false, {
            forwardKeys: ['ArrowRight', 'ArrowLeft', 'Tab'],
          })

          const d1 = subInput.onChange(({ text }: { text: string }) => {
            dispatch({ type: 'SET_FILTER', text })
          })
          if (d1) subInputDisposers.current.push(d1)

          const d2 = subInput.onKeyDown(({ key, ctrl, shift }: { key: string; ctrl?: boolean; shift?: boolean }) => {
            handleKeyAction(key, ctrl, shift)
          })
          if (d2) subInputDisposers.current.push(d2)
        }
      } catch {
        // subInput not available
      }
    }
    setupSubInput()
    return () => {
      subInputDisposers.current.forEach((d) => d())
      subInputDisposers.current = []
      subInput.remove?.()
    }
  }, [])

  const handleKeyAction = useCallback((key: string, ctrl?: boolean, shift?: boolean) => {
    dispatch((prevAction) => prevAction)
  }, [])

  useEffect(() => {
    if (state.readingItem) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const { key, ctrlKey, metaKey, shiftKey } = e
      const mod = ctrlKey || metaKey

      if (!mod && (key === 'Tab' || key === 'ArrowLeft' || key === 'ArrowRight')) {
        e.preventDefault()
        const dir = (key === 'Tab' && shiftKey) || key === 'ArrowLeft' ? -1 : 1
        dispatch({ type: 'SET_CATEGORY', index: ((state.categoryIndex + dir) + CATEGORIES.length) % CATEGORIES.length })
        return
      }

      if (mod && (key === 'Tab' || key === 'ArrowLeft' || key === 'ArrowRight')) {
        e.preventDefault()
        const platforms = CATEGORIES[state.categoryIndex].platforms
        const dir = (key === 'Tab' && shiftKey) || key === 'ArrowLeft' ? -1 : 1
        dispatch({ type: 'SET_PLATFORM', index: ((state.platformIndex + dir) + platforms.length) % platforms.length })
        return
      }

      if (key === 'ArrowUp') {
        e.preventDefault()
        dispatch({ type: 'SET_SELECTED', index: Math.max(0, state.selectedIndex - 1) })
        return
      }
      if (key === 'ArrowDown') {
        e.preventDefault()
        dispatch({ type: 'SET_SELECTED', index: Math.min(filteredItems.length - 1, state.selectedIndex + 1) })
        return
      }

      if (key === 'Enter') {
        e.preventDefault()
        if (filteredItems[state.selectedIndex]) {
          openInWebview(filteredItems[state.selectedIndex])
        }
        return
      }

      if (key === 'Escape') {
        e.preventDefault()
        subInput.remove?.()
        window.mulby?.plugin?.outPlugin?.()
        return
      }

      if (mod && key.toLowerCase() === 'r') {
        e.preventDefault()
        if (currentPlatform) {
          host.call('clearCache').then(() => fetchData(currentPlatform.id))
        }
        return
      }

      if (mod && key.toLowerCase() === 'w') {
        e.preventDefault()
        subInput.remove?.()
        window.mulby?.window?.close?.()
        return
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [state.categoryIndex, state.platformIndex, state.selectedIndex, state.readingItem, filteredItems, currentPlatform, fetchData, host, openInWebview])

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${state.selectedIndex}"]`)
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [state.selectedIndex])

  const handleCategoryChange = (index: number) => {
    dispatch({ type: 'SET_CATEGORY', index })
  }

  const handlePlatformChange = (index: number) => {
    dispatch({ type: 'SET_PLATFORM', index })
  }

  const handleItemClick = (item: HotItem) => {
    openInWebview(item)
  }

  const handleRefresh = () => {
    if (currentPlatform) {
      host.call('clearCache').then(() => fetchData(currentPlatform.id))
    }
  }

  if (state.readingItem) {
    return (
      <WebviewReader
        item={state.readingItem}
        platformName={currentPlatform?.name || ''}
        onClose={closeWebview}
        onOpenExternal={openExternal}
      />
    )
  }

  return (
    <div className="app-root">
      <CategoryTabs
        categories={CATEGORIES}
        activeIndex={state.categoryIndex}
        onChange={handleCategoryChange}
      />
      <PlatformTabs
        platforms={currentCategory?.platforms || []}
        activeIndex={state.platformIndex}
        onChange={handlePlatformChange}
      />
      <div className="list-container" ref={listRef}>
        <HotList
          items={filteredItems}
          loading={state.loading}
          error={state.error}
          selectedIndex={state.selectedIndex}
          onSelect={(index) => dispatch({ type: 'SET_SELECTED', index })}
          onClick={handleItemClick}
          onRefresh={handleRefresh}
        />
      </div>
      <StatusBar
        updateTime={currentData?.updateTime}
        total={filteredItems.length}
        filterText={state.filterText}
        onRefresh={handleRefresh}
      />
    </div>
  )
}
