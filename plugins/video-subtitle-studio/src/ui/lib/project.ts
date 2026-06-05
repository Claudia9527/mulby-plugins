import type { SubtitleCue } from './subtitles'

export const PROJECT_FORMAT = 'video-subtitle-studio/project'
export const PROJECT_VERSION = 1
export const PROJECT_EXTENSION = 'vssproj'

export interface ProjectMeta {
  provider?: string
  targetLanguage?: string
  translateModel?: string
}

export interface SubtitleProject {
  format: typeof PROJECT_FORMAT
  version: number
  savedAt: string
  videoPath: string
  durationMs: number
  cues: SubtitleCue[]
  meta?: ProjectMeta
}

function clampMs(value: unknown): number {
  const num = typeof value === 'number' ? value : Number(value)
  return Math.max(0, Math.round(Number.isFinite(num) ? num : 0))
}

function normalizeCue(raw: unknown, index: number): SubtitleCue | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Partial<SubtitleCue>
  if (typeof value.text !== 'string') return null
  const cue: SubtitleCue = {
    id: typeof value.id === 'string' && value.id ? value.id : `cue-${index + 1}`,
    startMs: clampMs(value.startMs),
    endMs: clampMs(value.endMs),
    text: value.text
  }
  if (typeof value.translation === 'string' && value.translation) cue.translation = value.translation
  if (typeof value.speaker === 'string' && value.speaker) cue.speaker = value.speaker
  if (typeof value.confidence === 'number' && Number.isFinite(value.confidence)) cue.confidence = value.confidence
  if (Array.isArray(value.words)) cue.words = value.words
  return cue
}

export function buildProject(input: {
  videoPath: string
  durationMs: number
  cues: SubtitleCue[]
  savedAt?: string
  meta?: ProjectMeta
}): SubtitleProject {
  return {
    format: PROJECT_FORMAT,
    version: PROJECT_VERSION,
    savedAt: input.savedAt ?? new Date().toISOString(),
    videoPath: input.videoPath,
    durationMs: clampMs(input.durationMs),
    cues: input.cues,
    ...(input.meta ? { meta: input.meta } : {})
  }
}

export function serializeProject(input: {
  videoPath: string
  durationMs: number
  cues: SubtitleCue[]
  savedAt?: string
  meta?: ProjectMeta
}): string {
  return JSON.stringify(buildProject(input), null, 2)
}

export function parseProject(content: string): SubtitleProject {
  let raw: unknown
  try {
    raw = JSON.parse(content)
  } catch {
    throw new Error('工程文件不是有效的 JSON。')
  }
  if (!raw || typeof raw !== 'object') throw new Error('工程文件内容无法解析。')
  const value = raw as Partial<SubtitleProject>
  if (value.format !== PROJECT_FORMAT) {
    throw new Error('这不是视频字幕工作台的工程文件。')
  }
  if (typeof value.version !== 'number' || value.version > PROJECT_VERSION) {
    throw new Error(`工程文件版本（${String(value.version)}）不受支持，请升级插件。`)
  }
  if (!Array.isArray(value.cues)) throw new Error('工程文件缺少字幕数据。')

  const cues = value.cues
    .map((cue, index) => normalizeCue(cue, index))
    .filter((cue): cue is SubtitleCue => cue !== null)

  return {
    format: PROJECT_FORMAT,
    version: PROJECT_VERSION,
    savedAt: typeof value.savedAt === 'string' ? value.savedAt : new Date().toISOString(),
    videoPath: typeof value.videoPath === 'string' ? value.videoPath : '',
    durationMs: clampMs(value.durationMs),
    cues,
    ...(value.meta && typeof value.meta === 'object' ? { meta: value.meta } : {})
  }
}

export function projectFileName(videoPath: string): string {
  const base = videoPath.split(/[\\/]/).pop() || 'subtitles'
  return `${base.replace(/\.[^.]+$/, '') || 'subtitles'}.${PROJECT_EXTENSION}`
}
