// Pure model for GFM table editing. The interactive table widget parses the
// Markdown source into this structure, mutates it (add / remove / move rows and
// columns), then serializes it back and writes it to the document. Keeping all
// of this logic pure makes it unit-testable without a DOM or CodeMirror.

export type TableAlign = 'none' | 'left' | 'center' | 'right'

export interface TableData {
  headers: string[]
  aligns: TableAlign[]
  rows: string[][]
}

/** Splits one table row into trimmed cell strings, honoring `\|` escapes and
 *  optional leading/trailing pipes. */
function splitRow(line: string): string[] {
  let s = line.trim()
  if (s.startsWith('|')) {
    s = s.slice(1)
  }
  if (s.endsWith('|') && !s.endsWith('\\|')) {
    s = s.slice(0, -1)
  }
  const cells: string[] = []
  let cur = ''
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i]
    if (ch === '\\' && s[i + 1] === '|') {
      cur += '\\|'
      i += 1
      continue
    }
    if (ch === '|') {
      cells.push(cur.trim())
      cur = ''
      continue
    }
    cur += ch
  }
  cells.push(cur.trim())
  return cells
}

/** True when every cell of a row is a GFM alignment marker (`:--`, `--:`, …). */
function isDelimiterRow(line: string): boolean {
  const cells = splitRow(line)
  if (cells.length === 0) {
    return false
  }
  return cells.every((c) => /^:?-+:?$/.test(c.replace(/\s+/g, '')))
}

function alignOf(cell: string): TableAlign {
  const c = cell.replace(/\s+/g, '')
  const left = c.startsWith(':')
  const right = c.endsWith(':')
  if (left && right) {
    return 'center'
  }
  if (right) {
    return 'right'
  }
  if (left) {
    return 'left'
  }
  return 'none'
}

/** Parses a Markdown table block into a TableData, or null if it isn't one. */
export function parseTable(source: string): TableData | null {
  const lines = source.split('\n').filter((l, i, arr) => !(i === arr.length - 1 && l.trim() === ''))
  if (lines.length < 2 || !isDelimiterRow(lines[1])) {
    return null
  }
  const headers = splitRow(lines[0])
  const aligns = splitRow(lines[1]).map(alignOf)
  const cols = headers.length
  // Normalize alignment count to the header column count.
  while (aligns.length < cols) {
    aligns.push('none')
  }
  aligns.length = cols
  const rows = lines.slice(2).map((l) => padCells(splitRow(l), cols))
  return { headers: [...headers], aligns, rows }
}

function padCells(cells: string[], cols: number): string[] {
  const out = cells.slice(0, cols)
  while (out.length < cols) {
    out.push('')
  }
  return out
}

function alignMarker(a: TableAlign): string {
  switch (a) {
    case 'left':
      return ':---'
    case 'center':
      return ':---:'
    case 'right':
      return '---:'
    default:
      return '---'
  }
}

/** Serializes a TableData back to a compact GFM table block. */
export function serializeTable(table: TableData): string {
  const cols = table.headers.length
  const aligns = table.aligns.slice(0, cols)
  while (aligns.length < cols) {
    aligns.push('none')
  }
  const headerLine = `| ${table.headers.map((c) => c || ' ').join(' | ')} |`
  const delimLine = `| ${aligns.map(alignMarker).join(' | ')} |`
  const bodyLines = table.rows.map((r) => `| ${padCells(r, cols).map((c) => c || ' ').join(' | ')} |`)
  return [headerLine, delimLine, ...bodyLines].join('\n')
}

function clone(table: TableData): TableData {
  return {
    headers: [...table.headers],
    aligns: [...table.aligns],
    rows: table.rows.map((r) => [...r])
  }
}

/** Inserts an empty column at `at` (0..cols). */
export function addColumn(table: TableData, at: number): TableData {
  const t = clone(table)
  const idx = Math.max(0, Math.min(at, t.headers.length))
  t.headers.splice(idx, 0, '')
  t.aligns.splice(idx, 0, 'none')
  for (const r of t.rows) {
    r.splice(idx, 0, '')
  }
  return t
}

/** Removes the column at `at`. The last remaining column is kept (a table needs ≥1). */
export function removeColumn(table: TableData, at: number): TableData {
  if (table.headers.length <= 1) {
    return clone(table)
  }
  const t = clone(table)
  if (at < 0 || at >= t.headers.length) {
    return t
  }
  t.headers.splice(at, 1)
  t.aligns.splice(at, 1)
  for (const r of t.rows) {
    r.splice(at, 1)
  }
  return t
}

/** Inserts an empty body row at `at` (0..rows.length). */
export function addRow(table: TableData, at: number): TableData {
  const t = clone(table)
  const idx = Math.max(0, Math.min(at, t.rows.length))
  t.rows.splice(idx, 0, new Array(t.headers.length).fill(''))
  return t
}

/** Removes the body row at `at`. */
export function removeRow(table: TableData, at: number): TableData {
  const t = clone(table)
  if (at < 0 || at >= t.rows.length) {
    return t
  }
  t.rows.splice(at, 1)
  return t
}

function moveItem<T>(arr: T[], from: number, to: number): void {
  if (from < 0 || from >= arr.length || to < 0 || to >= arr.length || from === to) {
    return
  }
  const [item] = arr.splice(from, 1)
  arr.splice(to, 0, item)
}

/** Moves a column from index `from` to index `to`. */
export function moveColumn(table: TableData, from: number, to: number): TableData {
  const t = clone(table)
  moveItem(t.headers, from, to)
  moveItem(t.aligns, from, to)
  for (const r of t.rows) {
    moveItem(r, from, to)
  }
  return t
}

/** Moves a body row from index `from` to index `to`. */
export function moveRow(table: TableData, from: number, to: number): TableData {
  const t = clone(table)
  moveItem(t.rows, from, to)
  return t
}
