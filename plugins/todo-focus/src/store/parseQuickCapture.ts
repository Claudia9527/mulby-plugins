export function parseQuickCapture(input: string): string | null {
  const m = input.trim().match(/^(?:todo|待办|td)\s+([\s\S]+)$/i)
  return m?.[1]?.trim() || null
}

export function normalizeSelectionTitle(input: string, maxLen = 500): string {
  const title = input.trim()
  if (title.length <= maxLen) return title
  return title.slice(0, maxLen)
}
