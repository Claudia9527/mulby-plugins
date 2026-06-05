interface BackendPluginAttachment {
  path?: string
  name?: string
  kind?: 'file' | 'image'
}

interface BackendPluginContext {
  featureCode?: string
  input?: string
  attachments?: BackendPluginAttachment[]
}

interface Window {
  mulby?: any
}
