export function useMulby() {
  return (window as Window & { mulby?: any }).mulby ?? null
}
