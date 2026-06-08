import assert from 'node:assert/strict'
import {
  applyCloseTabs,
  createBlankTab,
  deriveTabTitle,
  findTabByPath,
  isTabDirty,
  makeTabId,
  moveTab,
  nextActiveTabId,
  splitClosableTabs,
  type EditorTab
} from './tabs'

function mk(id: string, partial: Partial<EditorTab> = {}): EditorTab {
  return {
    id,
    filePath: partial.filePath ?? null,
    content: partial.content ?? '',
    savedContent: partial.savedContent ?? '',
    savedAt: partial.savedAt ?? null
  }
}

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

// --- moveTab (drag-to-reorder) ---
const order = [mk('t1'), mk('t2'), mk('t3')]
// drop t1 to the right side of t3 → end.
assert.deepEqual(moveTab(order, 't1', 't3', false).map((t) => t.id), ['t2', 't3', 't1'])
// drop t3 to the left side of t1 → start.
assert.deepEqual(moveTab(order, 't3', 't1', true).map((t) => t.id), ['t3', 't1', 't2'])
// drop t2 before t1.
assert.deepEqual(moveTab(order, 't2', 't1', true).map((t) => t.id), ['t2', 't1', 't3'])
// no-op when ids match or source is missing.
assert.deepEqual(moveTab(order, 't1', 't1', true).map((t) => t.id), ['t1', 't2', 't3'])
assert.deepEqual(moveTab(order, 'x', 't2', true).map((t) => t.id), ['t1', 't2', 't3'])

// --- splitClosableTabs (dirty-aware batch close) ---
const mix = [
  mk('a', { content: 'x', savedContent: 'x' }), // clean
  mk('b', { content: 'y', savedContent: '' }), // dirty
  mk('c', { filePath: '/c.md', content: 'z', savedContent: 'z', savedAt: 1 }) // clean
]
const split = splitClosableTabs(mix, ['a', 'b', 'c'])
assert.deepEqual(split.closable, ['a', 'c'])
assert.deepEqual(split.dirty, ['b'])

// --- applyCloseTabs (survivors + next active) ---
// active survives → stays active.
let close = applyCloseTabs(order, ['t2'], 't1')
assert.deepEqual(close.remaining.map((t) => t.id), ['t1', 't3'])
assert.equal(close.nextActiveId, 't1')
// active closed → nearest neighbor after.
close = applyCloseTabs(order, ['t1'], 't1')
assert.equal(close.nextActiveId, 't2')
// active closed at the end → falls back to the neighbor before.
close = applyCloseTabs(order, ['t3'], 't3')
assert.equal(close.nextActiveId, 't2')
// active closed → preferred survivor wins (close-others keeps the clicked tab).
close = applyCloseTabs(order, ['t1', 't2'], 't1', 't3')
assert.equal(close.nextActiveId, 't3')
// closing everything → null (caller opens a fresh blank tab).
close = applyCloseTabs(order, ['t1', 't2', 't3'], 't2')
assert.equal(close.remaining.length, 0)
assert.equal(close.nextActiveId, null)

console.log('markdown-editor tabs unit tests passed')
