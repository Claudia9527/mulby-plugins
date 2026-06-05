import { Trash2 } from 'lucide-react'
import { memo, useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { SubtitleCue } from '../lib/subtitles'

interface CueListProps {
  cues: SubtitleCue[]
  onChange: (id: string, patch: Partial<SubtitleCue>) => void
  onDelete: (id: string) => void
}

interface CueRowProps {
  cue: SubtitleCue
  index: number
  onChange: (id: string, patch: Partial<SubtitleCue>) => void
  onDelete: (id: string) => void
}

const ESTIMATED_ROW_HEIGHT = 232
const GAP = 12
const OVERSCAN = 6

const CueRow = memo(function CueRow({ cue, index, onChange, onDelete }: CueRowProps) {
  return (
    <article className="cue-card">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-200">#{index + 1}</span>
        <button className="icon-button" aria-label="删除字幕" onClick={() => onDelete(cue.id)}>
          <Trash2 size={15} />
        </button>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <label className="field compact"><span>开始</span><input type="number" value={cue.startMs} onChange={(event) => onChange(cue.id, { startMs: Number(event.target.value) })} /></label>
        <label className="field compact"><span>结束</span><input type="number" value={cue.endMs} onChange={(event) => onChange(cue.id, { endMs: Number(event.target.value) })} /></label>
      </div>
      <textarea value={cue.text} onChange={(event) => onChange(cue.id, { text: event.target.value })} />
      <textarea placeholder="译文" value={cue.translation || ''} onChange={(event) => onChange(cue.id, { translation: event.target.value })} />
    </article>
  )
})

export function CueList({ cues, onChange, onDelete }: CueListProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const heightsRef = useRef<Map<string, number>>(new Map())
  const [viewportHeight, setViewportHeight] = useState(620)
  const [scrollTop, setScrollTop] = useState(0)
  const [, forceRender] = useState(0)

  const rowHeight = useCallback(
    (id: string) => heightsRef.current.get(id) ?? ESTIMATED_ROW_HEIGHT,
    []
  )

  const offsets: number[] = []
  let running = 0
  for (const cue of cues) {
    offsets.push(running)
    running += rowHeight(cue.id) + GAP
  }
  const totalHeight = Math.max(running - GAP, 0)

  let startIndex = 0
  while (startIndex < cues.length - 1 && offsets[startIndex + 1] <= scrollTop) startIndex += 1
  startIndex = Math.max(0, startIndex - OVERSCAN)

  let endIndex = startIndex
  const visibleBottom = scrollTop + viewportHeight
  while (endIndex < cues.length && offsets[endIndex] < visibleBottom) endIndex += 1
  endIndex = Math.min(cues.length, endIndex + OVERSCAN)

  useLayoutEffect(() => {
    const element = scrollRef.current
    if (!element) return
    const update = () => setViewportHeight(element.clientHeight || 620)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const measureRow = useCallback((id: string, node: HTMLDivElement | null) => {
    if (!node) return
    const measured = node.getBoundingClientRect().height
    const previous = heightsRef.current.get(id)
    if (measured > 0 && (previous === undefined || Math.abs(previous - measured) > 1)) {
      heightsRef.current.set(id, measured)
      forceRender((value) => value + 1)
    }
  }, [])

  const visible = cues.slice(startIndex, endIndex)

  return (
    <div
      ref={scrollRef}
      className="min-h-0 flex-1 overflow-auto pr-2"
      onScroll={(event) => setScrollTop((event.target as HTMLDivElement).scrollTop)}
    >
      <div style={{ position: 'relative', height: totalHeight }}>
        {visible.map((cue, localIndex) => {
          const index = startIndex + localIndex
          return (
            <div
              key={cue.id}
              ref={(node) => measureRow(cue.id, node)}
              style={{ position: 'absolute', top: offsets[index], left: 0, right: 0 }}
            >
              <CueRow cue={cue} index={index} onChange={onChange} onDelete={onDelete} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
