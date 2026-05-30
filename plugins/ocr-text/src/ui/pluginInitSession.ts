type PluginInitLike = {
  nonce?: number | string | null
}

export function shouldProcessPluginInit(
  lastNonceRef: { current: number | string | null },
  data: PluginInitLike
): boolean {
  const nonce = data.nonce ?? null
  if (nonce == null) return true
  if (lastNonceRef.current === nonce) return false
  lastNonceRef.current = nonce
  return true
}
