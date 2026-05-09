type Disposable = () => void

interface PluginInitData {
  pluginName: string
  displayName: string
  featureCode: string
  input?: string
  attachments?: Array<{ id?: string; name?: string; path?: string; dataUrl?: string; kind?: 'file' | 'image' }>
  capabilities?: Record<string, boolean>
}

interface BackendPluginContext {
  api: any
  featureCode?: string
  input?: string
  attachments?: Array<{ id?: string; name?: string; path?: string; dataUrl?: string; kind?: 'file' | 'image' }>
}

interface Window {
  mulby: any
}
