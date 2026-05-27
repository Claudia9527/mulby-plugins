import {
  Document,
  ExternalHyperlink,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
  type ParagraphChild
} from 'docx'
import type { ExportDocument, ExportFilesystem } from './types'

interface InlineMarks {
  bold?: boolean
  italics?: boolean
  code?: boolean
}

function normalizeInlineText(value: string) {
  return value.replace(/\s+/g, ' ')
}

function getHeadingLevel(tagName: string) {
  switch (tagName) {
    case 'h1':
      return HeadingLevel.HEADING_1
    case 'h2':
      return HeadingLevel.HEADING_2
    case 'h3':
      return HeadingLevel.HEADING_3
    case 'h4':
      return HeadingLevel.HEADING_4
    case 'h5':
      return HeadingLevel.HEADING_5
    default:
      return HeadingLevel.HEADING_6
  }
}

function toArrayBuffer(value: ArrayBuffer | Uint8Array) {
  if (value instanceof ArrayBuffer) {
    return value
  }

  return value.slice().buffer
}

function getPlainText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return normalizeInlineText(node.textContent ?? '')
  }

  if (!(node instanceof HTMLElement)) {
    return ''
  }

  if (node.tagName.toLowerCase() === 'input' && node.getAttribute('type') === 'checkbox') {
    return node.hasAttribute('checked') ? '[x] ' : '[ ] '
  }

  if (node.tagName.toLowerCase() === 'img') {
    return `[图片: ${node.getAttribute('alt') || node.getAttribute('src') || '未命名图片'}]`
  }

  return Array.from(node.childNodes)
    .map((child) => getPlainText(child))
    .join('')
}

function buildInlineChildren(node: Node, marks: InlineMarks = {}): ParagraphChild[] {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = normalizeInlineText(node.textContent ?? '')
    if (!text.trim()) {
      return []
    }

    return [new TextRun({
      text,
      bold: marks.bold,
      italics: marks.italics,
      font: marks.code ? 'Consolas' : undefined,
      size: marks.code ? 20 : undefined
    })]
  }

  if (!(node instanceof HTMLElement)) {
    return []
  }

  const tagName = node.tagName.toLowerCase()

  if (tagName === 'br') {
    return [new TextRun({ text: '', break: 1 })]
  }

  if (tagName === 'strong' || tagName === 'b') {
    return Array.from(node.childNodes).flatMap((child) => buildInlineChildren(child, { ...marks, bold: true }))
  }

  if (tagName === 'em' || tagName === 'i') {
    return Array.from(node.childNodes).flatMap((child) => buildInlineChildren(child, { ...marks, italics: true }))
  }

  if (tagName === 'code') {
    return Array.from(node.childNodes).flatMap((child) => buildInlineChildren(child, { ...marks, code: true }))
  }

  if (tagName === 'a') {
    const href = node.getAttribute('href')
    const text = getPlainText(node).trim() || href || '链接'
    const linkRun = new TextRun({
      text,
      bold: marks.bold,
      italics: marks.italics,
      style: 'Hyperlink'
    })

    if (href) {
      return [new ExternalHyperlink({ link: href, children: [linkRun] })]
    }

    return [linkRun]
  }

  if (tagName === 'input' && node.getAttribute('type') === 'checkbox') {
    return [new TextRun({ text: node.hasAttribute('checked') ? '[x] ' : '[ ] ' })]
  }

  if (tagName === 'img') {
    return [new TextRun({
      text: `[图片: ${node.getAttribute('alt') || node.getAttribute('src') || '未命名图片'}]`,
      italics: true
    })]
  }

  return Array.from(node.childNodes).flatMap((child) => buildInlineChildren(child, marks))
}

function paragraphFromInlineElement(element: HTMLElement) {
  const children = buildInlineChildren(element)
  if (children.length === 0) {
    return []
  }

  return [new Paragraph({ children })]
}

function buildCodeParagraphs(code: string) {
  const lines = code.replace(/\n$/, '').split('\n')
  const runs: TextRun[] = []

  lines.forEach((line, index) => {
    runs.push(new TextRun({
      text: line || ' ',
      font: 'Consolas',
      size: 20,
      break: index === 0 ? 0 : 1
    }))
  })

  return [new Paragraph({ children: runs })]
}

function buildTableParagraphs(table: HTMLTableElement) {
  const rows = Array.from(table.querySelectorAll('tr'))
  return rows
    .map((row) => Array.from(row.querySelectorAll('th, td')).map((cell) => getPlainText(cell).trim()).filter(Boolean).join(' | '))
    .filter(Boolean)
    .map((text) => new Paragraph({ children: [new TextRun({ text })] }))
}

function buildListParagraphs(list: HTMLElement, depth = 0): Paragraph[] {
  const ordered = list.tagName.toLowerCase() === 'ol'
  const items = Array.from(list.children).filter((child): child is HTMLLIElement => child instanceof HTMLLIElement)
  const paragraphs: Paragraph[] = []

  items.forEach((item, index) => {
    const prefix = ordered ? `${index + 1}. ` : '• '
    const inlineChildren = Array.from(item.childNodes)
      .filter((child) => !(child instanceof HTMLElement && (child.tagName.toLowerCase() === 'ul' || child.tagName.toLowerCase() === 'ol')))
      .flatMap((child) => buildInlineChildren(child))

    if (inlineChildren.length > 0) {
      paragraphs.push(new Paragraph({
        indent: { left: 360 * depth },
        children: [new TextRun({ text: prefix }), ...inlineChildren]
      }))
    }

    Array.from(item.children)
      .filter((child): child is HTMLElement => child instanceof HTMLElement && (child.tagName.toLowerCase() === 'ul' || child.tagName.toLowerCase() === 'ol'))
      .forEach((nestedList) => {
        paragraphs.push(...buildListParagraphs(nestedList, depth + 1))
      })
  })

  return paragraphs
}

function buildBlockParagraphs(element: HTMLElement): Paragraph[] {
  const tagName = element.tagName.toLowerCase()

  if (/^h[1-6]$/.test(tagName)) {
    const children = buildInlineChildren(element)
    if (children.length === 0) {
      return []
    }

    return [new Paragraph({
      heading: getHeadingLevel(tagName),
      children
    })]
  }

  if (tagName === 'p') {
    return paragraphFromInlineElement(element)
  }

  if (tagName === 'blockquote') {
    const text = getPlainText(element).trim()
    if (!text) {
      return []
    }

    return [new Paragraph({
      indent: { left: 420 },
      children: [new TextRun({ text, italics: true })]
    })]
  }

  if (tagName === 'pre') {
    const codeElement = element.querySelector('code')
    const code = (codeElement?.textContent ?? element.textContent ?? '').replace(/\r\n/g, '\n')
    return buildCodeParagraphs(code)
  }

  if (tagName === 'ul' || tagName === 'ol') {
    return buildListParagraphs(element)
  }

  if (tagName === 'table') {
    return buildTableParagraphs(element as HTMLTableElement)
  }

  if (tagName === 'hr') {
    return [new Paragraph({ children: [new TextRun({ text: '──────────────' })] })]
  }

  if (tagName === 'img') {
    return [new Paragraph({
      children: [new TextRun({
        text: `[图片: ${element.getAttribute('alt') || element.getAttribute('src') || '未命名图片'}]`,
        italics: true
      })]
    })]
  }

  const childElements = Array.from(element.children).filter((child): child is HTMLElement => child instanceof HTMLElement)
  if (childElements.length > 0) {
    return childElements.flatMap((child) => buildBlockParagraphs(child))
  }

  return paragraphFromInlineElement(element)
}

export async function exportDocxFile(
  document: ExportDocument,
  path: string,
  filesystem: ExportFilesystem
) {
  const parser = new DOMParser()
  const htmlDocument = parser.parseFromString(document.fullHtml, 'text/html')
  const bodyChildren = Array.from(htmlDocument.body.children)
    .filter((child): child is HTMLElement => child instanceof HTMLElement)
    .flatMap((child) => buildBlockParagraphs(child))

  const doc = new Document({
    sections: [
      {
        children: bodyChildren.length > 0
          ? bodyChildren
          : [new Paragraph({ children: [new TextRun(document.markdown || ' ')] })]
      }
    ]
  })

  const buffer = await Packer.toBuffer(doc)
  await filesystem.writeFile(path, toArrayBuffer(buffer as Uint8Array | ArrayBuffer))
}
