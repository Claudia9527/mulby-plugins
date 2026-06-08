// Pure, cross-platform path helpers + sorting + name validation for the file
// explorer. These mirror the Node `path` logic exposed by preload (window.mdeFs.path)
// but stay dependency-free and deterministic so the tree model and its unit tests
// never need a real filesystem.

const MARKDOWN_EXTENSIONS = ['md', 'markdown', 'mdown', 'mkd']

/** Detect the path separator used by a path (defaults to '/'). */
export function detectSep(p: string): '\\' | '/' {
  // A Windows path either contains a backslash or starts with a drive letter.
  if (p.includes('\\') && !p.includes('/')) {
    return '\\'
  }
  if (/^[a-zA-Z]:\\/.test(p)) {
    return '\\'
  }
  return p.includes('\\') && /^[a-zA-Z]:/.test(p) ? '\\' : '/'
}

/** Last path segment, e.g. '/a/b/c.md' -> 'c.md'. */
export function basename(p: string): string {
  const parts = p.split(/[\\/]/).filter(Boolean)
  return parts.length ? parts[parts.length - 1] : p
}

/** Parent directory, e.g. '/a/b/c.md' -> '/a/b'. Preserves the path's separator. */
export function dirname(p: string): string {
  const sep = detectSep(p)
  const normalized = p.replace(/[\\/]+$/, '')
  const idx = Math.max(normalized.lastIndexOf('/'), normalized.lastIndexOf('\\'))
  if (idx < 0) {
    return ''
  }
  // Keep root slash for POSIX absolute paths.
  if (idx === 0 && sep === '/') {
    return '/'
  }
  return normalized.slice(0, idx)
}

/** Lower-case extension without the dot, e.g. 'a.MD' -> 'md'. '' for none. */
export function extname(name: string): string {
  const base = basename(name)
  const dot = base.lastIndexOf('.')
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : ''
}

/** File name without its extension, e.g. 'note.md' -> 'note'. */
export function stripExtension(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(0, dot) : name
}

/** Join a directory and a child using the directory's separator. */
export function joinPath(dir: string, child: string): string {
  if (!dir) {
    return child
  }
  const sep = detectSep(dir)
  const trimmed = dir.replace(/[\\/]+$/, '')
  return `${trimmed}${sep}${child}`
}

/** True for Markdown files we want to surface in the explorer. */
export function isMarkdownFile(name: string): boolean {
  return MARKDOWN_EXTENSIONS.includes(extname(name))
}

/** Append `.md` when the user typed a bare name with no extension. */
export function ensureMarkdownName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) {
    return trimmed
  }
  return extname(trimmed) ? trimmed : `${trimmed}.md`
}

/**
 * Natural comparison so "file2" sorts before "file10" and casing is ignored.
 * Falls back to a stable code-point compare for ties.
 */
export function naturalCompare(a: string, b: string): number {
  const result = a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  if (result !== 0) {
    return result
  }
  return a < b ? -1 : a > b ? 1 : 0
}

const ILLEGAL_NAME = /[\\/:*?"<>|\u0000-\u001f]/

/** Validate a file/folder name typed inline. Returns an error string or null. */
export function validateName(name: string): string | null {
  const trimmed = name.trim()
  if (!trimmed) {
    return '名称不能为空'
  }
  if (trimmed === '.' || trimmed === '..') {
    return '名称无效'
  }
  if (ILLEGAL_NAME.test(trimmed)) {
    return '名称包含非法字符'
  }
  if (trimmed.length > 255) {
    return '名称过长'
  }
  return null
}

/** True when `child` is `parent` itself or nested inside it (drop-target guard). */
export function isSameOrInside(parent: string, child: string): boolean {
  const norm = (p: string) => p.replace(/\\/g, '/').replace(/\/+$/, '')
  const a = norm(parent)
  const b = norm(child)
  return b === a || b.startsWith(`${a}/`)
}
