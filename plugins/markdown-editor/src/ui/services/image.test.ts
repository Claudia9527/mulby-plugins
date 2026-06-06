import assert from 'node:assert/strict'
import {
  base64ToBytes,
  buildDataUrl,
  buildImageMarkdown,
  bytesToBase64,
  extensionFromMime,
  extractInlineImages,
  findInlineDataImages,
  getDirectory,
  getExtension,
  hasInlineDataImage,
  joinPath,
  mimeFromExtension,
  parseDataUrl,
  toFileUrl
} from './image'

assert.equal(getDirectory('/a/b/note.md'), '/a/b')
assert.equal(getDirectory('C:\\docs\\note.md'), 'C:/docs')
assert.equal(getDirectory('note.md'), '')

assert.equal(getExtension('/a/b/pic.PNG'), 'png')
assert.equal(getExtension('archive.tar.gz'), 'gz')
assert.equal(getExtension('noext'), '')

assert.equal(mimeFromExtension('jpg'), 'image/jpeg')
assert.equal(mimeFromExtension('svg'), 'image/svg+xml')
assert.equal(mimeFromExtension('unknown'), 'application/octet-stream')

assert.equal(extensionFromMime('image/png'), 'png')
assert.equal(extensionFromMime('image/jpeg'), 'jpg')
assert.equal(extensionFromMime('weird/type'), 'png')

assert.equal(joinPath('/a/b', 'c.png'), '/a/b/c.png')
assert.equal(joinPath('/a/b/', 'c.png'), '/a/b/c.png')
assert.equal(joinPath('', 'c.png'), 'c.png')

assert.equal(buildImageMarkdown('assets/x.png', 'alt text'), '![alt text](assets/x.png)')
assert.equal(buildImageMarkdown('data:image/png;base64,AA'), '![](data:image/png;base64,AA)')

const bytes = new Uint8Array([72, 105]) // "Hi"
assert.equal(bytesToBase64(bytes), 'SGk=')
assert.equal(buildDataUrl(bytes, 'image/png'), 'data:image/png;base64,SGk=')

assert.equal(toFileUrl('/Users/me/a b/pic.png'), 'file:///Users/me/a%20b/pic.png')
assert.equal(toFileUrl('C:/data/x.png'), 'file:///C%3A/data/x.png')

// base64 <-> bytes round-trip
assert.deepEqual(Array.from(base64ToBytes('SGk=')), [72, 105])
assert.equal(bytesToBase64(base64ToBytes('SGk=')), 'SGk=')

// parseDataUrl
const parsedPng = parseDataUrl('data:image/png;base64,SGk=')
assert.ok(parsedPng)
assert.equal(parsedPng?.mime, 'image/png')
assert.equal(parsedPng?.ext, 'png')
assert.deepEqual(Array.from(parsedPng?.bytes ?? []), [72, 105])
assert.equal(parseDataUrl('data:image/png,not-base64'), null) // missing ;base64
assert.equal(parseDataUrl('https://example.com/a.png'), null) // not a data url
// default mime falls back to image/png when omitted
assert.equal(parseDataUrl('data:;base64,SGk=')?.mime, 'image/png')

// findInlineDataImages + hasInlineDataImage
const sampleMd = '前言\n![one](data:image/png;base64,SGk=) 中间 ![](data:image/jpeg;base64,QQ==)\n尾'
assert.equal(hasInlineDataImage(sampleMd), true)
assert.equal(hasInlineDataImage('![file](assets/x.png)'), false)
const inline = findInlineDataImages(sampleMd)
assert.equal(inline.length, 2)
assert.equal(inline[0].alt, 'one')
assert.equal(inline[0].dataUrl, 'data:image/png;base64,SGk=')
assert.equal(sampleMd.slice(inline[0].start, inline[0].end), '![one](data:image/png;base64,SGk=)')
assert.equal(inline[1].alt, '')

// extractInlineImages: replaces every data URL with the saved short reference
{
  let calls = 0
  const result = await extractInlineImages(sampleMd, async (image) => {
    calls += 1
    return `assets/img-${calls}.${image.ext}`
  })
  assert.equal(calls, 2)
  assert.equal(result.extracted, 2)
  assert.equal(
    result.markdown,
    '前言\n![one](assets/img-2.png) 中间 ![](assets/img-1.jpg)\n尾'
  )
}

// extractInlineImages: saver returning null leaves that reference untouched (no data loss)
{
  const result = await extractInlineImages(sampleMd, async () => null)
  assert.equal(result.extracted, 0)
  assert.equal(result.markdown, sampleMd)
}

// extractInlineImages: no-op when there are no inline images
{
  const clean = '![file](assets/keep.png) no base64 here'
  const result = await extractInlineImages(clean, async () => 'assets/should-not-run.png')
  assert.equal(result.extracted, 0)
  assert.equal(result.markdown, clean)
}

console.log('markdown-editor image unit tests passed')
