import type { ApiExampleModule } from './types'
import { catalogModule, mulby, unavailable } from './helpers'

export const dataExamples: ApiExampleModule[] = [
  catalogModule('storage', {
    title: 'Storage',
    category: 'data',
    contexts: ['renderer', 'backend'],
    notes: [
      'Renderer storage accepts an optional namespace; backend storage is isolated to the current plugin.',
      'Use encrypted storage for tokens and attachment storage for binary data up to the host limit.'
    ],
    examples: [
      {
        id: 'storage-roundtrip',
        label: 'Write and read plugin data',
        description: 'Stores a small JSON object under a demo key, reads it back, then returns the value.',
        safety: 'writes-plugin-data',
        code: `await window.mulby.storage.set('mulby-demo:lastRun', { at: Date.now() })\nconst value = await window.mulby.storage.get('mulby-demo:lastRun')`,
        async run() {
          const api = mulby()
          if (!api?.storage) return unavailable('Storage roundtrip')
          const payload = { at: new Date().toISOString(), source: 'mulby-demo' }
          await api.storage.set('mulby-demo:lastRun', payload)
          const value = await api.storage.get('mulby-demo:lastRun')
          return { ok: true, title: 'Storage roundtrip', data: value }
        }
      },
      {
        id: 'storage-encrypted-preview',
        label: 'Encrypted storage availability',
        description: 'Checks whether encrypted storage functions are exposed in this renderer.',
        safety: 'safe',
        code: `Boolean(window.mulby.storage.encrypted?.set && window.mulby.storage.encrypted?.get)`,
        async run() {
          const api = mulby()
          if (!api?.storage) return unavailable('Encrypted storage availability')
          return {
            ok: true,
            title: 'Encrypted storage availability',
            data: {
              encrypted: Boolean(api.storage.encrypted?.set && api.storage.encrypted?.get),
              attachment: Boolean(api.storage.attachment?.put && api.storage.attachment?.list)
            }
          }
        }
      }
    ]
  }),
  catalogModule('clipboard', {
    title: 'Clipboard',
    category: 'data',
    contexts: ['renderer', 'backend'],
    notes: [
      'Requires `manifest.permissions.clipboard: true` for clipboard and clipboard-history access.',
      'This demo reads text and format by default; write examples use explicit demo text.'
    ],
    examples: [
      {
        id: 'clipboard-read',
        label: 'Read clipboard format and text',
        description: 'Reads current clipboard format and text without modifying the clipboard.',
        safety: 'requires-permission',
        code: `const format = await window.mulby.clipboard.getFormat()\nconst text = await window.mulby.clipboard.readText()`,
        async run() {
          const api = mulby()
          if (!api?.clipboard) return unavailable('Clipboard read')
          const [format, text] = await Promise.all([
            api.clipboard.getFormat(),
            api.clipboard.readText()
          ])
          return {
            ok: true,
            title: 'Clipboard read',
            data: { format, textPreview: String(text ?? '').slice(0, 120) }
          }
        }
      },
      {
        id: 'clipboard-write-demo',
        label: 'Write demo text',
        description: 'Writes a clearly labeled demo string to the clipboard.',
        safety: 'writes-plugin-data',
        code: `await window.mulby.clipboard.writeText('Mulby demo clipboard sample')`,
        async run() {
          const api = mulby()
          if (!api?.clipboard) return unavailable('Clipboard write')
          const text = `Mulby demo clipboard sample ${new Date().toISOString()}`
          await api.clipboard.writeText(text)
          return { ok: true, title: 'Clipboard write', data: { written: text } }
        }
      }
    ]
  }),
  catalogModule('clipboard-history', {
    title: 'Clipboard History',
    category: 'data',
    contexts: ['renderer', 'backend'],
    notes: [
      'Clipboard history is user data. Prefer small limits and avoid rendering sensitive content by default.',
      'Mutating calls such as delete/clear are documented but not executed by this reference UI.'
    ],
    examples: [
      {
        id: 'clipboard-history-stats',
        label: 'Read history stats',
        description: 'Reads aggregate clipboard history counts.',
        safety: 'requires-permission',
        code: `const stats = await window.mulby.clipboardHistory.stats()`,
        async run() {
          const api = mulby()
          if (!api?.clipboardHistory) return unavailable('Clipboard history stats')
          const stats = await api.clipboardHistory.stats()
          return { ok: true, title: 'Clipboard history stats', data: stats }
        }
      },
      {
        id: 'clipboard-history-query',
        label: 'Query recent records',
        description: 'Queries up to five recent records and only displays metadata in the output.',
        safety: 'requires-permission',
        code: `const records = await window.mulby.clipboardHistory.query({ limit: 5 })`,
        async run() {
          const api = mulby()
          if (!api?.clipboardHistory) return unavailable('Clipboard history query')
          const records = await api.clipboardHistory.query({ limit: 5 })
          return {
            ok: true,
            title: 'Clipboard history query',
            data: records.map((item: any) => ({
              id: item.id,
              type: item.type,
              size: item.size,
              favorite: item.favorite,
              timestamp: item.timestamp
            }))
          }
        }
      }
    ]
  }),
  catalogModule('security', {
    title: 'Security',
    category: 'data',
    contexts: ['renderer', 'backend'],
    notes: [
      'Use `storage.encrypted` for persisted secrets; `security.encryptString` is useful for explicit safe-storage transforms.',
      'Encryption availability depends on the host OS safe storage backend.'
    ],
    examples: [
      {
        id: 'security-availability',
        label: 'Check encryption availability',
        description: 'Reads whether host safe storage encryption is available.',
        safety: 'safe',
        code: `const available = await window.mulby.security.isEncryptionAvailable()`,
        async run() {
          const api = mulby()
          if (!api?.security) return unavailable('Security availability')
          const available = await api.security.isEncryptionAvailable()
          return { ok: true, title: 'Security availability', data: { available } }
        }
      }
    ]
  })
]
