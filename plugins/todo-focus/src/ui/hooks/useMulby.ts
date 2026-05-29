import { useMemo } from 'react'

interface WrappedHost {
  invoke(method: string, ...args: unknown[]): Promise<unknown>
  call(method: string, ...args: unknown[]): Promise<{ success: boolean; data: unknown }>
  status(): Promise<{ ready: boolean; active: boolean }>
  restart(): Promise<boolean>
}

export function useMulby(pluginId?: string) {
  return useMemo(() => {
    const mulby = window.mulby

    const storage = pluginId
      ? {
          ...mulby.storage,
          get: (key: string) => mulby.storage.get(key, pluginId),
          set: (key: string, value: unknown) => mulby.storage.set(key, value, pluginId),
          remove: (key: string) => mulby.storage.remove(key, pluginId),
        }
      : mulby.storage

    const host: WrappedHost = pluginId && mulby.host
      ? {
          invoke: (method: string, ...args: unknown[]) => mulby.host!.invoke(pluginId, method, ...args),
          call: (method: string, ...args: unknown[]) => mulby.host!.call(pluginId, method, ...args),
          status: () => mulby.host!.status(pluginId),
          restart: () => mulby.host!.restart(pluginId),
        }
      : {
          invoke: (method: string, ...args: unknown[]) => mulby.host!.invoke('', method, ...args),
          call: (method: string, ...args: unknown[]) => mulby.host!.call('', method, ...args),
          status: () => mulby.host!.status(''),
          restart: () => mulby.host!.restart(''),
        }

    return {
      ...mulby,
      storage,
      host,
    }
  }, [pluginId])
}
