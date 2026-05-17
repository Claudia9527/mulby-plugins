/// <reference path="./types/mulby.d.ts" />

type PluginContext = BackendPluginContext

interface BookEntry {
  id: string
  title: string
  filePath: string
  addedAt: number
  lastReadAt: number
  progress: number
}

interface ReaderSettings {
  fontSize: number
  lineHeight: number
  theme: 'light' | 'dark' | 'sepia'
}

const BOOKSHELF_KEY = 'bookshelf'
const SETTINGS_KEY = 'settings'
const PROGRESS_PREFIX = 'progress:'

function bookId(filePath: string): string {
  let hash = 0
  for (let i = 0; i < filePath.length; i++) {
    const ch = filePath.charCodeAt(i)
    hash = ((hash << 5) - hash) + ch
    hash |= 0
  }
  return `book_${Math.abs(hash).toString(36)}`
}

function titleFromPath(filePath: string): string {
  const name = filePath.split(/[/\\]/).pop() ?? 'unknown'
  return name.replace(/\.txt$/i, '')
}

function log(evt: string) {
  console.log(`[novel-reader] ${evt}`)
}

// ── 生命周期 ──

export function onLoad() { log('插件已加载') }
export function onUnload() { log('插件已卸载') }
export function onEnable() { log('插件已启用') }
export function onDisable() { log('插件已禁用') }

export async function run(_context: PluginContext) {
  log('插件触发')
}

// ── Host RPC ──

export const host = {

  async openFile(ctx: PluginContext, filePath: string) {
    const text = await ctx.api.filesystem.readFile(filePath, 'utf-8')
    return text
  },

  async getBookList(ctx: PluginContext): Promise<BookEntry[]> {
    const data = await ctx.api.storage.get(BOOKSHELF_KEY)
    return Array.isArray(data) ? data : []
  },

  async addBook(ctx: PluginContext, filePath: string): Promise<BookEntry> {
    const id = bookId(filePath)
    const books: BookEntry[] = (await ctx.api.storage.get(BOOKSHELF_KEY)) ?? []

    const existing = books.find((b) => b.id === id)
    if (existing) return existing

    const entry: BookEntry = {
      id,
      title: titleFromPath(filePath),
      filePath,
      addedAt: Date.now(),
      lastReadAt: 0,
      progress: 0,
    }
    books.push(entry)
    await ctx.api.storage.set(BOOKSHELF_KEY, books)
    return entry
  },

  async removeBook(ctx: PluginContext, bookId: string): Promise<boolean> {
    const books: BookEntry[] = (await ctx.api.storage.get(BOOKSHELF_KEY)) ?? []
    const filtered = books.filter((b) => b.id !== bookId)
    if (filtered.length === books.length) return false
    await ctx.api.storage.set(BOOKSHELF_KEY, filtered)
    await ctx.api.storage.remove(`${PROGRESS_PREFIX}${bookId}`)
    return true
  },

  async saveProgress(ctx: PluginContext, bookId: string, progress: number): Promise<void> {
    await ctx.api.storage.set(`${PROGRESS_PREFIX}${bookId}`, { progress, updatedAt: Date.now() })

    const books: BookEntry[] = (await ctx.api.storage.get(BOOKSHELF_KEY)) ?? []
    const idx = books.findIndex((b) => b.id === bookId)
    if (idx !== -1) {
      books[idx].progress = progress
      books[idx].lastReadAt = Date.now()
      await ctx.api.storage.set(BOOKSHELF_KEY, books)
    }
  },

  async getProgress(ctx: PluginContext, bookId: string): Promise<number> {
    const data = await ctx.api.storage.get(`${PROGRESS_PREFIX}${bookId}`)
    return data?.progress ?? 0
  },

  async getSettings(ctx: PluginContext): Promise<ReaderSettings> {
    const data = await ctx.api.storage.get(SETTINGS_KEY)
    return data ?? { fontSize: 18, lineHeight: 1.8, theme: 'light' }
  },

  async saveSettings(ctx: PluginContext, settings: ReaderSettings): Promise<void> {
    await ctx.api.storage.set(SETTINGS_KEY, settings)
  },
}

export default { onLoad, onUnload, onEnable, onDisable, run, host }
