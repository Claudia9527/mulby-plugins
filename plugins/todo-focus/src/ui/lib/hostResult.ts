/** Mulby host.call / host.invoke 统一包装为 { data: T } */
export function unwrapHostResult<T>(result: unknown): T {
  if (result !== null && typeof result === 'object' && 'data' in result) {
    return (result as { data: T }).data
  }
  return result as T
}
