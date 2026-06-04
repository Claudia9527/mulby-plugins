/// <reference path="./types/mulby.d.ts" />

declare const require: any
declare const process: any
const fs = require('node:fs/promises')
const path = require('node:path')
const os = require('node:os')

declare const mulby: any

type PluginContext = BackendPluginContext

const PLUGIN_TAG = '[disk-assistant]'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScanTree {
  name: string
  path: string
  size: number
  isDirectory: boolean
  extension: string
  modifiedAt: number
  children?: ScanTree[]
}

export interface ScanResult {
  tree: ScanTree
  totalSize: number
  totalFiles: number
  totalDirs: number
  scanTimeMs: number
  truncated: boolean
}

export interface DiskInfo {
  name: string
  path: string
  total: number
  free: number
  used: number
  usedPercent: number
}

interface ScanOptions {
  maxDepth?: number
  minSizeThreshold?: number
  maxChildren?: number
}

// ─── State ────────────────────────────────────────────────────────────────────

let scanCancelled = false
let currentScanId = 0
let scanProgress = {
  dirsScanned: 0,
  filesScanned: 0,
  bytesScanned: 0,
  cachedDirs: 0,
  currentDir: '',
  isScanning: false,
  isIncremental: false,
  startTime: 0,
  topDirs: 0
}

function log(msg: string) {
  console.log(`${PLUGIN_TAG} ${msg}`)
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

export function onLoad() {
  log('loaded')
}

export function onUnload() {
  scanCancelled = true
  log('unloaded')
}

export function onEnable() {
  log('enabled')
}

export function onDisable() {
  log('disabled')
}

export async function run(context: PluginContext) {
  log(`run feature=${context.featureCode ?? ''}`)
}

// ─── Scanning ─────────────────────────────────────────────────────────────────

const SCAN_CONCURRENCY = 6
const FILE_BATCH_SIZE = 32

const SKIP_DIRS = new Set([
  'node_modules', '.git', '.hg', '.svn',
  '$Recycle.Bin', 'System Volume Information',
  '__pycache__', '.cache', '.next', 'dist', 'build'
])

// Skip files with these extensions (virtual archives that crash Electron's asar handler)
const SKIP_EXTS = new Set(['.asar'])

async function scanDirectory(
  dirPath: string,
  scanId: number,
  depth = 0,
  options: ScanOptions = {}
): Promise<ScanTree> {
  const maxDepth = options.maxDepth ?? 10
  const maxChildren = options.maxChildren ?? 5000

  if (scanId !== currentScanId || scanCancelled) {
    throw new Error('Scan cancelled')
  }

  scanProgress.currentDir = dirPath
  scanProgress.dirsScanned++

  const dirName = path.basename(dirPath)

  // 1. Read directory entries
  let entries: any[]
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true })
  } catch {
    return { name: dirName, path: dirPath, size: 0, isDirectory: true, extension: '', modifiedAt: 0, children: [] }
  }

  if (entries.length > maxChildren) {
    entries = entries.slice(0, maxChildren)
  }

  // 2. Separate files and directories
  const fileEntries: { name: string; path: string }[] = []
  const dirEntries: { name: string; path: string }[] = []

  for (const entry of entries) {
    if (scanCancelled || scanId !== currentScanId) break
    const name: string = entry.name ?? entry
    if (SKIP_DIRS.has(name)) continue
    const entryPath = path.join(dirPath, name)
    if (entry.isDirectory?.()) {
      dirEntries.push({ name, path: entryPath })
    } else if (entry.isFile?.()) {
      const ext = path.extname(name).toLowerCase()
      if (SKIP_EXTS.has(ext)) continue
      fileEntries.push({ name, path: entryPath })
    }
  }

  // 3. Batch stat files in parallel
  const fileChildren: ScanTree[] = []
  let fileSize = 0
  for (let i = 0; i < fileEntries.length; i += FILE_BATCH_SIZE) {
    if (scanCancelled || scanId !== currentScanId) break
    const batch = fileEntries.slice(i, i + FILE_BATCH_SIZE)
    const results = await Promise.all(batch.map(async (f) => {
      try {
        const st = await fs.lstat(f.path)
        return { ...f, size: st.size ?? 0, modifiedAt: st.mtimeMs ?? 0 }
      } catch {
        return { ...f, size: 0, modifiedAt: 0 }
      }
    }))
    for (const r of results) {
      const ext = path.extname(r.name).toLowerCase()
      fileChildren.push({
        name: r.name, path: r.path, size: r.size,
        isDirectory: false, extension: ext, modifiedAt: r.modifiedAt
      })
      fileSize += r.size
    }
    scanProgress.filesScanned += batch.length
  }
  scanProgress.bytesScanned += fileSize

  // 4. Scan subdirectories with worker pool (parallel)
  const dirChildren: ScanTree[] = new Array(dirEntries.length)
  if (depth < maxDepth && dirEntries.length > 0) {
    let next = 0
    const workers = Math.min(SCAN_CONCURRENCY, dirEntries.length)
    const promises: Promise<void>[] = []

    for (let w = 0; w < workers; w++) {
      promises.push((async () => {
        while (true) {
          if (scanCancelled || scanId !== currentScanId) break
          const idx = next++
          if (idx >= dirEntries.length) break
          try {
            dirChildren[idx] = await scanDirectory(dirEntries[idx].path, scanId, depth + 1, options)
          } catch {
            dirChildren[idx] = {
              name: dirEntries[idx].name, path: dirEntries[idx].path,
              size: 0, isDirectory: true, extension: '', modifiedAt: 0, children: []
            }
          }
        }
      })())
    }
    await Promise.all(promises)
  } else if (dirEntries.length > 0) {
    // At max depth: quick size estimate for subdirs
    for (let i = 0; i < dirEntries.length; i += FILE_BATCH_SIZE) {
      if (scanCancelled) break
      const batch = dirEntries.slice(i, i + FILE_BATCH_SIZE)
      const results = await Promise.all(batch.map(async (d) => {
        try {
          const subs = await fs.readdir(d.path, { withFileTypes: true })
          let dirSize = 0
          const fileSubs = subs.filter((s: any) => s.isFile?.()).slice(0, 50)
          const stats = await Promise.all(fileSubs.map(async (s: any) => {
            try { const st = await fs.lstat(path.join(d.path, s.name ?? s)); return st.size ?? 0 } catch { return 0 }
          }))
          dirSize = stats.reduce((a: number, b: number) => a + b, 0)
          scanProgress.filesScanned += fileSubs.length
          scanProgress.bytesScanned += dirSize
          return { ...d, size: dirSize }
        } catch {
          return { ...d, size: 0 }
        }
      }))
      for (let j = 0; j < results.length; j++) {
        const r = results[j]
        dirChildren[i + j] = {
          name: r.name, path: r.path, size: r.size,
          isDirectory: true, extension: '', modifiedAt: 0
        }
      }
    }
  }

  // 5. Combine and sort
  const children = [...dirChildren.filter(Boolean), ...fileChildren]
  children.sort((a, b) => b.size - a.size)
  const totalSize = children.reduce((s, c) => s + c.size, 0)

  // Get dir mtime for caching
  let dirMtime = 0
  try { const d = await fs.lstat(dirPath); dirMtime = d.mtimeMs ?? 0 } catch {}

  return {
    name: dirName, path: dirPath, size: totalSize,
    isDirectory: true, extension: '', modifiedAt: dirMtime, children
  }
}

function countItems(tree: ScanTree): { files: number; dirs: number } {
  let files = 0
  let dirs = 0
  const stack: ScanTree[] = [tree]
  while (stack.length > 0) {
    const node = stack.pop()!
    if (node.isDirectory) {
      dirs++
      if (node.children) {
        for (let i = 0; i < node.children.length; i++) {
          stack.push(node.children[i])
        }
      }
    } else {
      files++
    }
  }
  return { files, dirs }
}

// ─── Cache ────────────────────────────────────────────────────────────────────

const CACHE_DIR = path.join(os.homedir(), '.disk-assistant', 'cache')
const CACHE_VERSION = 1

function cacheKey(dirPath: string): string {
  // Use a simple hash for the filename
  let hash = 0
  const normalized = dirPath.replace(/[\\/]+$/, '').toLowerCase()
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) - hash + normalized.charCodeAt(i)) | 0
  }
  return `scan_${Math.abs(hash).toString(36)}`
}

interface CacheFile {
  version: number
  path: string
  scanTime: number
  tree: ScanTree
  totalSize: number
  totalFiles: number
  totalDirs: number
}

async function ensureCacheDir(): Promise<void> {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true })
  } catch { /* exists */ }
}

async function saveCache(dirPath: string, result: ScanResult): Promise<void> {
  try {
    await ensureCacheDir()
    const file: CacheFile = {
      version: CACHE_VERSION,
      path: dirPath,
      scanTime: Date.now(),
      tree: result.tree,
      totalSize: result.totalSize,
      totalFiles: result.totalFiles,
      totalDirs: result.totalDirs
    }
    const filePath = path.join(CACHE_DIR, cacheKey(dirPath) + '.json')
    await fs.writeFile(filePath, JSON.stringify(file), 'utf8')

    // Also save a lightweight summary (root + direct children only)
    const summaryTree: ScanTree = {
      ...result.tree,
      children: (result.tree.children || []).map(c => ({
        ...c,
        children: c.isDirectory ? [] : undefined
      }))
    }
    const summary: CacheFile = {
      version: CACHE_VERSION,
      path: dirPath,
      scanTime: Date.now(),
      tree: summaryTree,
      totalSize: result.totalSize,
      totalFiles: result.totalFiles,
      totalDirs: result.totalDirs
    }
    const summaryPath = path.join(CACHE_DIR, cacheKey(dirPath) + '_summary.json')
    await fs.writeFile(summaryPath, JSON.stringify(summary), 'utf8')

    log(`cache saved: ${filePath}`)
  } catch (e) {
    log(`cache save failed: ${e}`)
  }
}

async function loadCacheFromFile(dirPath: string): Promise<(ScanResult & { cachedAt: number }) | null> {
  try {
    const filePath = path.join(CACHE_DIR, cacheKey(dirPath) + '.json')
    const raw = await fs.readFile(filePath, 'utf8')
    const file: CacheFile = JSON.parse(raw)
    if (file.version !== CACHE_VERSION || file.path !== dirPath) return null
    log(`cache loaded: ${filePath} (age=${Math.round((Date.now() - file.scanTime) / 1000)}s)`)
    return {
      tree: file.tree,
      totalSize: file.totalSize,
      totalFiles: file.totalFiles,
      totalDirs: file.totalDirs,
      scanTimeMs: 0,
      truncated: false,
      cachedAt: file.scanTime
    } as ScanResult & { cachedAt: number }
  } catch {
    return null
  }
}

// Build a lookup map from cached tree: path -> ScanTree node
function buildCacheMap(tree: ScanTree, map: Map<string, ScanTree> = new Map()): Map<string, ScanTree> {
  const stack: ScanTree[] = [tree]
  while (stack.length > 0) {
    const node = stack.pop()!
    if (node.isDirectory) {
      map.set(node.path, node)
      if (node.children) {
        for (let i = 0; i < node.children.length; i++) {
          stack.push(node.children[i])
        }
      }
    }
  }
  return map
}

// ─── Incremental Scan ─────────────────────────────────────────────────────────

async function incrementalScanDirectory(
  dirPath: string,
  scanId: number,
  cachedMap: Map<string, ScanTree>,
  depth = 0,
  options: ScanOptions = {}
): Promise<ScanTree> {
  const maxDepth = options.maxDepth ?? 10
  const maxChildren = options.maxChildren ?? 5000

  if (scanId !== currentScanId || scanCancelled) {
    throw new Error('Scan cancelled')
  }

  scanProgress.currentDir = dirPath
  scanProgress.dirsScanned++

  const dirName = path.basename(dirPath)

  // Check if this directory has an unchanged cached subtree
  const cachedNode = cachedMap.get(dirPath)
  if (cachedNode) {
    try {
      const dirSt = await fs.lstat(dirPath)
      if (Math.abs((dirSt.mtimeMs ?? 0) - cachedNode.modifiedAt) < 1000) {
        // mtime matches -> reuse entire cached subtree
        scanProgress.cachedDirs++
        return { ...cachedNode, name: dirName }
      }
    } catch { /* fall through to rescan */ }
  }

  // Read directory entries
  let entries: any[]
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true })
  } catch {
    return { name: dirName, path: dirPath, size: 0, isDirectory: true, extension: '', modifiedAt: 0, children: [] }
  }

  if (entries.length > maxChildren) entries = entries.slice(0, maxChildren)

  // Separate files and directories
  const fileEntries: { name: string; path: string }[] = []
  const dirEntries: { name: string; path: string }[] = []

  for (const entry of entries) {
    if (scanCancelled || scanId !== currentScanId) break
    const name: string = entry.name ?? entry
    if (SKIP_DIRS.has(name)) continue
    const entryPath = path.join(dirPath, name)
    if (entry.isDirectory?.()) {
      dirEntries.push({ name, path: entryPath })
    } else if (entry.isFile?.()) {
      const ext = path.extname(name).toLowerCase()
      if (SKIP_EXTS.has(ext)) continue
      fileEntries.push({ name, path: entryPath })
    }
  }

  // Batch stat files (with cache check)
  const cachedFileMap = new Map<string, ScanTree>()
  if (cachedNode?.children) {
    for (const c of cachedNode.children) {
      if (!c.isDirectory) cachedFileMap.set(c.path, c)
    }
  }

  const fileChildren: ScanTree[] = []
  let fileSize = 0
  for (let i = 0; i < fileEntries.length; i += FILE_BATCH_SIZE) {
    if (scanCancelled || scanId !== currentScanId) break
    const batch = fileEntries.slice(i, i + FILE_BATCH_SIZE)
    const results = await Promise.all(batch.map(async (f) => {
      try {
        const st = await fs.lstat(f.path)
        const cached = cachedFileMap.get(f.path)
        // If file mtime unchanged and cached exists, reuse cached data
        if (cached && Math.abs((st.mtimeMs ?? 0) - cached.modifiedAt) < 1000) {
          return { ...cached }
        }
        return { ...f, size: st.size ?? 0, modifiedAt: st.mtimeMs ?? 0 }
      } catch {
        return { ...f, size: 0, modifiedAt: 0 }
      }
    }))
    for (const r of results) {
      const ext = path.extname(r.name).toLowerCase()
      fileChildren.push({
        name: r.name, path: r.path, size: r.size,
        isDirectory: false, extension: ext, modifiedAt: r.modifiedAt
      })
      fileSize += r.size
    }
    scanProgress.filesScanned += batch.length
  }
  scanProgress.bytesScanned += fileSize

  // Scan subdirectories with worker pool
  const dirChildren: ScanTree[] = new Array(dirEntries.length)
  if (depth < maxDepth && dirEntries.length > 0) {
    let next = 0
    const workers = Math.min(SCAN_CONCURRENCY, dirEntries.length)
    const promises: Promise<void>[] = []

    for (let w = 0; w < workers; w++) {
      promises.push((async () => {
        while (true) {
          if (scanCancelled || scanId !== currentScanId) break
          const idx = next++
          if (idx >= dirEntries.length) break
          try {
            dirChildren[idx] = await incrementalScanDirectory(
              dirEntries[idx].path, scanId, cachedMap, depth + 1, options
            )
          } catch {
            dirChildren[idx] = {
              name: dirEntries[idx].name, path: dirEntries[idx].path,
              size: 0, isDirectory: true, extension: '', modifiedAt: 0, children: []
            }
          }
        }
      })())
    }
    await Promise.all(promises)
  } else if (dirEntries.length > 0) {
    for (let i = 0; i < dirEntries.length; i += FILE_BATCH_SIZE) {
      if (scanCancelled) break
      const batch = dirEntries.slice(i, i + FILE_BATCH_SIZE)
      const results = await Promise.all(batch.map(async (d) => {
        try {
          const subs = await fs.readdir(d.path, { withFileTypes: true })
          const fileSubs = subs.filter((s: any) => s.isFile?.()).slice(0, 50)
          const stats = await Promise.all(fileSubs.map(async (s: any) => {
            try { const st = await fs.lstat(path.join(d.path, s.name ?? s)); return st.size ?? 0 } catch { return 0 }
          }))
          const dirSize = stats.reduce((a: number, b: number) => a + b, 0)
          scanProgress.filesScanned += fileSubs.length
          scanProgress.bytesScanned += dirSize
          return { ...d, size: dirSize }
        } catch {
          return { ...d, size: 0 }
        }
      }))
      for (let j = 0; j < results.length; j++) {
        const r = results[j]
        dirChildren[i + j] = {
          name: r.name, path: r.path, size: r.size,
          isDirectory: true, extension: '', modifiedAt: 0
        }
      }
    }
  }

  const children = [...dirChildren.filter(Boolean), ...fileChildren]
  children.sort((a, b) => b.size - a.size)
  const totalSize = children.reduce((s, c) => s + c.size, 0)

  // Get dir mtime for caching
  let dirMtime = 0
  try { const d = await fs.lstat(dirPath); dirMtime = d.mtimeMs ?? 0 } catch {}

  return {
    name: dirName, path: dirPath, size: totalSize,
    isDirectory: true, extension: '', modifiedAt: dirMtime, children
  }
}

// ─── Disk Info ────────────────────────────────────────────────────────────────

async function getHomeDir(): Promise<string> {
  return os.homedir()
}

// ─── RPC Methods ──────────────────────────────────────────────────────────────

export const rpc = {
  async scanDirectory(dirPath: string, options?: ScanOptions): Promise<ScanResult> {
    scanCancelled = false
    currentScanId++
    const scanId = currentScanId
    scanProgress = { dirsScanned: 0, filesScanned: 0, bytesScanned: 0, cachedDirs: 0, currentDir: '', isScanning: true, isIncremental: false, startTime: Date.now(), topDirs: 0 }

    const t0 = Date.now()
    try {
      const tree = await scanDirectory(dirPath, scanId, 0, options)
      const counts = countItems(tree)
      const result: ScanResult = {
        tree,
        totalSize: tree.size,
        totalFiles: counts.files,
        totalDirs: counts.dirs,
        scanTimeMs: Date.now() - t0,
        truncated: false
      }
      // Save to cache
      await saveCache(dirPath, result)
      return result
    } catch (e) {
      return {
        tree: {
          name: path.basename(dirPath),
          path: dirPath,
          size: 0,
          isDirectory: true,
          extension: '',
          modifiedAt: 0,
          children: []
        },
        totalSize: 0,
        totalFiles: 0,
        totalDirs: 0,
        scanTimeMs: Date.now() - t0,
        truncated: false
      }
    } finally {
      scanProgress.isScanning = false
    }
  },

  async incrementalScan(dirPath: string, options?: ScanOptions): Promise<ScanResult> {
    // Load cached data for incremental comparison
    const cached = await loadCacheFromFile(dirPath)
    if (!cached) {
      // No cache available, fall back to full scan
      return rpc.scanDirectory(dirPath, options)
    }

    scanCancelled = false
    currentScanId++
    const scanId = currentScanId
    scanProgress = { dirsScanned: 0, filesScanned: 0, bytesScanned: 0, cachedDirs: 0, currentDir: '', isScanning: true, isIncremental: true, startTime: Date.now(), topDirs: 0 }

    const t0 = Date.now()
    try {
      const cachedMap = buildCacheMap(cached.tree)
      const tree = await incrementalScanDirectory(dirPath, scanId, cachedMap, 0, options)
      const counts = countItems(tree)
      const result: ScanResult = {
        tree,
        totalSize: tree.size,
        totalFiles: counts.files,
        totalDirs: counts.dirs,
        scanTimeMs: Date.now() - t0,
        truncated: false
      }
      // Update cache
      await saveCache(dirPath, result)
      return result
    } catch (e) {
      // Return cached data on failure
      return cached
    } finally {
      scanProgress.isScanning = false
    }
  },

  async loadCache(dirPath: string): Promise<(ScanResult & { cachedAt: number }) | null> {
    // Load lightweight summary first for fast display
    try {
      const summaryPath = path.join(CACHE_DIR, cacheKey(dirPath) + '_summary.json')
      const raw = await fs.readFile(summaryPath, 'utf8')
      const file: CacheFile = JSON.parse(raw)
      if (file.version !== CACHE_VERSION || file.path !== dirPath) return null
      log(`summary cache loaded: ${summaryPath} (age=${Math.round((Date.now() - file.scanTime) / 1000)}s)`)
      return {
        tree: file.tree,
        totalSize: file.totalSize,
        totalFiles: file.totalFiles,
        totalDirs: file.totalDirs,
        scanTimeMs: 0,
        truncated: false,
        cachedAt: file.scanTime
      } as ScanResult & { cachedAt: number }
    } catch {
      // Fallback to full cache
      return loadCacheFromFile(dirPath)
    }
  },

  async cancelScan(): Promise<{ ok: boolean }> {
    scanCancelled = true
    return { ok: true }
  },

  async getScanStatus(): Promise<typeof scanProgress> {
    return { ...scanProgress }
  },

  async getDiskInfo(): Promise<{ disks: DiskInfo[]; homeDir: string }> {
    const homeDir = await getHomeDir()
    const disks: DiskInfo[] = []

    // On Windows, try to get drive space via PowerShell (wmic is deprecated in Win11)
    if (process.platform === 'win32') {
      try {
        const { execSync } = require('node:child_process')
        // Use pipe delimiter to avoid issues with commas in volume names
        const psCmd = [
          '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8;',
          'Get-CimInstance Win32_LogicalDisk',
          '| ForEach-Object { "$($_.DeviceID)|$($_.FreeSpace)|$($_.Size)|$($_.VolumeName)" }'
        ].join(' ')
        const result = execSync(
          `powershell -NoProfile -Command "${psCmd}"`,
          { encoding: 'utf8', timeout: 10000 }
        )
        const lines = result.split('\n').map((l: string) => l.trim()).filter(Boolean)
        for (const line of lines) {
          const parts = line.split('|')
          if (parts.length >= 3) {
            const deviceId = parts[0].trim()
            const free = parseInt(parts[1]) || 0
            const total = parseInt(parts[2]) || 0
            const volumeName = (parts[3] || '').trim()
            if (total > 0) {
              disks.push({
                name: volumeName ? `${volumeName} (${deviceId})` : deviceId,
                path: deviceId + '\\',
                total,
                free,
                used: total - free,
                usedPercent: Math.round(((total - free) / total) * 100)
              })
            }
          }
        }
      } catch {
        // Fallback: report common drives without size info
        for (const letter of ['C', 'D', 'E']) {
          try {
            const fs = require('node:fs')
            const testPath = `${letter}:\\`
            if (fs.existsSync(testPath)) {
              disks.push({
                name: `${letter}:`,
                path: testPath,
                total: 0,
                free: 0,
                used: 0,
                usedPercent: 0
              })
            }
          } catch { /* skip */ }
        }
      }
    } else {
      // macOS/Linux: use home directory
      disks.push({
        name: 'Home',
        path: homeDir,
        total: 0,
        free: 0,
        used: 0,
        usedPercent: 0
      })
    }

    return { disks, homeDir }
  }
}

const plugin = { onLoad, onUnload, onEnable, onDisable, run }
export default plugin
