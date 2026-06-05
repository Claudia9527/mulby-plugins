export interface SubtitleWord {
  startMs: number
  endMs: number
  text: string
  confidence?: number
}

export interface SubtitleCue {
  id: string
  startMs: number
  endMs: number
  text: string
  translation?: string
  speaker?: string
  confidence?: number
  words?: SubtitleWord[]
}

function clampMs(value: number) {
  return Math.max(0, Math.round(Number.isFinite(value) ? value : 0))
}

function formatTime(ms: number, separator: ',' | '.') {
  const totalMs = clampMs(ms)
  const hours = Math.floor(totalMs / 3_600_000)
  const minutes = Math.floor((totalMs % 3_600_000) / 60_000)
  const seconds = Math.floor((totalMs % 60_000) / 1000)
  const millis = totalMs % 1000
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}${separator}${String(millis).padStart(3, '0')}`
}

export function formatSrtTime(ms: number) {
  return formatTime(ms, ',')
}

export function formatVttTime(ms: number) {
  return formatTime(ms, '.')
}

function cueLines(cue: SubtitleCue) {
  const lines = [cue.text.trim()]
  if (cue.translation?.trim()) lines.push(cue.translation.trim())
  return lines.filter(Boolean)
}

export function exportSrt(cues: SubtitleCue[]) {
  return cues
    .map((cue, index) => [
      String(index + 1),
      `${formatSrtTime(cue.startMs)} --> ${formatSrtTime(cue.endMs)}`,
      ...cueLines(cue),
      ''
    ].join('\n'))
    .join('\n')
}

export function exportVtt(cues: SubtitleCue[]) {
  return [
    'WEBVTT',
    '',
    ...cues.flatMap((cue) => [
      `${formatVttTime(cue.startMs)} --> ${formatVttTime(cue.endMs)}`,
      ...cueLines(cue),
      ''
    ])
  ].join('\n')
}

export function exportJson(cues: SubtitleCue[]) {
  return JSON.stringify(cues, null, 2)
}

function splitTextByIndex(text: string, preferredIndex: number) {
  const trimmed = text.trim()
  if (!trimmed) return ['', '']
  const midpoint = Math.max(1, Math.min(preferredIndex, trimmed.length - 1))
  const before = trimmed.lastIndexOf(' ', midpoint)
  const after = trimmed.indexOf(' ', midpoint)
  const splitAt = before > 0 ? before : after > 0 ? after : midpoint
  return [trimmed.slice(0, splitAt).trim(), trimmed.slice(splitAt).trim()]
}

export function splitSubtitle(cue: SubtitleCue, splitMs: number, preferredTextIndex?: number): [SubtitleCue, SubtitleCue] {
  const boundary = Math.max(cue.startMs + 1, Math.min(splitMs, cue.endMs - 1))
  const [leftText, rightText] = splitTextByIndex(cue.text, preferredTextIndex ?? Math.floor(cue.text.length / 2))
  return [
    { ...cue, id: `${cue.id}-1`, endMs: boundary, text: leftText },
    { ...cue, id: `${cue.id}-2`, startMs: boundary, text: rightText }
  ]
}

export function mergeSubtitles(left: SubtitleCue, right: SubtitleCue): SubtitleCue {
  const words = [...(left.words ?? []), ...(right.words ?? [])]
  const confidence =
    typeof left.confidence === 'number' && typeof right.confidence === 'number'
      ? (left.confidence + right.confidence) / 2
      : left.confidence ?? right.confidence

  return {
    ...left,
    endMs: Math.max(left.endMs, right.endMs),
    text: [left.text.trim(), right.text.trim()].filter(Boolean).join(' '),
    translation: [left.translation?.trim(), right.translation?.trim()].filter(Boolean).join(' ') || undefined,
    ...(words.length ? { words } : {}),
    ...(typeof confidence === 'number' ? { confidence } : {})
  }
}
