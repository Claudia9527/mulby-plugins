import React from 'react'

/**
 * 轻量 Markdown 渲染：覆盖 AI 对话里常见的语法
 *（标题 / 粗体 / 斜体 / 行内代码 / 代码块 / 有序与无序列表 / 引用 / 链接 / 分隔线），
 * 不引入第三方依赖，避免插件打包体积膨胀。流式输出时即使语法尚未闭合也能容错渲染。
 */

// 行内：行内代码、粗体、斜体、链接
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  const regex = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\n]+\*|_[^_\n]+_)|(\[[^\]]+\]\([^)]+\))/g
  let lastIndex = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastIndex) nodes.push(text.slice(lastIndex, m.index))
    const token = m[0]
    const k = `${keyPrefix}-${i++}`
    if (token.startsWith('`')) {
      nodes.push(<code key={k} className="px-1 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700/70 text-[11px] mono break-words">{token.slice(1, -1)}</code>)
    } else if (token.startsWith('**')) {
      nodes.push(<strong key={k} className="font-semibold">{token.slice(2, -2)}</strong>)
    } else if (token.startsWith('[')) {
      const mm = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
      if (mm) nodes.push(<a key={k} href={mm[2]} target="_blank" rel="noreferrer" className="text-sky-600 dark:text-sky-400 underline break-all">{mm[1]}</a>)
      else nodes.push(token)
    } else {
      nodes.push(<em key={k} className="italic">{token.slice(1, -1)}</em>)
    }
    lastIndex = regex.lastIndex
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex))
  return nodes
}

const BLOCK_BREAK = /^(```|#{1,4}\s|\s*[-*]\s|\s*\d+\.\s|\s*>\s?|\s*---+\s*$)/

export function Markdown({ text }: { text: string }) {
  const lines = (text || '').split('\n')
  const blocks: React.ReactNode[] = []
  let i = 0
  let key = 0
  while (i < lines.length) {
    const line = lines[i]

    // 代码块（容错：流式未闭合时读到结尾）
    const fence = line.match(/^```(\w*)\s*$/)
    if (fence) {
      const code: string[] = []
      i++
      while (i < lines.length && !/^```\s*$/.test(lines[i])) { code.push(lines[i]); i++ }
      if (i < lines.length) i++ // 跳过结尾 ```
      blocks.push(
        <pre key={key++} className="my-1 p-2 rounded-lg bg-slate-900/90 dark:bg-black/50 text-slate-100 text-[11px] mono overflow-auto whitespace-pre">
          <code>{code.join('\n')}</code>
        </pre>
      )
      continue
    }

    // 标题
    const h = line.match(/^(#{1,4})\s+(.*)$/)
    if (h) {
      blocks.push(<div key={key++} className="font-semibold text-[13px] mt-1.5">{renderInline(h[2], `h${key}`)}</div>)
      i++; continue
    }

    // 无序列表
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*[-*]\s+/, '')); i++ }
      blocks.push(
        <ul key={key++} className="list-disc pl-4 space-y-0.5 my-0.5">
          {items.map((it, j) => <li key={j}>{renderInline(it, `ul${key}-${j}`)}</li>)}
        </ul>
      )
      continue
    }

    // 有序列表
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*\d+\.\s+/, '')); i++ }
      blocks.push(
        <ol key={key++} className="list-decimal pl-4 space-y-0.5 my-0.5">
          {items.map((it, j) => <li key={j}>{renderInline(it, `ol${key}-${j}`)}</li>)}
        </ol>
      )
      continue
    }

    // 引用
    if (/^\s*>\s?/.test(line)) {
      const quote: string[] = []
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) { quote.push(lines[i].replace(/^\s*>\s?/, '')); i++ }
      blocks.push(
        <blockquote key={key++} className="border-l-2 border-slate-300 dark:border-slate-600 pl-2 my-1 text-slate-500 dark:text-slate-400">
          {quote.map((q, j) => <React.Fragment key={j}>{j > 0 && <br />}{renderInline(q, `q${key}-${j}`)}</React.Fragment>)}
        </blockquote>
      )
      continue
    }

    // 分隔线
    if (/^\s*---+\s*$/.test(line)) { blocks.push(<hr key={key++} className="my-2 border-slate-200 dark:border-slate-700" />); i++; continue }

    // 空行
    if (line.trim() === '') { i++; continue }

    // 段落（合并连续普通行，保留行内换行）
    const para: string[] = [line]
    i++
    while (i < lines.length && lines[i].trim() !== '' && !BLOCK_BREAK.test(lines[i])) { para.push(lines[i]); i++ }
    blocks.push(
      <p key={key++} className="leading-relaxed break-words">
        {para.map((ln, j) => <React.Fragment key={j}>{j > 0 && <br />}{renderInline(ln, `p${key}-${j}`)}</React.Fragment>)}
      </p>
    )
  }
  return <div className="space-y-1">{blocks}</div>
}
