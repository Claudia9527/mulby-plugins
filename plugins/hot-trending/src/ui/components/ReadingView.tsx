import { ArrowLeft, ExternalLink, Flame, MapPin, User } from 'lucide-react'
import type { HotItem } from '../types'

interface Props {
  item: HotItem
  platformName: string
  onClose: () => void
  onOpenBrowser: (url: string) => void
}

function formatHot(hot: number): string {
  if (!hot) return ''
  if (hot >= 100000000) return `${(hot / 100000000).toFixed(1)}亿`
  if (hot >= 10000) return `${(hot / 10000).toFixed(1)}万`
  return hot.toLocaleString()
}

export function ReadingView({ item, platformName, onClose, onOpenBrowser }: Props) {
  return (
    <div className="reading-view">
      <header className="reading-header">
        <button className="back-btn" onClick={onClose} title="返回 (ESC)">
          <ArrowLeft size={18} />
          <span>返回</span>
        </button>
        <h1 className="reading-title">{item.title}</h1>
        {item.url && (
          <button
            className="open-btn"
            onClick={() => onOpenBrowser(item.url)}
            title="在浏览器中打开 (Ctrl+O)"
          >
            <ExternalLink size={16} />
          </button>
        )}
      </header>

      <div className="reading-meta">
        {item.hot > 0 && (
          <span className="meta-badge hot-badge">
            <Flame size={11} />
            {formatHot(item.hot)}
          </span>
        )}
        <span className="meta-badge source-badge">
          <MapPin size={11} />
          {platformName}
        </span>
        {item.author && (
          <span className="meta-badge author-badge">
            <User size={11} />
            {item.author}
          </span>
        )}
      </div>

      <div className="reading-body">
        {item.desc ? (
          <p className="reading-desc">{item.desc}</p>
        ) : (
          <div className="no-content">
            <p>暂无详细内容</p>
            {item.url && (
              <button
                className="open-browser-btn"
                onClick={() => onOpenBrowser(item.url)}
              >
                <ExternalLink size={14} />
                在浏览器中查看原文
              </button>
            )}
          </div>
        )}

        {item.cover && (
          <div className="reading-cover">
            <img src={item.cover} alt={item.title} loading="lazy" />
          </div>
        )}
      </div>

      <footer className="reading-footer">
        <span className="shortcut-hint">ESC/Enter 返回</span>
        <span className="shortcut-hint">Ctrl+O 浏览器打开</span>
      </footer>
    </div>
  )
}
