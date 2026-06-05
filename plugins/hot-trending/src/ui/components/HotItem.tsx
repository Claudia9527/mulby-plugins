import type { HotItem } from '../types'

interface Props {
  item: HotItem
  rank: number
  selected: boolean
  dataIndex: number
  onMouseEnter: () => void
  onClick: () => void
}

function formatHot(hot: number): string {
  if (!hot) return ''
  if (hot >= 100000000) return `${(hot / 100000000).toFixed(1)}亿`
  if (hot >= 10000) return `${(hot / 10000).toFixed(1)}万`
  return hot.toLocaleString()
}

function getRankClass(rank: number): string {
  if (rank === 1) return 'rank-1'
  if (rank === 2) return 'rank-2'
  if (rank === 3) return 'rank-3'
  if (rank <= 10) return 'rank-top10'
  return 'rank-normal'
}

export function HotItemRow({ item, rank, selected, dataIndex, onMouseEnter, onClick }: Props) {
  return (
    <div
      className={`hot-item ${selected ? 'selected' : ''}`}
      data-index={dataIndex}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
    >
      <span className={`hot-rank ${getRankClass(rank)}`}>{rank}</span>
      <div className="hot-content">
        <span className="hot-title">{item.title}</span>
        {item.desc && <span className="hot-desc">{item.desc}</span>}
      </div>
      {item.hot > 0 && (
        <span className="hot-value">{formatHot(item.hot)}</span>
      )}
    </div>
  )
}
