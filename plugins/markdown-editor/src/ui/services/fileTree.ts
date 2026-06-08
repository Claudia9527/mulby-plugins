// Pure tree-model helpers for the file explorer: sorting, Markdown-only
// filtering, and flattening the loaded/expanded tree into the ordered list of
// visible rows the virtualized renderer consumes. No React, no filesystem.

import { isMarkdownFile, naturalCompare } from './filePath'

/** A raw directory entry as returned by the fs bridge (window.mdeFs.list). */
export interface FsEntry {
  name: string
  path: string
  isDirectory: boolean
  isFile: boolean
  size?: number
  mtimeMs?: number
}

/** One visible row in the flattened tree. */
export interface TreeRow {
  entry: FsEntry
  depth: number
  /** Directories always show a twistie (children are lazy-loaded on expand). */
  hasChildren: boolean
  expanded: boolean
}

/** Loaded children keyed by their parent directory path. */
export type ChildrenByDir = Record<string, FsEntry[]>

export interface FlattenOptions {
  showOnlyMarkdown: boolean
}

/** Folders first, then natural-sorted by name. */
export function sortEntries(entries: FsEntry[]): FsEntry[] {
  return [...entries].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) {
      return a.isDirectory ? -1 : 1
    }
    return naturalCompare(a.name, b.name)
  })
}

/**
 * Keep directories (needed for navigation) plus, when markdown-only is on, just
 * Markdown files. Hidden dotfiles are always dropped.
 */
export function filterEntries(entries: FsEntry[], options: FlattenOptions): FsEntry[] {
  return entries.filter((entry) => {
    if (entry.name.startsWith('.')) {
      return false
    }
    if (entry.isDirectory) {
      return true
    }
    if (!entry.isFile) {
      return false
    }
    return options.showOnlyMarkdown ? isMarkdownFile(entry.name) : true
  })
}

/** Prepare a directory's raw entries for display (filter + sort). */
export function prepareChildren(entries: FsEntry[], options: FlattenOptions): FsEntry[] {
  return sortEntries(filterEntries(entries, options))
}

/**
 * Walk the loaded tree from `rootPath`, emitting a visible row for every entry
 * whose ancestors are all expanded. Unloaded or collapsed directories simply
 * contribute their own row without descending. Recursion is bounded by the
 * loaded data, so cycles are impossible.
 */
export function flattenTree(
  rootPath: string,
  childrenByDir: ChildrenByDir,
  expanded: ReadonlySet<string>,
  options: FlattenOptions
): TreeRow[] {
  const rows: TreeRow[] = []

  const walk = (dir: string, depth: number) => {
    const raw = childrenByDir[dir]
    if (!raw) {
      return
    }
    const visible = prepareChildren(raw, options)
    for (const entry of visible) {
      const isExpanded = entry.isDirectory && expanded.has(entry.path)
      rows.push({
        entry,
        depth,
        hasChildren: entry.isDirectory,
        expanded: isExpanded
      })
      if (isExpanded) {
        walk(entry.path, depth + 1)
      }
    }
  }

  walk(rootPath, 0)
  return rows
}

/** All ancestor directory paths of a file/dir within a root (for reveal/expand). */
export function ancestorsWithin(rootPath: string, target: string): string[] {
  const norm = (p: string) => p.replace(/\\/g, '/').replace(/\/+$/, '')
  const root = norm(rootPath)
  const child = norm(target)
  if (child === root || !child.startsWith(`${root}/`)) {
    return []
  }
  const rest = child.slice(root.length + 1).split('/')
  const result: string[] = []
  let current = root
  // Every segment except the last (the target itself) is an ancestor directory.
  for (let i = 0; i < rest.length - 1; i += 1) {
    current = `${current}/${rest[i]}`
    result.push(current)
  }
  return [rootPath, ...result.map((p) => p)]
}
