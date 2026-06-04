/// <reference types="vite/client" />

interface Window {
  mulby?: {
    filesystem?: {
      readFile: (path: string, encoding?: string) => Promise<any>
      writeFile: (path: string, data: any, encoding?: string) => Promise<void>
      exists: (path: string) => Promise<boolean>
      readdir: (path: string) => Promise<string[]>
      mkdir: (path: string) => Promise<void>
      stat: (path: string) => Promise<{
        name: string
        path: string
        size: number
        isFile: boolean
        isDirectory: boolean
        createdAt: number
        modifiedAt: number
      } | null>
      copy: (src: string, dest: string) => Promise<void>
      move: (src: string, dest: string) => Promise<void>
      unlink: (path: string) => Promise<void>
    }
    dialog?: {
      showOpenDialog: (options?: {
        title?: string
        defaultPath?: string
        filters?: { name: string; extensions: string[] }[]
        properties?: ('openFile' | 'openDirectory' | 'multiSelections' | 'showHiddenFiles')[]
      }) => Promise<string[]>
      showSaveDialog: (options?: {
        title?: string
        defaultPath?: string
        filters?: { name: string; extensions: string[] }[]
      }) => Promise<string | null>
      showMessageBox: (options: {
        type?: 'none' | 'info' | 'error' | 'question' | 'warning'
        title?: string
        message: string
        detail?: string
        buttons?: string[]
      }) => Promise<{ response: number; checkboxChecked: boolean }>
    }
    shell?: {
      openPath: (path: string) => Promise<string>
      openExternal: (url: string) => Promise<void>
      showItemInFolder: (path: string) => Promise<void>
      openFolder: (path: string) => Promise<string>
      trashItem: (path: string) => Promise<void>
    }
    notification?: {
      show: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void
    }
    window?: {
      setSize: (width: number, height: number) => void
      center: () => void
      hide: (isRestorePreWindow?: boolean) => void
      show: () => void
      close: () => void
      detach: () => void
      getMode: () => 'attached' | 'detached'
      minimize: () => void
      maximize: () => void
      getState: () => { isMaximized: boolean; isAlwaysOnTop: boolean }
      reload: () => void
    }
    host?: {
      invoke: (pluginId: string, method: string, ...args: unknown[]) => void
      call: (pluginId: string, method: string, ...args: unknown[]) => Promise<any>
    }
    system?: {
      getSystemInfo: () => Promise<any>
      getAppInfo: () => Promise<any>
      getPath: (name: string) => Promise<string>
      isWindows: () => boolean
      isMacOS: () => boolean
      isLinux: () => boolean
    }
    storage?: {
      get: (key: string, pluginId?: string) => Promise<any>
      set: (key: string, value: unknown, pluginId?: string) => Promise<void>
      remove: (key: string, pluginId?: string) => Promise<void>
    }
    theme?: {
      get: () => Promise<string>
      getActual: () => Promise<string>
    }
    clipboard?: {
      readText: () => Promise<string>
      writeText: (text: string) => Promise<void>
    }
  }
}

interface BackendPluginContext {
  api: any
  input?: string
  featureCode?: string
  attachments?: Array<{ path?: string; name?: string; kind?: 'file' | 'image' }>
}
