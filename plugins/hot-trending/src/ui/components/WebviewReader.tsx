import { useRef, useEffect, useState, useCallback } from 'react'
import { ArrowLeft, ExternalLink, RefreshCw, ChevronLeft } from 'lucide-react'
import type { HotItem } from '../types'

interface EmbeddedWebviewElement extends HTMLElement {
  src?: string
  reload?: () => void
  canGoBack?: () => boolean
  goBack?: () => void
  isLoading?: () => boolean
  isLoadingMainFrame?: () => boolean
}

interface Props {
  item: HotItem
  platformName: string
  onClose: () => void
  onOpenExternal: (url: string) => void
}

export function WebviewReader({ item, platformName, onClose, onOpenExternal }: Props) {
  const webviewRef = useRef<EmbeddedWebviewElement | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const webview = webviewRef.current
    if (!webview) return

    let disposed = false

    const handleStartLoading = () => {
      if (!disposed) setLoading(true)
    }

    const handleStopLoading = () => {
      if (!disposed) setLoading(false)
    }

    const handleDomReady = () => {
      if (!disposed) setLoading(false)
    }

    const handleFail = (event: Event) => {
      const e = event as Event & { errorDescription?: string; isMainFrame?: boolean; errorCode?: number }
      if (e.isMainFrame === false || e.errorCode === -3) return
      if (!disposed) {
        setLoading(false)
        setError(e.errorDescription || '页面加载失败')
      }
    }

    webview.addEventListener('did-start-loading', handleStartLoading)
    webview.addEventListener('did-stop-loading', handleStopLoading)
    webview.addEventListener('dom-ready', handleDomReady)
    webview.addEventListener('did-fail-load', handleFail)

    return () => {
      disposed = true
      webview.removeEventListener('did-start-loading', handleStartLoading)
      webview.removeEventListener('did-stop-loading', handleStopLoading)
      webview.removeEventListener('dom-ready', handleDomReady)
      webview.removeEventListener('did-fail-load', handleFail)
    }
  }, [item.url])

  const handleReload = useCallback(() => {
    setError(null)
    setLoading(true)
    webviewRef.current?.reload?.()
  }, [])

  const handleGoBack = useCallback(() => {
    if (webviewRef.current?.canGoBack?.()) {
      webviewRef.current.goBack?.()
    } else {
      onClose()
    }
  }, [onClose])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault()
        onOpenExternal(item.url)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [item.url, onClose, onOpenExternal])

  return (
    <div className="webview-reader">
      <header className="webview-toolbar">
        <button className="wv-btn" onClick={onClose} title="返回列表 (ESC)">
          <ArrowLeft size={16} />
        </button>
        <button className="wv-btn" onClick={handleGoBack} title="网页后退">
          <ChevronLeft size={16} />
        </button>
        <button className="wv-btn" onClick={handleReload} title="刷新">
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
        </button>
        <div className="wv-title-area">
          <span className="wv-title">{item.title}</span>
          <span className="wv-platform">{platformName}</span>
        </div>
        <button
          className="wv-btn"
          onClick={() => onOpenExternal(item.url)}
          title="外部浏览器打开 (Ctrl+O)"
        >
          <ExternalLink size={15} />
        </button>
      </header>

      <div className="webview-container">
        {error ? (
          <div className="webview-error">
            <p>{error}</p>
            <button className="retry-btn" onClick={handleReload}>
              <RefreshCw size={14} />
              重试
            </button>
          </div>
        ) : (
          <webview
            ref={webviewRef as unknown as React.RefObject<HTMLElement>}
            className="embedded-webview"
            src={item.url}
            partition="persist:hot-trending"
            allowpopups
          />
        )}
      </div>

      <footer className="webview-footer">
        <span className="wv-hint">ESC 返回</span>
        <span className="wv-hint">Ctrl+O 外部打开</span>
      </footer>
    </div>
  )
}
