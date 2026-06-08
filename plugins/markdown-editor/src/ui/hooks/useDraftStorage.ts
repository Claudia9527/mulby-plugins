import { useCallback, useMemo } from 'react'

export interface DraftPayload {
  content: string
  updatedAt: number
}

interface DraftStorage {
  get: (key: string) => Promise<unknown>
  set: (key: string, value: unknown) => Promise<void>
  remove: (key: string) => Promise<void>
}

export function normalizeDraft(value: unknown): DraftPayload | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const content = 'content' in value && typeof value.content === 'string' ? value.content : null
  const updatedAt = 'updatedAt' in value && typeof value.updatedAt === 'number' ? value.updatedAt : 0
  if (content === null) {
    return null
  }

  return { content, updatedAt }
}

/**
 * Encapsulates the draft persistence concern (read/write/remove of the
 * markdown draft) so the editor component only deals with React state.
 */
export function useDraftStorage(storage: DraftStorage, draftKey: string) {
  const loadDraft = useCallback(async (): Promise<DraftPayload | null> => {
    const value = await storage.get(draftKey)
    return normalizeDraft(value)
  }, [draftKey, storage])

  const saveDraft = useCallback(
    async (content: string): Promise<DraftPayload | null> => {
      if (content.trim()) {
        const payload: DraftPayload = { content, updatedAt: Date.now() }
        await storage.set(draftKey, payload)
        return payload
      }
      await storage.remove(draftKey)
      return null
    },
    [draftKey, storage]
  )

  const clearDraft = useCallback(async () => {
    await storage.remove(draftKey)
  }, [draftKey, storage])

  return useMemo(() => ({ loadDraft, saveDraft, clearDraft }), [clearDraft, loadDraft, saveDraft])
}
