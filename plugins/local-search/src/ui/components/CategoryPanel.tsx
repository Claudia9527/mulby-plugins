import React from 'react'
import {
  Layers, Image, Table, FileText, PlayCircle, Archive, FileCode, File,
} from 'lucide-react'
import { CATEGORIES, CategoryId } from '../utils'

const ICON_MAP: Record<string, React.ElementType> = {
  layers: Layers,
  image: Image,
  table: Table,
  'file-text': FileText,
  'play-circle': PlayCircle,
  archive: Archive,
  'file-code': FileCode,
  file: File,
}

interface CategoryPanelProps {
  active: CategoryId
  counts: Record<CategoryId, number>
  onSelect: (id: CategoryId) => void
}

export default function CategoryPanel({ active, counts, onSelect }: CategoryPanelProps) {
  return (
    <div
      className="flex flex-col gap-0.5 py-2 px-2 overflow-y-auto"
      style={{
        width: 140,
        minWidth: 140,
        borderRight: '1px solid var(--border-color)',
        background: 'var(--bg-secondary)',
      }}
    >
      <div className="text-xs font-medium px-2 py-1.5 mb-1" style={{ color: 'var(--text-tertiary)' }}>
        文件类型
      </div>
      {CATEGORIES.map((cat) => {
        const Icon = ICON_MAP[cat.icon] || File
        const count = counts[cat.id]
        return (
          <div
            key={cat.id}
            className={`category-item flex items-center gap-2 ${active === cat.id ? 'active' : ''}`}
            onClick={() => onSelect(cat.id)}
          >
            <Icon size={15} />
            <span className="flex-1 text-sm truncate">{cat.label}</span>
            {count > 0 && (
              <span className="text-xs" style={{ color: active === cat.id ? 'var(--accent)' : 'var(--text-tertiary)' }}>
                {count}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
