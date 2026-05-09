import type { ApiExampleModule } from './types'
import { catalogModule, mulby, unavailable } from './helpers'

export const filesNetworkExamples: ApiExampleModule[] = [
  catalogModule('filesystem', {
    title: 'Filesystem',
    category: 'files-network',
    contexts: ['renderer', 'backend'],
    notes: [
      'Renderer APIs operate on explicit paths from the user or host-provided attachments.',
      'Backend-only path helpers such as `join`, `dirname`, and `getDataPath` are demonstrated through host RPC.'
    ],
    examples: [
      {
        id: 'filesystem-temp-roundtrip',
        label: 'Backend temp file roundtrip',
        description: 'Asks the backend to write, read, stat, and remove a demo file under the plugin data path.',
        safety: 'writes-plugin-data',
        code: `await window.mulby.host.call('mulby-demo', 'runBackendExample', 'filesystemRoundtrip')`,
        async run() {
          const api = mulby()
          if (!api?.host) return unavailable('Filesystem backend roundtrip')
          const data = await api.host.call('mulby-demo', 'runBackendExample', 'filesystemRoundtrip')
          return { ok: true, title: 'Filesystem backend roundtrip', data }
        }
      }
    ]
  }),
  catalogModule('http', {
    title: 'HTTP',
    category: 'files-network',
    contexts: ['renderer', 'backend'],
    notes: [
      'Use `request` for full control; convenience helpers cover common verbs.',
      'This demo calls an HTTPS endpoint designed for lightweight JSON responses.'
    ],
    examples: [
      {
        id: 'http-get',
        label: 'GET sample JSON',
        description: 'Fetches a small JSON payload from httpbin.',
        safety: 'safe',
        code: `const response = await window.mulby.http.get('https://httpbin.org/json')`,
        async run() {
          const api = mulby()
          if (!api?.http) return unavailable('HTTP GET')
          const response = await api.http.get('https://httpbin.org/json')
          return { ok: true, title: 'HTTP GET', data: response }
        }
      }
    ]
  }),
  catalogModule('network', {
    title: 'Network',
    category: 'files-network',
    contexts: ['renderer', 'backend'],
    notes: [
      'Renderer subscriptions are useful for UI state. Backend network API focuses on current connectivity state.'
    ],
    examples: [
      {
        id: 'network-state',
        label: 'Read online state',
        description: 'Reads whether the host reports network connectivity.',
        safety: 'safe',
        code: `const online = await window.mulby.network.isOnline()`,
        async run() {
          const api = mulby()
          if (!api?.network) return unavailable('Network state')
          const online = await api.network.isOnline()
          return { ok: true, title: 'Network state', data: { online } }
        }
      }
    ]
  }),
  catalogModule('shell', {
    title: 'Shell',
    category: 'files-network',
    contexts: ['renderer', 'backend'],
    notes: [
      '`runCommand` requires `manifest.permissions.runCommand: true` and passes through the global command policy.',
      'The runnable command example uses backend `process.execPath` and `shell: false`; policy may still require user consent.'
    ],
    examples: [
      {
        id: 'shell-policy',
        label: 'Read command policy',
        description: 'Reads the current runCommand policy without executing a command.',
        safety: 'safe',
        code: `const policy = await window.mulby.shell.getRunCommandPolicy()`,
        async run() {
          const api = mulby()
          if (!api?.shell) return unavailable('Shell command policy')
          const policy = await api.shell.getRunCommandPolicy()
          return { ok: true, title: 'Shell command policy', data: policy }
        }
      },
      {
        id: 'shell-backend-command',
        label: 'Run safe backend command',
        description: 'Asks backend to execute `node -e` with shell disabled.',
        safety: 'requires-permission',
        code: `await window.mulby.host.call('mulby-demo', 'runBackendExample', 'shellRunCommand')`,
        async run() {
          const api = mulby()
          if (!api?.host) return unavailable('Shell backend command')
          const data = await api.host.call('mulby-demo', 'runBackendExample', 'shellRunCommand')
          return { ok: true, title: 'Shell backend command', data }
        }
      }
    ]
  }),
  catalogModule('inbrowser', {
    title: 'InBrowser',
    category: 'files-network',
    contexts: ['renderer'],
    notes: [
      'InBrowser chains browser actions and returns data through `run` or specific extraction methods.',
      'Examples are preview-only here to avoid opening remote pages unexpectedly.'
    ],
    examples: [
      {
        id: 'inbrowser-preview',
        label: 'Preview browser automation chain',
        description: 'Shows a safe automation chain without launching it.',
        safety: 'preview-only',
        code: `await window.mulby.inbrowser\n  .goto('https://example.com')\n  .wait('h1')\n  .markdown('body')\n  .run()`
      }
    ]
  })
]
