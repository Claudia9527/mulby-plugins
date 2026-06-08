import type { Platform } from '../types'
import { Icon } from './Icon'

interface Props {
  platforms: Platform[]
  activeIndex: number
  onChange: (index: number) => void
}

export function PlatformTabs({ platforms, activeIndex, onChange }: Props) {
  return (
    <div className="platform-tabs">
      {platforms.map((p, i) => (
        <button
          key={p.id}
          className={`platform-tab ${i === activeIndex ? 'active' : ''}`}
          onClick={() => onChange(i)}
        >
          <Icon name={p.icon} size={12} />
          <span className="platform-name">{p.name}</span>
        </button>
      ))}
    </div>
  )
}
