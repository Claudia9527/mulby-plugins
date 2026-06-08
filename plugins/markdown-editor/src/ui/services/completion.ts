// Inline AI completion (ghost text) service: builds the completion prompt and
// runs a single, abortable request. The CodeMirror extension in
// `editor/inlineCompletion.ts` is decoupled from this via an injected fetcher.

import { runAiAction, stripCodeFence, type AiClient, type AiPrompt } from './ai'

/**
 * Builds the prompt for a short inline continuation at the caret. `prefix` is the
 * text before the caret, `suffix` the text after (may be empty at line/doc end).
 * The model is told to return ONLY the next small piece, never repeating the
 * prefix, so the result can be shown as ghost text and inserted verbatim.
 */
export function buildCompletionPrompt(prefix: string, suffix: string): AiPrompt {
  const system = [
    '你是嵌入 Markdown 编辑器里的行内续写助手（类似代码补全）。',
    '只补全光标处接下来的一小段内容：最多一句话或一行，自然衔接前文的语气与格式。',
    '严格只输出续写的文本本身：绝不重复光标前已有的内容，不要加任何解释、引号或代码围栏。',
    '若无需补全或无法自然续写，输出空字符串。'
  ].join('\n')
  const trimmedSuffix = suffix.trim()
  const user = trimmedSuffix
    ? `在【光标】处接着写下去（只给接下来的一小段，要能和后文衔接）：\n${prefix}【光标】${suffix}`
    : `接着下面的内容继续写（只给接下来的一小段）：\n${prefix}`
  return { system, user }
}

/**
 * Requests a single inline completion. Resolves with the suggestion text (or ''
 * when there's nothing to add / the request was aborted). Aborting the signal
 * cancels the underlying AI request.
 */
export async function requestCompletion(
  ai: AiClient,
  model: string | undefined,
  prefix: string,
  suffix: string,
  signal: AbortSignal
): Promise<string> {
  if (signal.aborted) {
    return ''
  }
  const handle = runAiAction({ ai, model, prompt: buildCompletionPrompt(prefix, suffix) })
  const onAbort = () => handle.abort()
  signal.addEventListener('abort', onAbort, { once: true })
  try {
    const result = await handle.result
    if (result.aborted) {
      return ''
    }
    return stripCodeFence(result.text)
  } catch {
    return ''
  } finally {
    signal.removeEventListener('abort', onAbort)
  }
}
