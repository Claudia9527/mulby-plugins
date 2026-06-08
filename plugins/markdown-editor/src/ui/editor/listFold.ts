// List folding for the live-preview editor. Computes the range to collapse when
// a list item with nested children/continuation lines is folded, and exposes a
// CodeMirror `foldService` so the fold keymap (and any gutter) can use it too.
//
// Folding is display-only: the document is never modified, so the syntax tree is
// always intact and the same range computation works whether the item is
// currently folded or not.

import { foldService, syntaxTree } from '@codemirror/language'
import type { EditorState } from '@codemirror/state'
import type { SyntaxNode } from '@lezer/common'

export interface FoldRange {
  from: number
  to: number
}

/**
 * Returns the fold range for a list item that *begins* on the line containing
 * `lineStartPos`: everything after the item's first line (its nested children /
 * lazy-continuation lines) up to the end of the item's last non-blank line.
 *
 * Returns null when the line is not the first line of a multi-line list item
 * (so single-line items, and the inner lines of an item, are not foldable here).
 */
export function listFoldRange(state: EditorState, lineStartPos: number): FoldRange | null {
  const line = state.doc.lineAt(lineStartPos)
  const trimmed = line.text.trimStart()
  if (!trimmed) {
    return null
  }
  // Resolve at the marker (first non-blank column) so leading indentation of a
  // nested item doesn't resolve to the parent list instead of the ListItem.
  const textStart = line.from + (line.text.length - trimmed.length)
  const tree = syntaxTree(state)
  let item: SyntaxNode | null = null
  for (let node: SyntaxNode | null = tree.resolveInner(textStart, 1); node; node = node.parent) {
    if (node.name === 'ListItem' && state.doc.lineAt(node.from).number === line.number) {
      item = node
      break
    }
  }
  if (!item) {
    return null
  }
  // Trim trailing blank lines so the fold ends on real content (a blank line
  // often terminates the lezer ListItem range).
  let endLineNo = state.doc.lineAt(Math.min(item.to, state.doc.length)).number
  while (endLineNo > line.number && state.doc.line(endLineNo).text.trim() === '') {
    endLineNo -= 1
  }
  if (endLineNo <= line.number) {
    return null
  }
  return { from: line.to, to: state.doc.line(endLineNo).to }
}

/** True when a list item begins on this line and has foldable nested content. */
export function isFoldableListLine(state: EditorState, lineStartPos: number): boolean {
  return listFoldRange(state, lineStartPos) !== null
}

// Register the range computation as a fold service so the standard fold keymap
// (Ctrl/Cmd+Shift+[ etc.) folds list items as well.
export const listFoldService = foldService.of((state, lineStart) => listFoldRange(state, lineStart))
