import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createRegistry,
  ensureCatalogCoverage,
  groupExamplesByCategory,
  publicApiCatalog,
  restrictedApiCatalog
} from '../test-support/registry-core.mjs'

test('createRegistry sorts examples by category order then title', () => {
  const registry = createRegistry([
    { code: 'window', title: 'Window', category: 'ui', methods: ['window.close'] },
    { code: 'storage', title: 'Storage', category: 'data', methods: ['storage.get'] },
    { code: 'clipboard', title: 'Clipboard', category: 'data', methods: ['clipboard.readText'] }
  ])

  assert.deepEqual(registry.map((entry) => entry.code), ['clipboard', 'storage', 'window'])
})

test('createRegistry rejects duplicate module codes', () => {
  assert.throws(
    () => createRegistry([
      { code: 'storage', title: 'Storage A', category: 'data', methods: [] },
      { code: 'storage', title: 'Storage B', category: 'data', methods: [] }
    ]),
    /Duplicate API example code: storage/
  )
})

test('groupExamplesByCategory preserves category display metadata', () => {
  const groups = groupExamplesByCategory(createRegistry([
    { code: 'storage', title: 'Storage', category: 'data', methods: ['storage.get'] },
    { code: 'shell', title: 'Shell', category: 'files-network', methods: ['shell.openPath'] }
  ]))

  assert.deepEqual(groups.map((group) => group.category), ['data', 'files-network'])
  assert.equal(groups[0].label, 'Data & Persistence')
  assert.deepEqual(groups[0].examples.map((entry) => entry.code), ['storage'])
})

test('ensureCatalogCoverage reports missing public API modules', () => {
  const result = ensureCatalogCoverage(
    [{ code: 'storage', title: 'Storage', category: 'data', methods: ['storage.get'] }],
    [{ code: 'storage' }, { code: 'filesystem' }],
    []
  )

  assert.deepEqual(result.missingPublic, ['filesystem'])
})

test('ensureCatalogCoverage confirms shipped public and restricted coverage', () => {
  const examples = [
    ...publicApiCatalog.map((entry) => ({
      code: entry.code,
      title: entry.title,
      category: entry.category,
      methods: entry.methods
    })),
    ...restrictedApiCatalog.map((entry) => ({
      code: entry.code,
      title: entry.title,
      category: 'restricted',
      methods: entry.methods
    }))
  ]

  const result = ensureCatalogCoverage(examples, publicApiCatalog, restrictedApiCatalog)

  assert.deepEqual(result.missingPublic, [])
  assert.deepEqual(result.missingRestricted, [])
})
