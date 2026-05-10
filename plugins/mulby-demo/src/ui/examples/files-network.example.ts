import type { ApiExampleModule } from './types'
import { attempt, callBackendExample, catalogModule, mulby, unavailable } from './helpers'

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
        methods: ['filesystem.readFile', 'filesystem.writeFile', 'filesystem.exists', 'filesystem.readdir', 'filesystem.mkdir', 'filesystem.stat', 'filesystem.copy', 'filesystem.move', 'filesystem.unlink', 'filesystem.extname', 'filesystem.join', 'filesystem.dirname', 'filesystem.basename', 'filesystem.getDataPath'],
        safety: 'writes-plugin-data',
        code: `await window.mulby.host.call('mulby-demo', 'runBackendExample', 'filesystemRoundtrip')`,
        async run() {
          const data = await callBackendExample('filesystemRoundtrip')
          if ((data as any)?.warning) return data as any
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
        id: 'http-verbs',
        label: 'Run HTTP verbs',
        description: 'Runs request, GET, POST, PUT, and DELETE against lightweight JSON endpoints.',
        methods: ['http.request', 'http.get', 'http.post', 'http.put', 'http.delete'],
        safety: 'safe',
        code: `await window.mulby.http.request({ url: 'https://httpbin.org/json', method: 'GET' })\nawait window.mulby.http.get('https://httpbin.org/json')\nawait window.mulby.http.post('https://httpbin.org/post', { source: 'mulby-demo' })`,
        async run() {
          const api = mulby()
          if (!api?.http) return unavailable('HTTP verbs')
          const [request, get, post, put, deleted] = await Promise.all([
            api.http.request({ url: 'https://httpbin.org/json', method: 'GET' }),
            api.http.get('https://httpbin.org/json'),
            api.http.post('https://httpbin.org/post', { source: 'mulby-demo' }),
            api.http.put('https://httpbin.org/put', { source: 'mulby-demo' }),
            api.http.delete('https://httpbin.org/delete')
          ])
          return { ok: true, title: 'HTTP verbs', data: { request, get, post, put, delete: deleted } }
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
        description: 'Reads network state and registers online/offline listeners, then removes browser event listeners immediately.',
        methods: ['network.isOnline', 'network.onOnline', 'network.onOffline'],
        safety: 'safe',
        code: `const online = await window.mulby.network.isOnline()\nwindow.mulby.network.onOnline(() => console.log('online'))\nwindow.mulby.network.onOffline(() => console.log('offline'))`,
        async run() {
          const api = mulby()
          if (!api?.network) return unavailable('Network state')
          const online = await api.network.isOnline()
          let onlineEvents = 0
          let offlineEvents = 0
          const onOnline = () => { onlineEvents += 1 }
          const onOffline = () => { offlineEvents += 1 }
          api.network.onOnline(onOnline)
          api.network.onOffline(onOffline)
          window.removeEventListener('online', onOnline)
          window.removeEventListener('offline', onOffline)
          return { ok: true, title: 'Network state', data: { online, listenersRegisteredAndRemoved: true, onlineEvents, offlineEvents } }
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
        label: 'Read command policy and audit',
        description: 'Reads the current runCommand policy, policy mutator availability, and recent audit rows through the backend.',
        methods: ['shell.getRunCommandPolicy', 'shell.updateRunCommandPolicy', 'shell.listRunCommandAudit', 'shell.clearRunCommandAudit', 'shell.clearRunCommandTrusted'],
        safety: 'safe',
        code: `await window.mulby.host.call('mulby-demo', 'runBackendExample', 'shellPolicyAudit')`,
        async run() {
          const data = await callBackendExample('shellPolicyAudit')
          if ((data as any)?.warning) return data as any
          const api = mulby()
          const rendererRestricted = api?.shell
            ? {
                updateRunCommandPolicy: await attempt('updateRunCommandPolicy', () => api.shell.updateRunCommandPolicy?.({})),
                clearRunCommandAudit: await attempt('clearRunCommandAudit', () => api.shell.clearRunCommandAudit?.()),
                clearRunCommandTrusted: await attempt('clearRunCommandTrusted', () => api.shell.clearRunCommandTrusted?.())
              }
            : null
          return { ok: true, title: 'Shell policy and audit', data: { backend: data, rendererRestricted } }
        }
      },
      {
        id: 'shell-backend-command',
        label: 'Run safe backend command',
        description: 'Asks backend to execute `node -e` with shell disabled.',
        methods: ['shell.runCommand'],
        safety: 'requires-permission',
        code: `await window.mulby.host.call('mulby-demo', 'runBackendExample', 'shellRunCommand')`,
        async run() {
          const data = await callBackendExample('shellRunCommand')
          if ((data as any)?.warning) return data as any
          return { ok: true, title: 'Shell backend command', data }
        }
      },
      {
        id: 'shell-system-actions',
        label: 'Open paths and move demo file to trash',
        description: 'Creates demo temp files, opens path/folder/URL, beeps, shows a file, and trashes only the demo file.',
        methods: ['shell.openPath', 'shell.openExternal', 'shell.showItemInFolder', 'shell.openFolder', 'shell.trashItem', 'shell.beep'],
        safety: 'opens-system-ui',
        code: `await window.mulby.host.call('mulby-demo', 'runBackendExample', 'shellSystemActions')`,
        async run() {
          const data = await callBackendExample('shellSystemActions')
          if ((data as any)?.warning) return data as any
          return { ok: true, title: 'Shell system actions', data }
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
      'This example opens `https://example.com`, extracts Markdown, evaluates page data, captures a screenshot payload, and closes the session.'
    ],
    examples: [
      {
        id: 'inbrowser-run-example',
        label: 'Run browser automation chain',
        description: 'Runs a real InBrowser chain against example.com, including navigation, input actions, extraction, screenshot, download, evaluate, and cleanup.',
        methods: [
          'inbrowser.goto',
          'inbrowser.useragent',
          'inbrowser.device',
          'inbrowser.viewport',
          'inbrowser.show',
          'inbrowser.hide',
          'inbrowser.click',
          'inbrowser.mousedown',
          'inbrowser.mouseup',
          'inbrowser.dblclick',
          'inbrowser.hover',
          'inbrowser.type',
          'inbrowser.input',
          'inbrowser.value',
          'inbrowser.check',
          'inbrowser.focus',
          'inbrowser.paste',
          'inbrowser.press',
          'inbrowser.scroll',
          'inbrowser.file',
          'inbrowser.drop',
          'inbrowser.wait',
          'inbrowser.when',
          'inbrowser.css',
          'inbrowser.cookies',
          'inbrowser.setCookies',
          'inbrowser.removeCookies',
          'inbrowser.clearCookies',
          'inbrowser.screenshot',
          'inbrowser.pdf',
          'inbrowser.markdown',
          'inbrowser.download',
          'inbrowser.evaluate',
          'inbrowser.devTools',
          'inbrowser.end',
          'inbrowser.run',
          'inbrowser.getIdleInBrowsers',
          'inbrowser.setInBrowserProxy',
          'inbrowser.clearInBrowserCache'
        ],
        safety: 'opens-system-ui',
        code: `await window.mulby.inbrowser\n  .goto('https://example.com')\n  .wait('h1')\n  .click('body')\n  .type('body', 'Mulby demo')\n  .markdown('body')\n  .screenshot('body')\n  .download(() => 'data:text/plain,mulby-demo')\n  .evaluate(() => ({ title: document.title }))\n  .end()\n  .run({ show: true })`,
        async run() {
          const api = mulby()
          if (!api?.inbrowser) return unavailable('InBrowser run')
          const idleBefore = await api.inbrowser.getIdleInBrowsers?.()
          const cache = await api.inbrowser.clearInBrowserCache?.()
          const proxy = await attempt('setInBrowserProxy', () => api.inbrowser.setInBrowserProxy?.({ mode: 'direct' }))
          const data = await api.inbrowser
            .goto('https://example.com')
            .useragent('MulbyDemo/1.0')
            .device({ userAgent: 'MulbyDemo/1.0', size: { width: 900, height: 700 } })
            .viewport(900, 700)
            .show()
            .hide()
            .show()
            .wait('h1')
            .click('body')
            .mousedown('body')
            .mouseup('body')
            .dblclick('body')
            .hover('body')
            .type('body', 'Mulby demo')
            .input('body', 'Mulby demo input')
            .value('body', 'Mulby demo value')
            .check('body', false)
            .focus('body')
            .paste('Mulby demo paste')
            .press('Escape')
            .scroll(0, 10)
            .file('input[type=file]', [])
            .drop('body', [])
            .when('body')
            .css('body { outline: 2px solid #2563eb; }')
            .cookies()
            .setCookies([{ name: 'mulby_demo', value: '1' }])
            .removeCookies('mulby_demo')
            .clearCookies('https://example.com')
            .markdown('body')
            .screenshot('body')
            .pdf()
            .download(() => 'data:text/plain,mulby-demo')
            .devTools('bottom')
            .evaluate(() => ({ title: document.title, heading: document.querySelector('h1')?.textContent }))
            .end()
            .run({ show: true })
          return { ok: true, title: 'InBrowser run', data: { idleBefore, cache, proxy, data } }
        }
      }
    ]
  })
]
