import React, { useRef, useCallback, useEffect } from 'react'
import { Folder } from 'lucide-react'
import { FileItem, formatFileSize, getParentDir } from '../utils'

interface FileListProps {
  files: FileItem[]
  focusedIndex: number
  selectedIndices: Set<number>
  onFocusIndex: (idx: number) => void
  onSelect: (idx: number, shift: boolean) => void
  onOpen: (file: FileItem) => void
  onContextMenu: (e: React.MouseEvent, file: FileItem, idx: number) => void
  onDragStart: (e: React.DragEvent, file: FileItem) => void
}

export default function FileList({
  files,
  focusedIndex,
  selectedIndices,
  onFocusIndex,
  onSelect,
  onOpen,
  onContextMenu,
  onDragStart,
}: FileListProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    if (focusedIndex >= 0 && rowRefs.current[focusedIndex]) {
      rowRefs.current[focusedIndex]?.scrollIntoView({ block: 'nearest' })
    }
  }, [focusedIndex])

  const handleClick = useCallback(
    (e: React.MouseEvent, idx: number) => {
      onSelect(idx, e.shiftKey)
      onFocusIndex(idx)
    },
    [onSelect, onFocusIndex]
  )

  if (files.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full"
        style={{ color: 'var(--text-tertiary)' }}
      >
        <Folder size={40} strokeWidth={1} />
        <p className="mt-2 text-sm">输入关键词开始搜索</p>
      </div>
    )
  }

  return (
    <div ref={listRef} className="overflow-y-auto h-full">
      {files.map((file, idx) => {
        const isSelected = selectedIndices.has(idx)
        const isFocused = idx === focusedIndex
        return (
          <div
            key={file.path}
            ref={(el) => { rowRefs.current[idx] = el }}
            className={`file-item flex items-center gap-2 px-3 py-1.5 ${isSelected ? 'selected' : ''} ${isFocused ? 'focused' : ''}`}
            onClick={(e) => handleClick(e, idx)}
            onDoubleClick={() => onOpen(file)}
            onContextMenu={(e) => onContextMenu(e, file, idx)}
            draggable
            onDragStart={(e) => onDragStart(e, file)}
          >
            {file.icon ? (
              <img src={file.icon} alt="" width={20} height={20} className="shrink-0" draggable={false} />
            ) : (
              <div className="w-5 h-5 shrink-0 rounded" style={{ background: 'var(--bg-tertiary)' }} />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">{file.name}</div>
              <div className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                {getParentDir(file.path)}
              </div>
            </div>
            <span className="text-xs shrink-0" style={{ color: 'var(--text-tertiary)' }}>
              {file.isDirectory ? '文件夹' : formatFileSize(file.size)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
