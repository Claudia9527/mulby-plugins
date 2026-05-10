import type { ApiExampleModule } from './types'
import { catalogModule, mulby, unavailable } from './helpers'

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const diagnosticsExamples: ApiExampleModule[] = [
  catalogModule('log', {
    title: 'Log',
    category: 'diagnostics',
    contexts: ['renderer'],
    notes: [
      'Log records are plugin-scoped when Mulby can resolve the calling plugin window.',
      'Call `subscribe` before `onLog` when a UI needs live log updates, and always dispose the listener.'
    ],
    examples: [
      {
        id: 'log-write-query-subscribe',
        label: 'Write, query, subscribe, and clear logs',
        description: 'Subscribes to live log events, writes every log level, queries plugin logs, clears demo-owned logs, and reads the log directory.',
        methods: [
          'log.debug',
          'log.info',
          'log.warn',
          'log.error',
          'log.getLogs',
          'log.clear',
          'log.getLogsDir',
          'log.subscribe',
          'log.onLog'
        ],
        safety: 'writes-plugin-data',
        code: `await window.mulby.log.subscribe()
const off = window.mulby.log.onLog((entry) => console.log(entry.level, entry.message))
window.mulby.log.debug('Mulby demo debug', { source: 'mulby-demo' })
window.mulby.log.info('Mulby demo info')
window.mulby.log.warn('Mulby demo warning')
window.mulby.log.error('Mulby demo error')
const logs = await window.mulby.log.getLogs({ pluginId: 'mulby-demo', limit: 20 })
const logsDir = await window.mulby.log.getLogsDir()
await window.mulby.log.clear('mulby-demo')
off()`,
        async run() {
          const api = mulby()
          if (!api?.log) return unavailable('Log diagnostics')

          const liveEntries: unknown[] = []
          const subscribe = await api.log.subscribe()
          const off = api.log.onLog?.((entry: unknown) => liveEntries.push(entry))

          api.log.debug('Mulby demo debug log', { source: 'mulby-demo', level: 'debug' })
          api.log.info('Mulby demo info log', { source: 'mulby-demo', level: 'info' })
          api.log.warn('Mulby demo warning log', { source: 'mulby-demo', level: 'warn' })
          api.log.error('Mulby demo error log', { source: 'mulby-demo', level: 'error' })

          await wait(150)
          const beforeClear = await api.log.getLogs({ pluginId: 'mulby-demo', limit: 20 })
          const logsDir = await api.log.getLogsDir()
          const clear = await api.log.clear('mulby-demo')
          api.log.info('Mulby demo log after clear', { source: 'mulby-demo' })
          await wait(50)
          const afterClear = await api.log.getLogs({ pluginId: 'mulby-demo', limit: 5 })
          off?.()

          return {
            ok: true,
            title: 'Log diagnostics',
            data: {
              subscribe,
              logsDir,
              beforeClearCount: Array.isArray(beforeClear) ? beforeClear.length : beforeClear,
              afterClearCount: Array.isArray(afterClear) ? afterClear.length : afterClear,
              liveEntries: liveEntries.slice(0, 8),
              clear
            }
          }
        }
      }
    ]
  })
]
