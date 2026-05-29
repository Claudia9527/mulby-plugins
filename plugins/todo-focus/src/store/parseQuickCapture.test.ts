import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { TodoItem } from '../types/todo'
import { formatLocalDateKey, parseTodoText, sortTodos } from './parseQuickCapture'

function todo(overrides: Partial<TodoItem>): TodoItem {
  return {
    id: overrides.id || 'todo',
    title: overrides.title || 'todo',
    done: overrides.done ?? false,
    createdAt: overrides.createdAt ?? 0,
    updatedAt: overrides.updatedAt ?? 0,
    focusMinutes: overrides.focusMinutes ?? 0,
    ...overrides,
  }
}

test('formats date keys using the local day instead of UTC', () => {
  const date = new Date('2026-05-28T00:00:00+08:00')

  assert.equal(formatLocalDateKey(date), '2026-05-28')
})

test('parses plain todo text metadata from list composer input', () => {
  const parsed = parseTodoText('!写周报 @明天')

  assert.equal(parsed?.title, '写周报')
  assert.equal(parsed?.priority, 'high')
  assert.equal(typeof parsed?.dueDate, 'number')
})

test('sorts active todos by persisted manual order before automatic scoring', () => {
  const sorted = sortTodos([
    todo({ id: 'later', title: 'later', sortOrder: 1, priority: 'high', updatedAt: 100 }),
    todo({ id: 'first', title: 'first', sortOrder: 0, priority: 'low', updatedAt: 1 }),
  ])

  assert.deepEqual(sorted.map((item) => item.id), ['first', 'later'])
})
