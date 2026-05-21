import { useMemo } from 'react'

type NotificationType = 'info' | 'success' | 'warning' | 'error'
type ThemeMode = 'light' | 'dark'
type OpenDialogResult = string[] | { filePaths?: string[] } | undefined

interface PluginInitData {
  pluginName: string
  featureCode: string
  input: string
  mode?: string
  route?: string
}

interface WindowMulby {
  clipboard?: {
    readText: () => Promise<string>
    writeText: (text: string) => Promise<void>
  }
  storage?: {
    get: (key: string, pluginId?: string) => Promise<unknown>
    set: (key: string, value: unknown, pluginId?: string) => Promise<void>
    remove: (key: string, pluginId?: string) => Promise<void>
  }
  notification?: {
    show: (message: string, type?: NotificationType) => void
  }
  dialog?: {
    showOpenDialog: (options?: {
      title?: string
      defaultPath?: string
      buttonLabel?: string
      filters?: { name: string; extensions: string[] }[]
      properties?: ('openFile' | 'openDirectory' | 'multiSelections' | 'showHiddenFiles')[]
    }) => Promise<OpenDialogResult>
    showSaveDialog: (options?: {
      title?: string
      defaultPath?: string
      buttonLabel?: string
      filters?: { name: string; extensions: string[] }[]
    }) => Promise<string | null>
  }
  filesystem?: {
    readFile: (path: string, encoding?: 'utf-8' | 'base64') => Promise<string | ArrayBuffer | Uint8Array>
    writeFile: (path: string, data: string | ArrayBuffer, encoding?: 'utf-8' | 'base64') => Promise<void>
  }
  onThemeChange?: (callback: (theme: ThemeMode) => void) => void
  onPluginInit?: (callback: (data: PluginInitData) => void) => void
}

declare global {
  interface Window {
    mulby?: WindowMulby
  }
}

export function useMulby(pluginId?: string) {
  return useMemo(() => ({
    clipboard: {
      readText: () => window.mulby?.clipboard?.readText() ?? Promise.resolve(''),
      writeText: (text: string) => window.mulby?.clipboard?.writeText(text) ?? Promise.resolve()
    },
    storage: {
      get: (key: string) => window.mulby?.storage?.get(key, pluginId) ?? Promise.resolve(undefined),
      set: (key: string, value: unknown) => window.mulby?.storage?.set(key, value, pluginId) ?? Promise.resolve(),
      remove: (key: string) => window.mulby?.storage?.remove(key, pluginId) ?? Promise.resolve()
    },
    notification: {
      show: (message: string, type?: NotificationType) => window.mulby?.notification?.show(message, type)
    },
    dialog: {
      showOpenDialog: (options?: {
        title?: string
        defaultPath?: string
        buttonLabel?: string
        filters?: { name: string; extensions: string[] }[]
        properties?: ('openFile' | 'openDirectory' | 'multiSelections' | 'showHiddenFiles')[]
      }) => window.mulby?.dialog?.showOpenDialog(options) ?? Promise.resolve(undefined),
      showSaveDialog: (options?: {
        title?: string
        defaultPath?: string
        buttonLabel?: string
        filters?: { name: string; extensions: string[] }[]
      }) => window.mulby?.dialog?.showSaveDialog(options) ?? Promise.resolve(null)
    },
    filesystem: {
      readFile: (path: string, encoding?: 'utf-8' | 'base64') =>
        window.mulby?.filesystem?.readFile(path, encoding) ?? Promise.resolve(''),
      writeFile: (path: string, data: string | ArrayBuffer, encoding?: 'utf-8' | 'base64') =>
        window.mulby?.filesystem?.writeFile(path, data, encoding) ?? Promise.resolve()
    }
  }), [pluginId])
}
