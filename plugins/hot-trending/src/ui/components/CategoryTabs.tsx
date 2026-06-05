import type { Category } from '../types'
import { Icon } from './Icon'

interface Props {
  categories: Category[]
  activeIndex: number
  onChange: (index: number) => void
}

export function CategoryTabs({ categories, activeIndex, onChange }: Props) {
  return (
    <div className="category-tabs">
      {categories.map((cat, i) => (
        <button
          key={cat.id}
          className={`category-tab ${i === activeIndex ? 'active' : ''}`}
          onClick={() => onChange(i)}
          title={cat.name}
        >
          <Icon name={cat.icon} size={13} />
          <span className="tab-name">{cat.name}</span>
        </button>
      ))}
    </div>
  )
}
