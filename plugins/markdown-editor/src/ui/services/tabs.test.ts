import assert from 'node:assert/strict'
import {
  createBlankTab,
  deriveTabTitle,
  findTabByPath,
  isTabDirty,
  makeTabId,
  nextActiveTabId,
  type EditorTab
} from './tabs'

// makeTabId is unique across calls.
assert.notEqual(makeTabId(), makeTabId())

// createBlankTab is an untitled, clean, empty tab with a fresh id.
const blank = createBlankTab()
assert.equal(blank.filePath, null)
assert.equal(blank.content, '')
assert.equal(isTabDirty(blank), false)
assert.notEqual(createBlankTab().id, blank.id)

// deriveTabTitle: file name from posix/windows paths, 未命名 for untitled.
assert.equal(deriveTabTitle({ filePath: '/docs/readme.md' }), 'readme.md')
assert.equal(deriveTabTitle({ filePath: 'C:\\notes\\todo.md' }), 'todo.md')
assert.equal(deriveTabTitle({ filePath: null }), '未命名')

// isTabDirty compares content vs the saved baseline.
assert.equal(isTabDirty({ content: 'a', savedContent: 'a' }), false)
assert.equal(isTabDirty({ content: 'a', savedContent: 'b' }), true)

const tabs: EditorTab[] = [
  { id: 't1', filePath: '/a.md', content: '', savedContent: '', savedAt: null },
  { id: 't2', filePath: null, content: '', savedContent: '', savedAt: null },
  { id: 't3', filePath: '/b.md', content: '', savedContent: '', savedAt: null }
]

// findTabByPath returns the matching tab or undefined.
assert.equal(findTabByPath(tabs, '/b.md')?.id, 't3')
assert.equal(findTabByPath(tabs, '/missing.md'), undefined)

// nextActiveTabId: closing a background tab keeps the active one.
assert.equal(nextActiveTabId(tabs, 't1', 't3'), 't3')
// closing the active tab prefers the right neighbor.
assert.equal(nextActiveTabId(tabs, 't1', 't1'), 't2')
// closing the rightmost active tab falls back to the left neighbor.
assert.equal(nextActiveTabId(tabs, 't3', 't3'), 't2')
// closing the only tab returns null (caller then opens a fresh blank tab).
assert.equal(nextActiveTabId([tabs[0]], 't1', 't1'), null)

console.log('markdown-editor tabs unit tests passed')
