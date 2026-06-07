// CodeMirror 6 view layer for the Obsidian-style live preview. It turns the
// pure descriptors from `livePreviewModel` into CodeMirror Decorations:
//   - hidden marker ranges  -> replace decorations (collapsed)
//   - styled spans          -> mark decorations (bold/italic/code/link…)
//   - block lines           -> line decorations (heading/quote sizing)
//   - images / rules / tasks-> widget decorations
// The set is rebuilt on every doc/selection/viewport change, which is what makes
// the raw Markdown reveal itself on the active line.

import { EditorSelection, Facet, StateField, type EditorState, type Extension, type Range } from '@codemirror/state'
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType
} from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'
import type { SyntaxNode } from '@lezer/common'
import katex from 'katex'
import {
  computeLivePreview,
  headingSlug,
  parseDefinitionList,
  slugify,
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

/** Coerces an HTML size attribute ("120" / "50%") into a CSS length. */
function toCssSize(value: string): string {
  return /^\d+$/.test(value) ? `${value}px` : value
}

class ImageWidget extends WidgetType {
  constructor(
    private readonly url: string,
    private readonly alt: string,
    private readonly resolve: (href: string) => string,
    private readonly width = '',
    private readonly height = '',
    // Standalone-image lines render as block widgets, which must be block-level
    // elements (a <div>); inline images embedded in text stay as a <span>.
    private readonly block = false
  ) {
    super()
  }
  eq(other: ImageWidget) {
    return (
      other.url === this.url &&
      other.alt === this.alt &&
      other.width === this.width &&
      other.height === this.height &&
      other.block === this.block
    )
  }
  toDOM() {
    const wrap = document.createElement(this.block ? 'div' : 'span')
    wrap.className = this.block ? 'cm-md-image-wrap cm-md-image-block' : 'cm-md-image-wrap'
    const img = document.createElement('img')
    img.className = 'cm-md-image'
    img.src = this.resolve(this.url)
    img.alt = this.alt
    img.title = this.alt
    img.loading = 'lazy'
    // Explicit HTML sizing (<img width=… height=…>) wins over the CSS cap.
    if (this.width) {
      img.style.width = toCssSize(this.width)
    }
    if (this.height) {
      img.style.height = toCssSize(this.height)
      img.style.maxHeight = 'none'
    }
    wrap.appendChild(img)
    return wrap
  }
  ignoreEvent() {
    // Let clicks fall through to CodeMirror so the caret lands here and the
    // source reveals for editing (default WidgetType.ignoreEvent is `true`,
    // which silently swallows clicks on the widget).
    return false
  }
}

class DefinitionListWidget extends WidgetType {
  constructor(private readonly source: string) {
    super()
  }
  eq(other: DefinitionListWidget) {
    return other.source === this.source
  }
  toDOM() {
    // Built from text content only (never innerHTML) so embedded markup can't
    // inject anything.
    const dl = document.createElement('dl')
    dl.className = 'cm-md-dl'
    for (const item of parseDefinitionList(this.source)) {
      const el = document.createElement(item.term ? 'dt' : 'dd')
      el.textContent = item.text
      dl.appendChild(el)
    }
    return dl
  }
  ignoreEvent() {
    return false
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
  ignoreEvent() {
    // Allow clicks to position the caret in the table source (reveals it for
    // editing); otherwise a rendered table swallows all clicks.
    return false
  }
}

// Lazily load mermaid — it's a large dependency, so it's code-split into its own
// chunk and only fetched the first time a ```mermaid block actually renders.
let mermaidLoader: Promise<(typeof import('mermaid'))['default']> | null = null
let mermaidSeq = 0
function loadMermaid() {
  if (!mermaidLoader) {
    mermaidLoader = import('mermaid').then((mod) => mod.default)
  }
  return mermaidLoader
}

class MermaidWidget extends WidgetType {
  private readonly dark: boolean
  constructor(private readonly code: string) {
    super()
    // Capture the theme so a theme change (which re-runs the live preview)
    // produces a non-equal widget and re-renders the diagram with the new theme.
    this.dark = document.documentElement.classList.contains('dark')
  }
  eq(other: MermaidWidget) {
    return other.code === this.code && other.dark === this.dark
  }
  toDOM() {
    const wrap = document.createElement('div')
    wrap.className = 'cm-md-mermaid'
    const { code, dark } = this
    loadMermaid()
      .then((mermaid) => {
        mermaid.initialize({ startOnLoad: false, theme: dark ? 'dark' : 'default', securityLevel: 'strict' })
        return mermaid.render(`cm-mermaid-${(mermaidSeq += 1)}`, code)
      })
      .then(({ svg }) => {
        wrap.innerHTML = svg
      })
      .catch(() => {
        // Invalid diagram: fall back to the raw source so nothing is lost.
        wrap.classList.add('cm-md-mermaid-error')
        const pre = document.createElement('pre')
        pre.textContent = code
        wrap.replaceChildren(pre)
      })
    return wrap
  }
  ignoreEvent() {
    return false
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
  ignoreEvent() {
    // Let clicks position the caret so the math source reveals for editing.
    return false
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
  ignoreEvent() {
    // Let clicks position the caret so the list marker reveals for editing.
    return false
  }
}

class EmojiWidget extends WidgetType {
  constructor(private readonly emoji: string) {
    super()
  }
  eq(other: EmojiWidget) {
    return other.emoji === this.emoji
  }
  toDOM() {
    const span = document.createElement('span')
    span.className = 'cm-md-emoji'
    span.textContent = this.emoji
    return span
  }
  ignoreEvent() {
    // Let clicks position the caret so the :shortcode: reveals for editing.
    return false
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
  const resolve = state.facet(imageUrlResolver)
  const ranges: Range<Decoration>[] = []
  for (const widget of model.widgets) {
    if (widget.to <= widget.from || !widgetIsBlock(state, widget)) {
      continue
    }
    if (widget.kind === 'image') {
      const img = new ImageWidget(
        widget.data.url ?? '',
        widget.data.alt ?? '',
        resolve,
        widget.data.width ?? '',
        widget.data.height ?? '',
        true
      )
      if (widget.reveal) {
        // The line is being edited: keep its raw source visible and draw the
        // image as a block *below* it (insert, not replace) so the image never
        // disappears and the layout barely shifts.
        ranges.push(Decoration.widget({ widget: img, block: true, side: 1 }).range(widget.to))
      } else {
        // Idle: the image block stands in for the whole source line.
        ranges.push(Decoration.replace({ widget: img, block: true }).range(widget.from, widget.to))
      }
    } else if (widget.kind === 'table') {
      ranges.push(
        Decoration.replace({ widget: new TableWidget(widget.data.source ?? ''), block: true }).range(
          widget.from,
          widget.to
        )
      )
    } else if (widget.kind === 'dl') {
      ranges.push(
        Decoration.replace({ widget: new DefinitionListWidget(widget.data.source ?? ''), block: true }).range(
          widget.from,
          widget.to
        )
      )
    } else if (widget.kind === 'mermaid') {
      ranges.push(
        Decoration.replace({ widget: new MermaidWidget(widget.data.code ?? ''), block: true }).range(
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
      // `attributes` (e.g. a sanitized inline `style`) is applied via
      // setAttribute by CodeMirror — never innerHTML — so it can't inject markup.
      ranges.push(
        Decoration.mark(
          mark.attrs ? { class: mark.cls, attributes: mark.attrs } : { class: mark.cls }
        ).range(mark.from, mark.to)
      )
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
          widget: new ImageWidget(
            widget.data.url ?? '',
            widget.data.alt ?? '',
            resolve,
            widget.data.width ?? '',
            widget.data.height ?? ''
          )
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
    } else if (widget.kind === 'emoji') {
      ranges.push(
        Decoration.replace({ widget: new EmojiWidget(widget.data.emoji ?? '') }).range(widget.from, widget.to)
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

/**
 * Returns the nearest navigable ancestor of a DOM event target — a rendered link
 * (`.cm-md-link`, incl. autolinks) or a footnote reference (`.cm-md-footnote-ref`).
 * Both share the "single click acts, double click edits" interaction.
 */
function closestNavigable(target: EventTarget | null): HTMLElement | null {
  // A mouse event's target can be a text node; climb to its parent element first.
  let el: Element | null = target instanceof Element ? target : null
  if (!el && target instanceof Node && target.parentElement) {
    el = target.parentElement
  }
  return el ? (el.closest('.cm-md-link, .cm-md-footnote-ref') as HTMLElement | null) : null
}

/** Extracts the URL of the Link/Image node containing `pos`, if any. */
function linkUrlAt(state: EditorState, pos: number): string | null {
  let node: SyntaxNode | null = syntaxTree(state).resolveInner(pos, 1)
  while (node) {
    if (node.name === 'Link' || node.name === 'Image') {
      const url = node.getChild('URL')
      return url ? state.doc.sliceString(url.from, url.to) : null
    }
    node = node.parent
  }
  return null
}

/**
 * Resolves the URL to open for a clicked link element: prefers the markdown
 * Link's destination, falling back to the element's text for autolinks
 * (`<https://…>` / `<a@b.com>`), where the visible text *is* the address.
 */
function resolveOpenUrl(state: EditorState, pos: number, linkEl: HTMLElement): string | null {
  const fromTree = linkUrlAt(state, pos)
  if (fromTree) {
    return fromTree
  }
  const text = (linkEl.textContent ?? '').trim()
  if (/^(https?|ftp|mailto):/i.test(text)) {
    return text
  }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
    return `mailto:${text}`
  }
  return null
}

/** Opens a URL in the system browser via the Mulby host, falling back to window.open. */
function openExternalUrl(url: string): void {
  const shell = (window as unknown as { mulby?: { shell?: { openExternal?: (u: string) => unknown } } })
    .mulby?.shell
  if (shell?.openExternal) {
    void shell.openExternal(url)
  } else {
    window.open(url, '_blank', 'noopener')
  }
}

/** Scrolls a matching ATX heading into view for an in-document `#anchor` link. */
function jumpToHeading(view: EditorView, fragment: string): void {
  let decoded = fragment
  try {
    decoded = decodeURIComponent(fragment)
  } catch {
    // Malformed %-escape: fall back to the raw fragment.
  }
  const target = slugify(decoded)
  if (!target) {
    return
  }
  const doc = view.state.doc
  for (let n = 1; n <= doc.lines; n += 1) {
    const line = doc.line(n)
    if (headingSlug(line.text) === target) {
      view.dispatch({ effects: EditorView.scrollIntoView(line.from, { y: 'start' }) })
      return
    }
  }
}

/** Scrolls the matching `[^id]: …` definition into view for a footnote reference. */
function jumpToFootnoteDefinition(view: EditorView, id: string): void {
  const needle = `[^${id}]:`
  const doc = view.state.doc
  for (let n = 1; n <= doc.lines; n += 1) {
    const line = doc.line(n)
    if (line.text.trimStart().startsWith(needle)) {
      view.dispatch({ effects: EditorView.scrollIntoView(line.from, { y: 'start' }) })
      return
    }
  }
}

/**
 * Resolves what a single click on a navigable element should *do*: open external
 * links in the browser, jump to a heading for `#anchor` links, or jump to the
 * definition for a footnote reference. Returns null when there's nothing to do.
 */
function navigableAction(view: EditorView, el: HTMLElement): (() => void) | null {
  if (el.classList.contains('cm-md-footnote-ref')) {
    const id = (el.textContent ?? '').trim()
    return id ? () => jumpToFootnoteDefinition(view, id) : null
  }
  const url = resolveOpenUrl(view.state, view.posAtDOM(el), el)
  if (!url) {
    return null
  }
  if (url.startsWith('#')) {
    return () => jumpToHeading(view, url.slice(1))
  }
  return () => openExternalUrl(url)
}

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

/**
 * Places the caret inside a clicked navigable element (link / footnote ref) so
 * its raw Markdown reveals for editing (the double-click "edit" gesture).
 * Resolves the position from the DOM node (`posAtDOM`) rather than the click
 * coordinates (`posAtCoords`): on a tall line the link underline pulls the
 * pointer into the inter-line gap and a coordinate hit-test resolves to a
 * neighboring line — the root cause of "it won't switch to edit mode unless I
 * click slightly higher".
 */
function revealSource(view: EditorView, el: HTMLElement): void {
  const pos = view.posAtDOM(el)
  view.dispatch({ selection: EditorSelection.cursor(pos), scrollIntoView: true })
  view.focus()
}

export function livePreviewExtension(): Extension {
  // Obsidian-style interaction for links & footnote refs: a single click acts
  // (open external link / jump to an #anchor heading / jump to a footnote def),
  // a double click edits the source. A single click can't act immediately — it
  // must wait to see whether a second click turns it into a double click — so it
  // *schedules* the action and the next press / click / dblclick cancels it.
  //
  // The cancel must happen on the second *mousedown* (the earliest signal a
  // double click is underway), not the second click *release*: the gap between
  // the two releases routinely exceeds a short timer, which let the open fire
  // before a double-click could cancel it. The delay is also generous enough to
  // outlast a normal double-click so a double click only ever edits the source.
  const DOUBLE_CLICK_MS = 450
  let pendingAction: ReturnType<typeof setTimeout> | null = null
  const cancelPendingAction = () => {
    if (pendingAction !== null) {
      clearTimeout(pendingAction)
      pendingAction = null
    }
  }

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
          // A click on a rendered link / footnote ref must NOT let CodeMirror move
          // the caret — that would reveal the source and fight the act/edit
          // gestures decided in the click / dblclick handlers. Cmd/Ctrl+click acts
          // immediately (open / jump).
          const el = closestNavigable(event.target)
          if (el) {
            if (event.metaKey || event.ctrlKey) {
              const act = navigableAction(view, el)
              if (act) {
                cancelPendingAction()
                act()
              }
              event.preventDefault()
              return true
            }
            // The second press of a double click is the earliest reliable signal
            // the user is double-clicking to edit — cancel the scheduled
            // single-click open here, before its timer can fire.
            if (event.detail >= 2) {
              cancelPendingAction()
            }
            event.preventDefault()
            return true
          }
          return false
        },
        click: (event, view) => {
          const el = closestNavigable(event.target)
          if (!el) {
            return false
          }
          // Cmd/Ctrl+click already acted on mousedown.
          if (event.metaKey || event.ctrlKey) {
            event.preventDefault()
            return true
          }
          // Any click beyond the first belongs to a (potential) double-click:
          // cancel the pending single-click action (the second mousedown usually
          // cancelled it already) and let dblclick reveal the source.
          if (event.detail > 1) {
            cancelPendingAction()
            event.preventDefault()
            return true
          }
          // First click -> act, but only after a delay so a following press /
          // dblclick can cancel it and edit the source instead.
          cancelPendingAction()
          const act = navigableAction(view, el)
          if (act) {
            pendingAction = setTimeout(() => {
              pendingAction = null
              act()
            }, DOUBLE_CLICK_MS)
          }
          event.preventDefault()
          return true
        },
        dblclick: (event, view) => {
          const el = closestNavigable(event.target)
          if (!el) {
            return false
          }
          cancelPendingAction()
          revealSource(view, el)
          event.preventDefault()
          return true
        }
      }
    }
  )
  // Block decorations from a field + inline/line decorations from the plugin.
  return [blockDecorationField, plugin]
}
