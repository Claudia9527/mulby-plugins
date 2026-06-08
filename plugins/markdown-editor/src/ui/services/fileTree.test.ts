import assert from 'node:assert/strict'
import {
  ancestorsWithin,
  filterEntries,
  flattenTree,
  prepareChildren,
  sortEntries,
  type ChildrenByDir,
  type FsEntry
} from './fileTree'

function file(path: string): FsEntry {
  const name = path.split('/').pop() ?? path
  return { name, path, isDirectory: false, isFile: true }
}
function dir(path: string): FsEntry {
  const name = path.split('/').pop() ?? path
  return { name, path, isDirectory: true, isFile: false }
}

const opts = { showOnlyMarkdown: true }

// sortEntries: folders first, then natural order.
const sorted = sortEntries([file('/r/b.md'), dir('/r/z'), file('/r/a10.md'), file('/r/a2.md'), dir('/r/a')])
assert.deepEqual(
  sorted.map((e) => e.name),
  ['a', 'z', 'a2.md', 'a10.md', 'b.md']
)

// filterEntries: dirs kept, only markdown files kept, dotfiles dropped.
const filtered = filterEntries(
  [dir('/r/sub'), file('/r/a.md'), file('/r/b.txt'), file('/r/.hidden'), dir('/r/.git')],
  opts
)
assert.deepEqual(
  filtered.map((e) => e.name),
  ['sub', 'a.md']
)

// prepareChildren = filter + sort.
const prepared = prepareChildren([file('/r/b.md'), dir('/r/z'), file('/r/a.txt')], opts)
assert.deepEqual(
  prepared.map((e) => e.name),
  ['z', 'b.md']
)

// flattenTree: only descends into expanded + loaded directories.
const children: ChildrenByDir = {
  '/r': [dir('/r/docs'), file('/r/top.md')],
  '/r/docs': [dir('/r/docs/sub'), file('/r/docs/guide.md')],
  '/r/docs/sub': [file('/r/docs/sub/deep.md')]
}

// Nothing expanded -> only the root level shows.
const collapsed = flattenTree('/r', children, new Set(), opts)
assert.deepEqual(
  collapsed.map((r) => `${r.depth}:${r.entry.name}`),
  ['0:docs', '0:top.md']
)
assert.equal(collapsed[0].hasChildren, true)
assert.equal(collapsed[0].expanded, false)

// Expand /r/docs -> its children appear at depth 1, but /r/docs/sub stays collapsed.
const oneOpen = flattenTree('/r', children, new Set(['/r/docs']), opts)
assert.deepEqual(
  oneOpen.map((r) => `${r.depth}:${r.entry.name}`),
  ['0:docs', '1:sub', '1:guide.md', '0:top.md']
)

// Expand the nested directory too.
const twoOpen = flattenTree('/r', children, new Set(['/r/docs', '/r/docs/sub']), opts)
assert.deepEqual(
  twoOpen.map((r) => `${r.depth}:${r.entry.name}`),
  ['0:docs', '1:sub', '2:deep.md', '1:guide.md', '0:top.md']
)

// Expanded but not-yet-loaded directory does not crash (no children emitted).
const unloaded = flattenTree('/r', { '/r': [dir('/r/lazy')] }, new Set(['/r/lazy']), opts)
assert.deepEqual(
  unloaded.map((r) => r.entry.name),
  ['lazy']
)

// ancestorsWithin: directories to expand to reveal a deep file.
assert.deepEqual(ancestorsWithin('/r', '/r/docs/sub/deep.md'), ['/r', '/r/docs', '/r/docs/sub'])
assert.deepEqual(ancestorsWithin('/r', '/other/x.md'), [])

console.log('markdown-editor fileTree unit tests passed')
