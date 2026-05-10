import type { ApiExampleModule } from './types'
import { attempt, callBackendExample, catalogModule, mulby, unavailable } from './helpers'

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
        label: 'Inspect manifest contract at runtime',
        description: 'Reads this plugin through the Plugin API and returns manifest-backed features, permissions, window, setting, and tool declarations.',
        methods: [
          'manifest.id',
          'manifest.name',
          'manifest.version',
          'manifest.displayName',
          'manifest.description',
          'manifest.main',
          'manifest.ui',
          'manifest.preload',
          'manifest.icon',
          'manifest.features',
          'manifest.permissions',
          'manifest.pluginSetting',
          'manifest.window',
          'manifest.tools',
          'manifest.platform',
          'manifest.assets'
        ],
        safety: 'safe',
        code: `const plugins = await window.mulby.plugin.getAll()\nconst demo = plugins.find((plugin) => plugin.id === 'mulby-demo' || plugin.name === 'mulby-demo')`,
        async run() {
          const api = mulby()
          if (!api?.plugin) return unavailable('Manifest contract')
          const plugins = await api.plugin.getAll()
          const demo = plugins.find((plugin: any) => plugin.id === 'mulby-demo' || plugin.name === 'mulby-demo')
          return {
            ok: true,
            title: 'Manifest contract',
            data: {
              id: demo?.id,
              name: demo?.name,
              version: demo?.version,
              displayName: demo?.displayName,
              description: demo?.description,
              main: demo?.main,
              ui: demo?.ui,
              preload: demo?.preload,
              icon: demo?.icon,
              features: demo?.features,
              permissions: demo?.permissions,
              pluginSetting: demo?.pluginSetting,
              window: demo?.window,
              tools: demo?.tools,
              platform: demo?.platform,
              assets: demo?.assets
            }
          }
        }
      }
    ]
  }),
  catalogModule('lifecycle', {
    title: 'Lifecycle & Run Context',
    category: 'plugin',
    contexts: ['backend'],
    notes: [
      'Backend APIs are async through `context.api`; await calls even when renderer equivalents look synchronous.',
      '`run(context)` receives featureCode, input text, and attachments from the matched feature.',
      'Renderer lifecycle listeners must be disposed when the UI component that registered them unmounts.'
    ],
    examples: [
      {
        id: 'lifecycle-state',
        label: 'Read backend lifecycle state',
        description: 'Calls backend host RPC to read lifecycle counters and registers renderer lifecycle listeners before disposing them.',
        methods: ['onLoad', 'onUnload', 'onEnable', 'onDisable', 'run', 'onPluginInit', 'onPluginAttach', 'onPluginDetached', 'onPluginOut', 'onPluginLaunchStart', 'onPluginLaunchEnd'],
        safety: 'safe',
        code: `await window.mulby.host.call('mulby-demo', 'runBackendExample', 'lifecycleState')`,
        async run() {
          const api = mulby()
          const events: unknown[] = []
          const disposers = api
            ? [
                api.onPluginInit?.((data: unknown) => events.push({ type: 'init', data })),
                api.onPluginAttach?.((data: unknown) => events.push({ type: 'attach', data })),
                api.onPluginDetached?.(() => events.push({ type: 'detached' })),
                api.onPluginOut?.((isKill: boolean) => events.push({ type: 'out', isKill })),
                api.onPluginLaunchStart?.((data: unknown) => events.push({ type: 'launch-start', data })),
                api.onPluginLaunchEnd?.((data: unknown) => events.push({ type: 'launch-end', data }))
              ]
            : []
          const data = await callBackendExample('lifecycleState')
          if ((data as any)?.warning) return data as any
          for (const dispose of disposers) dispose?.()
          return { ok: true, title: 'Lifecycle state', data: { backend: data, rendererEvents: events } }
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
        methods: ['host.call'],
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
        methods: ['host.status'],
        safety: 'safe',
        code: `await window.mulby.host.status('mulby-demo')`,
        async run() {
          const api = mulby()
          if (!api?.host) return unavailable('Host status')
          const data = await api.host.status('mulby-demo')
          return { ok: true, title: 'Host status', data }
        }
      },
      {
        id: 'host-invoke-restart',
        label: 'Invoke API and restart host',
        description: 'Calls a backend API method through host.invoke, restarts this plugin host, then reads status again.',
        methods: ['host.invoke', 'host.restart'],
        safety: 'opens-system-ui',
        code: `await window.mulby.host.invoke('mulby-demo', 'system.getSystemInfo')\nawait window.mulby.host.restart('mulby-demo')`,
        async run() {
          const api = mulby()
          if (!api?.host) return unavailable('Host invoke and restart')
          const systemInfo = await api.host.invoke('mulby-demo', 'system.getSystemInfo')
          const restart = await api.host.restart('mulby-demo')
          const status = await api.host.status('mulby-demo')
          return { ok: true, title: 'Host invoke and restart', data: { systemInfo, restart, status } }
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
        methods: ['plugin.getAll', 'plugin.resolveDroppedFilePaths'],
        safety: 'safe',
        code: `const plugins = await window.mulby.plugin.getAll()\nconst paths = window.mulby.plugin.resolveDroppedFilePaths([])`,
        async run() {
          const api = mulby()
          if (!api?.plugin) return unavailable('Plugin list')
          const plugins = await api.plugin.getAll()
          const droppedPaths = api.plugin.resolveDroppedFilePaths?.([])
          return {
            ok: true,
            title: 'Plugin list',
            data: {
              plugins: plugins.map((plugin: any) => ({
                id: plugin.id,
                name: plugin.name,
                displayName: plugin.displayName,
                enabled: plugin.enabled,
                features: plugin.features?.length ?? 0
              })),
              droppedPaths
            }
          }
        }
      },
      {
        id: 'plugin-commands',
        label: 'List command entries',
        description: 'Reads commands exposed by this plugin.',
        methods: ['plugin.listCommands', 'plugin.search', 'plugin.getRecentUsed', 'plugin.getSearchPreferences', 'plugin.removeRecentUsage', 'plugin.listBackground', 'plugin.startBackground', 'plugin.stopBackground', 'plugin.getBackgroundInfo', 'plugin.getReadme', 'plugin.prewarm'],
        safety: 'safe',
        code: `await window.mulby.plugin.listCommands('mulby-demo')\nawait window.mulby.plugin.search('mulby demo')\nawait window.mulby.plugin.getSearchPreferences()\nawait window.mulby.plugin.getReadme('mulby-demo')\nawait window.mulby.plugin.listBackground()`,
        async run() {
          const api = mulby()
          if (!api?.plugin) return unavailable('Plugin commands')
          const [commands, search, recent, preferences, readme, background, backgroundInfo, prewarm, startBackground, stopBackground, removeRecentUsage] = await Promise.all([
            api.plugin.listCommands('mulby-demo'),
            api.plugin.search('mulby demo'),
            api.plugin.getRecentUsed(5),
            api.plugin.getSearchPreferences?.(),
            api.plugin.getReadme?.('mulby-demo'),
            api.plugin.listBackground(),
            api.plugin.getBackgroundInfo?.('mulby-demo'),
            api.plugin.prewarm?.('mulby-demo'),
            attempt('startBackground:missing', () => api.plugin.startBackground?.('mulby-demo-missing')),
            attempt('stopBackground:missing', () => api.plugin.stopBackground?.('mulby-demo-missing')),
            api.plugin.removeRecentUsage?.('mulby-demo', 'dynamic-demo-entry')
          ])
          return {
            ok: true,
            title: 'Plugin commands',
            data: {
              commands,
              search,
              recent,
              preferences,
              readmePreview: String(readme ?? '').slice(0, 240),
              background,
              backgroundInfo,
              prewarm,
              startBackground,
              stopBackground,
              removeRecentUsage
            }
          }
        }
      },
      {
        id: 'plugin-run-preferences',
        label: 'Run and update demo feature preferences',
        description: 'Runs this plugin smoke feature, invokes a command object, pins/unpins and hides/unhides this demo feature, then validates install-management method availability.',
        methods: [
          'plugin.run',
          'plugin.runCommand',
          'plugin.pinFeature',
          'plugin.unpinFeature',
          'plugin.hideFeature',
          'plugin.unhideFeature',
          'plugin.install',
          'plugin.enable',
          'plugin.disable',
          'plugin.uninstall',
          'plugin.listCommandShortcuts',
          'plugin.bindCommandShortcut',
          'plugin.unbindCommandShortcut',
          'plugin.validateCommandShortcut',
          'plugin.setCommandDisabled',
          'plugin.redirect',
          'plugin.outPlugin'
        ],
        safety: 'writes-plugin-data',
        code: `await window.mulby.plugin.run('mulby-demo', 'run-smoke-demo')\nawait window.mulby.plugin.runCommand({ pluginId: 'mulby-demo', featureCode: 'run-smoke-demo' })\nawait window.mulby.plugin.pinFeature('mulby-demo', 'open-reference')\nawait window.mulby.plugin.unpinFeature('mulby-demo', 'open-reference')`,
        async run() {
          const api = mulby()
          if (!api?.plugin) return unavailable('Plugin run and preferences')
          const run = await api.plugin.run('mulby-demo', 'run-smoke-demo')
          const runCommand = await api.plugin.runCommand({ pluginId: 'mulby-demo', featureCode: 'run-smoke-demo' })
          const pin = await api.plugin.pinFeature('mulby-demo', 'open-reference')
          const unpin = await api.plugin.unpinFeature?.('mulby-demo', 'open-reference')
          const hide = await api.plugin.hideFeature('mulby-demo', 'dynamic-demo-entry')
          const unhide = await api.plugin.unhideFeature?.('mulby-demo', 'dynamic-demo-entry')
          const commands = await api.plugin.listCommands('mulby-demo')
          const bindableCommand = commands.find((command: any) => command.bindable)
          const shortcuts = await api.plugin.listCommandShortcuts?.('mulby-demo')
          const shortcutValidation = await api.plugin.validateCommandShortcut?.('CommandOrControl+Shift+Alt+D')
          const bind = bindableCommand
            ? await attempt('bindCommandShortcut', () => api.plugin.bindCommandShortcut?.({
                pluginId: bindableCommand.pluginId,
                featureCode: bindableCommand.featureCode,
                cmdId: bindableCommand.cmdId,
                cmdSignature: bindableCommand.cmdSignature,
                commandLabel: bindableCommand.displayLabel,
                accelerator: 'CommandOrControl+Shift+Alt+D'
              }))
            : { label: 'bindCommandShortcut', ok: false, error: 'No bindable command found.' }
          const bindingId = bind.ok ? (bind.value as any)?.binding?.id : null
          const unbind = bindingId
            ? await attempt('unbindCommandShortcut', () => api.plugin.unbindCommandShortcut?.(bindingId))
            : { label: 'unbindCommandShortcut', ok: false, error: 'No binding was created.' }
          const setCommandDisabled = bindableCommand
            ? await api.plugin.setCommandDisabled?.({
                pluginId: bindableCommand.pluginId,
                featureCode: bindableCommand.featureCode,
                cmdId: bindableCommand.cmdId,
                cmdSignature: bindableCommand.cmdSignature,
                disabled: false
              })
            : null
          const install = await attempt('install:missing', () => api.plugin.install?.('__mulby_demo_missing__.inplugin'))
          const enable = await attempt('enable:self', () => api.plugin.enable?.('mulby-demo'))
          const disable = await attempt('disable:missing', () => api.plugin.disable?.('mulby-demo-missing'))
          const uninstall = await attempt('uninstall:missing', () => api.plugin.uninstall?.('mulby-demo-missing'))
          const redirect = await attempt('redirect:self', () => api.plugin.redirect?.(['mulby-demo', 'run-smoke-demo'], { text: 'Mulby demo redirect' }))
          return {
            ok: true,
            title: 'Plugin run and preferences',
            data: {
              run,
              runCommand,
              pin,
              unpin,
              hide,
              unhide,
              shortcuts,
              shortcutValidation,
              bind,
              unbind,
              setCommandDisabled,
              install,
              enable,
              disable,
              uninstall,
              redirect,
              outPlugin: typeof api.plugin.outPlugin,
              managementMethods: {
                install: typeof api.plugin.install,
                enable: typeof api.plugin.enable,
                disable: typeof api.plugin.disable,
                uninstall: typeof api.plugin.uninstall,
                startBackground: typeof api.plugin.startBackground,
                stopBackground: typeof api.plugin.stopBackground,
                stopPlugin: typeof api.plugin.stopPlugin,
                bindCommandShortcut: typeof api.plugin.bindCommandShortcut,
                unbindCommandShortcut: typeof api.plugin.unbindCommandShortcut,
                redirect: typeof api.plugin.redirect,
                outPlugin: typeof api.plugin.outPlugin
              }
            }
          }
        }
      },
      {
        id: 'plugin-stop-safety',
        label: 'Stop plugin guarded target',
        description: 'Calls stopPlugin against an intentionally missing demo target so the API path executes without stopping the reference UI.',
        methods: ['plugin.stopPlugin'],
        safety: 'safe',
        code: `await window.mulby.plugin.stopPlugin('mulby-demo-missing')`,
        async run() {
          const api = mulby()
          if (!api?.plugin) return unavailable('Plugin stop guarded target')
          const data = await attempt('stopPlugin:missing', () => api.plugin.stopPlugin?.('mulby-demo-missing'))
          return { ok: true, title: 'Plugin stop guarded target', data }
        }
      },
      {
        id: 'plugin-main-push-select',
        label: 'Invoke MainPush select',
        description: 'Calls plugin.mainPushSelect against the demo-owned MainPush feature after handlers are registered.',
        methods: ['plugin.mainPushSelect', 'plugin.getMainPushPlugins'],
        safety: 'safe',
        code: `await window.mulby.host.call('mulby-demo', 'runBackendExample', 'registerMainPushHandlers')\nawait window.mulby.plugin.mainPushSelect('mulby-demo', { code: 'dynamic-docs-main-push', type: 'text', payload: 'Mulby demo', option: {} })\nawait window.mulby.plugin.getMainPushPlugins()`,
        async run() {
          const api = mulby()
          if (!api?.plugin) return unavailable('Plugin MainPush select')
          await callBackendExample('registerDynamicMainPushFeature')
          await callBackendExample('registerMainPushHandlers')
          const result = await api.plugin.mainPushSelect?.('mulby-demo', {
            code: 'dynamic-docs-main-push',
            type: 'text',
            payload: 'Mulby demo',
            option: {
              title: 'Mulby demo synthetic option',
              text: 'Invoked from the Plugin Management example.'
            }
          })
          const plugins = await api.plugin.getMainPushPlugins?.()
          return { ok: true, title: 'Plugin MainPush select', data: { result, plugins } }
        }
      }
    ]
  }),
  catalogModule('plugin-store', {
    title: 'Plugin Store',
    category: 'plugin',
    contexts: ['renderer'],
    notes: [
      'Read calls are safe discovery helpers. Install and update calls mutate the plugin environment, so this demo uses an invalid local URL and an impossible id filter.',
      'For real installers, pass a HTTPS `.inplugin` download URL and verify `sha256` when the store index provides one.'
    ],
    examples: [
      {
        id: 'plugin-store-read',
        label: 'Fetch store and update state',
        description: 'Reads configured store entries and checks installed plugin updates without installing anything.',
        methods: ['pluginStore.fetch', 'pluginStore.checkUpdatesInstalled'],
        safety: 'safe',
        code: `const store = await window.mulby.pluginStore.fetch()\nconst updates = await window.mulby.pluginStore.checkUpdatesInstalled()`,
        async run() {
          const api = mulby()
          if (!api?.pluginStore) return unavailable('Plugin Store read')
          const [store, updates] = await Promise.all([
            api.pluginStore.fetch(),
            api.pluginStore.checkUpdatesInstalled()
          ])
          return {
            ok: true,
            title: 'Plugin Store read',
            data: {
              sourceCount: Array.isArray(store?.sources) ? store.sources.length : undefined,
              entryCount: Array.isArray(store?.entries) ? store.entries.length : undefined,
              fetchedAt: store?.fetchedAt,
              updates
            }
          }
        }
      },
      {
        id: 'plugin-store-guarded-mutations',
        label: 'Run guarded install and update calls',
        description: 'Executes installFromUrl with a localhost invalid package URL and updateAll with a missing plugin id, exercising API paths without installing real plugins.',
        methods: ['pluginStore.installFromUrl', 'pluginStore.updateAll'],
        safety: 'writes-plugin-data',
        code: `await window.mulby.pluginStore.installFromUrl({\n  pluginId: 'mulby-demo-invalid-package',\n  version: '0.0.0',\n  downloadUrl: 'http://127.0.0.1:9/mulby-demo-invalid-package.inplugin'\n})\nawait window.mulby.pluginStore.updateAll(['mulby-demo-missing-plugin'])`,
        async run() {
          const api = mulby()
          if (!api?.pluginStore) return unavailable('Plugin Store guarded mutations')
          const install = await api.pluginStore.installFromUrl({
            pluginId: 'mulby-demo-invalid-package',
            version: '0.0.0',
            downloadUrl: 'http://127.0.0.1:9/mulby-demo-invalid-package.inplugin',
            sourceId: 'mulby-demo',
            sourceName: 'Mulby Demo Guarded Source',
            sourceUrl: 'http://127.0.0.1:9/store.json'
          })
          const updateAll = await api.pluginStore.updateAll(['mulby-demo-missing-plugin'])
          return { ok: true, title: 'Plugin Store guarded mutations', data: { install, updateAll } }
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
        methods: ['features.getFeatures', 'features.setFeature'],
        safety: 'writes-plugin-data',
        code: `await window.mulby.host.call('mulby-demo', 'runBackendExample', 'registerDynamicFeature')`,
        async run() {
          const data = await callBackendExample('registerDynamicFeature')
          if ((data as any)?.warning) return data as any
          return { ok: true, title: 'Register dynamic feature', data }
        }
      },
      {
        id: 'features-main-push',
        label: 'Register MainPush handlers',
        description: 'Registers a dynamic MainPush feature and backend onMainPush/onMainPushSelect handlers.',
        methods: ['features.onMainPush', 'features.onMainPushSelect'],
        safety: 'writes-plugin-data',
        code: `await window.mulby.host.call('mulby-demo', 'runBackendExample', 'registerDynamicMainPushFeature')\nawait window.mulby.host.call('mulby-demo', 'runBackendExample', 'registerMainPushHandlers')`,
        async run() {
          const feature = await callBackendExample('registerDynamicMainPushFeature')
          const handlers = await callBackendExample('registerMainPushHandlers')
          if ((feature as any)?.warning) return feature as any
          return { ok: true, title: 'Register MainPush handlers', data: { feature, handlers } }
        }
      },
      {
        id: 'features-remove',
        label: 'Remove dynamic demo features',
        description: 'Removes the dynamic demo features and demonstrates feature cleanup.',
        methods: ['features.removeFeature', 'features.redirectHotKeySetting', 'features.redirectAiModelsSetting'],
        safety: 'opens-system-ui',
        code: `await window.mulby.host.call('mulby-demo', 'runBackendExample', 'redirectFeatureSettings')\nawait window.mulby.host.call('mulby-demo', 'runBackendExample', 'removeDynamicFeature')`,
        async run() {
          const redirects = await callBackendExample('redirectFeatureSettings')
          const data = await callBackendExample('removeDynamicFeature')
          if ((data as any)?.warning) return data as any
          return { ok: true, title: 'Remove dynamic feature', data: { redirects, cleanup: data } }
        }
      }
    ]
  }),
  catalogModule('messaging', {
    title: 'Messaging',
    category: 'plugin',
    contexts: ['backend'],
    notes: [
      'Use namespaced message types, for example `mulby-demo:catalog-refresh`.',
      'Messaging is exposed through backend `context.api.messaging`; renderer demos call it through host RPC.'
    ],
    examples: [
      {
        id: 'messaging-broadcast',
        label: 'Send and receive loopback messages',
        description: 'Registers a backend message handler, sends a direct message, broadcasts a message, then unsubscribes handlers.',
        methods: ['messaging.send', 'messaging.broadcast', 'messaging.on', 'messaging.off'],
        safety: 'safe',
        code: `await window.mulby.host.call('mulby-demo', 'runBackendExample', 'messagingLoopback')`,
        async run() {
          const data = await callBackendExample('messagingLoopback')
          if ((data as any)?.warning) return data as any
          return { ok: true, title: 'Messaging loopback', data }
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
        methods: ['scheduler.validateCron', 'scheduler.describeCron'],
        safety: 'safe',
        code: `await window.mulby.host.call('mulby-demo', 'runBackendExample', 'schedulerDescribe')`,
        async run() {
          const data = await callBackendExample('schedulerDescribe')
          if ((data as any)?.warning) return data as any
          return { ok: true, title: 'Scheduler describe', data }
        }
      },
      {
        id: 'scheduler-create-delay',
        label: 'Create delayed notification task',
        description: 'Creates a short delay task that calls the backend demo scheduler callback.',
        methods: ['scheduler.schedule'],
        safety: 'writes-plugin-data',
        code: `await window.mulby.host.call('mulby-demo', 'runBackendExample', 'schedulerDelayTask')`,
        async run() {
          const data = await callBackendExample('schedulerDelayTask')
          if ((data as any)?.warning) return data as any
          return { ok: true, title: 'Scheduler delay task', data }
        }
      },
      {
        id: 'scheduler-lifecycle',
        label: 'Pause, resume, list, and cancel task',
        description: 'Creates a long demo task, reads it, pauses it, resumes it, lists tasks, cancels it, and reads execution history.',
        methods: ['scheduler.cancel', 'scheduler.pause', 'scheduler.resume', 'scheduler.get', 'scheduler.list', 'scheduler.getExecutions', 'scheduler.getNextCronTime'],
        safety: 'writes-plugin-data',
        code: `await window.mulby.host.call('mulby-demo', 'runBackendExample', 'schedulerLifecycle')`,
        async run() {
          const data = await callBackendExample('schedulerLifecycle')
          if ((data as any)?.warning) return data as any
          return { ok: true, title: 'Scheduler lifecycle', data }
        }
      },
      {
        id: 'scheduler-renderer-list-delete',
        label: 'List and delete scheduler records',
        description: 'Uses renderer scheduler APIs to list demo tasks, count them, inspect one, and delete demo-owned records.',
        methods: ['scheduler.listTasks', 'scheduler.getTask', 'scheduler.getTaskCount', 'scheduler.deleteTasks', 'scheduler.cleanupTasks', 'scheduler.subscribe', 'scheduler.unsubscribe', 'scheduler.onEvent'],
        safety: 'writes-plugin-data',
        code: `await window.mulby.scheduler.subscribe()\nconst off = window.mulby.scheduler.onEvent((event) => console.log(event))\nawait window.mulby.scheduler.listTasks({ pluginId: 'mulby-demo', limit: 20 })\nawait window.mulby.scheduler.getTaskCount({ pluginId: 'mulby-demo' })\nawait window.mulby.scheduler.deleteTasks([taskId])\noff()\nawait window.mulby.scheduler.unsubscribe()`,
        async run() {
          const api = mulby()
          if (!api?.scheduler) return unavailable('Scheduler renderer cleanup')
          const events: unknown[] = []
          const subscribe = await api.scheduler.subscribe?.()
          const off = api.scheduler.onEvent?.((event: unknown) => events.push(event))
          const tasks = await api.scheduler.listTasks({ pluginId: 'mulby-demo', limit: 20 })
          const count = await api.scheduler.getTaskCount({ pluginId: 'mulby-demo' })
          const task = Array.isArray(tasks)
            ? tasks.find((item: any) => item?.name === 'Mulby demo scheduler lifecycle task' || item?.name === 'Mulby demo delayed notification')
            : null
          const taskDetail = task ? await api.scheduler.getTask?.(task.id) : null
          const deleteResult = task?.id ? await api.scheduler.deleteTasks([task.id]) : null
          const cleanup = await api.scheduler.cleanupTasks?.(Date.now())
          off?.()
          const unsubscribe = await api.scheduler.unsubscribe?.()
          return { ok: true, title: 'Scheduler renderer cleanup', data: { subscribe, count, taskDetail, deleteResult, cleanup, events, unsubscribe } }
        }
      }
    ]
  })
]
