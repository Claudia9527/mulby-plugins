export type PluginProjectType = 'single' | 'collection'
export type PluginProjectSource = 'added' | 'imported' | 'created' | 'migrated'

export interface PluginManifestSummary {
  id?: string
  name?: string
  displayName?: string
  version?: string
  description?: string
  author?: string
  main?: string
  ui?: string
  features?: Array<{ code?: string; explain?: string }>
}

export interface PluginValidationResult {
  valid: boolean
  errors: string[]
  manifest?: PluginManifestSummary
  built: boolean
  mainEntryFound: boolean
}

export interface PluginProjectPluginStatus {
  id: string
  displayName: string
  path: string
  manifestValid: boolean
  manifestErrors: string[]
  mainEntryFound: boolean
  built: boolean
  loaded: boolean
  enabled: boolean
  isDev: boolean
  idConflictWith?: string
}

export interface PluginProjectStatus {
  projectId: string
  path: string
  type: PluginProjectType
  source: PluginProjectSource
  label?: string
  exists: boolean
  plugins: PluginProjectPluginStatus[]
}

export interface IpcResult<T = unknown> {
  success: boolean
  error?: string
  log?: string
  project?: T
  path?: string
  outFile?: string
}

export type LogLevel = 'info' | 'success' | 'error' | 'warn'

export interface LogEntry {
  id: string
  ts: number
  level: LogLevel
  text: string
}
