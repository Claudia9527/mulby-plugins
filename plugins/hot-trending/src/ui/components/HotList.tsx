import { RefreshCw, AlertCircle } from 'lucide-react'
import type { HotItem } from '../types'
import { HotItemRow } from './HotItem'

interface Props {
  items: HotItem[]
  loading: boolean
  error: string | null
  selectedIndex: number
  onSelect: (index: number) => void
  onClick: (item: HotItem) => void
  onRefresh: () => void
}

export function HotList({ items, loading, error, selectedIndex, onSelect, onClick, onRefresh }: Props) {
  if (loading && items.length === 0) {
    return (
      <div className="loading-state">
        <RefreshCw size={24} className="spin" />
        <p>加载中...</p>
      </div>
    )
  }

  if (error && items.length === 0) {
    return (
      <div className="error-state">
        <AlertCircle size={24} />
        <p>{error}</p>
        <button className="retry-btn" onClick={onRefresh}>
          <RefreshCw size={14} />
          重试
        </button>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <p>暂无数据</p>
      </div>
    )
  }

  return (
    <div className="hot-list">
      {items.map((item, index) => (
        <HotItemRow
          key={item.id}
          item={item}
          rank={index + 1}
          selected={index === selectedIndex}
          dataIndex={index}
          onMouseEnter={() => onSelect(index)}
          onClick={() => onClick(item)}
        />
      ))}
    </div>
  )
}
