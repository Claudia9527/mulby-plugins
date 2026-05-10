export type ApiCategoryId =
  | 'data'
  | 'files-network'
  | 'ui'
  | 'system'
  | 'plugin'
  | 'ai-media'
  | 'diagnostics'
  | 'restricted'

export interface ApiCategory {
  id: ApiCategoryId
  label: string
  description: string
  order: number
}

export interface PublicApiCatalogEntry {
  code: string
  title: string
  category: Exclude<ApiCategoryId, 'restricted'>
  contexts: Array<'renderer' | 'backend' | 'manifest'>
  methods: string[]
  permissions?: string[]
  summary: string
}

export interface RestrictedApiCatalogEntry {
  code: string
  title: string
  methods: string[]
  reason: string
  saferAlternative?: string
}

export const categoryCatalog: ApiCategory[] = [
  {
    id: 'data',
    label: 'Data & Persistence',
    description: 'Plugin-local state, clipboard data, and secure storage.',
    order: 10
  },
  {
    id: 'files-network',
    label: 'Files, Network & Shell',
    description: 'Filesystem access, HTTP requests, browser automation, and shell integrations.',
    order: 20
  },
  {
    id: 'ui',
    label: 'Windows & UI',
    description: 'Windows, dialogs, context menus, notifications, tray, theme, and sub input controls.',
    order: 30
  },
  {
    id: 'system',
    label: 'System, Device & Permissions',
    description: 'System information, hardware permissions, screen, input, power, and desktop search.',
    order: 40
  },
  {
    id: 'plugin',
    label: 'Plugin Collaboration',
    description: 'Manifest contracts, lifecycle, host RPC, dynamic features, messaging, and scheduler.',
    order: 50
  },
  {
    id: 'ai-media',
    label: 'AI, Media & Processing',
    description: 'AI calls, Plugin Tools, text-to-speech, Sharp, FFmpeg, and media helpers.',
    order: 60
  },
  {
    id: 'diagnostics',
    label: 'Diagnostics',
    description: 'Plugin-local logging, log inspection, and live log subscriptions.',
    order: 70
  },
  {
    id: 'restricted',
    label: 'Internal or Settings-Scoped APIs',
    description: 'Documented boundaries for host settings, system pages, and internal-only surfaces.',
    order: 90
  }
]

export const publicApiCatalog: PublicApiCatalogEntry[] = [
  {
    code: 'manifest',
    title: 'Plugin Manifest',
    category: 'plugin',
    contexts: ['manifest'],
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
    summary: 'Defines the plugin contract, trigger commands, permissions, AI tools, window behavior, and runtime settings.'
  },
  {
    code: 'lifecycle',
    title: 'Lifecycle & Run Context',
    category: 'plugin',
    contexts: ['backend'],
    methods: ['onLoad', 'onUnload', 'onEnable', 'onDisable', 'run', 'onPluginInit', 'onPluginAttach', 'onPluginDetached', 'onPluginOut', 'onPluginLaunchStart', 'onPluginLaunchEnd'],
    summary: 'Backend lifecycle hooks and feature invocation entry points.'
  },
  {
    code: 'host',
    title: 'Host RPC',
    category: 'plugin',
    contexts: ['renderer'],
    methods: ['host.invoke', 'host.call', 'host.status', 'host.restart'],
    summary: 'Calls backend-exported methods from plugin UI and checks host process status.'
  },
  {
    code: 'tools',
    title: 'Plugin Tools',
    category: 'ai-media',
    contexts: ['backend', 'manifest'],
    methods: ['tools.register', 'tools.unregister'],
    summary: 'Registers plugin-provided tools that AI Agent can discover and call.'
  },
  {
    code: 'storage',
    title: 'Storage',
    category: 'data',
    contexts: ['renderer', 'backend'],
    methods: [
      'storage.get',
      'storage.set',
      'storage.remove',
      'storage.getAll',
      'storage.getAllWithMeta',
      'storage.listNamespaces',
      'storage.clear',
      'storage.keys',
      'storage.has',
      'storage.bulkSet',
      'storage.list',
      'storage.getMany',
      'storage.setMany',
      'storage.getMeta',
      'storage.setWithVersion',
      'storage.removeWithVersion',
      'storage.transaction',
      'storage.append',
      'storage.watch',
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
    summary: 'Stores plugin settings, encrypted values, and attachment blobs.'
  },
  {
    code: 'filesystem',
    title: 'Filesystem',
    category: 'files-network',
    contexts: ['renderer', 'backend'],
    methods: ['filesystem.readFile', 'filesystem.writeFile', 'filesystem.exists', 'filesystem.readdir', 'filesystem.mkdir', 'filesystem.stat', 'filesystem.copy', 'filesystem.move', 'filesystem.unlink', 'filesystem.extname', 'filesystem.join', 'filesystem.dirname', 'filesystem.basename', 'filesystem.getDataPath'],
    summary: 'Reads, writes, inspects, and moves files. Backend path helpers are shown separately.'
  },
  {
    code: 'clipboard',
    title: 'Clipboard',
    category: 'data',
    contexts: ['renderer', 'backend'],
    permissions: ['clipboard'],
    methods: ['clipboard.readText', 'clipboard.writeText', 'clipboard.readImage', 'clipboard.writeImage', 'clipboard.readFiles', 'clipboard.writeFiles', 'clipboard.getFormat'],
    summary: 'Reads and writes text, images, and files from the system clipboard.'
  },
  {
    code: 'clipboard-history',
    title: 'Clipboard History',
    category: 'data',
    contexts: ['renderer', 'backend'],
    permissions: ['clipboard'],
    methods: ['clipboardHistory.query', 'clipboardHistory.get', 'clipboardHistory.copy', 'clipboardHistory.toggleFavorite', 'clipboardHistory.delete', 'clipboardHistory.clear', 'clipboardHistory.stats'],
    summary: 'Queries and manages Mulby clipboard history with explicit clipboard permission.'
  },
  {
    code: 'http',
    title: 'HTTP',
    category: 'files-network',
    contexts: ['renderer', 'backend'],
    methods: ['http.request', 'http.get', 'http.post', 'http.put', 'http.delete'],
    summary: 'Performs HTTP calls through Mulby host APIs.'
  },
  {
    code: 'network',
    title: 'Network',
    category: 'files-network',
    contexts: ['renderer', 'backend'],
    methods: ['network.isOnline', 'network.onOnline', 'network.onOffline'],
    summary: 'Reads network connectivity state and subscribes to renderer connectivity events.'
  },
  {
    code: 'shell',
    title: 'Shell',
    category: 'files-network',
    contexts: ['renderer', 'backend'],
    permissions: ['runCommand'],
    methods: ['shell.openPath', 'shell.openExternal', 'shell.showItemInFolder', 'shell.openFolder', 'shell.trashItem', 'shell.beep', 'shell.runCommand', 'shell.getRunCommandPolicy', 'shell.updateRunCommandPolicy', 'shell.listRunCommandAudit', 'shell.clearRunCommandAudit', 'shell.clearRunCommandTrusted'],
    summary: 'Opens paths and URLs, plays system sounds, and demonstrates policy-protected command execution.'
  },
  {
    code: 'dialog',
    title: 'Dialog',
    category: 'ui',
    contexts: ['renderer', 'backend'],
    methods: ['dialog.showOpenDialog', 'dialog.showSaveDialog', 'dialog.showMessageBox', 'dialog.showErrorBox'],
    summary: 'Shows native open, save, message, and error dialogs.'
  },
  {
    code: 'notification',
    title: 'Notification',
    category: 'ui',
    contexts: ['renderer', 'backend'],
    permissions: ['notification'],
    methods: ['notification.show'],
    summary: 'Sends host notifications with typed severity.'
  },
  {
    code: 'window',
    title: 'Window',
    category: 'ui',
    contexts: ['renderer'],
    methods: ['window.hide', 'window.show', 'window.showInactive', 'window.focus', 'window.setTitle', 'window.setSize', 'window.setPosition', 'window.setBounds', 'window.getBounds', 'window.setExpendHeight', 'window.invalidate', 'window.center', 'window.setAlwaysOnTop', 'window.setOpacity', 'window.getOpacity', 'window.setBackgroundThrottling', 'window.setIgnoreMouseEvents', 'window.setVisibleOnAllWorkspaces', 'window.setFullScreen', 'window.detach', 'window.close', 'window.terminatePlugin', 'window.showPluginMenu', 'window.reload', 'window.getMode', 'window.getWindowType', 'window.getState', 'window.minimize', 'window.maximize', 'window.resizeDrag', 'window.create', 'window.sendToParent', 'window.onChildMessage', 'window.findInPage', 'window.stopFindInPage', 'window.startDrag', 'window.onWindowStateChange'],
    summary: 'Controls the current plugin window, detached windows, child windows, search in page, drag, and opacity.'
  },
  {
    code: 'sub-input',
    title: 'Sub Input',
    category: 'ui',
    contexts: ['renderer'],
    methods: ['subInput.set', 'subInput.remove', 'subInput.setValue', 'subInput.focus', 'subInput.blur', 'subInput.select', 'subInput.onChange'],
    summary: 'Controls Mulby panel sub-input for focused text capture workflows.'
  },
  {
    code: 'theme',
    title: 'Theme',
    category: 'ui',
    contexts: ['renderer'],
    methods: ['theme.get', 'theme.set', 'theme.getActual', 'onThemeChange'],
    summary: 'Reads and changes theme mode and reacts to actual theme changes.'
  },
  {
    code: 'menu',
    title: 'Menu',
    category: 'ui',
    contexts: ['renderer'],
    methods: ['menu.showContextMenu'],
    summary: 'Shows a native context menu and returns the selected item id.'
  },
  {
    code: 'tray',
    title: 'Tray',
    category: 'ui',
    contexts: ['renderer', 'backend'],
    methods: ['tray.create', 'tray.destroy', 'tray.setIcon', 'tray.setTooltip', 'tray.setTitle', 'tray.exists'],
    summary: 'Creates and updates plugin-owned tray icons.'
  },
  {
    code: 'plugin',
    title: 'Plugin Management',
    category: 'plugin',
    contexts: ['renderer'],
    methods: [
      'plugin.getAll',
      'plugin.listCommands',
      'plugin.search',
      'plugin.run',
      'plugin.runCommand',
      'plugin.getRecentUsed',
      'plugin.getSearchPreferences',
      'plugin.pinFeature',
      'plugin.unpinFeature',
      'plugin.hideFeature',
      'plugin.unhideFeature',
      'plugin.removeRecentUsage',
      'plugin.resolveDroppedFilePaths',
      'plugin.install',
      'plugin.enable',
      'plugin.disable',
      'plugin.uninstall',
      'plugin.getReadme',
      'plugin.listBackground',
      'plugin.startBackground',
      'plugin.stopBackground',
      'plugin.getBackgroundInfo',
      'plugin.stopPlugin',
      'plugin.prewarm',
      'plugin.listCommandShortcuts',
      'plugin.bindCommandShortcut',
      'plugin.unbindCommandShortcut',
      'plugin.validateCommandShortcut',
      'plugin.setCommandDisabled',
      'plugin.redirect',
      'plugin.outPlugin',
      'plugin.mainPushSelect',
      'plugin.getMainPushPlugins'
    ],
    summary: 'Discovers, searches, runs, and manages plugins and command shortcuts.'
  },
  {
    code: 'plugin-store',
    title: 'Plugin Store',
    category: 'plugin',
    contexts: ['renderer'],
    methods: ['pluginStore.fetch', 'pluginStore.installFromUrl', 'pluginStore.checkUpdatesInstalled', 'pluginStore.updateAll'],
    summary: 'Reads plugin store entries, checks installed plugin updates, and performs guarded install/update flows.'
  },
  {
    code: 'features',
    title: 'Dynamic Features',
    category: 'plugin',
    contexts: ['backend'],
    methods: [
      'features.getFeatures',
      'features.setFeature',
      'features.removeFeature',
      'features.onMainPush',
      'features.onMainPushSelect',
      'features.redirectHotKeySetting',
      'features.redirectAiModelsSetting'
    ],
    summary: 'Adds or removes runtime command entries and supports mainPush dynamic options.'
  },
  {
    code: 'messaging',
    title: 'Messaging',
    category: 'plugin',
    contexts: ['backend'],
    methods: ['messaging.send', 'messaging.broadcast', 'messaging.on', 'messaging.off'],
    summary: 'Sends direct and broadcast messages between plugins.'
  },
  {
    code: 'scheduler',
    title: 'Scheduler',
    category: 'plugin',
    contexts: ['renderer', 'backend'],
    methods: [
      'scheduler.schedule',
      'scheduler.cancel',
      'scheduler.pause',
      'scheduler.resume',
      'scheduler.get',
      'scheduler.list',
      'scheduler.getExecutions',
      'scheduler.listTasks',
      'scheduler.getTask',
      'scheduler.getTaskCount',
      'scheduler.deleteTasks',
      'scheduler.cleanupTasks',
      'scheduler.validateCron',
      'scheduler.getNextCronTime',
      'scheduler.describeCron',
      'scheduler.subscribe',
      'scheduler.unsubscribe',
      'scheduler.onEvent'
    ],
    summary: 'Creates delayed, once, and repeat tasks and inspects task state.'
  },
  {
    code: 'system',
    title: 'System',
    category: 'system',
    contexts: ['renderer', 'backend'],
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
    summary: 'Reads OS, app, path, idle, icon, and platform information.'
  },
  {
    code: 'permission',
    title: 'Permission',
    category: 'system',
    contexts: ['renderer', 'backend'],
    permissions: ['geolocation', 'camera', 'microphone', 'screen', 'accessibility', 'contacts', 'calendar'],
    methods: ['permission.getStatus', 'permission.request', 'permission.canRequest', 'permission.openSystemSettings', 'permission.isAccessibilityTrusted'],
    summary: 'Checks and requests host-mediated system permissions.'
  },
  {
    code: 'power',
    title: 'Power',
    category: 'system',
    contexts: ['renderer', 'backend'],
    methods: ['power.getSystemIdleTime', 'power.getSystemIdleState', 'power.isOnBatteryPower', 'power.getCurrentThermalState', 'power.onSuspend', 'power.onResume', 'power.onAC', 'power.onBattery', 'power.onLockScreen', 'power.onUnlockScreen'],
    summary: 'Reads power and idle state from the OS.'
  },
  {
    code: 'screen',
    title: 'Screen',
    category: 'system',
    contexts: ['renderer', 'backend'],
    permissions: ['screen'],
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
    summary: 'Reads display information and captures screen or region data.'
  },
  {
    code: 'media',
    title: 'Media Permissions',
    category: 'system',
    contexts: ['renderer', 'backend'],
    permissions: ['camera', 'microphone'],
    methods: ['media.getAccessStatus', 'media.askForAccess', 'media.hasCameraAccess', 'media.hasMicrophoneAccess'],
    summary: 'Checks and requests camera and microphone access.'
  },
  {
    code: 'input',
    title: 'Input Automation',
    category: 'system',
    contexts: ['renderer', 'backend'],
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
    summary: 'Pastes or types into the previous window and simulates keyboard or mouse events.'
  },
  {
    code: 'input-monitor',
    title: 'Input Monitor',
    category: 'system',
    contexts: ['renderer', 'backend'],
    permissions: ['inputMonitor', 'accessibility'],
    methods: ['inputMonitor.isAvailable', 'inputMonitor.requireAccessibility', 'inputMonitor.start', 'inputMonitor.stop', 'inputMonitor.onEvent'],
    summary: 'Listens to global keyboard and mouse events with explicit permission.'
  },
  {
    code: 'shortcut',
    title: 'Global Shortcut',
    category: 'system',
    contexts: ['renderer', 'backend'],
    methods: ['shortcut.register', 'shortcut.unregister', 'shortcut.unregisterAll', 'shortcut.isRegistered', 'shortcut.onTriggered'],
    summary: 'Registers plugin-owned global shortcuts and cleans them up.'
  },
  {
    code: 'security',
    title: 'Security',
    category: 'data',
    contexts: ['renderer', 'backend'],
    methods: ['security.isEncryptionAvailable', 'security.encryptString', 'security.decryptString'],
    summary: 'Uses host safe storage encryption primitives.'
  },
  {
    code: 'geolocation',
    title: 'Geolocation',
    category: 'system',
    contexts: ['renderer'],
    permissions: ['geolocation'],
    methods: ['geolocation.getAccessStatus', 'geolocation.requestAccess', 'geolocation.canGetPosition', 'geolocation.openSettings', 'geolocation.getCurrentPosition'],
    summary: 'Requests and reads current position when available.'
  },
  {
    code: 'tts',
    title: 'Text To Speech',
    category: 'ai-media',
    contexts: ['renderer'],
    methods: ['tts.speak', 'tts.stop', 'tts.pause', 'tts.resume', 'tts.getVoices', 'tts.isSpeaking'],
    summary: 'Speaks text and inspects speech voices/state.'
  },
  {
    code: 'desktop',
    title: 'Desktop Search',
    category: 'system',
    contexts: ['renderer'],
    methods: ['desktop.searchFiles', 'desktop.searchApps'],
    summary: 'Searches desktop files and applications.'
  },
  {
    code: 'inbrowser',
    title: 'InBrowser',
    category: 'files-network',
    contexts: ['renderer'],
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
    summary: 'Automates an embedded browser session for navigation, extraction, screenshots, and downloads.'
  },
  {
    code: 'sharp',
    title: 'Sharp Image Processing',
    category: 'ai-media',
    contexts: ['renderer', 'backend'],
    methods: ['sharp.resize', 'sharp.extract', 'sharp.rotate', 'sharp.composite', 'sharp.metadata', 'sharp.toBuffer', 'sharp.toFile', 'getSharpVersion', 'context.api.sharp.execute'],
    summary: 'Uses host-provided Sharp processing without bundling native sharp in the plugin.'
  },
  {
    code: 'ffmpeg',
    title: 'FFmpeg',
    category: 'ai-media',
    contexts: ['renderer'],
    methods: ['ffmpeg.run', 'ffmpeg.isAvailable', 'ffmpeg.getVersion', 'ffmpeg.getPath', 'ffmpeg.download'],
    summary: 'Runs host-managed FFmpeg jobs and checks installation state.'
  },
  {
    code: 'ai',
    title: 'AI',
    category: 'ai-media',
    contexts: ['renderer', 'backend'],
    methods: [
      'ai.call',
      'ai.abort',
      'ai.allModels',
      'ai.models.fetch',
      'ai.settings.get',
      'ai.skills.listEnabled',
      'ai.skills.previewForCall',
      'ai.attachments.upload',
      'ai.attachments.get',
      'ai.attachments.delete',
      'ai.attachments.uploadToProvider',
      'ai.tokens.estimate',
      'ai.images.generate',
      'ai.images.generateStream',
      'ai.images.edit'
    ],
    summary: 'Calls configured AI providers, streams chunks, manages attachments, estimates tokens, and generates images.'
  },
  {
    code: 'log',
    title: 'Log',
    category: 'diagnostics',
    contexts: ['renderer'],
    methods: ['log.debug', 'log.info', 'log.warn', 'log.error', 'log.getLogs', 'log.clear', 'log.getLogsDir', 'log.subscribe', 'log.onLog'],
    summary: 'Writes plugin logs, queries log records, reads the log directory, and subscribes to live log events.'
  }
]

export const restrictedApiCatalog: RestrictedApiCatalogEntry[] = [
  {
    code: 'settings',
    title: 'Settings API',
    methods: ['settings.get', 'settings.update', 'settings.reset', 'settings.pauseShortcuts', 'settings.downloadUpdate', 'settings.installUpdate'],
    reason: 'System-level app settings and updater actions. Third-party demos should not mutate host settings.',
    saferAlternative: 'Use plugin-local storage and manifest-declared command shortcuts instead.'
  },
  {
    code: 'developer',
    title: 'Developer API',
    methods: ['developer.addPluginPath', 'developer.removePluginPath', 'developer.reloadPlugins'],
    reason: 'Developer workflow controls for plugin path management, not normal plugin behavior.',
    saferAlternative: 'Document local development setup in README and let developers configure paths manually.'
  },
  {
    code: 'system-plugin',
    title: 'System Plugin API',
    methods: ['systemPlugin.setActive', 'systemPlugin.notifyReadyForAttach', 'systemPlugin.getActive'],
    reason: 'Reserved for Mulby system plugin attachment flow.'
  },
  {
    code: 'system-page',
    title: 'System Page API',
    methods: ['systemPage.open', 'systemPage.close', 'systemPage.detach', 'systemPage.reload'],
    reason: 'Safe as an explicit host UI navigation action, but the demo marks it as boundary documentation to avoid surprising page changes.',
    saferAlternative: 'Link users to manual settings paths or use plugin-local UI.'
  },
  {
    code: 'super-panel',
    title: 'Super Panel API',
    methods: ['superPanel.action', 'superPanel.onState'],
    reason: 'Designed for Mulby Super Panel frontends rather than ordinary third-party plugin windows.'
  },
  {
    code: 'tray-menu',
    title: 'Tray Menu API',
    methods: ['trayMenu.getState', 'trayMenu.action', 'trayMenu.close', 'trayMenu.onState'],
    reason: 'Specific to host tray menu UI state.'
  },
  {
    code: 'app-events',
    title: 'App/System Events',
    methods: ['app.onOpenSystemPlugin', 'app.onSystemPluginBeforeAttach', 'app.onOpenAiSettings', 'app.onOpenAiMcpSettings', 'app.onOpenAiToolsSettings', 'app.onOpenAiSkillsSettings', 'app.onOpenPluginStore', 'app.onOpenPluginManager', 'app.onOpenBackgroundPlugins', 'app.onOpenTaskScheduler', 'app.onOpenLogViewer', 'app.onOpenStorageExplorer', 'app.onOpenCommandShortcuts', 'app.onSetSearchText', 'app.onMainWindowShow'],
    reason: 'Primarily host navigation and system page events. Third-party plugins can listen selectively, but this reference does not trigger host navigation.'
  },
  {
    code: 'ai-system-settings',
    title: 'AI System Settings',
    methods: ['ai.mcp.*', 'ai.tooling.webSearch.*', 'ai.tooling.pluginTools.*', 'ai.mcpServer.*'],
    reason: 'AI provider, MCP server, web search, and tool visibility management are global host settings.',
    saferAlternative: 'Use `ai.call`, `ai.skills.listEnabled`, `ai.attachments`, and Plugin Tools for plugin-owned integrations.'
  },
  {
    code: 'undocumented-host-internals',
    title: 'Undocumented Host Internals',
    methods: ['onboarding', 'openclaw'],
    reason: 'Seen in local type surfaces but not documented as public third-party plugin APIs.'
  }
]

export function getCatalogSummary() {
  return {
    publicApiCount: publicApiCatalog.length,
    restrictedApiCount: restrictedApiCatalog.length,
    categories: categoryCatalog.map((category) => ({
      id: category.id,
      label: category.label,
      publicApiCount: publicApiCatalog.filter((entry) => entry.category === category.id).length
    }))
  }
}
