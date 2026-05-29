interface BackendAttachment {
  path?: string
  name?: string
}

interface BackendPluginContext {
  featureCode?: string
  attachments?: BackendAttachment[]
}

interface MulbyDialog {
  showOpenDialog(options?: {
    title?: string
    defaultPath?: string
    buttonLabel?: string
    filters?: { name: string; extensions: string[] }[]
    properties?: ('openFile' | 'openDirectory' | 'multiSelections' | 'showHiddenFiles')[]
  }): Promise<string[] | { canceled?: boolean; filePaths?: string[] }>
  showSaveDialog(options?: {
    title?: string
    defaultPath?: string
    buttonLabel?: string
    filters?: { name: string; extensions: string[] }[]
  }): Promise<string | null>
}

interface MulbyNotification {
  show(message: string, type?: 'info' | 'success' | 'warning' | 'error'): void
}

interface MulbyHost {
  call(pluginId: string, method: string, ...args: unknown[]): Promise<{ data?: unknown } | unknown>
}

interface MulbyTheme {
  getActual(): Promise<'light' | 'dark'>
}

interface MulbyShell {
  showItemInFolder(filePath: string): Promise<void>
  openFolder(folderPath: string): Promise<string>
}

interface MulbyFilesystem {
  writeFile(path: string, data: string | Uint8Array | ArrayBuffer, encoding?: 'utf-8' | 'base64'): Promise<void>
}

interface FFmpegRunProgress {
  bitrate: string
  fps: number
  frame: number
  percent?: number
  q: number | string
  size: string
  speed: string
  time: string
}

interface FFmpegDownloadProgress {
  phase: 'downloading' | 'extracting' | 'done'
  percent: number
  downloaded?: number
  total?: number
}

interface FFmpegTask {
  promise: Promise<void>
  kill(): void
  quit(): void
}

interface MulbyFFmpeg {
  isAvailable(): Promise<boolean>
  getVersion(): Promise<string | null>
  getPath(): Promise<string | null>
  download(onProgress?: (progress: FFmpegDownloadProgress) => void): Promise<{ success: boolean; error?: string }>
  run(args: string[], onProgress?: (progress: FFmpegRunProgress) => void): FFmpegTask
}

interface MulbyRendererApi {
  dialog?: MulbyDialog
  notification?: MulbyNotification
  host?: MulbyHost
  theme?: MulbyTheme
  shell?: MulbyShell
  filesystem?: MulbyFilesystem
  ffmpeg?: MulbyFFmpeg
  onThemeChange?: (callback: (theme: 'light' | 'dark') => void) => void
  onPluginInit?: (callback: (data: { attachments?: BackendAttachment[] }) => void) => void
}

interface Window {
  mulby?: MulbyRendererApi
}
