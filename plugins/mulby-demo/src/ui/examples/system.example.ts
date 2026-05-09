import type { ApiExampleModule } from './types'
import { catalogModule, mulby, unavailable } from './helpers'

export const systemExamples: ApiExampleModule[] = [
  catalogModule('system', {
    title: 'System',
    category: 'system',
    contexts: ['renderer', 'backend'],
    notes: [
      'System APIs are useful for diagnostics and platform-specific branching.',
      'Avoid exposing sensitive paths or environment values in user-facing logs.'
    ],
    examples: [
      {
        id: 'system-info',
        label: 'Read system and app info',
        description: 'Reads OS and Mulby app metadata.',
        safety: 'safe',
        code: `const system = await window.mulby.system.getSystemInfo()\nconst app = await window.mulby.system.getAppInfo()`,
        async run() {
          const api = mulby()
          if (!api?.system) return unavailable('System info')
          const [system, app, tempPath, idleTime] = await Promise.all([
            api.system.getSystemInfo(),
            api.system.getAppInfo(),
            api.system.getPath('temp'),
            api.system.getIdleTime()
          ])
          return {
            ok: true,
            title: 'System info',
            data: {
              platform: system.platform,
              arch: system.arch,
              cpus: system.cpus,
              totalmem: system.totalmem,
              app: { name: app.name, version: app.version, locale: app.locale },
              tempPath,
              idleTime
            }
          }
        }
      }
    ]
  }),
  catalogModule('permission', {
    title: 'Permission',
    category: 'system',
    contexts: ['renderer', 'backend'],
    notes: [
      'Request calls may show system UI. This reference reads status first.',
      'Manifest permissions are required before host permission prompts are meaningful.'
    ],
    examples: [
      {
        id: 'permission-status',
        label: 'Read permission statuses',
        description: 'Reads common permission statuses without requesting them.',
        safety: 'safe',
        code: `await window.mulby.permission.getStatus('microphone')`,
        async run() {
          const api = mulby()
          if (!api?.permission) return unavailable('Permission status')
          const types = ['geolocation', 'camera', 'microphone', 'screen', 'accessibility']
          const statuses = await Promise.all(types.map(async (type) => [type, await api.permission.getStatus(type)]))
          return { ok: true, title: 'Permission status', data: Object.fromEntries(statuses) }
        }
      }
    ]
  }),
  catalogModule('power', {
    title: 'Power',
    category: 'system',
    contexts: ['renderer', 'backend'],
    notes: ['Use idle and battery state to defer background work or reduce CPU-heavy processing.'],
    examples: [
      {
        id: 'power-state',
        label: 'Read power state',
        description: 'Reads idle time, idle state, battery, and thermal state.',
        safety: 'safe',
        code: `const idle = await window.mulby.power.getSystemIdleTime()`,
        async run() {
          const api = mulby()
          if (!api?.power) return unavailable('Power state')
          const [idleTime, idleState, onBattery, thermal] = await Promise.all([
            api.power.getSystemIdleTime(),
            api.power.getSystemIdleState(60),
            api.power.isOnBatteryPower(),
            api.power.getCurrentThermalState()
          ])
          return { ok: true, title: 'Power state', data: { idleTime, idleState, onBattery, thermal } }
        }
      }
    ]
  }),
  catalogModule('screen', {
    title: 'Screen',
    category: 'system',
    contexts: ['renderer', 'backend'],
    notes: [
      'Screen capture calls require `permissions.screen` and may require OS-level screen recording permission.',
      'This demo reads display metadata by default; capture calls are shown as code snippets.'
    ],
    examples: [
      {
        id: 'screen-displays',
        label: 'Read displays',
        description: 'Reads all displays, primary display, and cursor screen point.',
        safety: 'requires-permission',
        code: `const displays = await window.mulby.screen.getAllDisplays()`,
        async run() {
          const api = mulby()
          if (!api?.screen) return unavailable('Screen displays')
          const [displays, primary, cursor] = await Promise.all([
            api.screen.getAllDisplays(),
            api.screen.getPrimaryDisplay(),
            api.screen.getCursorScreenPoint()
          ])
          return { ok: true, title: 'Screen displays', data: { displays, primary, cursor } }
        }
      }
    ]
  }),
  catalogModule('media', {
    title: 'Media Permissions',
    category: 'system',
    contexts: ['renderer', 'backend'],
    notes: ['Camera and microphone permissions must be declared separately in manifest.'],
    examples: [
      {
        id: 'media-status',
        label: 'Read camera/microphone access',
        description: 'Reads camera and microphone access status without opening devices.',
        safety: 'requires-permission',
        code: `await window.mulby.media.getAccessStatus('camera')`,
        async run() {
          const api = mulby()
          if (!api?.media) return unavailable('Media status')
          const [camera, microphone, hasCamera, hasMicrophone] = await Promise.all([
            api.media.getAccessStatus('camera'),
            api.media.getAccessStatus('microphone'),
            api.media.hasCameraAccess(),
            api.media.hasMicrophoneAccess()
          ])
          return { ok: true, title: 'Media status', data: { camera, microphone, hasCamera, hasMicrophone } }
        }
      }
    ]
  }),
  catalogModule('input', {
    title: 'Input Automation',
    category: 'system',
    contexts: ['renderer', 'backend'],
    notes: [
      'Input automation affects other apps. Prefer explicit user actions and restore windows after paste/type flows.',
      'This reference keeps write/simulate examples as code snippets only.'
    ],
    examples: [
      {
        id: 'input-preview',
        label: 'Preview input APIs',
        description: 'Shows safe input automation patterns without executing them.',
        safety: 'preview-only',
        code: `await window.mulby.input.hideMainWindowPasteText('demo text')\nawait window.mulby.input.restoreWindows()\nawait window.mulby.input.simulateKeyboardTap('A', 'CommandOrControl')`
      }
    ]
  }),
  catalogModule('input-monitor', {
    title: 'Input Monitor',
    category: 'system',
    contexts: ['renderer', 'backend'],
    notes: [
      'Requires `inputMonitor` and usually accessibility permission on macOS.',
      'Always stop sessions and unsubscribe listeners during cleanup.'
    ],
    examples: [
      {
        id: 'input-monitor-available',
        label: 'Check monitor availability',
        description: 'Checks whether global input monitor support is available.',
        safety: 'requires-permission',
        code: `const available = await window.mulby.inputMonitor.isAvailable()`,
        async run() {
          const api = mulby()
          if (!api?.inputMonitor) return unavailable('Input monitor availability')
          const available = await api.inputMonitor.isAvailable()
          return { ok: true, title: 'Input monitor availability', data: { available } }
        }
      }
    ]
  }),
  catalogModule('shortcut', {
    title: 'Global Shortcut',
    category: 'system',
    contexts: ['renderer', 'backend'],
    notes: [
      'Register shortcuts on explicit user action and unregister them on unload.',
      'Use `plugin.bindCommandShortcut` for command shortcuts managed by Mulby settings.'
    ],
    examples: [
      {
        id: 'shortcut-preview',
        label: 'Preview shortcut registration',
        description: 'Shows the register/unregister lifecycle without claiming a global accelerator.',
        safety: 'preview-only',
        code: `const ok = await window.mulby.shortcut.register('CommandOrControl+Shift+D')\nawait window.mulby.shortcut.unregister('CommandOrControl+Shift+D')`
      }
    ]
  }),
  catalogModule('geolocation', {
    title: 'Geolocation',
    category: 'system',
    contexts: ['renderer'],
    notes: ['Read access status before requesting. Position reads require geolocation permission and OS/browser consent.'],
    examples: [
      {
        id: 'geolocation-status',
        label: 'Read geolocation status',
        description: 'Reads access status and whether a position can be requested.',
        safety: 'requires-permission',
        code: `const status = await window.mulby.geolocation.getAccessStatus()`,
        async run() {
          const api = mulby()
          if (!api?.geolocation) return unavailable('Geolocation status')
          const [status, canGetPosition] = await Promise.all([
            api.geolocation.getAccessStatus(),
            api.geolocation.canGetPosition()
          ])
          return { ok: true, title: 'Geolocation status', data: { status, canGetPosition } }
        }
      }
    ]
  }),
  catalogModule('desktop', {
    title: 'Desktop Search',
    category: 'system',
    contexts: ['renderer'],
    notes: ['Use small limits and clear user-provided queries for desktop search examples.'],
    examples: [
      {
        id: 'desktop-search-apps',
        label: 'Search apps',
        description: 'Searches up to five apps matching "code".',
        safety: 'safe',
        code: `const apps = await window.mulby.desktop.searchApps('code', 5)`,
        async run() {
          const api = mulby()
          if (!api?.desktop) return unavailable('Desktop app search')
          const apps = await api.desktop.searchApps('code', 5)
          return { ok: true, title: 'Desktop app search', data: apps }
        }
      }
    ]
  })
]
