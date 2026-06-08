// Pure helpers for the "recent files / folders" list shown atop the explorer.
// Dedupe by path, most-recent-first, capped. Persisted via storage by the hook.

export type RecentKind = 'file' | 'folder'

export interface RecentEntry {
  path: string
  name: string
  kind: RecentKind
  at: number
}

export const RECENT_CAP = 12

/** Add/refresh an entry: dedupe by path, move to front, cap the list length. */
export function addRecent(list: RecentEntry[], entry: RecentEntry, cap = RECENT_CAP): RecentEntry[] {
  const filtered = list.filter((item) => item.path !== entry.path)
  return [entry, ...filtered].slice(0, Math.max(0, cap))
}

/** Remove an entry by path (e.g. when the file is deleted/missing). */
export function removeRecent(list: RecentEntry[], path: string): RecentEntry[] {
  return list.filter((item) => item.path !== path)
}

/** Validate persisted data into a clean RecentEntry[] (drops malformed items). */
export function normalizeRecent(value: unknown): RecentEntry[] {
  if (!Array.isArray(value)) {
    return []
  }
  const seen = new Set<string>()
  const result: RecentEntry[] = []
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') {
      continue
    }
    const item = raw as Record<string, unknown>
    const path = typeof item.path === 'string' ? item.path : ''
    const name = typeof item.name === 'string' ? item.name : ''
    const kind = item.kind === 'folder' ? 'folder' : 'file'
    const at = typeof item.at === 'number' ? item.at : 0
    if (!path || seen.has(path)) {
      continue
    }
    seen.add(path)
    result.push({ path, name: name || path, kind, at })
  }
  return result
}
