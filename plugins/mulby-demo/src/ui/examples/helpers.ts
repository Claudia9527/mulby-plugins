import { publicApiCatalog, restrictedApiCatalog } from '../../shared/api-catalog'
import type { ApiExampleModule, ExampleResult } from './types'

type MulbyWindow = Window & { mulby?: any }

export function mulby(): any | null {
  return (window as MulbyWindow).mulby ?? null
}

export function unavailable(title: string): ExampleResult {
  return {
    ok: false,
    title,
    warning: 'window.mulby is not available. Run this inside Mulby to execute the API call.'
  }
}

export function catalogModule(
  code: string,
  extra: Omit<ApiExampleModule, 'code' | 'methods' | 'permissions' | 'summary'> &
    Partial<Pick<ApiExampleModule, 'methods' | 'permissions' | 'summary'>>
): ApiExampleModule {
  const catalog = publicApiCatalog.find((entry) => entry.code === code)
  if (!catalog) {
    throw new Error(`Unknown public API catalog code: ${code}`)
  }

  return {
    ...extra,
    code,
    methods: extra.methods ?? catalog.methods,
    permissions: extra.permissions ?? catalog.permissions,
    summary: extra.summary ?? catalog.summary
  }
}

export function restrictedModule(code: string, notes: string[] = []): ApiExampleModule {
  const catalog = restrictedApiCatalog.find((entry) => entry.code === code)
  if (!catalog) {
    throw new Error(`Unknown restricted API catalog code: ${code}`)
  }

  return {
    code,
    title: catalog.title,
    category: 'restricted',
    contexts: ['docs-only'],
    summary: catalog.reason,
    methods: catalog.methods,
    notes: catalog.saferAlternative ? [...notes, `Safer alternative: ${catalog.saferAlternative}`] : notes,
    examples: [
      {
        id: `${code}-boundary`,
        label: 'Boundary note',
        description: catalog.reason,
        safety: 'preview-only',
        code: `// ${catalog.title} is documented as out of scope for runnable third-party examples.\n// Covered methods: ${catalog.methods.join(', ')}`
      }
    ]
  }
}
