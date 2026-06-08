import assert from 'node:assert/strict'
import {
  basename,
  dirname,
  ensureMarkdownName,
  extname,
  isMarkdownFile,
  isSameOrInside,
  joinPath,
  naturalCompare,
  stripExtension,
  validateName
} from './filePath'

// basename / dirname on POSIX and Windows paths.
assert.equal(basename('/a/b/c.md'), 'c.md')
assert.equal(basename('C:\\docs\\note.md'), 'note.md')
assert.equal(dirname('/a/b/c.md'), '/a/b')
assert.equal(dirname('/top.md'), '/')
assert.equal(dirname('C:\\docs\\note.md'), 'C:\\docs')

// extension helpers (lower-cased, dotfiles have no extension).
assert.equal(extname('a.MD'), 'md')
assert.equal(extname('archive.tar.gz'), 'gz')
assert.equal(extname('.gitignore'), '')
assert.equal(stripExtension('note.md'), 'note')

// join respects the directory separator.
assert.equal(joinPath('/a/b', 'c.md'), '/a/b/c.md')
assert.equal(joinPath('/a/b/', 'c.md'), '/a/b/c.md')
assert.equal(joinPath('C:\\docs', 'c.md'), 'C:\\docs\\c.md')

// markdown detection + ensureMarkdownName.
assert.equal(isMarkdownFile('readme.md'), true)
assert.equal(isMarkdownFile('a.markdown'), true)
assert.equal(isMarkdownFile('a.txt'), false)
assert.equal(ensureMarkdownName('todo'), 'todo.md')
assert.equal(ensureMarkdownName('todo.markdown'), 'todo.markdown')
assert.equal(ensureMarkdownName('  '), '')

// natural sort: file2 before file10, case-insensitive.
assert.ok(naturalCompare('file2', 'file10') < 0)
assert.ok(naturalCompare('Apple', 'banana') < 0)

// name validation.
assert.equal(validateName('good.md'), null)
assert.equal(typeof validateName(''), 'string')
assert.equal(typeof validateName('..'), 'string')
assert.equal(typeof validateName('a/b'), 'string')
assert.equal(typeof validateName('a:b'), 'string')

// drop-target guard: a folder cannot be moved into itself or a descendant.
assert.equal(isSameOrInside('/a/b', '/a/b'), true)
assert.equal(isSameOrInside('/a/b', '/a/b/c'), true)
assert.equal(isSameOrInside('/a/b', '/a/bc'), false)
assert.equal(isSameOrInside('/a/b', '/a'), false)

console.log('markdown-editor filePath unit tests passed')
