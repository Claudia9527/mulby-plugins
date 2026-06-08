import assert from 'node:assert/strict'
import { buildCompletionPrompt } from './completion'

// With no suffix (caret at line/doc end): prefix is continued directly.
{
  const p = buildCompletionPrompt('今天天气很', '')
  assert.ok(p.system.length > 0)
  assert.ok(p.user.includes('今天天气很'))
  assert.ok(!p.user.includes('【光标】'))
}

// With a suffix: caret position is marked so the completion fits between.
{
  const p = buildCompletionPrompt('开头', '结尾')
  assert.ok(p.user.includes('【光标】'))
  assert.ok(p.user.includes('开头'))
  assert.ok(p.user.includes('结尾'))
}

// System prompt forbids repeating the prefix / adding explanations.
{
  const p = buildCompletionPrompt('x', '')
  assert.ok(p.system.includes('不要') || p.system.includes('绝不'))
}

console.log('markdown-editor completion unit tests passed')
