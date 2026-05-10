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
        description: 'Reads OS, Mulby app, resource, path, environment, icon, platform, active-window, and native-id data.',
        methods: [
          'system.getSystemInfo',
          'system.getAppInfo',
          'system.getAppResourceUsage',
          'system.getPath',
          'system.getEnv',
          'system.getIdleTime',
          'system.getFileIcon',
          'system.getFileIcons',
          'system.getNativeId',
          'system.isDev',
          'system.isMacOS',
          'system.isWindows',
          'system.isLinux',
          'system.onActiveWindowChange',
          'system.getCachedActiveWindow',
          'system.getActiveWindow'
        ],
        safety: 'safe',
        code: `const system = await window.mulby.system.getSystemInfo()\nconst app = await window.mulby.system.getAppInfo()\nconst tempPath = await window.mulby.system.getPath('temp')\nconst icon = await window.mulby.system.getFileIcon(tempPath, { kind: 'file' })`,
        async run() {
          const api = mulby()
          if (!api?.system) return unavailable('System info')
          const [system, app, resourceUsage, tempPath, homePath, pathEnv, idleTime, nativeId, isDev, isMacOS, isWindows, isLinux] = await Promise.all([
            api.system.getSystemInfo(),
            api.system.getAppInfo(),
            api.system.getAppResourceUsage?.(),
            api.system.getPath('temp'),
            api.system.getPath('home'),
            api.system.getEnv('PATH'),
            api.system.getIdleTime(),
            api.system.getNativeId?.(),
            api.system.isDev?.(),
            api.system.isMacOS(),
            api.system.isWindows(),
            api.system.isLinux()
          ])
          const icon = await api.system.getFileIcon?.(tempPath, { kind: 'file', size: 32 })
          const icons = await api.system.getFileIcons?.([{ key: 'temp', path: tempPath, kind: 'file' }], { size: 32 })
          const activeEvents: unknown[] = []
          const off = api.system.onActiveWindowChange?.((info: unknown) => activeEvents.push(info))
          off?.()
          const cachedActiveWindow = await api.system.getCachedActiveWindow?.()
          const activeWindow = await api.system.getActiveWindow?.()
          return {
            ok: true,
            title: 'System info',
            data: {
              platform: system.platform,
              arch: system.arch,
              cpus: system.cpus,
              totalmem: system.totalmem,
              app: { name: app.name, version: app.version, locale: app.locale },
              resourceUsage,
              tempPath,
              homePath,
              pathEnvPreview: String(pathEnv ?? '').slice(0, 180),
              idleTime,
              nativeId,
              isDev,
              isMacOS,
              isWindows,
              isLinux,
              iconPreview: typeof icon === 'string' ? icon.slice(0, 60) : icon,
              icons,
              cachedActiveWindow,
              activeWindow,
              activeEvents
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
        description: 'Reads, requests, checks requestability, and exposes settings access for common permissions.',
        methods: ['permission.getStatus', 'permission.request', 'permission.canRequest', 'permission.openSystemSettings', 'permission.isAccessibilityTrusted'],
        safety: 'opens-system-ui',
        code: `await window.mulby.permission.getStatus('microphone')\nawait window.mulby.permission.canRequest('microphone')\nawait window.mulby.permission.request('microphone')\nawait window.mulby.permission.isAccessibilityTrusted()`,
        async run() {
          const api = mulby()
          if (!api?.permission) return unavailable('Permission status')
          const types = ['geolocation', 'camera', 'microphone', 'screen', 'accessibility']
          const statuses = await Promise.all(types.map(async (type) => [type, await api.permission.getStatus(type)]))
          const canRequest = await Promise.all(types.map(async (type) => [type, await api.permission.canRequest(type)]))
          let microphoneRequest: unknown = null
          try {
            microphoneRequest = await api.permission.request('microphone')
          } catch (error) {
            microphoneRequest = error instanceof Error ? error.message : String(error)
          }
          const accessibilityTrusted = await api.permission.isAccessibilityTrusted()
          return {
            ok: true,
            title: 'Permission status',
            data: {
              statuses: Object.fromEntries(statuses),
              canRequest: Object.fromEntries(canRequest),
              microphoneRequest,
              accessibilityTrusted,
              openSystemSettings: typeof api.permission.openSystemSettings
            }
          }
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
        description: 'Reads idle time, idle state, battery, thermal state, and registers all renderer power event listeners before disposing them.',
        methods: ['power.getSystemIdleTime', 'power.getSystemIdleState', 'power.isOnBatteryPower', 'power.getCurrentThermalState', 'power.onSuspend', 'power.onResume', 'power.onAC', 'power.onBattery', 'power.onLockScreen', 'power.onUnlockScreen'],
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
          const events: string[] = []
          const listeners = [
            api.power.onSuspend?.(() => events.push('suspend')),
            api.power.onResume?.(() => events.push('resume')),
            api.power.onAC?.(() => events.push('ac')),
            api.power.onBattery?.(() => events.push('battery')),
            api.power.onLockScreen?.(() => events.push('lock')),
            api.power.onUnlockScreen?.(() => events.push('unlock'))
          ]
          for (const dispose of listeners) dispose?.()
          return { ok: true, title: 'Power state', data: { idleTime, idleState, onBattery, thermal, events } }
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
        description: 'Reads displays, capture sources, coordinates, constraints, screenshots, and screen capture tool availability.',
        methods: [
          'screen.getAllDisplays',
          'screen.getPrimaryDisplay',
          'screen.getCursorScreenPoint',
          'screen.getDisplayNearestPoint',
          'screen.getDisplayMatching',
          'screen.getSources',
          'screen.getWindowBounds',
          'screen.capture',
          'screen.captureRegion',
          'screen.getMediaStreamConstraints',
          'screen.screenCapture',
          'screen.colorPick',
          'screen.screenToDipPoint',
          'screen.dipToScreenPoint',
          'screen.screenToDipRect',
          'screen.dipToScreenRect'
        ],
        safety: 'requires-permission',
        code: `const displays = await window.mulby.screen.getAllDisplays()\nconst sources = await window.mulby.screen.getSources({ types: ['screen'], thumbnailSize: { width: 64, height: 64 } })\nconst shot = await window.mulby.screen.capture({ format: 'png' })`,
        async run() {
          const api = mulby()
          if (!api?.screen) return unavailable('Screen displays')
          const [displays, primary, cursor] = await Promise.all([
            api.screen.getAllDisplays(),
            api.screen.getPrimaryDisplay(),
            api.screen.getCursorScreenPoint()
          ])
          const nearest = await api.screen.getDisplayNearestPoint(cursor)
          const matching = await api.screen.getDisplayMatching?.(primary.bounds)
          let sources: any[] = []
          let sourcesError: unknown = null
          try {
            sources = await api.screen.getSources({ types: ['screen'], thumbnailSize: { width: 64, height: 64 } })
          } catch (error) {
            sourcesError = error instanceof Error ? error.message : String(error)
          }
          let windowBounds: unknown = null
          try {
            windowBounds = sources[0]?.id ? await api.screen.getWindowBounds?.(sources[0].id) : null
          } catch (error) {
            windowBounds = error instanceof Error ? error.message : String(error)
          }
          let constraints: unknown = null
          try {
            constraints = sources[0]?.id ? await api.screen.getMediaStreamConstraints({ sourceId: sources[0].id, audio: false, frameRate: 5 }) : null
          } catch (error) {
            constraints = error instanceof Error ? error.message : String(error)
          }
          const dipPoint = await api.screen.screenToDipPoint?.(cursor)
          const screenPoint = dipPoint ? await api.screen.dipToScreenPoint?.(dipPoint) : null
          const dipRect = await api.screen.screenToDipRect?.({ ...primary.bounds })
          const screenRect = dipRect ? await api.screen.dipToScreenRect?.(dipRect) : null
          let capture: unknown = null
          let region: unknown = null
          try {
            const shot = await api.screen.capture({ format: 'png' })
            capture = { bytes: shot?.byteLength ?? shot?.length }
          } catch (error) {
            capture = error instanceof Error ? error.message : String(error)
          }
          try {
            const shot = await api.screen.captureRegion({ x: primary.bounds.x, y: primary.bounds.y, width: 1, height: 1 }, { format: 'png' })
            region = { bytes: shot?.byteLength ?? shot?.length }
          } catch (error) {
            region = error instanceof Error ? error.message : String(error)
          }
          return {
            ok: true,
            title: 'Screen displays',
            data: {
              displays,
              primary,
              cursor,
              nearest,
              matching,
              sources: sources.slice?.(0, 3),
              sourcesError,
              windowBounds,
              constraints,
              capture,
              region,
              screenCapture: typeof api.screen.screenCapture,
              colorPick: typeof api.screen.colorPick,
              dipPoint,
              screenPoint,
              dipRect,
              screenRect
            }
          }
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
        description: 'Reads and requests camera and microphone access status through the host API.',
        methods: ['media.getAccessStatus', 'media.askForAccess', 'media.hasCameraAccess', 'media.hasMicrophoneAccess'],
        safety: 'requires-permission',
        code: `await window.mulby.media.getAccessStatus('camera')\nawait window.mulby.media.askForAccess('microphone')`,
        async run() {
          const api = mulby()
          if (!api?.media) return unavailable('Media status')
          const [camera, microphone, hasCamera, hasMicrophone] = await Promise.all([
            api.media.getAccessStatus('camera'),
            api.media.getAccessStatus('microphone'),
            api.media.hasCameraAccess(),
            api.media.hasMicrophoneAccess()
          ])
          let microphoneRequest: unknown = null
          try {
            microphoneRequest = await api.media.askForAccess('microphone')
          } catch (error) {
            microphoneRequest = error instanceof Error ? error.message : String(error)
          }
          return { ok: true, title: 'Media status', data: { camera, microphone, hasCamera, hasMicrophone, microphoneRequest } }
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
      'This reference runs the calls with small demo payloads and catches permission or focus errors in the output.'
    ],
    examples: [
      {
        id: 'input-actions',
        label: 'Run input automation actions',
        description: 'Executes paste/type/keyboard/mouse automation calls with demo payloads and restores windows afterward.',
        methods: [
          'input.hideMainWindowPasteText',
          'input.hideMainWindowPasteImage',
          'input.hideMainWindowPasteFile',
          'input.hideMainWindowTypeString',
          'input.restoreWindows',
          'input.simulateKeyboardTap',
          'input.simulateMouseMove',
          'input.simulateMouseClick',
          'input.simulateMouseDoubleClick',
          'input.simulateMouseRightClick'
        ],
        safety: 'opens-system-ui',
        code: `await window.mulby.input.hideMainWindowPasteText('Mulby demo')\nawait window.mulby.input.restoreWindows()\nawait window.mulby.input.simulateKeyboardTap('Escape')`,
        async run() {
          const api = mulby()
          if (!api?.input) return unavailable('Input automation')
          const results: Record<string, unknown> = {}
          const safe = async (name: string, fn: () => Promise<unknown>) => {
            try {
              results[name] = await fn()
            } catch (error) {
              results[name] = error instanceof Error ? error.message : String(error)
            }
          }
          await safe('hideMainWindowPasteText', () => api.input.hideMainWindowPasteText('Mulby demo input text'))
          await safe('hideMainWindowPasteImage', () => api.input.hideMainWindowPasteImage('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lw9LNgAAAABJRU5ErkJggg=='))
          await safe('hideMainWindowPasteFile', () => api.input.hideMainWindowPasteFile([]))
          await safe('hideMainWindowTypeString', () => api.input.hideMainWindowTypeString('Mulby demo'))
          await safe('restoreWindows', () => api.input.restoreWindows())
          await safe('simulateKeyboardTap', () => api.input.simulateKeyboardTap('Escape'))
          await safe('simulateMouseMove', () => api.input.simulateMouseMove(1, 1))
          await safe('simulateMouseClick', () => api.input.simulateMouseClick(1, 1))
          await safe('simulateMouseDoubleClick', () => api.input.simulateMouseDoubleClick?.(1, 1))
          await safe('simulateMouseRightClick', () => api.input.simulateMouseRightClick?.(1, 1))
          return { ok: true, title: 'Input automation', data: results }
        }
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
        description: 'Checks availability, requests accessibility, starts a short session if possible, listens, then stops it.',
        methods: ['inputMonitor.isAvailable', 'inputMonitor.requireAccessibility', 'inputMonitor.start', 'inputMonitor.stop', 'inputMonitor.onEvent'],
        safety: 'requires-permission',
        code: `const available = await window.mulby.inputMonitor.isAvailable()\nconst sessionId = available ? await window.mulby.inputMonitor.start({ mouse: true, keyboard: false }) : null\nconst off = window.mulby.inputMonitor.onEvent((event) => console.log(event))\nif (sessionId) await window.mulby.inputMonitor.stop(sessionId)\noff()`,
        async run() {
          const api = mulby()
          if (!api?.inputMonitor) return unavailable('Input monitor availability')
          const available = await api.inputMonitor.isAvailable()
          let accessibility: unknown = null
          try {
            accessibility = await api.inputMonitor.requireAccessibility()
          } catch (error) {
            accessibility = error instanceof Error ? error.message : String(error)
          }
          const events: unknown[] = []
          const off = api.inputMonitor.onEvent?.((event: unknown) => events.push(event))
          const sessionId = available && accessibility === true
            ? await api.inputMonitor.start({ mouse: true, keyboard: false, throttleMs: 100 })
            : null
          if (sessionId) {
            await new Promise((resolve) => setTimeout(resolve, 250))
            await api.inputMonitor.stop(sessionId)
          }
          off?.()
          return { ok: true, title: 'Input monitor availability', data: { available, accessibility, sessionId, events } }
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
        id: 'shortcut-register',
        label: 'Register and unregister shortcut',
        description: 'Registers a demo global shortcut, checks state, listens for trigger events, unregisters it, and clears plugin-owned shortcuts.',
        methods: ['shortcut.register', 'shortcut.unregister', 'shortcut.unregisterAll', 'shortcut.isRegistered', 'shortcut.onTriggered'],
        safety: 'opens-system-ui',
        code: `const off = window.mulby.shortcut.onTriggered((accelerator) => console.log(accelerator))\nconst ok = await window.mulby.shortcut.register('CommandOrControl+Shift+Alt+D')\nconst registered = await window.mulby.shortcut.isRegistered('CommandOrControl+Shift+Alt+D')\nawait window.mulby.shortcut.unregister('CommandOrControl+Shift+Alt+D')\nawait window.mulby.shortcut.unregisterAll()\noff()`,
        async run() {
          const api = mulby()
          if (!api?.shortcut) return unavailable('Shortcut register')
          const accelerator = 'CommandOrControl+Shift+Alt+D'
          const triggered: string[] = []
          const off = api.shortcut.onTriggered?.((value: string) => triggered.push(value))
          const registered = await api.shortcut.register(accelerator)
          const isRegistered = await api.shortcut.isRegistered(accelerator)
          await api.shortcut.unregister(accelerator)
          const afterUnregister = await api.shortcut.isRegistered(accelerator)
          await api.shortcut.unregisterAll()
          off?.()
          return { ok: true, title: 'Shortcut register', data: { registered, isRegistered, afterUnregister, triggered } }
        }
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
        description: 'Reads access status, requests access, checks availability, and attempts to read current position.',
        methods: ['geolocation.getAccessStatus', 'geolocation.requestAccess', 'geolocation.canGetPosition', 'geolocation.openSettings', 'geolocation.getCurrentPosition'],
        safety: 'requires-permission',
        code: `const status = await window.mulby.geolocation.getAccessStatus()\nconst granted = await window.mulby.geolocation.requestAccess()\nconst position = await window.mulby.geolocation.getCurrentPosition()`,
        async run() {
          const api = mulby()
          if (!api?.geolocation) return unavailable('Geolocation status')
          const [status, canGetPosition] = await Promise.all([
            api.geolocation.getAccessStatus(),
            api.geolocation.canGetPosition()
          ])
          let access: unknown = null
          try {
            access = await api.geolocation.requestAccess()
          } catch (error) {
            access = error instanceof Error ? error.message : String(error)
          }
          let position: unknown = null
          try {
            position = await api.geolocation.getCurrentPosition()
          } catch (error) {
            position = error instanceof Error ? error.message : String(error)
          }
          return { ok: true, title: 'Geolocation status', data: { status, canGetPosition, access, position, openSettings: typeof api.geolocation.openSettings } }
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
        description: 'Searches up to five apps and files matching common demo queries.',
        methods: ['desktop.searchFiles', 'desktop.searchApps'],
        safety: 'safe',
        code: `const apps = await window.mulby.desktop.searchApps('code', 5)\nconst files = await window.mulby.desktop.searchFiles('readme', 5)`,
        async run() {
          const api = mulby()
          if (!api?.desktop) return unavailable('Desktop app search')
          const [apps, files] = await Promise.all([
            api.desktop.searchApps('code', 5),
            api.desktop.searchFiles('readme', 5)
          ])
          return { ok: true, title: 'Desktop search', data: { apps, files } }
        }
      }
    ]
  })
]
