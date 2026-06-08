// Copilot-style inline AI completion (ghost text) for CodeMirror 6.
//
// A StateField holds the current suggestion; it renders as a dimmed widget at
// the caret. Tab accepts it, Escape dismisses it. A ViewPlugin debounces typing
// and requests a completion through an injected fetcher (so this stays decoupled
// from the AI service and unit-testable). IME composition is respected — nothing
// triggers or rebuilds while composing.

import { Prec, StateEffect, StateField, type Extension } from '@codemirror/state'
import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
  keymap,
  type ViewUpdate
} from '@codemirror/view'

export interface InlineCompletionConfig {
  /** Whether completion is currently enabled (read live on each trigger). */
  getEnabled: () => boolean
  /** Fetches a completion for the caret context; resolve '' for none. */
  fetch: (prefix: string, suffix: string, signal: AbortSignal) => Promise<string>
  /** Idle delay before requesting (ms). */
  delayMs?: number
}

interface Suggestion {
  text: string
  pos: number
}

const setSuggestion = StateEffect.define<Suggestion | null>()

class GhostWidget extends WidgetType {
  constructor(readonly text: string) {
    super()
  }
  eq(other: GhostWidget) {
    return other.text === this.text
  }
  toDOM() {
    const span = document.createElement('span')
    span.className = 'cm-ghost-text'
    // textContent (never innerHTML) — the suggestion is plain text; pointer
    // events are disabled in CSS so clicks fall through to the editor.
    span.textContent = this.text
    return span
  }
}

const suggestionField = StateField.define<Suggestion | null>({
  create() {
    return null
  },
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setSuggestion)) {
        return effect.value
      }
    }
    // Any edit or caret move invalidates a showing suggestion.
    if (tr.docChanged || tr.selection) {
      return null
    }
    return value
  },
  provide: (field) =>
    EditorView.decorations.from(field, (suggestion) => {
      if (!suggestion || !suggestion.text) {
        return Decoration.none
      }
      const pos = Math.min(suggestion.pos, 1e9)
      return Decoration.set([
        Decoration.widget({ widget: new GhostWidget(suggestion.text), side: 1 }).range(pos)
      ])
    })
})

function currentSuggestion(view: EditorView): Suggestion | null {
  return view.state.field(suggestionField, false) ?? null
}

/** Accept (insert) the showing suggestion. Returns false when none shows. */
export function acceptInlineCompletion(view: EditorView): boolean {
  const suggestion = currentSuggestion(view)
  if (!suggestion || !suggestion.text) {
    return false
  }
  const pos = Math.min(suggestion.pos, view.state.doc.length)
  view.dispatch({
    changes: { from: pos, insert: suggestion.text },
    selection: { anchor: pos + suggestion.text.length },
    effects: setSuggestion.of(null),
    userEvent: 'input.complete'
  })
  return true
}

/** Dismiss the showing suggestion. Returns false when none shows. */
function dismissInlineCompletion(view: EditorView): boolean {
  if (!currentSuggestion(view)) {
    return false
  }
  view.dispatch({ effects: setSuggestion.of(null) })
  return true
}

/** Imperatively clear any showing suggestion (e.g. when the feature is toggled off). */
export function clearInlineCompletion(view: EditorView): void {
  if (currentSuggestion(view)) {
    view.dispatch({ effects: setSuggestion.of(null) })
  }
}

const PREFIX_CHARS = 2000
const SUFFIX_CHARS = 400
const MIN_PREFIX = 1

function triggerPlugin(config: InlineCompletionConfig) {
  const delay = config.delayMs ?? 500
  return ViewPlugin.fromClass(
    class {
      timer = 0
      controller: AbortController | null = null
      constructor(readonly view: EditorView) {}
      update(update: ViewUpdate) {
        if (!update.docChanged && !update.selectionSet) {
          return
        }
        // Edit / caret move → cancel any pending request (the field already
        // cleared a showing suggestion); reschedule when enabled & not composing.
        this.cancel()
        if (!config.getEnabled() || update.view.composing) {
          return
        }
        this.schedule()
      }
      schedule() {
        window.clearTimeout(this.timer)
        this.timer = window.setTimeout(() => void this.request(), delay)
      }
      cancel() {
        window.clearTimeout(this.timer)
        this.controller?.abort()
        this.controller = null
      }
      async request() {
        const view = this.view
        if (!config.getEnabled() || view.composing || !view.hasFocus) {
          return
        }
        const sel = view.state.selection.main
        if (!sel.empty) {
          return
        }
        const pos = sel.head
        const doc = view.state.doc
        const line = doc.lineAt(pos)
        // Only at a word / line boundary — never mid-word.
        const nextChar = pos < line.to ? doc.sliceString(pos, pos + 1) : ''
        if (nextChar && !/\s/.test(nextChar)) {
          return
        }
        const prefix = doc.sliceString(Math.max(0, pos - PREFIX_CHARS), pos)
        if (prefix.trim().length < MIN_PREFIX) {
          return
        }
        const suffix = doc.sliceString(pos, Math.min(doc.length, pos + SUFFIX_CHARS))
        const controller = new AbortController()
        this.controller = controller
        let text = ''
        try {
          text = await config.fetch(prefix, suffix, controller.signal)
        } catch {
          return
        }
        if (controller.signal.aborted) {
          return
        }
        // Discard if the caret moved while waiting.
        const now = view.state.selection.main
        if (!now.empty || now.head !== pos) {
          return
        }
        const cleaned = text.replace(/\s+$/, '')
        if (!cleaned) {
          return
        }
        view.dispatch({ effects: setSuggestion.of({ text: cleaned, pos }) })
      }
      destroy() {
        this.cancel()
      }
    }
  )
}

const completionKeymap = Prec.highest(
  keymap.of([
    { key: 'Tab', run: acceptInlineCompletion },
    { key: 'Escape', run: dismissInlineCompletion }
  ])
)

/** The inline AI completion (ghost text) extension. */
export function inlineCompletion(config: InlineCompletionConfig): Extension {
  return [suggestionField, triggerPlugin(config), completionKeymap]
}
