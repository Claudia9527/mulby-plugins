import assert from 'node:assert/strict'
import { EditorState } from '@codemirror/state'
import { ensureSyntaxTree } from '@codemirror/language'
import { createMarkdownLanguage } from './markdownLanguage'
import {
  activeLineNumbers,
  computeLivePreview,
  extractImageAlt,
  findBlockMathMatches,
  findHighlightMatches,
  findInlineMathMatches,
  type HideRange,
  type MarkRange,
  type WidgetRange
} from './livePreviewModel'

function stateFor(doc: string, caret: number): EditorState {
  const state = EditorState.create({
    doc,
    selection: { anchor: caret },
    extensions: [createMarkdownLanguage()]
  })
  // Force a complete parse so syntaxTree() is exhaustive in the headless test.
  ensureSyntaxTree(state, state.doc.length, 10000)
  return state
}

const hasHide = (hides: HideRange[], from: number, to: number) =>
  hides.some((h) => h.from === from && h.to === to)
const hasMark = (marks: MarkRange[], cls: string) => marks.some((m) => m.cls === cls)
const findWidget = (widgets: WidgetRange[], kind: WidgetRange['kind']) =>
  widgets.find((w) => w.kind === kind)

// extractImageAlt pulls the alt text out of an image's raw source.
assert.equal(extractImageAlt('![a cat](x.png)'), 'a cat')
assert.equal(extractImageAlt('![](x.png)'), '')

// activeLineNumbers covers every line a selection touches.
{
  const state = EditorState.create({ doc: 'a\nb\nc', selection: { anchor: 0, head: 3 } })
  const lines = activeLineNumbers(state)
  assert.ok(lines.has(1) && lines.has(2))
  assert.ok(!lines.has(3))
}

// Heading off the active line: line is classed and the "# " marker is hidden.
{
  const doc = '# Title\n\nbody'
  const state = stateFor(doc, doc.indexOf('body'))
  const deco = computeLivePreview(state)
  assert.ok(deco.lineClasses.some((l) => l.cls === 'cm-md-h1'), 'h1 line class')
  assert.ok(hasHide(deco.hides, 0, 2), 'hides "# "')
}

// Bold off the active line: marks hidden, content styled.
{
  const doc = '**bold**\n\ntail'
  const state = stateFor(doc, doc.indexOf('tail'))
  const deco = computeLivePreview(state)
  assert.ok(hasHide(deco.hides, 0, 2), 'hides opening **')
  assert.ok(hasHide(deco.hides, 6, 8), 'hides closing **')
  assert.ok(hasMark(deco.marks, 'cm-md-strong'), 'strong mark')
}

// On the active line, the bold markers are revealed (not hidden).
{
  const doc = '**bold**\n\ntail'
  const state = stateFor(doc, 3) // caret inside the bold on line 1
  const deco = computeLivePreview(state)
  assert.ok(!hasHide(deco.hides, 0, 2), 'opening ** revealed on active line')
}

// Inline code off the active line hides the backticks.
{
  const doc = '`code`\n\ntail'
  const state = stateFor(doc, doc.indexOf('tail'))
  const deco = computeLivePreview(state)
  assert.ok(hasMark(deco.marks, 'cm-md-code'), 'code mark')
  assert.ok(hasHide(deco.hides, 0, 1), 'hides opening backtick')
}

// Inline link off the active line: brackets/URL hidden, label styled.
{
  const doc = '[label](http://x)\n\ntail'
  const state = stateFor(doc, doc.indexOf('tail'))
  const deco = computeLivePreview(state)
  assert.ok(hasMark(deco.marks, 'cm-md-link'), 'link mark')
  assert.ok(hasHide(deco.hides, 0, 1), 'hides opening [')
  const rbracket = doc.indexOf(']')
  assert.ok(hasHide(deco.hides, rbracket, doc.indexOf('\n')), 'hides ](url) tail')
}

// Image off the active line becomes an image widget carrying url + alt.
{
  const doc = '![a cat](cat.png)\n\ntail'
  const state = stateFor(doc, doc.indexOf('tail'))
  const deco = computeLivePreview(state)
  const widget = findWidget(deco.widgets, 'image')
  assert.ok(widget, 'image widget present')
  assert.equal(widget?.data.url, 'cat.png')
  assert.equal(widget?.data.alt, 'a cat')
}

// Horizontal rule off the active line becomes an hr widget.
{
  const doc = 'before\n\n---\n\nafter'
  const state = stateFor(doc, doc.indexOf('after'))
  const deco = computeLivePreview(state)
  assert.ok(findWidget(deco.widgets, 'hr'), 'hr widget present')
}

// Fenced code block: every line of the block gets the code-block class.
{
  const doc = '```js\nconst a = 1\nconst b = 2\n```\n\ntail'
  const state = stateFor(doc, doc.indexOf('tail'))
  const deco = computeLivePreview(state)
  const codeLineCount = deco.lineClasses.filter((l) => l.cls === 'cm-md-codeblock').length
  assert.ok(codeLineCount >= 3, `expected >=3 code-block lines, got ${codeLineCount}`)
  assert.ok(deco.lineClasses.some((l) => l.cls === 'cm-md-codeblock-open'), 'open fence class')
  assert.ok(deco.lineClasses.some((l) => l.cls === 'cm-md-codeblock-close'), 'close fence class')
}

// Bullet list markers off the active line become bullet widgets.
{
  const doc = '- first\n- second\n\ntail'
  const state = stateFor(doc, doc.indexOf('tail'))
  const deco = computeLivePreview(state)
  const bullets = deco.widgets.filter((w) => w.kind === 'bullet')
  assert.equal(bullets.length, 2, 'two bullet widgets')
}

// Ordered list markers are left as-is (no bullet widget).
{
  const doc = '1. first\n2. second\n\ntail'
  const state = stateFor(doc, doc.indexOf('tail'))
  const deco = computeLivePreview(state)
  assert.equal(deco.widgets.filter((w) => w.kind === 'bullet').length, 0, 'no bullets for ordered list')
}

// GFM table off the active line becomes a block table widget carrying its source.
{
  const doc = 'intro\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\ntail'
  const state = stateFor(doc, doc.indexOf('tail'))
  const deco = computeLivePreview(state)
  const table = findWidget(deco.widgets, 'table')
  assert.ok(table, 'table widget present')
  assert.equal(table?.block, true)
  assert.ok((table?.data.source ?? '').includes('| a | b |'), 'carries table source')
}

// --- TeX math scanners (pure) ---------------------------------------------
{
  // Inline math: padded by non-space, no newline.
  assert.equal(findInlineMathMatches('a $x^2$ b').length, 1, 'one inline math')
  assert.equal(findInlineMathMatches('$x^2$')[0].inner, 'x^2', 'inner tex')
  // Currency is not math.
  assert.equal(findInlineMathMatches('it costs $5 and $10 total').length, 0, 'no currency math')
  // Padding rule: leading/trailing space rejects.
  assert.equal(findInlineMathMatches('$ x $').length, 0, 'space-padded rejected')
  // Block math (display), possibly multi-line.
  const block = findBlockMathMatches('$$\n\\int_0^1 x\\,dx\n$$')
  assert.equal(block.length, 1, 'one block math')
  assert.equal(block[0].inner, '\\int_0^1 x\\,dx', 'trimmed block tex')
}

// --- ==highlight== scanner (pure) -----------------------------------------
{
  assert.equal(findHighlightMatches('==hi==').length, 1, 'one highlight')
  assert.equal(findHighlightMatches('==hi there==')[0].inner, 'hi there', 'multi-word highlight')
  // Comparisons with spaces around "==" are not highlights.
  assert.equal(findHighlightMatches('if a == b == c then').length, 0, 'comparison not highlight')
  // Leading/trailing space inside rejects.
  assert.equal(findHighlightMatches('== padded ==').length, 0, 'padded rejected')
}

// Inline math off the active line becomes an inline math widget.
{
  const doc = 'energy $E=mc^2$ here\n\ntail'
  const state = stateFor(doc, doc.indexOf('tail'))
  const deco = computeLivePreview(state)
  const math = deco.widgets.find((w) => w.kind === 'math' && w.data.display !== '1')
  assert.ok(math, 'inline math widget present')
  assert.equal(math?.data.tex, 'E=mc^2', 'carries tex')
}

// Block math off the active line becomes a block math widget.
{
  const doc = 'intro\n\n$$\na^2+b^2=c^2\n$$\n\ntail'
  const state = stateFor(doc, doc.indexOf('tail'))
  const deco = computeLivePreview(state)
  const math = deco.widgets.find((w) => w.kind === 'math' && w.data.display === '1')
  assert.ok(math, 'block math widget present')
  assert.equal(math?.block, true, 'block flag set')
}

// Math is NOT detected inside a fenced code block.
{
  const doc = '```\n$x^2$ ==hi==\n```\n\ntail'
  const state = stateFor(doc, doc.indexOf('tail'))
  const deco = computeLivePreview(state)
  assert.equal(deco.widgets.filter((w) => w.kind === 'math').length, 0, 'no math inside code')
  assert.ok(!hasMark(deco.marks, 'cm-md-highlight'), 'no highlight inside code')
}

// ==highlight== off the active line: span marked, "==" fences hidden.
{
  const doc = 'see ==important== now\n\ntail'
  const state = stateFor(doc, doc.indexOf('tail'))
  const deco = computeLivePreview(state)
  assert.ok(hasMark(deco.marks, 'cm-md-highlight'), 'highlight mark')
  const open = doc.indexOf('==')
  assert.ok(hasHide(deco.hides, open, open + 2), 'hides opening ==')
}

// On the active line, the "==" fences are revealed (still marked).
{
  const doc = 'see ==important== now\n\ntail'
  const state = stateFor(doc, doc.indexOf('important'))
  const deco = computeLivePreview(state)
  const open = doc.indexOf('==')
  assert.ok(!hasHide(deco.hides, open, open + 2), 'opening == revealed on active line')
  assert.ok(hasMark(deco.marks, 'cm-md-highlight'), 'still marked while editing')
}

console.log('markdown-editor livePreviewModel unit tests passed')
