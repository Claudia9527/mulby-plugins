// Pure, DOM-free model for the Obsidian-style live preview. Given a CodeMirror
// EditorState (markdown language), it walks the syntax tree and produces a set
// of decoration descriptors: which markup markers to hide, which spans to style,
// which lines to class, and which ranges to replace with widgets (images, rules,
// task checkboxes).
//
// The "reveal on the active line" behavior — the hallmark of Obsidian's Live
// Preview — is implemented here: any construct whose lines intersect a selection
// range keeps its raw Markdown visible so it can be edited; everything else is
// rendered.
//
// Keeping this DOM-free (no EditorView) makes the tricky range math unit-testable
// in Node; the thin ViewPlugin in `livePreview.ts` only turns these descriptors
// into actual CodeMirror Decorations.

import { EditorState } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'

export interface HideRange {
  from: number
  to: number
}

export interface MarkRange {
  from: number
  to: number
  cls: string
}

export interface LineClass {
  /** A position inside the target line. */
  pos: number
  cls: string
}

export type WidgetKind = 'image' | 'hr' | 'checkbox' | 'bullet' | 'table' | 'math'

export interface WidgetRange {
  from: number
  to: number
  kind: WidgetKind
  data: Record<string, string>
  /** Block-level replacement (replaces whole lines), e.g. tables / display math. */
  block?: boolean
}

export interface LivePreviewDecorations {
  hides: HideRange[]
  marks: MarkRange[]
  lineClasses: LineClass[]
  widgets: WidgetRange[]
}

const HEADING_CLASS: Record<string, string> = {
  ATXHeading1: 'cm-md-h1',
  ATXHeading2: 'cm-md-h2',
  ATXHeading3: 'cm-md-h3',
  ATXHeading4: 'cm-md-h4',
  ATXHeading5: 'cm-md-h5',
  ATXHeading6: 'cm-md-h6',
  SetextHeading1: 'cm-md-h1',
  SetextHeading2: 'cm-md-h2'
}

/** Collects the set of line numbers intersected by any selection range. */
export function activeLineNumbers(state: EditorState): Set<number> {
  const lines = new Set<number>()
  for (const range of state.selection.ranges) {
    const startLine = state.doc.lineAt(range.from).number
    const endLine = state.doc.lineAt(range.to).number
    for (let line = startLine; line <= endLine; line += 1) {
      lines.add(line)
    }
  }
  return lines
}

/**
 * Walks the markdown syntax tree and returns decoration descriptors for the
 * live preview. Constructs whose lines are "active" (touched by a selection)
 * are left as raw source so they can be edited.
 */
export function computeLivePreview(state: EditorState): LivePreviewDecorations {
  const hides: HideRange[] = []
  const marks: MarkRange[] = []
  const lineClasses: LineClass[] = []
  const widgets: WidgetRange[] = []
  // Ranges already consumed by a rendered construct (code / table / image / hr /
  // math). Used to keep the regex-based $math$ / ==highlight== detection out of
  // code spans and out of blocks that are already replaced by a widget.
  const occupied: HideRange[] = []
  const active = activeLineNumbers(state)
  const doc = state.doc

  const isActive = (from: number, to: number): boolean => {
    const startLine = doc.lineAt(from).number
    const endLine = doc.lineAt(Math.min(to, doc.length)).number
    for (let line = startLine; line <= endLine; line += 1) {
      if (active.has(line)) {
        return true
      }
    }
    return false
  }

  const hideRange = (from: number, to: number) => {
    if (to > from) {
      hides.push({ from, to })
    }
  }

  const tree = syntaxTree(state)
  tree.iterate({
    enter: (node) => {
      const name = node.name

      // Headings: style the whole line, hide the leading "### " marker.
      const headingClass = HEADING_CLASS[name]
      if (headingClass) {
        lineClasses.push({ pos: node.from, cls: headingClass })
        return
      }

      if (name === 'HeaderMark') {
        if (!isActive(node.from, node.to)) {
          // Include the single trailing space after ATX "#"s when present.
          let end = node.to
          if (doc.sliceString(end, end + 1) === ' ') {
            end += 1
          }
          hideRange(node.from, end)
        }
        return
      }

      if (name === 'StrongEmphasis') {
        marks.push({ from: node.from, to: node.to, cls: 'cm-md-strong' })
        return
      }
      if (name === 'Emphasis') {
        marks.push({ from: node.from, to: node.to, cls: 'cm-md-em' })
        return
      }
      if (name === 'Strikethrough') {
        marks.push({ from: node.from, to: node.to, cls: 'cm-md-strike' })
        return
      }

      if (name === 'EmphasisMark' || name === 'StrikethroughMark') {
        if (!isActive(node.from, node.to)) {
          hideRange(node.from, node.to)
        }
        return
      }

      if (name === 'InlineCode') {
        marks.push({ from: node.from, to: node.to, cls: 'cm-md-code' })
        occupied.push({ from: node.from, to: node.to })
        return
      }

      // Inline code backticks: hide only when the mark belongs to InlineCode
      // (leave fenced-code fences alone so the block layout is preserved).
      if (name === 'CodeMark') {
        const parent = node.node.parent
        if (parent && parent.name === 'InlineCode' && !isActive(node.from, node.to)) {
          hideRange(node.from, node.to)
        }
        return
      }

      if (name === 'Link') {
        // Only render inline links ([label](url)); leave reference/bare links raw.
        const url = node.node.getChild('URL')
        if (url && !isActive(node.from, node.to)) {
          // Hide the leading "[" and the trailing "](url)" so only the label
          // shows; style the label as a link.    [label](url)
          const labelStart = findLabelEnd(state, node.from, node.to)
          if (labelStart >= 0) {
            hideRange(node.from, node.from + 1) // the "["
            hideRange(labelStart, node.to) // the "](url)" tail
            marks.push({ from: node.from + 1, to: labelStart, cls: 'cm-md-link' })
          }
        }
        return
      }

      if (name === 'Image') {
        if (!isActive(node.from, node.to)) {
          const inner = node.node
          const url = inner.getChild('URL')
          const urlText = url ? doc.sliceString(url.from, url.to) : ''
          const alt = extractImageAlt(doc.sliceString(node.from, node.to))
          widgets.push({
            from: node.from,
            to: node.to,
            kind: 'image',
            data: { url: urlText, alt }
          })
          occupied.push({ from: node.from, to: node.to })
        }
        return
      }

      if (name === 'HorizontalRule') {
        if (!isActive(node.from, node.to)) {
          widgets.push({ from: node.from, to: node.to, kind: 'hr', data: {} })
          occupied.push({ from: node.from, to: node.to })
        }
        return
      }

      if (name === 'Blockquote') {
        // Class every line of the quote (not just the first) so multi-line
        // blockquotes render with a continuous bar.
        const startLine = doc.lineAt(node.from).number
        const endLine = doc.lineAt(Math.min(node.to, doc.length)).number
        for (let n = startLine; n <= endLine; n += 1) {
          lineClasses.push({ pos: doc.line(n).from, cls: 'cm-md-quote' })
        }
        return
      }

      if (name === 'QuoteMark') {
        // Hide the ">" marker off the active line; the bar comes from the line class.
        if (!isActive(node.from, node.to)) {
          let end = node.to
          if (doc.sliceString(end, end + 1) === ' ') {
            end += 1
          }
          hideRange(node.from, end)
        }
        return
      }

      if (name === 'Table') {
        // Render a GFM table as a real table (block widget) when not editing it.
        if (!isActive(node.from, node.to)) {
          const from = doc.lineAt(node.from).from
          const to = doc.lineAt(Math.min(node.to, doc.length)).to
          widgets.push({ from, to, kind: 'table', data: { source: doc.sliceString(from, to) }, block: true })
          occupied.push({ from, to })
          return false // don't decorate inside the replaced block
        }
        return undefined
      }

      if (name === 'ListMark') {
        // Render bullet-list markers (-, *, +) as a • dot; leave ordered-list
        // numbers as-is. Skip when the line is being edited.
        const list = node.node.parent?.parent
        if (list && list.name === 'BulletList' && !isActive(node.from, node.to)) {
          widgets.push({ from: node.from, to: node.to, kind: 'bullet', data: {} })
        }
        return
      }

      if (name === 'FencedCode') {
        // Give every line of the block a class so it reads as a code block, plus
        // open/close classes on the fence lines for rounded-corner styling.
        const startLine = doc.lineAt(node.from).number
        const endLine = doc.lineAt(Math.min(node.to, doc.length)).number
        occupied.push({ from: node.from, to: Math.min(node.to, doc.length) })
        for (let n = startLine; n <= endLine; n += 1) {
          const line = doc.line(n)
          lineClasses.push({ pos: line.from, cls: 'cm-md-codeblock' })
          if (n === startLine) {
            lineClasses.push({ pos: line.from, cls: 'cm-md-codeblock-open' })
          }
          if (n === endLine) {
            lineClasses.push({ pos: line.from, cls: 'cm-md-codeblock-close' })
          }
        }
        return
      }

      if (name === 'Task') {
        // GFM task item: render the "[ ]"/"[x]" marker as a checkbox.
        const inner = node.node
        const marker = inner.getChild('TaskMarker')
        if (marker && !isActive(marker.from, marker.to)) {
          const checked = doc.sliceString(marker.from, marker.to).toLowerCase().includes('x')
          widgets.push({
            from: marker.from,
            to: marker.to,
            kind: 'checkbox',
            data: { checked: checked ? '1' : '' }
          })
        }
        return
      }
    }
  })

  // Constructs the markdown grammar (GFM) doesn't model — TeX math ($…$, $$…$$)
  // and ==highlight== — are detected with a text scan over the regions not
  // already consumed by code / tables / images / rules. Block math is detected
  // first so inline math doesn't match the inner "$".
  const text = doc.toString()

  for (const m of findBlockMathMatches(text)) {
    if (rangesOverlap(m.start, m.end, occupied) || isActive(m.start, m.end)) {
      continue
    }
    const startLine = doc.lineAt(m.start)
    const endLine = doc.lineAt(Math.min(m.end, doc.length))
    const leadOnly = startLine.text.slice(0, m.start - startLine.from).trim() === ''
    const trailOnly = endLine.text.slice(m.end - endLine.from).trim() === ''
    if (leadOnly && trailOnly) {
      widgets.push({
        from: startLine.from,
        to: endLine.to,
        kind: 'math',
        data: { tex: m.inner, display: '1' },
        block: true
      })
      occupied.push({ from: startLine.from, to: endLine.to })
    } else {
      widgets.push({ from: m.start, to: m.end, kind: 'math', data: { tex: m.inner, display: '1' } })
      occupied.push({ from: m.start, to: m.end })
    }
  }

  for (const m of findInlineMathMatches(text)) {
    if (rangesOverlap(m.start, m.end, occupied) || isActive(m.start, m.end)) {
      continue
    }
    widgets.push({ from: m.start, to: m.end, kind: 'math', data: { tex: m.inner, display: '' } })
    occupied.push({ from: m.start, to: m.end })
  }

  for (const m of findHighlightMatches(text)) {
    if (rangesOverlap(m.start, m.end, occupied)) {
      continue
    }
    // Always style the highlighted span; only hide the "==" fences off the
    // active line so the marker can be edited where the cursor sits.
    marks.push({ from: m.start, to: m.end, cls: 'cm-md-highlight' })
    if (!isActive(m.start, m.end)) {
      hideRange(m.start, m.start + 2)
      hideRange(m.end - 2, m.end)
    }
    occupied.push({ from: m.start, to: m.end })
  }

  return { hides, marks, lineClasses, widgets }
}

/** True when [from, to) intersects any of the given ranges. */
function rangesOverlap(from: number, to: number, ranges: HideRange[]): boolean {
  for (const r of ranges) {
    if (from < r.to && r.from < to) {
      return true
    }
  }
  return false
}

export interface RawMatch {
  start: number
  end: number
  /** The inner payload (math TeX / highlighted text), already trimmed for math. */
  inner: string
}

/**
 * Finds `==highlight==` spans on a single line. The inner text must be padded by
 * non-space (so `== a ==` and stray "a == b" comparisons don't match) and may not
 * contain "=".
 */
export function findHighlightMatches(text: string): RawMatch[] {
  const out: RawMatch[] = []
  const re = /==([^\n=]+?)==/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const inner = m[1]
    if (inner.length > 0 && inner.trim() === inner) {
      out.push({ start: m.index, end: m.index + m[0].length, inner })
    }
  }
  return out
}

/** Finds display math `$$…$$`, which may span multiple lines. */
export function findBlockMathMatches(text: string): RawMatch[] {
  const out: RawMatch[] = []
  const re = /\$\$([\s\S]+?)\$\$/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const inner = m[1].trim()
    if (inner.length > 0) {
      out.push({ start: m.index, end: m.index + m[0].length, inner })
    }
  }
  return out
}

/**
 * Finds inline math `$…$` on a single line. The inner expression must be padded
 * by non-space, and a currency guard skips "$5 … $10" style text (a digit right
 * after the closing "$", or an alphanumeric right before the opening "$").
 */
export function findInlineMathMatches(text: string): RawMatch[] {
  const out: RawMatch[] = []
  const re = /\$([^\n$]+?)\$/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const inner = m[1]
    const start = m.index
    const end = start + m[0].length
    if (inner.length === 0 || inner.trim() !== inner) {
      continue
    }
    const before = start > 0 ? text[start - 1] : ''
    const after = end < text.length ? text[end] : ''
    if (/\d/.test(after) || /[A-Za-z0-9]/.test(before)) {
      continue
    }
    out.push({ start, end, inner })
  }
  return out
}

/**
 * Finds the absolute offset of a link label's closing "]" within a Link node —
 * i.e. the start of the "](url)" tail that should be hidden. Returns -1 when not
 * found.
 */
function findLabelEnd(state: EditorState, from: number, to: number): number {
  const text = state.doc.sliceString(from, to)
  // Find the "](" sequence that separates label from destination.
  const idx = text.indexOf('](')
  if (idx < 0) {
    return -1
  }
  return from + idx // absolute position of "]"
}

/** Extracts the alt text from an image's raw `![alt](url)` source. */
export function extractImageAlt(source: string): string {
  const match = /^!\[([^\]]*)\]/.exec(source)
  return match ? match[1] : ''
}
