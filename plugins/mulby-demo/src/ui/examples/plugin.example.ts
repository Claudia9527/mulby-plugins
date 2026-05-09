import type { ApiExampleModule } from './types'
import { catalogModule, mulby, unavailable } from './helpers'

export const pluginExamples: ApiExampleModule[] = [
  catalogModule('manifest', {
    title: 'Plugin Manifest',
    category: 'plugin',
    contexts: ['manifest'],
    notes: [
      'Treat `manifest.json` as the source of truth for plugin contract, permissions, tools, and feature triggers.',
      'Every feature code in manifest should map to backend and/or UI behavior.'
    ],
    examples: [
      {
        id: 'manifest-snippet',
        label: 'Manifest contract snippet',
        description: 'Shows the key fields used by this demo plugin.',
        safety: 'preview-only',
        code: `"features": [\n  { "code": "open-reference", "mode": "ui", "cmds": [{ "type": "keyword", "value": "mulby demo" }] },\n  { "code": "run-smoke-demo", "mode": "silent", "cmds": [{ "type": "keyword", "value": "mulby demo smoke" }] }\n],\n"tools": [{ "name": "mulby_demo_echo", "inputSchema": { "type": "object" } }]`
      }
    ]
  }),
  catalogModule('lifecycle', {
    title: 'Lifecycle & Run Context',
    category: 'plugin',
    contexts: ['backend'],
    notes: [
      'Backend APIs are async through `context.api`; await calls even when renderer equivalents look synchronous.',
      '`run(context)` receives featureCode, input text, and attachments from the matched feature.'
    ],
    examples: [
      {
        id: 'lifecycle-state',
        label: 'Read backend lifecycle state',
        description: 'Calls backend host RPC to read lifecycle counters and last run context.',
        safety: 'safe',
        code: `await window.mulby.host.call('mulby-demo', 'runBackendExample', 'lifecycleState')`,
        async run() {
          const api = mulby()
          if (!api?.host) return unavailable('Lifecycle state')
          const data = await api.host.call('mulby-demo', 'runBackendExample', 'lifecycleState')
          return { ok: true, title: 'Lifecycle state', data }
        }
      }
    ]
  }),
  catalogModule('host', {
    title: 'Host RPC',
    category: 'plugin',
    contexts: ['renderer'],
    notes: [
      'Prefer the `rpc` export shape for new backend methods when supported; this demo also exposes `host` for compatibility.',
      'Keep host method inputs and outputs JSON-serializable.'
    ],
    examples: [
      {
        id: 'host-echo',
        label: 'Call backend echo',
        description: 'Calls a backend RPC method and returns the echoed payload.',
        safety: 'safe',
        code: `await window.mulby.host.call('mulby-demo', 'echo', { message: 'hello' })`,
        async run() {
          const api = mulby()
          if (!api?.host) return unavailable('Host echo')
          const data = await api.host.call('mulby-demo', 'echo', { message: 'hello from renderer' })
          return { ok: true, title: 'Host echo', data }
        }
      },
      {
        id: 'host-status',
        label: 'Read backend status',
        description: 'Reads backend process status for this plugin.',
        safety: 'safe',
        code: `await window.mulby.host.status('mulby-demo')`,
        async run() {
          const api = mulby()
          if (!api?.host) return unavailable('Host status')
          const data = await api.host.status('mulby-demo')
          return { ok: true, title: 'Host status', data }
        }
      }
    ]
  }),
  catalogModule('plugin', {
    title: 'Plugin Management',
    category: 'plugin',
    contexts: ['renderer'],
    notes: [
      'Discovery calls are safe. Install, uninstall, enable, disable, and stop calls mutate the plugin environment and should require explicit user intent.',
      'Command shortcut APIs are useful for building plugin managers or command palettes.'
    ],
    examples: [
      {
        id: 'plugin-list',
        label: 'List installed plugins',
        description: 'Reads installed plugin metadata and returns a compact summary.',
        safety: 'safe',
        code: `const plugins = await window.mulby.plugin.getAll()`,
        async run() {
          const api = mulby()
          if (!api?.plugin) return unavailable('Plugin list')
          const plugins = await api.plugin.getAll()
          return {
            ok: true,
            title: 'Plugin list',
            data: plugins.map((plugin: any) => ({
              id: plugin.id,
              name: plugin.name,
              displayName: plugin.displayName,
              enabled: plugin.enabled,
              features: plugin.features?.length ?? 0
            }))
          }
        }
      },
      {
        id: 'plugin-commands',
        label: 'List command entries',
        description: 'Reads commands exposed by this plugin.',
        safety: 'safe',
        code: `await window.mulby.plugin.listCommands('mulby-demo')`,
        async run() {
          const api = mulby()
          if (!api?.plugin) return unavailable('Plugin commands')
          const commands = await api.plugin.listCommands('mulby-demo')
          return { ok: true, title: 'Plugin commands', data: commands }
        }
      }
    ]
  }),
  catalogModule('features', {
    title: 'Dynamic Features',
    category: 'plugin',
    contexts: ['backend'],
    notes: [
      'Dynamic features are runtime entries owned by the plugin. Keep codes stable and remove entries on cleanup when they are transient.',
      'This demo registers a deterministic keyword entry so repeated runs update the same feature.'
    ],
    examples: [
      {
        id: 'features-register',
        label: 'Register dynamic feature',
        description: 'Calls backend to set a demo dynamic feature entry.',
        safety: 'writes-plugin-data',
        code: `await window.mulby.host.call('mulby-demo', 'runBackendExample', 'registerDynamicFeature')`,
        async run() {
          const api = mulby()
          if (!api?.host) return unavailable('Register dynamic feature')
          const data = await api.host.call('mulby-demo', 'runBackendExample', 'registerDynamicFeature')
          return { ok: true, title: 'Register dynamic feature', data }
        }
      }
    ]
  }),
  catalogModule('messaging', {
    title: 'Messaging',
    category: 'plugin',
    contexts: ['renderer', 'backend'],
    notes: [
      'Use namespaced message types, for example `mulby-demo:catalog-refresh`.',
      'Always unsubscribe renderer listeners on unmount.'
    ],
    examples: [
      {
        id: 'messaging-broadcast',
        label: 'Broadcast demo message',
        description: 'Broadcasts a small namespaced message from this plugin.',
        safety: 'safe',
        code: `await window.mulby.messaging.broadcast('mulby-demo:ping', { at: Date.now() })`,
        async run() {
          const api = mulby()
          if (!api?.messaging) return unavailable('Messaging broadcast')
          const payload = { at: new Date().toISOString(), source: 'mulby-demo' }
          await api.messaging.broadcast('mulby-demo:ping', payload)
          return { ok: true, title: 'Messaging broadcast', data: payload }
        }
      }
    ]
  }),
  catalogModule('scheduler', {
    title: 'Scheduler',
    category: 'plugin',
    contexts: ['renderer', 'backend'],
    notes: [
      'Backend creates tasks; renderer lists and manages tasks. Task callbacks must be exported by the plugin backend.',
      'Cron expressions use six fields: second, minute, hour, day, month, weekday.'
    ],
    examples: [
      {
        id: 'scheduler-describe',
        label: 'Describe cron',
        description: 'Asks backend scheduler to validate and describe a cron expression.',
        safety: 'safe',
        code: `await window.mulby.host.call('mulby-demo', 'runBackendExample', 'schedulerDescribe')`,
        async run() {
          const api = mulby()
          if (!api?.host) return unavailable('Scheduler describe')
          const data = await api.host.call('mulby-demo', 'runBackendExample', 'schedulerDescribe')
          return { ok: true, title: 'Scheduler describe', data }
        }
      },
      {
        id: 'scheduler-create-delay',
        label: 'Create delayed notification task',
        description: 'Creates a short delay task that calls the backend demo scheduler callback.',
        safety: 'writes-plugin-data',
        code: `await window.mulby.host.call('mulby-demo', 'runBackendExample', 'schedulerDelayTask')`,
        async run() {
          const api = mulby()
          if (!api?.host) return unavailable('Scheduler delay task')
          const data = await api.host.call('mulby-demo', 'runBackendExample', 'schedulerDelayTask')
          return { ok: true, title: 'Scheduler delay task', data }
        }
      }
    ]
  })
]
