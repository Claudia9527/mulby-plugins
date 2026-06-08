import assert from 'node:assert/strict'
import { normalizeSession, serializeSession } from './session'
import type { EditorTab } from './tabs'

function tab(partial: Partial<EditorTab>): EditorTab {
  return {
    id: partial.id ?? 't',
    filePath: partial.filePath ?? null,
    content: partial.content ?? '',
    savedContent: partial.savedContent ?? '',
    savedAt: partial.savedAt ?? null
  }
}

// Clean file tab → path only (content omitted, reloaded from disk on restore).
const clean = serializeSession([tab({ id: 'a', filePath: '/a.md', content: 'x', savedContent: 'x', savedAt: 1 })], 'a')
assert.equal(clean.tabs[0].filePath, '/a.md')
assert.equal(clean.tabs[0].content, null)
assert.equal(clean.tabs[0].savedContent, null)
assert.equal(clean.activeIndex, 0)

// Dirty file tab → keeps content + baseline so unsaved edits survive.
const dirty = serializeSession([tab({ id: 'a', filePath: '/a.md', content: 'edited', savedContent: 'orig' })], 'a')
assert.equal(dirty.tabs[0].content, 'edited')
assert.equal(dirty.tabs[0].savedContent, 'orig')

// Untitled tab → keeps content.
const untitled = serializeSession([tab({ id: 'u', filePath: null, content: 'draft', savedContent: '' })], 'u')
assert.equal(untitled.tabs[0].filePath, null)
assert.equal(untitled.tabs[0].content, 'draft')

// activeIndex reflects the active id.
const multi = serializeSession([tab({ id: 'a', content: 'a' }), tab({ id: 'b', content: 'b' })], 'b')
assert.equal(multi.activeIndex, 1)

// normalizeSession rejects junk.
assert.equal(normalizeSession(null), null)
assert.equal(normalizeSession({}), null)
assert.equal(normalizeSession({ tabs: [] }), null)
assert.equal(normalizeSession({ tabs: 'nope' }), null)

// normalizeSession validates, drops empty entries, and clamps activeIndex.
const norm = normalizeSession({
  activeIndex: 9,
  tabs: [
    { filePath: '/a.md', content: null, savedContent: null, savedAt: 1 },
    { filePath: null, content: 'draft', savedContent: '', savedAt: null },
    { nope: true }, // dropped: neither path nor content
    { filePath: null, content: null } // dropped: untitled with no content
  ]
})
assert.ok(norm)
assert.equal(norm!.tabs.length, 2)
assert.equal(norm!.activeIndex, 1) // clamped to last valid index
assert.equal(norm!.tabs[0].filePath, '/a.md')
assert.equal(norm!.tabs[1].content, 'draft')

// Round-trip keeps untitled content.
const round = normalizeSession(serializeSession([tab({ id: 'u', content: 'hello', savedContent: '' })], 'u'))
assert.ok(round)
assert.equal(round!.tabs[0].content, 'hello')

console.log('markdown-editor session unit tests passed')
