import type { ApiExampleModule } from './types'
import { attempt, catalogModule, callBackendExample, mulby, unavailable } from './helpers'

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
        description: 'Stores, reads, lists, batches, versions, appends, watches, and removes demo-owned renderer storage keys.',
        methods: [
          'storage.get',
          'storage.set',
          'storage.remove',
          'storage.getAll',
          'storage.getAllWithMeta',
          'storage.listNamespaces',
          'storage.list',
          'storage.getMany',
          'storage.setMany',
          'storage.getMeta',
          'storage.setWithVersion',
          'storage.removeWithVersion',
          'storage.transaction',
          'storage.append',
          'storage.watch'
        ],
        safety: 'writes-plugin-data',
        code: `const off = window.mulby.storage.watch({ prefix: 'mulby-demo:' }, console.log)
await window.mulby.storage.set('mulby-demo:lastRun', { at: Date.now() })
const value = await window.mulby.storage.get('mulby-demo:lastRun')
const meta = await window.mulby.storage.getMeta('mulby-demo:lastRun')
await window.mulby.storage.append('mulby-demo:events', { type: 'run' }, { maxItems: 5 })
await window.mulby.storage.remove('mulby-demo:lastRun')
off()`,
        async run() {
          const api = mulby()
          if (!api?.storage) return unavailable('Storage roundtrip')
          const payload = { at: new Date().toISOString(), source: 'mulby-demo' }
          const events: unknown[] = []
          const off = api.storage.watch?.({ prefix: 'mulby-demo:' }, (event: unknown) => events.push(event))
          await api.storage.set('mulby-demo:lastRun', payload)
          await api.storage.setMany?.([
            { key: 'mulby-demo:batch-a', value: { index: 1 } },
            { key: 'mulby-demo:batch-b', value: { index: 2 } }
          ], { atomic: true })
          await api.storage.setWithVersion?.('mulby-demo:versioned', { version: 1 }, { expectedVersion: null })
          await api.storage.append?.('mulby-demo:events', { type: 'run', at: payload.at }, { maxItems: 5 })
          await api.storage.transaction?.([
            { op: 'set', key: 'mulby-demo:tx-a', value: { tx: true } },
            { op: 'remove', key: 'mulby-demo:tx-missing' }
          ])
          const [value, all, allWithMeta, namespaces, list, many, meta, versionedMeta] = await Promise.all([
            api.storage.get('mulby-demo:lastRun'),
            attempt('getAll', () => api.storage.getAll?.()),
            attempt('getAllWithMeta', () => api.storage.getAllWithMeta?.('global')),
            attempt('listNamespaces', () => api.storage.listNamespaces?.()),
            attempt('list', () => api.storage.list?.({ prefix: 'mulby-demo:', limit: 20 })),
            attempt('getMany', () => api.storage.getMany?.(['mulby-demo:lastRun', 'mulby-demo:batch-a'])),
            attempt('getMeta', () => api.storage.getMeta?.('mulby-demo:lastRun')),
            attempt('getMeta:versioned', () => api.storage.getMeta?.('mulby-demo:versioned'))
          ])
          await api.storage.removeWithVersion?.('mulby-demo:versioned', { expectedVersion: versionedMeta.ok ? (versionedMeta.value as any)?.version : undefined })
          await api.storage.remove('mulby-demo:lastRun')
          await api.storage.remove('mulby-demo:batch-a')
          await api.storage.remove('mulby-demo:batch-b')
          await api.storage.remove('mulby-demo:events')
          await api.storage.remove('mulby-demo:tx-a')
          off?.()
          return {
            ok: true,
            title: 'Storage roundtrip',
            data: {
              value,
              all,
              allWithMeta,
              namespaces,
              list,
              many,
              meta,
              versionedMeta,
              watchEvents: events,
              removed: true
            }
          }
        }
      },
      {
        id: 'storage-backend-keys',
        label: 'Backend keys and clear',
        description: 'Uses backend storage keys and clear on demo-owned keys, then restores lifecycle metadata.',
        methods: ['storage.clear', 'storage.keys', 'storage.has', 'storage.bulkSet'],
        safety: 'writes-plugin-data',
        code: `await window.mulby.host.call('mulby-demo', 'runBackendExample', 'backendStorageRoundtrip')`,
        async run() {
          const data = await callBackendExample('backendStorageRoundtrip')
          if ((data as any)?.warning) return data as any
          return { ok: true, title: 'Backend storage keys', data }
        }
      },
      {
        id: 'storage-encrypted-attachment',
        label: 'Encrypted and attachment storage',
        description: 'Writes, reads, checks, lists, and removes demo-owned encrypted and binary values.',
        methods: [
          'storage.encrypted.set',
          'storage.encrypted.get',
          'storage.encrypted.remove',
          'storage.encrypted.has',
          'storage.attachment.put',
          'storage.attachment.get',
          'storage.attachment.getType',
          'storage.attachment.remove',
          'storage.attachment.list'
        ],
        safety: 'writes-plugin-data',
        code: `await window.mulby.storage.encrypted.set('mulby-demo:secret', { ok: true })\nconst secret = await window.mulby.storage.encrypted.get('mulby-demo:secret')\nawait window.mulby.storage.attachment.put('mulby-demo:blob', new TextEncoder().encode('demo'), 'text/plain')\nconst blob = await window.mulby.storage.attachment.get('mulby-demo:blob')`,
        async run() {
          const api = mulby()
          if (!api?.storage) return unavailable('Encrypted and attachment storage')
          const secretKey = 'mulby-demo:secret'
          const attachmentId = 'mulby-demo:blob'
          const secretPayload = { ok: true, at: new Date().toISOString() }
          await api.storage.encrypted?.set(secretKey, secretPayload)
          const secret = await api.storage.encrypted?.get(secretKey)
          const hasSecret = await api.storage.encrypted?.has?.(secretKey)
          await api.storage.encrypted?.remove(secretKey)

          const bytes = new TextEncoder().encode('Mulby demo attachment')
          await api.storage.attachment?.put(attachmentId, bytes, 'text/plain')
          const attachmentType = await api.storage.attachment?.getType(attachmentId)
          const attachment = await api.storage.attachment?.get(attachmentId)
          const list = await api.storage.attachment?.list('mulby-demo')
          await api.storage.attachment?.remove(attachmentId)
          return {
            ok: true,
            title: 'Encrypted and attachment storage',
            data: {
              secret,
              hasSecret,
              attachmentType,
              attachmentBytes: attachment?.byteLength ?? attachment?.length,
              listed: list
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
        methods: ['clipboard.readText', 'clipboard.readImage', 'clipboard.readFiles', 'clipboard.getFormat'],
        safety: 'requires-permission',
        code: `const format = await window.mulby.clipboard.getFormat()\nconst text = await window.mulby.clipboard.readText()`,
        async run() {
          const api = mulby()
          if (!api?.clipboard) return unavailable('Clipboard read')
          const [format, text] = await Promise.all([
            api.clipboard.getFormat(),
            api.clipboard.readText()
          ])
          const image = await api.clipboard.readImage()
          const files = await api.clipboard.readFiles()
          return {
            ok: true,
            title: 'Clipboard read',
            data: {
              format,
              textPreview: String(text ?? '').slice(0, 120),
              hasImage: Boolean(image),
              files: Array.isArray(files) ? files.slice(0, 5) : files
            }
          }
        }
      },
      {
        id: 'clipboard-write-demo',
        label: 'Write demo text',
        description: 'Writes a clearly labeled demo string to the clipboard.',
        methods: ['clipboard.writeText', 'clipboard.writeImage', 'clipboard.writeFiles'],
        safety: 'writes-plugin-data',
        code: `await window.mulby.clipboard.writeText('Mulby demo clipboard sample')\nawait window.mulby.clipboard.writeImage(dataUrl)\nawait window.mulby.clipboard.writeFiles([])`,
        async run() {
          const api = mulby()
          if (!api?.clipboard) return unavailable('Clipboard write')
          const text = `Mulby demo clipboard sample ${new Date().toISOString()}`
          await api.clipboard.writeText(text)
          const imageResult = await api.clipboard.writeImage?.(
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lw9LNgAAAABJRU5ErkJggg=='
          )
          let writeFilesResult: unknown = null
          try {
            writeFilesResult = await api.clipboard.writeFiles?.([])
          } catch (error) {
            writeFilesResult = error instanceof Error ? error.message : String(error)
          }
          return { ok: true, title: 'Clipboard write', data: { written: text, imageResult, writeFilesResult } }
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
        methods: ['clipboardHistory.stats'],
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
        label: 'Query and copy recent record',
        description: 'Queries recent records, reads the first record by id, copies it, toggles favorite twice, and leaves history unchanged.',
        methods: ['clipboardHistory.query', 'clipboardHistory.get', 'clipboardHistory.copy', 'clipboardHistory.toggleFavorite'],
        safety: 'requires-permission',
        code: `const records = await window.mulby.clipboardHistory.query({ limit: 5 })\nconst first = records[0]\nif (first) {\n  await window.mulby.clipboardHistory.get(first.id)\n  await window.mulby.clipboardHistory.copy(first.id)\n  await window.mulby.clipboardHistory.toggleFavorite(first.id)\n  await window.mulby.clipboardHistory.toggleFavorite(first.id)\n}`,
        async run() {
          const api = mulby()
          if (!api?.clipboardHistory) return unavailable('Clipboard history query')
          const records = await api.clipboardHistory.query({ limit: 5 })
          const first = records[0]
          const firstRecord = first ? await api.clipboardHistory.get(first.id) : null
          let copyResult: unknown = null
          let favoriteToggle: unknown = null
          if (first) {
            copyResult = await api.clipboardHistory.copy(first.id)
            const one = await api.clipboardHistory.toggleFavorite(first.id)
            const two = await api.clipboardHistory.toggleFavorite(first.id)
            favoriteToggle = { one, two }
          }
          return {
            ok: true,
            title: 'Clipboard history query',
            data: {
              records: records.map((item: any) => ({
                id: item.id,
                type: item.type,
                size: item.size,
                favorite: item.favorite,
                timestamp: item.timestamp
              })),
              firstRecord: firstRecord ? { id: firstRecord.id, type: firstRecord.type, favorite: firstRecord.favorite } : null,
              copyResult,
              favoriteToggle
            }
          }
        }
      },
      {
        id: 'clipboard-history-delete-clear',
        label: 'Delete and clear guarded demo',
        description: 'Executes delete with a demo-only impossible id and skips destructive clear unless the user opts into editing the snippet.',
        methods: ['clipboardHistory.delete', 'clipboardHistory.clear'],
        safety: 'requires-permission',
        code: `await window.mulby.clipboardHistory.delete('mulby-demo-nonexistent-id')\n// await window.mulby.clipboardHistory.clear()`,
        async run() {
          const api = mulby()
          if (!api?.clipboardHistory) return unavailable('Clipboard history delete guard')
          const deleteResult = await api.clipboardHistory.delete('mulby-demo-nonexistent-id')
          return {
            ok: true,
            title: 'Clipboard history delete guard',
            data: {
              deleteResult,
              clear: 'Not executed by default because it clears user clipboard history. The API call is intentionally shown in the snippet for explicit manual use.'
            }
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
        description: 'Encrypts and decrypts a demo string when host safe storage is available.',
        methods: ['security.isEncryptionAvailable', 'security.encryptString', 'security.decryptString'],
        safety: 'safe',
        code: `const available = await window.mulby.security.isEncryptionAvailable()\nconst encrypted = available ? await window.mulby.security.encryptString('Mulby demo') : null\nconst decrypted = encrypted ? await window.mulby.security.decryptString(encrypted) : null`,
        async run() {
          const api = mulby()
          if (!api?.security) return unavailable('Security availability')
          const available = await api.security.isEncryptionAvailable()
          const encrypted = available ? await api.security.encryptString('Mulby demo secret') : null
          const decrypted = encrypted ? await api.security.decryptString(encrypted) : null
          return {
            ok: true,
            title: 'Security availability',
            data: {
              available,
              encryptedBytes: encrypted?.byteLength ?? encrypted?.length ?? 0,
              decrypted
            }
          }
        }
      }
    ]
  })
]
