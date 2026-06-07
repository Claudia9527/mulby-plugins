// CodeMirror 6 view layer for the Obsidian-style live preview. It turns the
// pure descriptors from `livePreviewModel` into CodeMirror Decorations:
//   - hidden marker ranges  -> replace decorations (collapsed)
//   - styled spans          -> mark decorations (bold/italic/code/link…)
//   - block lines           -> line decorations (heading/quote sizing)
//   - images / rules / tasks-> widget decorations
// The set is rebuilt on every doc/selection/viewport change, which is what makes
// the raw Markdown reveal itself on the active line.

import { Facet, StateField, type EditorState, type Extension, type Range } from '@codemirror/state'
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType
} from '@codemirror/view'
import katex from 'katex'
import {
  computeLivePreview,
  type HideRange,
  type LivePreviewDecorations,
  type WidgetRange
} from './livePreviewModel'
import { renderMarkdownDocument } from '../services/markdownHtml'

/** Resolves a Markdown image href into a URL the <img> can actually load. */
export const imageUrlResolver = Facet.define<(href: string) => string, (href: string) => string>({
  combine: (values) => (values.length > 0 ? values[0] : (href: string) => href)
})

class HrWidget extends WidgetType {
  eq() {
    return true
  }
  toDOM() {
    const hr = document.createElement('hr')
    hr.className = 'cm-md-hr'
    return hr
  }
  ignoreEvent() {
    return false
  }
}

class ImageWidget extends WidgetType {
  constructor(
    private readonly url: string,
    private readonly alt: string,
    private readonly resolve: (href: string) => string
  ) {
    super()
  }
  eq(other: ImageWidget) {
    return other.url === this.url && other.alt === this.alt
  }
  toDOM() {
    const wrap = document.createElement('span')
    wrap.className = 'cm-md-image-wrap'
    const img = document.createElement('img')
    img.className = 'cm-md-image'
    img.src = this.resolve(this.url)
    img.alt = this.alt
    img.title = this.alt
    img.loading = 'lazy'
    wrap.appendChild(img)
    return wrap
  }
}

class TableWidget extends WidgetType {
  constructor(private readonly source: string) {
    super()
  }
  eq(other: TableWidget) {
    return other.source === this.source
  }
  toDOM() {
    const wrap = document.createElement('div')
    wrap.className = 'cm-md-table'
    wrap.innerHTML = renderMarkdownDocument(this.source)
    return wrap
  }
}

class MathWidget extends WidgetType {
  constructor(
    private readonly tex: string,
    private readonly display: boolean
  ) {
    super()
  }
  eq(other: MathWidget) {
    return other.tex === this.tex && other.display === this.display
  }
  toDOM() {
    const el = document.createElement(this.display ? 'div' : 'span')
    el.className = this.display ? 'cm-md-math cm-md-math-block' : 'cm-md-math cm-md-math-inline'
    try {
      el.innerHTML = katex.renderToString(this.tex, {
        displayMode: this.display,
        throwOnError: false,
        output: 'html'
      })
    } catch {
      // KaTeX should not throw (throwOnError:false), but stay defensive: fall
      // back to the raw source so the user never loses content.
      el.textContent = this.display ? `$$${this.tex}$$` : `$${this.tex}$`
    }
    return el
  }
}

class BulletWidget extends WidgetType {
  eq() {
    return true
  }
  toDOM() {
    const dot = document.createElement('span')
    dot.className = 'cm-md-bullet'
    dot.textContent = '•'
    return dot
  }
}

class CheckboxWidget extends WidgetType {
  constructor(private readonly checked: boolean) {
    super()
  }
  eq(other: CheckboxWidget) {
    return other.checked === this.checked
  }
  toDOM() {
    const box = document.createElement('input')
    box.type = 'checkbox'
    box.className = 'cm-md-checkbox'
    box.checked = this.checked
    return box
  }
  ignoreEvent() {
    return false
  }
}

/**
 * A widget must be provided as a *block* decoration (and therefore from a
 * StateField, not a ViewPlugin) when it is flagged block-level or when its range
 * crosses a line boundary — CodeMirror forbids both of those from plugins
 * ("Block decorations may not be specified via plugins").
 */
function widgetIsBlock(state: EditorState, widget: WidgetRange): boolean {
  if (widget.block === true) {
    return true
  }
  const startLine = state.doc.lineAt(widget.from).number
  const endLine = state.doc.lineAt(Math.min(widget.to, state.doc.length)).number
  return startLine !== endLine
}

/** Ranges covered by block widgets, so inline decorations inside them are skipped. */
function blockWidgetRanges(state: EditorState, model: LivePreviewDecorations): HideRange[] {
  const out: HideRange[] = []
  for (const widget of model.widgets) {
    if (widget.to > widget.from && widgetIsBlock(state, widget)) {
      out.push({ from: widget.from, to: widget.to })
    }
  }
  return out
}

function posWithin(pos: number, ranges: HideRange[]): boolean {
  for (const r of ranges) {
    if (pos >= r.from && pos < r.to) {
      return true
    }
  }
  return false
}

function rangeOverlaps(from: number, to: number, ranges: HideRange[]): boolean {
  for (const r of ranges) {
    if (from < r.to && r.from < to) {
      return true
    }
  }
  return false
}

/**
 * Block-level decorations (tables, display/multi-line math). These affect block
 * layout, so CodeMirror requires them to come from a StateField rather than the
 * ViewPlugin. Tables and block math are the only block widgets the model emits.
 */
function buildBlockDecorations(state: EditorState): DecorationSet {
  const model = computeLivePreview(state)
  const ranges: Range<Decoration>[] = []
  for (const widget of model.widgets) {
    if (widget.to <= widget.from || !widgetIsBlock(state, widget)) {
      continue
    }
    if (widget.kind === 'table') {
      ranges.push(
        Decoration.replace({ widget: new TableWidget(widget.data.source ?? ''), block: true }).range(
          widget.from,
          widget.to
        )
      )
    } else if (widget.kind === 'math') {
      // `block: true` is only valid over whole lines (the model sets it for
      // standalone $$…$$). Mid-line math that merely crosses a line break is a
      // line-spanning inline replace — allowed from a field, but not as a block.
      ranges.push(
        Decoration.replace({
          widget: new MathWidget(widget.data.tex ?? '', widget.data.display === '1'),
          block: widget.block === true
        }).range(widget.from, widget.to)
      )
    }
  }
  return Decoration.set(ranges, true)
}

/**
 * Inline + line decorations (headings, marks, hidden markers, images, rules,
 * bullets, checkboxes, inline math). These are safe to provide from a ViewPlugin.
 * Anything that falls inside a block widget's range is skipped so the two
 * decoration sources never fight over the same span.
 */
function buildInlineDecorations(view: EditorView): DecorationSet {
  const state = view.state
  const model = computeLivePreview(state)
  const resolve = state.facet(imageUrlResolver)
  const blocks = blockWidgetRanges(state, model)
  const ranges: Range<Decoration>[] = []

  for (const line of model.lineClasses) {
    const lineStart = state.doc.lineAt(line.pos).from
    if (posWithin(lineStart, blocks)) {
      continue
    }
    ranges.push(Decoration.line({ class: line.cls }).range(lineStart))
  }
  for (const mark of model.marks) {
    if (mark.to > mark.from && !rangeOverlaps(mark.from, mark.to, blocks)) {
      ranges.push(Decoration.mark({ class: mark.cls }).range(mark.from, mark.to))
    }
  }
  for (const hide of model.hides) {
    if (hide.to > hide.from && !rangeOverlaps(hide.from, hide.to, blocks)) {
      ranges.push(Decoration.replace({}).range(hide.from, hide.to))
    }
  }
  for (const widget of model.widgets) {
    if (widget.to <= widget.from || widgetIsBlock(state, widget)) {
      continue
    }
    if (widget.kind === 'image') {
      ranges.push(
        Decoration.replace({
          widget: new ImageWidget(widget.data.url ?? '', widget.data.alt ?? '', resolve)
        }).range(widget.from, widget.to)
      )
    } else if (widget.kind === 'hr') {
      ranges.push(Decoration.replace({ widget: new HrWidget() }).range(widget.from, widget.to))
    } else if (widget.kind === 'bullet') {
      ranges.push(Decoration.replace({ widget: new BulletWidget() }).range(widget.from, widget.to))
    } else if (widget.kind === 'math') {
      ranges.push(
        Decoration.replace({ widget: new MathWidget(widget.data.tex ?? '', widget.data.display === '1') }).range(
          widget.from,
          widget.to
        )
      )
    } else if (widget.kind === 'checkbox') {
      ranges.push(
        Decoration.replace({ widget: new CheckboxWidget(widget.data.checked === '1') }).range(
          widget.from,
          widget.to
        )
      )
    }
  }

  // Decoration.set sorts by (from, startSide) for us — doing it manually is
  // brittle because line/mark/replace decorations have different internal sides.
  return Decoration.set(ranges, true)
}

/**
 * State field that carries the block-level decorations. Block decorations must be
 * provided through `EditorView.decorations.from(field)` (not a ViewPlugin).
 * Recomputed on doc/selection change so blocks reveal their source on the active
 * line; widgets implement `eq()` so unchanged blocks are reused (keeps IME safe).
 */
const blockDecorationField = StateField.define<DecorationSet>({
  create(state) {
    return buildBlockDecorations(state)
  },
  update(value, tr) {
    if (tr.docChanged || tr.selection) {
      return buildBlockDecorations(tr.state)
    }
    return value
  },
  provide: (field) => EditorView.decorations.from(field)
})

/** Toggles a GFM task checkbox in the source when its widget is clicked. */
function toggleTaskAt(view: EditorView, pos: number): boolean {
  const line = view.state.doc.lineAt(pos)
  const match = /^(\s*(?:[-*+]|\d+[.)])\s+\[)([ xX])(\])/.exec(line.text)
  if (!match) {
    return false
  }
  const markerPos = line.from + match[1].length
  const next = match[2] === ' ' ? 'x' : ' '
  view.dispatch({ changes: { from: markerPos, to: markerPos + 1, insert: next } })
  return true
}

export function livePreviewExtension(): Extension {
  const plugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet
      constructor(view: EditorView) {
        this.decorations = buildInlineDecorations(view)
      }
      update(update: ViewUpdate) {
        // Never rebuild decorations mid-IME-composition: replacing/collapsing
        // ranges interrupts composition (e.g. Chinese input). Just map the
        // existing set through the change so positions stay valid; a full
        // rebuild happens on the next non-composing update.
        if (update.view.composing) {
          if (update.docChanged) {
            this.decorations = this.decorations.map(update.changes)
          }
          return
        }
        if (update.docChanged || update.selectionSet || update.viewportChanged) {
          this.decorations = buildInlineDecorations(update.view)
        }
      }
    },
    {
      decorations: (value) => value.decorations,
      eventHandlers: {
        mousedown: (event, view) => {
          const target = event.target as HTMLElement
          if (target && target.classList.contains('cm-md-checkbox')) {
            const pos = view.posAtDOM(target)
            if (toggleTaskAt(view, pos)) {
              event.preventDefault()
              return true
            }
          }
          return false
        }
      }
    }
  )
  // Block decorations from a field + inline/line decorations from the plugin.
  return [blockDecorationField, plugin]
}
