import assert from 'node:assert/strict'
import { EditorState } from '@codemirror/state'
import { ensureSyntaxTree } from '@codemirror/language'
import { createMarkdownLanguage } from './markdownLanguage'
import { isFoldableListLine, listFoldRange } from './listFold'

function stateFor(doc: string): EditorState {
  const state = EditorState.create({ doc, extensions: [createMarkdownLanguage()] })
  ensureSyntaxTree(state, state.doc.length, 10000)
  return state
}

// A single-line bullet item with no children is not foldable.
{
  const state = stateFor('- only one line\n')
  assert.equal(listFoldRange(state, 0), null)
}

// A bullet item with nested children folds from the end of its first line to
// the end of the last child line.
{
  const doc = '- parent\n  - child a\n  - child b\n'
  const state = stateFor(doc)
  const parentLine = state.doc.line(1)
  const range = listFoldRange(state, parentLine.from)
  assert.ok(range, 'parent item should be foldable')
  assert.equal(range!.from, parentLine.from + '- parent'.length)
  // Ends at the end of "  - child b".
  assert.equal(range!.to, state.doc.line(3).to)
}

// A nested child that itself has children is independently foldable.
{
  const doc = '- a\n  - b\n    - c\n    - d\n'
  const state = stateFor(doc)
  const childLine = state.doc.line(2) // "  - b"
  const range = listFoldRange(state, childLine.from)
  assert.ok(range, 'nested item with grandchildren should be foldable')
  assert.equal(range!.from, childLine.to)
  assert.equal(range!.to, state.doc.line(4).to)
}

// An ordered list item with a continuation/nested line is foldable.
{
  const doc = '1. first\n   continued line\n2. second\n'
  const state = stateFor(doc)
  const range = listFoldRange(state, 0)
  assert.ok(range, 'ordered item with continuation should be foldable')
  assert.equal(range!.to, state.doc.line(2).to)
}

// A plain paragraph (not a list) is never foldable.
{
  const state = stateFor('just a paragraph\nsecond line\n')
  assert.equal(listFoldRange(state, 0), null)
  assert.equal(isFoldableListLine(state, 0), false)
}

// A child line of a single-child item: the child itself is single-line → not foldable.
{
  const doc = '- parent\n  - leaf\n'
  const state = stateFor(doc)
  const leafLine = state.doc.line(2)
  assert.equal(listFoldRange(state, leafLine.from), null)
}

console.log('markdown-editor listFold unit tests passed')
