import { categoryCatalog, publicApiCatalog, restrictedApiCatalog } from '../../shared/api-catalog'
import type { ApiCategoryId } from '../../shared/api-catalog'
import type { ApiExampleModule, ExampleGroup } from './types'
import { dataExamples } from './data.example'
import { filesNetworkExamples } from './files-network.example'
import { uiExamples } from './ui.example'
import { systemExamples } from './system.example'
import { pluginExamples } from './plugin.example'
import { aiMediaExamples } from './ai-media.example'
import { restrictedExamples } from './restricted.example'

const categoryOrder = new Map(categoryCatalog.map((category) => [category.id, category.order]))
const categoryMeta = new Map(categoryCatalog.map((category) => [category.id, category]))

export const apiExamples: ApiExampleModule[] = createRegistry([
  ...dataExamples,
  ...filesNetworkExamples,
  ...uiExamples,
  ...systemExamples,
  ...pluginExamples,
  ...aiMediaExamples,
  ...restrictedExamples
])

export function createRegistry(examples: ApiExampleModule[]): ApiExampleModule[] {
  const seen = new Set<string>()
  const copy = examples.map((entry) => ({ ...entry }))

  for (const entry of copy) {
    if (seen.has(entry.code)) {
      throw new Error(`Duplicate API example code: ${entry.code}`)
    }
    seen.add(entry.code)
  }

  return copy.sort((a, b) => {
    const orderA = categoryOrder.get(a.category) ?? 999
    const orderB = categoryOrder.get(b.category) ?? 999
    if (orderA !== orderB) {
      return orderA - orderB
    }
    return a.title.localeCompare(b.title)
  })
}

export function groupExamplesByCategory(examples: ApiExampleModule[]): ExampleGroup[] {
  const grouped = new Map<ApiCategoryId, ExampleGroup>()

  for (const example of examples) {
    const meta = categoryMeta.get(example.category) ?? {
      id: example.category,
      label: example.category,
      description: '',
      order: 999
    }

    if (!grouped.has(example.category)) {
      grouped.set(example.category, {
        category: meta.id,
        label: meta.label,
        description: meta.description,
        order: meta.order,
        examples: []
      })
    }
    grouped.get(example.category)!.examples.push(example)
  }

  return [...grouped.values()].sort((a, b) => a.order - b.order)
}

export function ensureCatalogCoverage(examples: ApiExampleModule[]) {
  const exampleCodes = new Set(examples.map((entry) => entry.code))
  return {
    missingPublic: publicApiCatalog.map((entry) => entry.code).filter((code) => !exampleCodes.has(code)),
    missingRestricted: restrictedApiCatalog.map((entry) => entry.code).filter((code) => !exampleCodes.has(code))
  }
}
