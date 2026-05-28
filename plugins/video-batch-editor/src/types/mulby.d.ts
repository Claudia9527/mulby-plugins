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

interface MulbyRendererApi {
  dialog?: MulbyDialog
  notification?: MulbyNotification
  host?: MulbyHost
  theme?: MulbyTheme
  shell?: MulbyShell
  onThemeChange?: (callback: (theme: 'light' | 'dark') => void) => void
  onPluginInit?: (callback: (data: { attachments?: BackendAttachment[] }) => void) => void
}

interface Window {
  mulby?: MulbyRendererApi
}
