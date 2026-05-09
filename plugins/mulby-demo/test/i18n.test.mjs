import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import * as esbuild from 'esbuild'

async function importUiFixture() {
  const projectRoot = path.resolve(import.meta.dirname, '..')
  const tempDir = await mkdtemp(path.join(tmpdir(), 'mulby-demo-i18n-'))
  const entryPath = path.join(tempDir, 'fixture.ts')
  const outPath = path.join(tempDir, 'fixture.mjs')

  const registryPath = path.join(projectRoot, 'src/ui/examples/registry.ts').replace(/\\/g, '/')
  const i18nPath = path.join(projectRoot, 'src/ui/i18n.ts').replace(/\\/g, '/')

  await writeFile(entryPath, `
    export { apiExamples } from ${JSON.stringify(registryPath)}
    export {
      categoryTranslations,
      exampleTranslations,
      localize,
      moduleTranslations,
      safetyTranslations,
      uiText
    } from ${JSON.stringify(i18nPath)}
  `)

  await esbuild.build({
    entryPoints: [entryPath],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2020',
    outfile: outPath,
    logLevel: 'silent'
  })

  try {
    return await import(pathToFileURL(outPath).href)
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

function hasChinese(value) {
  return /[\u4e00-\u9fff]/.test(value)
}

test('i18n catalog covers every module, note, and example with Chinese text', async () => {
  const {
    apiExamples,
    categoryTranslations,
    exampleTranslations,
    moduleTranslations,
    safetyTranslations
  } = await importUiFixture()

  const categories = new Set()
  for (const module of apiExamples) {
    categories.add(module.category)

    const moduleText = moduleTranslations[module.code]
    assert.ok(moduleText, `missing module translation: ${module.code}`)
    assert.ok(hasChinese(moduleText.title), `module title is not Chinese: ${module.code}`)
    assert.ok(hasChinese(moduleText.summary), `module summary is not Chinese: ${module.code}`)
    assert.equal(moduleText.notes.length, module.notes.length, `module note count mismatch: ${module.code}`)
    for (const note of moduleText.notes) {
      assert.ok(hasChinese(note), `module note is not Chinese: ${module.code}`)
    }

    for (const example of module.examples) {
      const exampleText = exampleTranslations[example.id]
      assert.ok(exampleText, `missing example translation: ${example.id}`)
      assert.ok(hasChinese(exampleText.label), `example label is not Chinese: ${example.id}`)
      assert.ok(hasChinese(exampleText.description), `example description is not Chinese: ${example.id}`)
    }
  }

  for (const category of categories) {
    assert.ok(categoryTranslations[category], `missing category translation: ${category}`)
    assert.ok(hasChinese(categoryTranslations[category].label), `category label is not Chinese: ${category}`)
    assert.ok(hasChinese(categoryTranslations[category].description), `category description is not Chinese: ${category}`)
  }

  for (const [safety, text] of Object.entries(safetyTranslations)) {
    assert.ok(hasChinese(text.zh), `safety label is not Chinese: ${safety}`)
  }
})

test('localize returns requested language and falls back to English strings', async () => {
  const { localize, uiText } = await importUiFixture()

  assert.equal(localize({ en: 'Run', zh: '运行' }, 'zh'), '运行')
  assert.equal(localize({ en: 'Run', zh: '运行' }, 'en'), 'Run')
  assert.equal(localize('Preview', 'zh'), 'Preview')
  assert.ok(hasChinese(uiText.searchPlaceholder.zh))
})
