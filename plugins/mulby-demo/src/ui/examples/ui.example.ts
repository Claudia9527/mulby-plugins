import type { ApiExampleModule } from './types'
import { callBackendExample, catalogModule, mulby, unavailable } from './helpers'

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const uiExamples: ApiExampleModule[] = [
  catalogModule('dialog', {
    title: 'Dialog',
    category: 'ui',
    contexts: ['renderer', 'backend'],
    notes: [
      'Dialog APIs are available in renderer and backend contexts.',
      'Message boxes are safe for inline demos; open/save dialogs should be user-triggered.'
    ],
    examples: [
      {
        id: 'dialog-message',
        label: 'Show message box',
        description: 'Displays a native message box with two buttons and returns the selected index.',
        methods: ['dialog.showMessageBox'],
        safety: 'opens-system-ui',
        code: `const result = await window.mulby.dialog.showMessageBox({ message: 'Mulby dialog demo', buttons: ['OK', 'Cancel'] })`,
        async run() {
          const api = mulby()
          if (!api?.dialog) return unavailable('Dialog message')
          const result = await api.dialog.showMessageBox({
            type: 'info',
            title: 'Mulby API Demo',
            message: 'Mulby dialog demo',
            detail: 'This demonstrates dialog.showMessageBox(options).',
            buttons: ['OK', 'Cancel'],
            defaultId: 0,
            cancelId: 1
          })
          return { ok: true, title: 'Dialog message', data: result }
        }
      },
      {
        id: 'dialog-open-save-error',
        label: 'Open, save, and error dialogs',
        description: 'Shows native open and save dialogs and an error box, returning whether the user cancelled selection.',
        methods: ['dialog.showOpenDialog', 'dialog.showSaveDialog', 'dialog.showErrorBox'],
        safety: 'opens-system-ui',
        code: `await window.mulby.dialog.showOpenDialog({ properties: ['openFile'] })\nawait window.mulby.dialog.showSaveDialog({ defaultPath: 'mulby-demo.txt' })\nwindow.mulby.dialog.showErrorBox('Mulby demo', 'Error box demo')`,
        async run() {
          const api = mulby()
          if (!api?.dialog) return unavailable('Dialog open/save/error')
          const openResult = await api.dialog.showOpenDialog({
            title: 'Mulby demo open dialog',
            properties: ['openFile']
          })
          const saveResult = await api.dialog.showSaveDialog({
            title: 'Mulby demo save dialog',
            defaultPath: 'mulby-demo.txt'
          })
          const errorResult = await api.dialog.showErrorBox('Mulby demo error box', 'This demonstrates dialog.showErrorBox(title, content).')
          return { ok: true, title: 'Dialog open/save/error', data: { openResult, saveResult, errorResult } }
        }
      }
    ]
  }),
  catalogModule('notification', {
    title: 'Notification',
    category: 'ui',
    contexts: ['renderer', 'backend'],
    notes: ['Requires notification permission in manifest for plugins that send system notifications.'],
    examples: [
      {
        id: 'notification-show',
        label: 'Show notification',
        description: 'Sends an informational demo notification.',
        methods: ['notification.show'],
        safety: 'requires-permission',
        code: `window.mulby.notification.show('Mulby notification demo', 'info')`,
        async run() {
          const api = mulby()
          if (!api?.notification) return unavailable('Notification show')
          await api.notification.show('Mulby notification demo', 'info')
          return { ok: true, title: 'Notification show', data: { shown: true } }
        }
      }
    ]
  }),
  catalogModule('window', {
    title: 'Window',
    category: 'ui',
    contexts: ['renderer'],
    notes: [
      'Window APIs affect the current plugin window. Prefer reversible controls in demos.',
      '`window.create` loads the same manifest UI entry and passes route/query information; it does not load arbitrary HTML by default.'
    ],
    examples: [
      {
        id: 'window-state',
        label: 'Read window state',
        description: 'Reads mode, type, bounds, opacity, and maximize/top state when available.',
        methods: ['window.getBounds', 'window.getOpacity', 'window.getMode', 'window.getWindowType', 'window.getState', 'window.onWindowStateChange'],
        safety: 'safe',
        code: `const state = await window.mulby.window.getState()\nconst bounds = await window.mulby.window.getBounds()`,
        async run() {
          const api = mulby()
          if (!api?.window) return unavailable('Window state')
          const [state, bounds, mode, type, opacity] = await Promise.all([
            api.window.getState?.(),
            api.window.getBounds?.(),
            api.window.getMode?.(),
            api.window.getWindowType?.(),
            api.window.getOpacity?.()
          ])
          const stateChanges: unknown[] = []
          const off = api.onWindowStateChange?.((next: unknown) => stateChanges.push(next))
          off?.()
          return { ok: true, title: 'Window state', data: { state, bounds, mode, type, opacity, stateChanges } }
        }
      },
      {
        id: 'window-control',
        label: 'Control current window',
        description: 'Shows, focuses, retitles, resizes, repositions, changes bounds, toggles opacity and background throttling, searches in page, and invalidates the current window.',
        methods: ['window.hide', 'window.show', 'window.showInactive', 'window.focus', 'window.setTitle', 'window.setSize', 'window.setPosition', 'window.setBounds', 'window.setExpendHeight', 'window.center', 'window.setAlwaysOnTop', 'window.setOpacity', 'window.setIgnoreMouseEvents', 'window.setVisibleOnAllWorkspaces', 'window.setFullScreen', 'window.setBackgroundThrottling', 'window.findInPage', 'window.stopFindInPage', 'window.invalidate'],
        safety: 'safe',
        code: `await window.mulby.window.show()\nawait window.mulby.window.focus()\nawait window.mulby.window.setTitle('Mulby API Demo')\nawait window.mulby.window.setSize(1180, 820)\nawait window.mulby.window.setOpacity(0.98)\nawait window.mulby.window.setOpacity(1)`,
        async run() {
          const api = mulby()
          if (!api?.window) return unavailable('Window control')
          const before = await api.window.getBounds?.()
          await api.window.hide?.(false)
          await wait(80)
          await api.window.show?.()
          await api.window.showInactive?.()
          await api.window.focus?.()
          await api.window.setTitle?.('Mulby API Demo')
          await api.window.setSize?.(1180, 820)
          if (before) {
            await api.window.setPosition?.(before.x, before.y)
          }
          await api.window.setBounds?.({
            x: before?.x,
            y: before?.y,
            width: Math.min(before?.width ?? 1180, 1180),
            height: Math.min(before?.height ?? 820, 820)
          })
          await api.window.setExpendHeight?.(820, true)
          await api.window.center?.()
          await api.window.setAlwaysOnTop?.(false)
          await api.window.setIgnoreMouseEvents?.(false)
          await api.window.setVisibleOnAllWorkspaces?.(false)
          await api.window.setFullScreen?.(false)
          await api.window.setBackgroundThrottling?.(true)
          const findResult = await api.window.findInPage?.('Mulby')
          await api.window.stopFindInPage?.('clearSelection')
          await api.window.setOpacity?.(0.98)
          await api.window.setOpacity?.(1)
          await api.window.invalidate?.()
          const after = await api.window.getBounds?.()
          return { ok: true, title: 'Window control', data: { before, after, findResult } }
        }
      },
      {
        id: 'window-child',
        label: 'Create and control child window',
        description: 'Creates a child window, exercises child handle actions, sends a message, listens for child messages, then closes it.',
        methods: ['window.create', 'window.sendToParent', 'window.onChildMessage'],
        safety: 'opens-system-ui',
        code: `const child = await window.mulby.window.create('child-demo', { width: 520, height: 420, title: 'Mulby child demo', params: { source: 'window.create' } })\nawait child?.setTitle('Mulby child demo')\nawait child?.postMessage('mulby-demo:hello', { ok: true })\nawait child?.close()`,
        async run() {
          const api = mulby()
          if (!api?.window) return unavailable('Child window')
          const messages: unknown[] = []
          const off = api.window.onChildMessage?.((channel: string, ...args: unknown[]) => {
            messages.push({ channel, args })
          })
          const child = await api.window.create('child-demo', {
            width: 520,
            height: 420,
            title: 'Mulby child demo',
            params: { source: 'window.create' }
          })
          await child?.show?.()
          await child?.showInactive?.()
          await child?.hide?.()
          await child?.show?.()
          await child?.focus?.()
          await child?.setTitle?.('Mulby child demo updated')
          await child?.setSize?.(520, 420)
          await child?.setPosition?.(80, 80)
          const childBounds = await child?.getBounds?.()
          await child?.setBounds?.({ width: 540, height: 430 })
          await child?.setOpacity?.(0.98)
          await child?.setBackgroundThrottling?.(true)
          await child?.setIgnoreMouseEvents?.(false)
          await child?.setAlwaysOnTop?.(false)
          await child?.setVisibleOnAllWorkspaces?.(false)
          await child?.setFullScreen?.(false)
          await child?.postMessage?.('mulby-demo:hello', { ok: true })
          await child?.close?.()
          off?.()
          return { ok: true, title: 'Child window', data: { childId: child?.id, childBounds, messages } }
        }
      },
      {
        id: 'window-detach-drag-menu',
        label: 'Detach, menu, drag, reload, and close controls',
        description: 'Creates a disposable child window to close/destroy, opens the plugin menu, starts a file drag payload, and exposes remaining disruptive controls.',
        methods: ['window.detach', 'window.close', 'window.terminatePlugin', 'window.showPluginMenu', 'window.reload', 'window.minimize', 'window.maximize', 'window.resizeDrag', 'window.startDrag'],
        safety: 'opens-system-ui',
        code: `await window.mulby.window.showPluginMenu()\n// window.mulby.window.detach()\n// window.mulby.window.reload()\n// window.mulby.window.close()`,
        async run() {
          const api = mulby()
          if (!api?.window) return unavailable('Window disruptive controls')
          const menu = await api.window.showPluginMenu?.()
          const child = await api.window.create?.('disruptive-demo', {
            width: 360,
            height: 260,
            title: 'Mulby disposable window'
          })
          await child?.show?.()
          await child?.close?.()
          const childForDestroy = await api.window.create?.('destroy-demo', {
            width: 320,
            height: 220,
            title: 'Mulby destroy demo'
          })
          await childForDestroy?.destroy?.()
          const dragFile = await callBackendExample('windowDragFile')
          if (!((dragFile as any)?.warning) && typeof (dragFile as any)?.filePath === 'string') {
            api.window.startDrag?.((dragFile as any).filePath)
          }
          const before = await api.window.getBounds?.()
          api.window.resizeDrag?.({
            edge: 'bottom-right',
            startX: before?.x ?? 0,
            startY: before?.y ?? 0,
            currentX: (before?.x ?? 0) + 1,
            currentY: (before?.y ?? 0) + 1,
            baseBounds: before ?? { x: 0, y: 0, width: 1180, height: 820 }
          })
          return {
            ok: true,
            title: 'Window disruptive controls',
            data: {
              menu,
              childClosed: child?.id,
              childDestroyed: childForDestroy?.id,
              dragFile,
              available: {
                detach: typeof api.window.detach,
                close: typeof api.window.close,
                terminatePlugin: typeof api.window.terminatePlugin,
                reload: typeof api.window.reload,
                minimize: typeof api.window.minimize,
                maximize: typeof api.window.maximize,
                resizeDrag: typeof api.window.resizeDrag,
                startDrag: typeof api.window.startDrag
              },
              note: 'detach, reload, minimize, maximize, terminatePlugin, and closing the current reference window are exposed as copied snippets because executing them would interrupt this reference UI.'
            }
          }
        }
      }
    ]
  }),
  catalogModule('sub-input', {
    title: 'Sub Input',
    category: 'ui',
    contexts: ['renderer'],
    notes: [
      'Sub input is most useful when a panel-mode plugin wants structured secondary text input.',
      'Always remove the sub input when a workflow ends.'
    ],
    examples: [
      {
        id: 'sub-input-preview',
        label: 'Show sub input',
        description: 'Creates a sub input with a demo placeholder.',
        methods: ['subInput.set', 'subInput.setValue', 'subInput.focus', 'subInput.blur', 'subInput.select', 'subInput.onChange'],
        safety: 'safe',
        code: `const off = window.mulby.subInput.onChange((data) => console.log(data.text))\nawait window.mulby.subInput.set('Type API search text...', true)\nawait window.mulby.subInput.setValue('Mulby demo')\nawait window.mulby.subInput.focus()\nawait window.mulby.subInput.select()\nawait window.mulby.subInput.blur()\noff()`,
        async run() {
          const api = mulby()
          if (!api?.subInput) return unavailable('Sub input')
          const changes: unknown[] = []
          const off = api.subInput.onChange?.((data: unknown) => changes.push(data))
          const result = await api.subInput.set('Type API search text...', true)
          await api.subInput.setValue?.('Mulby demo')
          await api.subInput.focus?.()
          await api.subInput.select?.()
          await api.subInput.blur?.()
          off?.()
          return { ok: true, title: 'Sub input', data: { result, changes } }
        }
      },
      {
        id: 'sub-input-remove',
        label: 'Remove sub input',
        description: 'Removes the current sub input.',
        methods: ['subInput.remove'],
        safety: 'safe',
        code: `await window.mulby.subInput.remove()`,
        async run() {
          const api = mulby()
          if (!api?.subInput) return unavailable('Sub input remove')
          const result = await api.subInput.remove()
          return { ok: true, title: 'Sub input remove', data: { result } }
        }
      }
    ]
  }),
  catalogModule('theme', {
    title: 'Theme',
    category: 'ui',
    contexts: ['renderer'],
    notes: ['Use `getActual` when the configured theme is `system` and the UI needs the resolved light/dark value.'],
    examples: [
      {
        id: 'theme-read',
        label: 'Read theme',
        description: 'Reads configured and actual theme values, sets the current mode back to its existing value, and subscribes to theme changes.',
        methods: ['theme.get', 'theme.set', 'theme.getActual', 'onThemeChange'],
        safety: 'safe',
        code: `const theme = await window.mulby.theme.get()\nconst actual = await window.mulby.theme.getActual()\nconst off = window.mulby.onThemeChange((theme) => console.log(theme))\nawait window.mulby.theme.set(theme.mode ?? theme)\noff()`,
        async run() {
          const api = mulby()
          if (!api?.theme) return unavailable('Theme read')
          const [theme, actual] = await Promise.all([api.theme.get(), api.theme.getActual()])
          const changes: unknown[] = []
          const off = api.onThemeChange?.((next: unknown) => changes.push(next))
          const currentMode = typeof theme === 'string' ? theme : theme?.mode ?? theme?.theme ?? 'system'
          const setResult = await api.theme.set(currentMode)
          off?.()
          return { ok: true, title: 'Theme read', data: { theme, actual, setResult, changes } }
        }
      }
    ]
  }),
  catalogModule('menu', {
    title: 'Menu',
    category: 'ui',
    contexts: ['renderer'],
    notes: ['Context menu item ids are returned to the caller; use ids rather than labels for logic.'],
    examples: [
      {
        id: 'menu-context',
        label: 'Show context menu',
        description: 'Shows a small context menu and returns the selected id.',
        methods: ['menu.showContextMenu'],
        safety: 'opens-system-ui',
        code: `const id = await window.mulby.menu.showContextMenu([{ id: 'copy', label: 'Copy' }])`,
        async run() {
          const api = mulby()
          if (!api?.menu) return unavailable('Context menu')
          const selected = await api.menu.showContextMenu([
            { id: 'inspect', label: 'Inspect module' },
            { type: 'separator' },
            { id: 'copy-code', label: 'Copy code sample' }
          ])
          return { ok: true, title: 'Context menu', data: { selected } }
        }
      }
    ]
  }),
  catalogModule('tray', {
    title: 'Tray',
    category: 'ui',
    contexts: ['renderer', 'backend'],
    notes: [
      'Create only one plugin-owned tray item and destroy it when no longer needed.',
      'This UI reads existence by default; create/destroy is available through backend demo methods.'
    ],
    examples: [
      {
        id: 'tray-lifecycle',
        label: 'Create, update, and destroy tray icon',
        description: 'Creates a plugin-owned tray icon, updates icon/tooltip/title, checks state, then destroys it.',
        methods: ['tray.create', 'tray.destroy', 'tray.setIcon', 'tray.setTooltip', 'tray.setTitle', 'tray.exists'],
        safety: 'opens-system-ui',
        code: `await window.mulby.host.call('mulby-demo', 'runBackendExample', 'trayLifecycle')`,
        async run() {
          const data = await callBackendExample('trayLifecycle')
          if ((data as any)?.warning) return data as any
          return { ok: true, title: 'Tray lifecycle', data }
        }
      }
    ]
  })
]
