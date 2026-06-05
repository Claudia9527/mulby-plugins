import { RefreshCw } from 'lucide-react'

interface Props {
  updateTime?: string
  total: number
  filterText: string
  onRefresh: () => void
}

function formatTime(isoString?: string): string {
  if (!isoString) return ''
  try {
    const date = new Date(isoString)
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export function StatusBar({ updateTime, total, filterText, onRefresh }: Props) {
  return (
    <div className="status-bar">
      <div className="status-left">
        <span className="status-shortcuts">
          ←→ 切换分类 · Ctrl+←→ 切换平台 · ↑↓ 选择 · Enter 查看
        </span>
      </div>
      <div className="status-right">
        {filterText && <span className="status-filter">筛选: {filterText}</span>}
        <span className="status-count">{total} 条</span>
        {updateTime && <span className="status-time">更新于 {formatTime(updateTime)}</span>}
        <button className="refresh-btn" onClick={onRefresh} title="刷新 (Ctrl+R)">
          <RefreshCw size={12} />
        </button>
      </div>
    </div>
  )
}
