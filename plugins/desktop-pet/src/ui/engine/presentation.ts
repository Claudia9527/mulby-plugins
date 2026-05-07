/**
 * AI 控制宠物表现：Mulby ai.call 的 function tool + 文本回退标记。
 */
import type { PetExpression, PetPose } from './pet-standard'
import { ALL_EXPRESSIONS, ALL_POSES } from './pet-standard'

export const PET_PRESENTATION_TOOL_NAME = 'pet_set_presentation'

const FACE_ALIASES: PetExpression[] = [...ALL_EXPRESSIONS]
const FACE_SET = new Set<string>([...FACE_ALIASES, 'love'])
const POSE_SET = new Set<string>(ALL_POSES)

export type PresentationFace = PetExpression | 'love'

export interface PresentationIntent {
  face: PresentationFace
  pose?: PetPose
  /** 与 pet-stats applyEmotion 一致的情绪标签（小写） */
  emotion?: string
}

export interface PetAiStreamCallbacks {
  /** 气泡：reply 为对用户可见正文（已去掉表现标记）；reasoning 为推理过程累积 */
  onBubble?: (payload: { reply: string; reasoning: string }) => void
  /** 表情/姿势/心情：tool 来自模型 tool-call；fallback 来自文本标记或 [emotion] */
  onPresentation?: (intent: PresentationIntent, source: 'tool' | 'fallback') => void
}

/**
 * 仅供本插件 UI 内 `mulby.ai.call({ tools: [...] })` 使用。
 * manifest.json 的 `tools` 用于把能力开放给外部 AI Agent，与内联 tools 无关。
 */
export const PET_PRESENTATION_AI_TOOL = {
  type: 'function' as const,
  function: {
    name: PET_PRESENTATION_TOOL_NAME,
    description:
      '在回复用户时同步设定桌面宠物的表情与可选姿势。每轮对话应调用一次（在输出正文前或后均可）。face 必填；若无法确定则用 neutral。',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        face: {
          type: 'string',
          description: `表情，必须是之一: ${[...FACE_SET].join(', ')}`,
        },
        pose: {
          type: 'string',
          description: `可选。姿势: ${ALL_POSES.join(', ')}`,
        },
        emotion: {
          type: 'string',
          description:
            '可选。与系统心情统计一致: joy, sadness, surprise, anger, excitement, sleepiness, calm, shyness, love, curiosity',
        },
      },
      required: ['face'],
    },
  },
}

export function isPresentationToolName(name: string): boolean {
  return name === PET_PRESENTATION_TOOL_NAME || name.endsWith(`__${PET_PRESENTATION_TOOL_NAME}`)
}

export function normalizePresentationArgs(raw: unknown): PresentationIntent | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const faceRaw = typeof o.face === 'string' ? o.face.trim() : ''
  if (!faceRaw || !FACE_SET.has(faceRaw)) return null
  const face: PresentationFace = faceRaw === 'love' ? 'love' : (faceRaw as PetExpression)

  const intent: PresentationIntent = { face }
  if (typeof o.pose === 'string' && POSE_SET.has(o.pose)) intent.pose = o.pose as PetPose
  if (typeof o.emotion === 'string' && o.emotion.trim()) intent.emotion = o.emotion.trim().toLowerCase()
  return intent
}

const PET_BLOCK = /<<<PET\s*(\{[\s\S]*?\})\s*>>>/g

export function stripPresentationMarkers(text: string): string {
  return text.replace(PET_BLOCK, '').replace(/\n{3,}/g, '\n\n').trim()
}

/** 提取并移除所有 <<<PET {...}>>> 块，合并为单一 intent（后者覆盖前者） */
export function tryExtractPresentationMarker(text: string): { cleaned: string; intent: PresentationIntent | null } {
  let last: PresentationIntent | null = null
  const cleaned = text.replace(PET_BLOCK, (_m, json: string) => {
    try {
      const p = JSON.parse(json) as unknown
      const n = normalizePresentationArgs(p)
      if (n) last = n
    } catch {
      /* ignore */
    }
    return ''
  })
  return { cleaned: cleaned.trim(), intent: last }
}

export function sanitizeAssistantForHistory(content: string): string {
  return stripPresentationMarkers(content).trim()
}
