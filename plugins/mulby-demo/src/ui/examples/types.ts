import type { ApiCategoryId } from '../../shared/api-catalog'

export type ExampleContext = 'renderer' | 'backend' | 'manifest' | 'docs-only'

export interface ExampleResult {
  ok: boolean
  title: string
  data?: unknown
  warning?: string
}

export type MulbyApi = Record<string, any>

export interface RunnableExample {
  id: string
  label: string
  description: string
  methods: string[]
  code: string
  safety: 'safe' | 'writes-plugin-data' | 'opens-system-ui' | 'requires-permission' | 'preview-only'
  run?: () => Promise<ExampleResult>
}

export interface ApiExampleModule {
  code: string
  title: string
  category: ApiCategoryId
  contexts: ExampleContext[]
  summary: string
  methods: string[]
  permissions?: string[]
  notes: string[]
  examples: RunnableExample[]
}

export interface ExampleGroup {
  category: ApiCategoryId
  label: string
  description: string
  order: number
  examples: ApiExampleModule[]
}
