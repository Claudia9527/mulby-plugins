import assert from 'node:assert/strict'
import {
  addColumn,
  addRow,
  moveColumn,
  moveRow,
  parseTable,
  removeColumn,
  removeRow,
  serializeTable,
  type TableData
} from './tableModel'

const SRC = ['| A | B | C |', '| :--- | :---: | ---: |', '| 1 | 2 | 3 |', '| 4 | 5 | 6 |'].join('\n')

// parseTable extracts headers, alignments and body rows.
{
  const t = parseTable(SRC)
  assert.ok(t)
  assert.deepEqual(t!.headers, ['A', 'B', 'C'])
  assert.deepEqual(t!.aligns, ['left', 'center', 'right'])
  assert.deepEqual(t!.rows, [
    ['1', '2', '3'],
    ['4', '5', '6']
  ])
}

// Non-tables (missing delimiter row) return null.
assert.equal(parseTable('just text\nmore text'), null)
assert.equal(parseTable('| only header |'), null)

// Tables without outer pipes still parse.
{
  const t = parseTable('a | b\n--- | ---\n1 | 2')
  assert.ok(t)
  assert.deepEqual(t!.headers, ['a', 'b'])
  assert.deepEqual(t!.rows, [['1', '2']])
}

// Round-trip: parse then serialize yields a normalized but equivalent table.
{
  const t = parseTable(SRC)!
  const out = parseTable(serializeTable(t))!
  assert.deepEqual(out, t)
}

// addColumn inserts an empty column at the given index across all rows.
{
  const t = parseTable(SRC)!
  const out = addColumn(t, 1)
  assert.deepEqual(out.headers, ['A', '', 'B', 'C'])
  assert.deepEqual(out.aligns, ['left', 'none', 'center', 'right'])
  assert.deepEqual(out.rows[0], ['1', '', '2', '3'])
  // original is untouched (pure)
  assert.deepEqual(t.headers, ['A', 'B', 'C'])
}

// addColumn clamps the index and can append at the end.
{
  const t = parseTable(SRC)!
  const out = addColumn(t, 99)
  assert.equal(out.headers.length, 4)
  assert.equal(out.headers[3], '')
}

// removeColumn drops a column; the last column can't be removed.
{
  const t = parseTable(SRC)!
  const out = removeColumn(t, 0)
  assert.deepEqual(out.headers, ['B', 'C'])
  assert.deepEqual(out.rows[0], ['2', '3'])
  const single: TableData = { headers: ['only'], aligns: ['none'], rows: [['x']] }
  assert.deepEqual(removeColumn(single, 0), single)
}

// addRow / removeRow operate on body rows.
{
  const t = parseTable(SRC)!
  const added = addRow(t, 1)
  assert.equal(added.rows.length, 3)
  assert.deepEqual(added.rows[1], ['', '', ''])
  const removed = removeRow(t, 0)
  assert.deepEqual(removed.rows, [['4', '5', '6']])
}

// moveColumn reorders header, alignment and every body cell together.
{
  const t = parseTable(SRC)!
  const out = moveColumn(t, 0, 2)
  assert.deepEqual(out.headers, ['B', 'C', 'A'])
  assert.deepEqual(out.aligns, ['center', 'right', 'left'])
  assert.deepEqual(out.rows[0], ['2', '3', '1'])
}

// moveRow reorders body rows.
{
  const t = parseTable(SRC)!
  const out = moveRow(t, 0, 1)
  assert.deepEqual(out.rows, [
    ['4', '5', '6'],
    ['1', '2', '3']
  ])
}

// Escaped pipes inside cells survive a parse/serialize round-trip.
{
  const t = parseTable('| a \\| b | c |\n| --- | --- |\n| x | y |')
  assert.ok(t)
  assert.equal(t!.headers[0], 'a \\| b')
  const out = parseTable(serializeTable(t!))!
  assert.equal(out.headers[0], 'a \\| b')
}

console.log('markdown-editor tableModel unit tests passed')
