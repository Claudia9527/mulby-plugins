import { useCallback, useEffect, useState } from 'react';

const PLUGIN_ID = 'chrome-history';

export interface PluginInitPayload {
  pluginName: string;
  featureCode: string;
  input?: string;
  route?: string;
}

export function useMulby() {
  const call = useCallback(async (method: string, ...args: unknown[]) => {
    if (!(window as any).mulby?.host) {
      throw new Error('Mulby host not available');
    }
    const result = await (window as any).mulby.host.call(PLUGIN_ID, method, ...args);
    return result?.data;
  }, []);

  const notify = useCallback((message: string, type?: string) => {
    try {
      (window as any).mulby?.notification?.show(message, type);
    } catch {
      // Notification is best-effort in local browser previews.
    }
  }, []);

  const outPlugin = useCallback(() => {
    try {
      (window as any).mulby?.plugin?.outPlugin?.();
    } catch {
      // Ignore local preview.
    }
  }, []);

  return { call, notify, outPlugin };
}

export function usePluginInit() {
  const [init, setInit] = useState<PluginInitPayload | null>(null);

  useEffect(() => {
    const mulby = (window as any).mulby;
    if (!mulby?.onPluginInit) {
      return;
    }
    return mulby.onPluginInit((payload: PluginInitPayload) => {
      setInit(payload);
    });
  }, []);

  return init;
}

export function parseInitialKeyword(input: string | undefined): string {
  const value = (input || '').trim();
  if (!value) {
    return '';
  }
  return value
    .replace(/^(ch|edge|chrome历史记录|edge历史记录)\s*/i, '')
    .trim();
}
