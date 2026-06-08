// Adapter over the preload file-system bridge (window.mdeFs). The rest of the UI
// depends only on this module, so the implementation can change (e.g. swap to a
// backend RPC) without touching the explorer hook/component, and unit-tested code
// never references window directly.

import type { FsEntry } from './fileTree'

interface MdeFsPath {
  join: (...parts: string[]) => string
  dirname: (p: string) => string
  basename: (p: string, ext?: string) => string
  extname: (p: string) => string
  normalize: (p: string) => string
  relative: (from: string, to: string) => string
  isAbsolute: (p: string) => boolean
  sep: string
}

/** The narrow Node bridge injected by preload.cjs. */
export interface MdeFs {
  __ready: boolean
  version: number
  platform: string
  list: (dir: string) => Promise<FsEntry[]>
  stat: (path: string) => Promise<FsEntry | null>
  exists: (path: string) => Promise<boolean>
  readText: (path: string) => Promise<string>
  writeText: (path: string, content: string) => Promise<string>
  readBase64: (path: string) => Promise<string>
  mkdir: (path: string) => Promise<string>
  createDir: (dir: string, name: string) => Promise<string>
  createFile: (dir: string, name: string, content?: string) => Promise<string>
  rename: (path: string, newName: string) => Promise<string>
  move: (src: string, destDir: string) => Promise<string>
  copy: (src: string, destDir: string) => Promise<string>
  duplicate: (src: string) => Promise<string>
  trash: (path: string) => Promise<boolean>
  reveal: (path: string) => Promise<boolean>
  openExternal: (path: string) => Promise<boolean>
  watch: (dir: string, onChange: (dir: string) => void) => () => void
  path: MdeFsPath
  homedir: () => string
}

declare global {
  interface Window {
    mdeFs?: MdeFs
  }
}

/** Whether the preload bridge loaded. When false, the explorer degrades gracefully. */
export function isFsBridgeAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.mdeFs && window.mdeFs.__ready === true
}

/** Get the bridge or throw a user-facing error (callers should guard with isFsBridgeAvailable). */
export function getFsBridge(): MdeFs {
  const bridge = typeof window !== 'undefined' ? window.mdeFs : undefined
  if (!bridge || bridge.__ready !== true) {
    throw new Error('文件系统桥未就绪（请重载插件）')
  }
  return bridge
}
