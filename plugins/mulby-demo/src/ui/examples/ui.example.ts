import type { ApiExampleModule } from './types'
import { catalogModule, mulby, unavailable } from './helpers'

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
          return { ok: true, title: 'Window state', data: { state, bounds, mode, type, opacity } }
        }
      },
      {
        id: 'window-title',
        label: 'Set window title',
        description: 'Sets the current plugin window title to a demo label.',
        safety: 'safe',
        code: `await window.mulby.window.setTitle('Mulby API Demo')`,
        async run() {
          const api = mulby()
          if (!api?.window) return unavailable('Window title')
          await api.window.setTitle?.('Mulby API Demo')
          return { ok: true, title: 'Window title', data: { title: 'Mulby API Demo' } }
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
        safety: 'safe',
        code: `await window.mulby.subInput.set('Type API search text...', true)`,
        async run() {
          const api = mulby()
          if (!api?.subInput) return unavailable('Sub input')
          const result = await api.subInput.set('Type API search text...', true)
          return { ok: true, title: 'Sub input', data: { result } }
        }
      },
      {
        id: 'sub-input-remove',
        label: 'Remove sub input',
        description: 'Removes the current sub input.',
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
        description: 'Reads configured and actual theme values.',
        safety: 'safe',
        code: `const theme = await window.mulby.theme.get()\nconst actual = await window.mulby.theme.getActual()`,
        async run() {
          const api = mulby()
          if (!api?.theme) return unavailable('Theme read')
          const [theme, actual] = await Promise.all([api.theme.get(), api.theme.getActual()])
          return { ok: true, title: 'Theme read', data: { theme, actual } }
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
        id: 'tray-exists',
        label: 'Read tray state',
        description: 'Reads whether this plugin currently owns a tray item.',
        safety: 'safe',
        code: `const exists = await window.mulby.tray.exists()`,
        async run() {
          const api = mulby()
          if (!api?.tray) return unavailable('Tray exists')
          const exists = await api.tray.exists()
          return { ok: true, title: 'Tray exists', data: { exists } }
        }
      }
    ]
  })
]
