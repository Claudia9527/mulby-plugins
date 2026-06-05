import type { SubtitleCue } from './subtitles'

export interface AudioChunk {
  index: number
  startMs: number
  endMs: number
  trimStartMs: number
  trimEndMs: number
}

export interface ChunkPlanInput {
  durationMs: number
  chunkMs?: number
  overlapMs?: number
}

export interface ChunkResult {
  chunk: AudioChunk
  cues: SubtitleCue[]
}

const DEFAULT_CHUNK_MS = 8 * 60 * 1000
const DEFAULT_OVERLAP_MS = 5000

export function planAudioChunks(input: ChunkPlanInput): AudioChunk[] {
  const durationMs = Math.max(0, Math.round(input.durationMs))
  const chunkMs = Math.max(1000, Math.round(input.chunkMs ?? DEFAULT_CHUNK_MS))
  const overlapMs = Math.max(0, Math.min(Math.round(input.overlapMs ?? DEFAULT_OVERLAP_MS), chunkMs - 1))

  if (durationMs <= chunkMs) {
    return [{ index: 0, startMs: 0, endMs: durationMs, trimStartMs: 0, trimEndMs: durationMs }]
  }

  const chunks: AudioChunk[] = []
  let startMs = 0
  let trimStartMs = 0

  while (startMs < durationMs) {
    const endMs = Math.min(durationMs, startMs + chunkMs)
    const index = chunks.length
    const trimEndMs = endMs
    chunks.push({ index, startMs, endMs, trimStartMs, trimEndMs })
    if (endMs >= durationMs) break
    trimStartMs = endMs
    startMs = endMs - overlapMs
  }

  return chunks
}

export function shiftSegments(cues: SubtitleCue[], offsetMs: number): SubtitleCue[] {
  return cues.map((cue) => {
    const words = cue.words?.map((word) => ({
      ...word,
      startMs: word.startMs + offsetMs,
      endMs: word.endMs + offsetMs
    }))
    return {
      ...cue,
      startMs: cue.startMs + offsetMs,
      endMs: cue.endMs + offsetMs,
      ...(words ? { words } : {})
    }
  })
}

function normalizeText(text: string) {
  return text.toLowerCase().replace(/[^\p{Letter}\p{Number}]+/gu, '')
}

function rangesOverlap(a: SubtitleCue, b: SubtitleCue, toleranceMs: number) {
  return a.startMs < b.endMs + toleranceMs && b.startMs < a.endMs + toleranceMs
}

export function dedupeOverlappingSegments(cues: SubtitleCue[], toleranceMs = 750): SubtitleCue[] {
  const sorted = [...cues].sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs)
  const output: SubtitleCue[] = []

  for (const cue of sorted) {
    const duplicateIndex = output.findIndex((existing) => {
      return rangesOverlap(existing, cue, toleranceMs) && normalizeText(existing.text) === normalizeText(cue.text)
    })

    if (duplicateIndex === -1) {
      output.push(cue)
      continue
    }

    const existing = output[duplicateIndex]
    const existingScore = existing.confidence ?? 0
    const cueScore = cue.confidence ?? 0
    if (cueScore > existingScore) output[duplicateIndex] = cue
  }

  return output
}

export function mergeChunkResults(results: ChunkResult[]): SubtitleCue[] {
  const shifted = results.flatMap(({ chunk, cues }) => {
    return shiftSegments(cues, chunk.startMs)
      .filter((cue) => cue.endMs > chunk.trimStartMs && cue.startMs < chunk.trimEndMs)
      .map((cue) => ({
        ...cue,
        startMs: Math.max(cue.startMs, chunk.trimStartMs),
        endMs: Math.min(cue.endMs, chunk.trimEndMs)
      }))
  })

  return dedupeOverlappingSegments(shifted)
}
