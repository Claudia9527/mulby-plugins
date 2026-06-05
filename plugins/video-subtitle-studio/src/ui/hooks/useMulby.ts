export function useMulby(pluginId = 'video-subtitle-studio') {
  const api = window.mulby ?? {}

  const host = api.host
    ? {
        call: (method: string, ...args: unknown[]) => api.host.call(pluginId, method, ...args),
        invoke: (method: string, ...args: unknown[]) => api.host.invoke(pluginId, method, ...args),
        status: () => api.host.status?.(pluginId),
        restart: () => api.host.restart?.(pluginId)
      }
    : undefined

  return {
    ai: api.ai,
    clipboard: api.clipboard,
    dialog: api.dialog,
    ffmpeg: api.ffmpeg,
    filesystem: api.filesystem,
    host,
    notification: api.notification,
    storage: api.storage,
    system: api.system,
    pluginId
  }
}
