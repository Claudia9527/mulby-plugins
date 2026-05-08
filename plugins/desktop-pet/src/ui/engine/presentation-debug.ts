export const PET_PRESENTATION_LOG_PREFIX = '[desktop-pet][presentation]'

type LogDetail = Record<string, unknown> | undefined

function trimLogString(value: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= 160) return normalized
  return `${normalized.slice(0, 157)}...(${normalized.length} chars)`
}

function sanitizeForLog(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (typeof value === 'string') return trimLogString(value)
  if (typeof value === 'number' || typeof value === 'boolean' || value == null) return value
  if (Array.isArray(value)) return value.slice(0, 20).map(item => sanitizeForLog(item, depth + 1, seen))
  if (typeof value === 'object') {
    if (depth >= 3) return '[object]'
    if (seen.has(value)) return '[circular]'
    seen.add(value)
    const out: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = sanitizeForLog(item, depth + 1, seen)
    }
    return out
  }
  return String(value)
}

export function formatPetPresentationLog(event: string, detail?: LogDetail): string {
  if (detail === undefined) return `${PET_PRESENTATION_LOG_PREFIX} ${event}`
  return `${PET_PRESENTATION_LOG_PREFIX} ${event} ${JSON.stringify(sanitizeForLog(detail))}`
}

export function logPetPresentation(event: string, detail?: LogDetail) {
  try {
    console.info(formatPetPresentationLog(event, detail))
  } catch {
    /* logging must never affect pet behavior */
  }
}
