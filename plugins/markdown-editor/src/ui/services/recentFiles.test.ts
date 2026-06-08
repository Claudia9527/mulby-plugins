import assert from 'node:assert/strict'
import { addRecent, normalizeRecent, removeRecent, type RecentEntry } from './recentFiles'

function entry(path: string, at: number, kind: 'file' | 'folder' = 'file'): RecentEntry {
  return { path, name: path.split('/').pop() ?? path, kind, at }
}

// addRecent prepends, dedupes by path, and caps length.
let list: RecentEntry[] = []
list = addRecent(list, entry('/a.md', 1))
list = addRecent(list, entry('/b.md', 2))
list = addRecent(list, entry('/a.md', 3)) // refresh a.md -> moves to front, no dupe
assert.deepEqual(list.map((e) => e.path), ['/a.md', '/b.md'])

// cap respected.
let capped: RecentEntry[] = []
for (let i = 0; i < 20; i += 1) {
  capped = addRecent(capped, entry(`/f${i}.md`, i), 5)
}
assert.equal(capped.length, 5)
assert.equal(capped[0].path, '/f19.md')

// removeRecent drops by path.
assert.deepEqual(removeRecent(list, '/a.md').map((e) => e.path), ['/b.md'])

// normalizeRecent validates and dedupes persisted data.
const normalized = normalizeRecent([
  { path: '/x.md', name: 'x.md', kind: 'file', at: 1 },
  { path: '/x.md', name: 'dup', kind: 'file', at: 2 }, // dupe dropped
  { path: '/dir', kind: 'folder', at: 3 }, // missing name -> falls back to path
  { nope: true }, // malformed dropped
  null
])
assert.deepEqual(normalized.map((e) => e.path), ['/x.md', '/dir'])
assert.equal(normalized[1].name, '/dir')
assert.equal(normalized[1].kind, 'folder')
assert.deepEqual(normalizeRecent('bad'), [])

console.log('markdown-editor recentFiles unit tests passed')
