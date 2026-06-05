import type { SubtitleCue, SubtitleWord } from './subtitles'

export type AsrProviderId = 'openai' | 'volcengine'

export interface OpenAiTranscriptionOptions {
  model: string
  language?: string
  prompt?: string
  timestampGranularity?: 'segment' | 'word' | 'both'
}

interface OpenAiSegment {
  id?: string | number
  start?: number
  end?: number
  text?: string
  avg_logprob?: number
}

interface OpenAiWord {
  start?: number
  end?: number
  word?: string
  text?: string
}

interface OpenAiVerboseResponse {
  text?: string
  segments?: OpenAiSegment[]
  words?: OpenAiWord[]
}

interface VolcengineWord {
  start_time?: number
  end_time?: number
  text?: string
  confidence?: number
}

interface VolcengineUtterance {
  start_time?: number
  end_time?: number
  text?: string
  words?: VolcengineWord[]
  speaker?: string
}

interface VolcengineResponse {
  result?: {
    text?: string
    utterances?: VolcengineUtterance[]
  }
}

function secondsToMs(value: unknown) {
  return Math.max(0, Math.round((typeof value === 'number' && Number.isFinite(value) ? value : 0) * 1000))
}

function ms(value: unknown) {
  return Math.max(0, Math.round(typeof value === 'number' && Number.isFinite(value) ? value : 0))
}

function ensureCues(cues: SubtitleCue[]) {
  const valid = cues.filter((cue) => cue.text.trim() && cue.endMs > cue.startMs)
  if (!valid.length) throw new Error('ASR 没有返回可用字幕')
  return valid
}

export function buildOpenAiTranscriptionRequest(options: OpenAiTranscriptionOptions) {
  const granularities =
    options.timestampGranularity === 'both'
      ? ['word', 'segment']
      : [options.timestampGranularity ?? 'segment']

  return {
    model: options.model,
    ...(options.language ? { language: options.language } : {}),
    ...(options.prompt ? { prompt: options.prompt } : {}),
    response_format: 'verbose_json',
    timestamp_granularities: granularities
  }
}

export function normalizeOpenAiTranscription(response: OpenAiVerboseResponse): SubtitleCue[] {
  const segments = Array.isArray(response?.segments) ? response.segments : []
  if (segments.length) {
    return ensureCues(
      segments.map((segment, index) => ({
        id: `openai-${segment.id ?? index}`,
        startMs: secondsToMs(segment.start),
        endMs: secondsToMs(segment.end),
        text: String(segment.text ?? '').trim(),
        confidence: typeof segment.avg_logprob === 'number' ? Math.exp(segment.avg_logprob) : undefined
      }))
    )
  }

  if (Array.isArray(response?.words) && response.words.length) {
    const words: SubtitleWord[] = response.words.map((word) => ({
      startMs: secondsToMs(word.start),
      endMs: secondsToMs(word.end),
      text: String(word.word ?? word.text ?? '').trim()
    }))
    return ensureCues([
      {
        id: 'openai-0',
        startMs: words[0]?.startMs ?? 0,
        endMs: words.at(-1)?.endMs ?? 0,
        text: words.map((word) => word.text).join('').trim(),
        words
      }
    ])
  }

  return normalizePlainTextTranscription(response?.text ?? '', 0)
}

export function normalizeVolcengineTranscription(response: VolcengineResponse): SubtitleCue[] {
  const utterances = Array.isArray(response?.result?.utterances) ? response.result.utterances : []
  if (utterances.length) {
    return ensureCues(
      utterances.map((utterance, index) => {
        const words = Array.isArray(utterance.words)
          ? utterance.words.map((word) => ({
            startMs: ms(word.start_time),
            endMs: ms(word.end_time),
            text: String(word.text ?? '').trim(),
            confidence: typeof word.confidence === 'number' ? word.confidence : undefined
          }))
          : undefined
        const confidences = words?.map((word) => word.confidence).filter((value): value is number => typeof value === 'number') ?? []
        return {
          id: `volc-${index}`,
          startMs: ms(utterance.start_time),
          endMs: ms(utterance.end_time),
          text: String(utterance.text ?? '').trim(),
          ...(utterance.speaker ? { speaker: utterance.speaker } : {}),
          ...(confidences.length ? { confidence: confidences.reduce((sum, value) => sum + value, 0) / confidences.length } : {}),
          ...(words ? { words } : {})
        }
      })
    )
  }

  return normalizePlainTextTranscription(response?.result?.text ?? '', 0)
}

export function normalizePlainTextTranscription(text: string, durationMs: number): SubtitleCue[] {
  const parts = String(text)
    .split(/(?<=[。！？.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean)

  if (!parts.length) throw new Error('ASR 没有返回可用字幕')

  const totalDuration = Math.max(durationMs, parts.length * 3000)
  const cueMs = Math.max(1000, Math.round(totalDuration / parts.length))
  return parts.map((part, index) => ({
    id: `plain-${index}`,
    startMs: index * cueMs,
    endMs: index === parts.length - 1 ? totalDuration : (index + 1) * cueMs,
    text: part
  }))
}
