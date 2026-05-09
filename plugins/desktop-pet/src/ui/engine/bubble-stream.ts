export interface BubbleStreamPayload {
  reply: string
  reasoning: string
}

export const PET_CURRENT_BUBBLE_STORAGE_KEY = 'pet-current-bubble-stream'

export interface BubblePreviewState extends BubbleStreamPayload {
  reasoningPreview: string
  reasoningChars: number
  hasReasoning: boolean
  statusLabel: '思考中' | '已思考' | ''
}

export interface BubbleDetailState extends BubbleStreamPayload {
  reasoningChars: number
}

const MAX_PREVIEW_REASONING_LINES = 4
const MAX_PREVIEW_REASONING_CHARS = 177

export function normalizeBubbleStreamPayload(raw: string | { reply?: unknown; reasoning?: unknown }): BubbleStreamPayload {
  if (typeof raw === 'string') {
    return { reply: raw, reasoning: '' }
  }

  if (!raw || typeof raw !== 'object') {
    return { reply: '', reasoning: '' }
  }

  return {
    reply: typeof raw.reply === 'string' ? raw.reply : '',
    reasoning: typeof raw.reasoning === 'string' ? raw.reasoning : '',
  }
}

export function buildBubblePreviewState(payload: BubbleStreamPayload): BubblePreviewState {
  const reply = payload.reply
  const reasoning = payload.reasoning
  const reasoningChars = reasoning.length
  const hasReasoning = reasoning.trim().length > 0
  const statusLabel = hasReasoning ? (reply.trim() ? '已思考' : '思考中') : ''

  return {
    reply,
    reasoning,
    reasoningPreview: !reply.trim() && hasReasoning ? tailLines(reasoning, MAX_PREVIEW_REASONING_LINES) : '',
    reasoningChars,
    hasReasoning,
    statusLabel,
  }
}

export function buildBubbleDetailState(payload: BubbleStreamPayload): BubbleDetailState {
  return {
    reply: payload.reply,
    reasoning: payload.reasoning,
    reasoningChars: payload.reasoning.length,
  }
}

function tailLines(text: string, maxLines: number): string {
  const tail = text
    .split(/\r?\n/)
    .map(line => line.trimEnd())
    .filter(line => line.trim().length > 0)
    .slice(-maxLines)
    .join('\n')

  if (tail.length <= MAX_PREVIEW_REASONING_CHARS) return tail
  return `${tail.slice(-(MAX_PREVIEW_REASONING_CHARS - 3)).trimStart()}...`
}
