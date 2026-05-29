import { useMemo } from 'react'

export function useMulby(pluginId: string) {
  return useMemo(() => ({
    dialog: {
      showOpenDialog: (options?: {
        title?: string
        defaultPath?: string
        buttonLabel?: string
        filters?: { name: string; extensions: string[] }[]
        properties?: ('openFile' | 'openDirectory' | 'multiSelections' | 'showHiddenFiles')[]
      }) => window.mulby?.dialog?.showOpenDialog(options),
      showSaveDialog: (options?: {
        title?: string
        defaultPath?: string
        buttonLabel?: string
        filters?: { name: string; extensions: string[] }[]
      }) => window.mulby?.dialog?.showSaveDialog(options)
    },
    notification: {
      show: (message: string, type?: 'info' | 'success' | 'warning' | 'error') =>
        window.mulby?.notification?.show(message, type)
    },
    host: {
      call: (method: string, ...args: unknown[]) =>
        window.mulby?.host?.call?.(pluginId, method, ...args)
    },
    theme: {
      getActual: () => window.mulby?.theme?.getActual?.()
    },
    shell: {
      showItemInFolder: (filePath: string) => window.mulby?.shell?.showItemInFolder?.(filePath),
      openFolder: (folderPath: string) => window.mulby?.shell?.openFolder?.(folderPath)
    },
    filesystem: {
      writeFile: (filePath: string, data: string | Uint8Array | ArrayBuffer, encoding?: 'utf-8' | 'base64') =>
        window.mulby?.filesystem?.writeFile?.(filePath, data, encoding)
    },
    ffmpeg: window.mulby?.ffmpeg
  }), [pluginId])
}
