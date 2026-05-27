export type SourceRefreshMode = 'fullscreen' | 'window' | 'region'
export type SourceRefreshType = 'screen' | 'window'

export function getSourceRefreshTypes(mode: SourceRefreshMode): SourceRefreshType[] {
  return mode === 'window' ? ['window'] : ['screen']
}
