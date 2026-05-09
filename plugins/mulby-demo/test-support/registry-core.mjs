export const categoryCatalog = [
  { id: 'data', label: 'Data & Persistence', order: 10 },
  { id: 'files-network', label: 'Files, Network & Shell', order: 20 },
  { id: 'ui', label: 'Windows & UI', order: 30 },
  { id: 'system', label: 'System, Device & Permissions', order: 40 },
  { id: 'plugin', label: 'Plugin Collaboration', order: 50 },
  { id: 'ai-media', label: 'AI, Media & Processing', order: 60 },
  { id: 'restricted', label: 'Internal or Settings-Scoped APIs', order: 90 }
]

export const publicApiCatalog = [
  { code: 'manifest', title: 'Plugin Manifest', category: 'plugin', methods: ['manifest.json', 'features', 'permissions', 'pluginSetting', 'window', 'tools'] },
  { code: 'lifecycle', title: 'Lifecycle & Run Context', category: 'plugin', methods: ['onLoad', 'onUnload', 'onEnable', 'onDisable', 'run'] },
  { code: 'host', title: 'Host RPC', category: 'plugin', methods: ['host.invoke', 'host.call', 'host.status', 'host.restart'] },
  { code: 'tools', title: 'Plugin Tools', category: 'ai-media', methods: ['tools.register', 'tools.unregister'] },
  { code: 'storage', title: 'Storage', category: 'data', methods: ['storage.get', 'storage.set', 'storage.remove', 'storage.clear', 'storage.keys', 'storage.encrypted', 'storage.attachment'] },
  { code: 'filesystem', title: 'Filesystem', category: 'files-network', methods: ['filesystem.readFile', 'filesystem.writeFile', 'filesystem.exists', 'filesystem.readdir', 'filesystem.mkdir', 'filesystem.stat', 'filesystem.copy', 'filesystem.move', 'filesystem.unlink', 'filesystem.join'] },
  { code: 'clipboard', title: 'Clipboard', category: 'data', methods: ['clipboard.readText', 'clipboard.writeText', 'clipboard.readImage', 'clipboard.writeImage', 'clipboard.readFiles', 'clipboard.writeFiles', 'clipboard.getFormat'] },
  { code: 'clipboard-history', title: 'Clipboard History', category: 'data', methods: ['clipboardHistory.query', 'clipboardHistory.get', 'clipboardHistory.copy', 'clipboardHistory.toggleFavorite', 'clipboardHistory.delete', 'clipboardHistory.clear', 'clipboardHistory.stats'] },
  { code: 'http', title: 'HTTP', category: 'files-network', methods: ['http.request', 'http.get', 'http.post', 'http.put', 'http.delete'] },
  { code: 'network', title: 'Network', category: 'files-network', methods: ['network.isOnline', 'network.onOnline', 'network.onOffline'] },
  { code: 'shell', title: 'Shell', category: 'files-network', methods: ['shell.openPath', 'shell.openExternal', 'shell.showItemInFolder', 'shell.openFolder', 'shell.trashItem', 'shell.beep', 'shell.runCommand', 'shell.getRunCommandPolicy', 'shell.listRunCommandAudit'] },
  { code: 'dialog', title: 'Dialog', category: 'ui', methods: ['dialog.showOpenDialog', 'dialog.showSaveDialog', 'dialog.showMessageBox', 'dialog.showErrorBox'] },
  { code: 'notification', title: 'Notification', category: 'ui', methods: ['notification.show'] },
  { code: 'window', title: 'Window', category: 'ui', methods: ['window.hide', 'window.show', 'window.focus', 'window.setTitle', 'window.setSize', 'window.setBounds', 'window.getBounds', 'window.detach', 'window.create', 'window.findInPage', 'window.startDrag', 'window.setOpacity', 'window.onWindowStateChange'] },
  { code: 'sub-input', title: 'Sub Input', category: 'ui', methods: ['subInput.set', 'subInput.remove', 'subInput.setValue', 'subInput.focus', 'subInput.blur', 'subInput.select', 'subInput.onChange'] },
  { code: 'theme', title: 'Theme', category: 'ui', methods: ['theme.get', 'theme.set', 'theme.getActual', 'onThemeChange'] },
  { code: 'menu', title: 'Menu', category: 'ui', methods: ['menu.showContextMenu'] },
  { code: 'tray', title: 'Tray', category: 'ui', methods: ['tray.create', 'tray.destroy', 'tray.setIcon', 'tray.setTooltip', 'tray.setTitle', 'tray.exists'] },
  { code: 'plugin', title: 'Plugin Management', category: 'plugin', methods: ['plugin.getAll', 'plugin.listCommands', 'plugin.search', 'plugin.run', 'plugin.runCommand', 'plugin.getRecentUsed', 'plugin.pinFeature', 'plugin.hideFeature', 'plugin.install', 'plugin.enable', 'plugin.disable', 'plugin.uninstall', 'plugin.listBackground'] },
  { code: 'features', title: 'Dynamic Features', category: 'plugin', methods: ['features.getFeatures', 'features.setFeature', 'features.removeFeature', 'features.onMainPush', 'features.onMainPushSelect'] },
  { code: 'messaging', title: 'Messaging', category: 'plugin', methods: ['messaging.send', 'messaging.broadcast', 'messaging.on', 'messaging.off'] },
  { code: 'scheduler', title: 'Scheduler', category: 'plugin', methods: ['scheduler.schedule', 'scheduler.cancel', 'scheduler.pause', 'scheduler.resume', 'scheduler.get', 'scheduler.list', 'scheduler.listTasks', 'scheduler.getTaskCount', 'scheduler.deleteTasks', 'scheduler.validateCron', 'scheduler.describeCron'] },
  { code: 'system', title: 'System', category: 'system', methods: ['system.getSystemInfo', 'system.getAppInfo', 'system.getAppResourceUsage', 'system.getPath', 'system.getEnv', 'system.getIdleTime', 'system.getFileIcon', 'system.isMacOS', 'system.isWindows', 'system.isLinux', 'system.onActiveWindowChange'] },
  { code: 'permission', title: 'Permission', category: 'system', methods: ['permission.getStatus', 'permission.request', 'permission.canRequest', 'permission.openSystemSettings', 'permission.isAccessibilityTrusted'] },
  { code: 'power', title: 'Power', category: 'system', methods: ['power.getSystemIdleTime', 'power.getSystemIdleState', 'power.isOnBatteryPower', 'power.getCurrentThermalState'] },
  { code: 'screen', title: 'Screen', category: 'system', methods: ['screen.getAllDisplays', 'screen.getPrimaryDisplay', 'screen.getCursorScreenPoint', 'screen.getDisplayNearestPoint', 'screen.getSources', 'screen.capture', 'screen.captureRegion', 'screen.getMediaStreamConstraints', 'screen.screenCapture', 'screen.colorPick'] },
  { code: 'media', title: 'Media Permissions', category: 'system', methods: ['media.getAccessStatus', 'media.askForAccess', 'media.hasCameraAccess', 'media.hasMicrophoneAccess'] },
  { code: 'input', title: 'Input Automation', category: 'system', methods: ['input.hideMainWindowPasteText', 'input.hideMainWindowPasteImage', 'input.hideMainWindowPasteFile', 'input.hideMainWindowTypeString', 'input.restoreWindows', 'input.simulateKeyboardTap', 'input.simulateMouseMove', 'input.simulateMouseClick'] },
  { code: 'input-monitor', title: 'Input Monitor', category: 'system', methods: ['inputMonitor.isAvailable', 'inputMonitor.requireAccessibility', 'inputMonitor.start', 'inputMonitor.stop', 'inputMonitor.onEvent'] },
  { code: 'shortcut', title: 'Global Shortcut', category: 'system', methods: ['shortcut.register', 'shortcut.unregister', 'shortcut.unregisterAll', 'shortcut.isRegistered'] },
  { code: 'security', title: 'Security', category: 'data', methods: ['security.isEncryptionAvailable', 'security.encryptString', 'security.decryptString'] },
  { code: 'geolocation', title: 'Geolocation', category: 'system', methods: ['geolocation.getAccessStatus', 'geolocation.requestAccess', 'geolocation.canGetPosition', 'geolocation.openSettings', 'geolocation.getCurrentPosition'] },
  { code: 'tts', title: 'Text To Speech', category: 'ai-media', methods: ['tts.speak', 'tts.stop', 'tts.pause', 'tts.resume', 'tts.getVoices', 'tts.isSpeaking'] },
  { code: 'desktop', title: 'Desktop Search', category: 'system', methods: ['desktop.searchFiles', 'desktop.searchApps'] },
  { code: 'inbrowser', title: 'InBrowser', category: 'files-network', methods: ['inbrowser.goto', 'inbrowser.click', 'inbrowser.type', 'inbrowser.wait', 'inbrowser.screenshot', 'inbrowser.markdown', 'inbrowser.download', 'inbrowser.evaluate', 'inbrowser.run'] },
  { code: 'sharp', title: 'Sharp Image Processing', category: 'ai-media', methods: ['sharp.resize', 'sharp.extract', 'sharp.rotate', 'sharp.composite', 'sharp.metadata', 'sharp.toBuffer', 'sharp.toFile', 'getSharpVersion', 'context.api.sharp.execute'] },
  { code: 'ffmpeg', title: 'FFmpeg', category: 'ai-media', methods: ['ffmpeg.run', 'ffmpeg.isAvailable', 'ffmpeg.getVersion', 'ffmpeg.getPath', 'ffmpeg.download'] },
  { code: 'ai', title: 'AI', category: 'ai-media', methods: ['ai.call', 'ai.abort', 'ai.allModels', 'ai.models.fetch', 'ai.testConnection', 'ai.settings.get', 'ai.skills.listEnabled', 'ai.attachments.upload', 'ai.tokens.estimate', 'ai.images.generate'] }
]

export const restrictedApiCatalog = [
  { code: 'settings', title: 'Settings API', methods: ['settings.get', 'settings.update', 'settings.reset', 'settings.pauseShortcuts', 'settings.downloadUpdate', 'settings.installUpdate'], reason: 'System-level app settings and updater actions. Third-party demos should avoid mutating host settings.' },
  { code: 'developer', title: 'Developer API', methods: ['developer.addPluginPath', 'developer.removePluginPath', 'developer.reloadPlugins'], reason: 'Developer workflow controls for plugin path management, not normal plugin behavior.' },
  { code: 'system-plugin', title: 'System Plugin API', methods: ['systemPlugin.setActive', 'systemPlugin.notifyReadyForAttach', 'systemPlugin.getActive'], reason: 'Reserved for Mulby system plugin attachment flow.' },
  { code: 'system-page', title: 'System Page API', methods: ['systemPage.open', 'systemPage.close', 'systemPage.detach', 'systemPage.reload'], reason: 'Safe to navigate as a host UI action, but the demo treats it as boundary documentation to avoid surprising page changes.' },
  { code: 'super-panel', title: 'Super Panel API', methods: ['superPanel.action', 'superPanel.onState'], reason: 'Designed for Mulby Super Panel frontends rather than ordinary third-party plugin windows.' },
  { code: 'tray-menu', title: 'Tray Menu API', methods: ['trayMenu.getState', 'trayMenu.action', 'trayMenu.close', 'trayMenu.onState'], reason: 'Specific to host tray menu UI state.' },
  { code: 'plugin-store', title: 'Plugin Store API', methods: ['pluginStore.fetch', 'pluginStore.installFromUrl', 'pluginStore.checkUpdatesInstalled', 'pluginStore.updateAll'], reason: 'Install/update operations mutate the plugin environment and are documented read-only in this reference.' },
  { code: 'app-events', title: 'App/System Events', methods: ['app.onOpenPluginStore', 'app.onOpenPluginManager', 'app.onOpenTaskScheduler', 'onPluginOut'], reason: 'Primarily host navigation and system page events. Third-party plugins can listen selectively, but this reference does not trigger host navigation.' },
  { code: 'ai-system-settings', title: 'AI System Settings', methods: ['ai.mcp.*', 'ai.tooling.webSearch.*', 'ai.tooling.pluginTools.*', 'ai.mcpServer.*'], reason: 'AI provider, MCP server, web search, and tool visibility management are global host settings.' },
  { code: 'undocumented-host-internals', title: 'Undocumented Host Internals', methods: ['onboarding', 'openclaw'], reason: 'Seen in local type surfaces but not documented as public third-party plugin APIs.' }
]

const categoryOrder = new Map(categoryCatalog.map((category) => [category.id, category.order]))
const categoryMeta = new Map(categoryCatalog.map((category) => [category.id, category]))

export function createRegistry(examples) {
  const seen = new Set()
  const copy = examples.map((entry) => ({ ...entry }))

  for (const entry of copy) {
    if (seen.has(entry.code)) {
      throw new Error(`Duplicate API example code: ${entry.code}`)
    }
    seen.add(entry.code)
  }

  return copy.sort((a, b) => {
    const orderA = categoryOrder.get(a.category) ?? 999
    const orderB = categoryOrder.get(b.category) ?? 999
    if (orderA !== orderB) {
      return orderA - orderB
    }
    return a.title.localeCompare(b.title)
  })
}

export function groupExamplesByCategory(examples) {
  const grouped = new Map()

  for (const example of examples) {
    const meta = categoryMeta.get(example.category) ?? {
      id: example.category,
      label: example.category,
      order: 999
    }

    if (!grouped.has(example.category)) {
      grouped.set(example.category, {
        category: meta.id,
        label: meta.label,
        order: meta.order,
        examples: []
      })
    }
    grouped.get(example.category).examples.push(example)
  }

  return [...grouped.values()].sort((a, b) => a.order - b.order)
}

export function ensureCatalogCoverage(examples, publicCatalog, restrictedCatalog) {
  const exampleCodes = new Set(examples.map((entry) => entry.code))
  const missingPublic = publicCatalog
    .map((entry) => entry.code)
    .filter((code) => !exampleCodes.has(code))
  const missingRestricted = restrictedCatalog
    .map((entry) => entry.code)
    .filter((code) => !exampleCodes.has(code))

  return { missingPublic, missingRestricted }
}
