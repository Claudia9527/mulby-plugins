// Interactive table widget DOM for the live preview. Renders a GFM table with
// hover-revealed controls to add a row/column at the end, delete a row/column,
// and drag a row/column to a new position. Every edit serializes the table model
// back to Markdown and writes it to the document, after which CodeMirror
// re-renders the table from the new source.

import { syntaxTree } from '@codemirror/language'
import type { SyntaxNode } from '@lezer/common'
import type { EditorView } from '@codemirror/view'
import {
  addColumn,
  addRow,
  moveColumn,
  moveRow,
  parseTable,
  removeColumn,
  removeRow,
  serializeTable,
  type TableAlign,
  type TableData
} from './tableModel'
import { renderMarkdownDocument, renderMarkdownInline } from '../services/markdownHtml'

/** Finds the document range of the Table node enclosing (or starting at) `pos`. */
function tableRangeAt(view: EditorView, pos: number): { from: number; to: number } | null {
  const tree = syntaxTree(view.state)
  const tries = [pos, Math.min(pos + 1, view.state.doc.length), Math.max(pos - 1, 0)]
  for (const p of tries) {
    for (let node: SyntaxNode | null = tree.resolveInner(p, 1); node; node = node.parent) {
      if (node.name === 'Table') {
        return { from: node.from, to: node.to }
      }
    }
  }
  return null
}

function styleAlign(el: HTMLElement, align: TableAlign): void {
  if (align !== 'none') {
    el.style.textAlign = align
  }
}

function ctlButton(className: string, title: string, glyph: string): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = `cm-md-table-ctl ${className}`
  btn.title = title
  btn.tabIndex = -1
  btn.textContent = glyph
  return btn
}

/**
 * Builds the interactive table DOM. `view` is used to locate the table's current
 * source range and dispatch edits; `source` is the raw Markdown of the table.
 */
export function buildInteractiveTable(view: EditorView, source: string): HTMLElement {
  const root = document.createElement('div')
  root.className = 'cm-md-table'

  const data = parseTable(source)
  if (!data) {
    // Not a parseable table: fall back to a plain rendered table.
    root.innerHTML = renderMarkdownDocument(source)
    return root
  }

  const before = serializeTable(data)

  // Commits a new table model to the document by replacing the current table
  // source range. CodeMirror then rebuilds the widget from the new Markdown.
  const commit = (next: TableData) => {
    const insert = serializeTable(next)
    if (insert === before) {
      return // no structural change (e.g. dropped onto its own position)
    }
    const pos = view.posAtDOM(root)
    const range = tableRangeAt(view, pos)
    if (!range) {
      return
    }
    view.dispatch({ changes: { from: range.from, to: range.to, insert } })
  }

  // Drag state shared across the table's grips/targets.
  let dragKind: 'row' | 'col' | null = null
  let dragIndex = -1
  const clearDropMarks = () => {
    root.querySelectorAll('.cm-md-drop-target').forEach((el) => el.classList.remove('cm-md-drop-target'))
  }

  const frame = document.createElement('div')
  frame.className = 'cm-md-table-frame'

  const scroll = document.createElement('div')
  scroll.className = 'cm-md-table-scroll'

  const table = document.createElement('table')
  table.className = 'cm-md-table-el'

  // ---- header ----
  const thead = document.createElement('thead')
  const headTr = document.createElement('tr')
  data.headers.forEach((cell, colIndex) => {
    const th = document.createElement('th')
    styleAlign(th, data.aligns[colIndex])

    const tools = document.createElement('div')
    tools.className = 'cm-md-col-tools'

    const grip = ctlButton('cm-md-col-grip', '拖动调整列顺序', '\u2630')
    grip.draggable = true
    grip.addEventListener('dragstart', (e) => {
      e.stopPropagation()
      dragKind = 'col'
      dragIndex = colIndex
      e.dataTransfer?.setData('text/plain', 'col')
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move'
      }
    })
    grip.addEventListener('dragend', () => {
      dragKind = null
      dragIndex = -1
      clearDropMarks()
    })
    tools.appendChild(grip)

    const del = ctlButton('cm-md-col-del', '删除此列', '\u2715')
    del.addEventListener('click', (e) => {
      e.preventDefault()
      commit(removeColumn(data, colIndex))
    })
    tools.appendChild(del)

    th.appendChild(tools)

    const body = document.createElement('span')
    body.className = 'cm-md-cellbody'
    body.innerHTML = renderMarkdownInline(cell)
    th.appendChild(body)

    // Column drop target.
    th.addEventListener('dragover', (e) => {
      if (dragKind === 'col') {
        e.preventDefault()
        e.stopPropagation()
        if (e.dataTransfer) {
          e.dataTransfer.dropEffect = 'move'
        }
        clearDropMarks()
        th.classList.add('cm-md-drop-target')
      }
    })
    th.addEventListener('drop', (e) => {
      if (dragKind === 'col' && dragIndex >= 0) {
        e.preventDefault()
        e.stopPropagation()
        commit(moveColumn(data, dragIndex, colIndex))
      }
    })

    headTr.appendChild(th)
  })
  thead.appendChild(headTr)
  table.appendChild(thead)

  // ---- body ----
  const tbody = document.createElement('tbody')
  data.rows.forEach((row, rowIndex) => {
    const tr = document.createElement('tr')
    row.forEach((cell, colIndex) => {
      const td = document.createElement('td')
      styleAlign(td, data.aligns[colIndex])

      if (colIndex === 0) {
        const tools = document.createElement('div')
        tools.className = 'cm-md-row-tools'

        const grip = ctlButton('cm-md-row-grip', '拖动调整行顺序', '\u2630')
        grip.draggable = true
        grip.addEventListener('dragstart', (e) => {
          e.stopPropagation()
          dragKind = 'row'
          dragIndex = rowIndex
          e.dataTransfer?.setData('text/plain', 'row')
          if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move'
          }
        })
        grip.addEventListener('dragend', () => {
          dragKind = null
          dragIndex = -1
          clearDropMarks()
        })
        tools.appendChild(grip)

        const del = ctlButton('cm-md-row-del', '删除此行', '\u2715')
        del.addEventListener('click', (e) => {
          e.preventDefault()
          commit(removeRow(data, rowIndex))
        })
        tools.appendChild(del)

        td.appendChild(tools)
      }

      const body = document.createElement('span')
      body.className = 'cm-md-cellbody'
      body.innerHTML = renderMarkdownInline(cell)
      td.appendChild(body)
      tr.appendChild(td)
    })

    tr.addEventListener('dragover', (e) => {
      if (dragKind === 'row') {
        e.preventDefault()
        e.stopPropagation()
        if (e.dataTransfer) {
          e.dataTransfer.dropEffect = 'move'
        }
        clearDropMarks()
        tr.classList.add('cm-md-drop-target')
      }
    })
    tr.addEventListener('drop', (e) => {
      if (dragKind === 'row' && dragIndex >= 0) {
        e.preventDefault()
        e.stopPropagation()
        commit(moveRow(data, dragIndex, rowIndex))
      }
    })

    tbody.appendChild(tr)
  })
  table.appendChild(tbody)
  scroll.appendChild(table)
  frame.appendChild(scroll)

  // ---- add-column rail (right edge) ----
  const addCol = ctlButton('cm-md-add-col', '在末尾添加一列', '\uFF0B')
  addCol.addEventListener('click', (e) => {
    e.preventDefault()
    commit(addColumn(data, data.headers.length))
  })
  frame.appendChild(addCol)

  // ---- add-row bar (bottom edge) ----
  const addRowBtn = ctlButton('cm-md-add-row', '在末尾添加一行', '\uFF0B')
  addRowBtn.addEventListener('click', (e) => {
    e.preventDefault()
    commit(addRow(data, data.rows.length))
  })
  frame.appendChild(addRowBtn)

  root.appendChild(frame)
  return root
}

/** True when an event originated from one of the table's control elements. */
export function isTableControlEvent(event: Event): boolean {
  const t = event.target as HTMLElement | null
  return !!(t && t.closest && t.closest('.cm-md-table-ctl'))
}
