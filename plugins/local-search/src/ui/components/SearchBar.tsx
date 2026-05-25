import React, { useRef, useEffect } from 'react'
import { Search, X, Loader2 } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (v: string) => void
  loading: boolean
  resultCount: number
  onFocus?: () => void
}

export default function SearchBar({ value, onChange, loading, resultCount, onFocus }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <div className="relative flex items-center gap-2">
      <div className="relative flex-1">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
        </div>
        <input
          ref={inputRef}
          className="search-input"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          placeholder="输入关键词搜索文件…"
          spellCheck={false}
          autoComplete="off"
        />
        {value && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded"
            style={{ color: 'var(--text-tertiary)', background: 'transparent', border: 'none', cursor: 'default' }}
            onClick={() => onChange('')}
            tabIndex={-1}
          >
            <X size={14} />
          </button>
        )}
      </div>
      {value && !loading && (
        <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-tertiary)' }}>
          {resultCount} 个结果
        </span>
      )}
    </div>
  )
}
