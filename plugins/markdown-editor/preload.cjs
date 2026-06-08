// preload.cjs — Markdown 编辑器文件管理器的「文件系统桥」
// CommonJS，放在插件根目录，由 manifest.preload 指向，不参与 vite/esbuild 打包。
//
// 为什么需要它：渲染层 window.mulby.filesystem 对「非原生对话框选出来的路径」
// （持久化的最近文件夹、点击文件树里的条目等）会触发沙盒授权拦截。preload 在
// 渲染进程以 Node 集成方式运行，不受该沙盒约束，可直接用 fs 读写遍历，并提供
// 宿主缺失的能力：文件监听（fs.watch）与渲染层路径工具（path.*）。
//
// 仅使用 Node 内置模块（fs/path/os）与 electron，无任何 npm 依赖 → 打包无忧。

const fs = require('fs')
const fsp = fs.promises
const path = require('path')
const os = require('os')

function toEntry(name, fullPath, stat) {
  return {
    name,
    path: fullPath,
    isDirectory: stat ? stat.isDirectory() : false,
    isFile: stat ? stat.isFile() : false,
    size: stat ? stat.size : 0,
    mtimeMs: stat ? stat.mtimeMs : 0
  }
}

async function safeStat(target) {
  try {
    return await fsp.stat(target)
  } catch {
    return null
  }
}

// 生成同目录下不重名的路径：foo.md -> foo 1.md -> foo 2.md（目录则 foo -> foo 1）
async function uniquePath(dir, name) {
  const ext = path.extname(name)
  const base = ext ? name.slice(0, -ext.length) : name
  let candidate = path.join(dir, name)
  let i = 1
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await fsp.access(candidate, fs.constants.F_OK)
      candidate = path.join(dir, `${base} ${i}${ext}`)
      i += 1
    } catch {
      return candidate
    }
  }
}

function getShell() {
  try {
    return require('electron').shell
  } catch {
    return null
  }
}

const api = {
  __ready: true,
  version: 1,
  platform: process.platform,

  // ── 读取目录（一次返回带 stat 的条目，避免 N 次 IPC/往返）──────────────
  async list(dir) {
    const names = await fsp.readdir(dir)
    const entries = await Promise.all(
      names.map(async (name) => {
        const full = path.join(dir, name)
        const stat = await safeStat(full)
        return toEntry(name, full, stat)
      })
    )
    return entries
  },

  async stat(target) {
    const stat = await safeStat(target)
    if (!stat) {
      return null
    }
    return toEntry(path.basename(target), target, stat)
  },

  async exists(target) {
    try {
      await fsp.access(target, fs.constants.F_OK)
      return true
    } catch {
      return false
    }
  },

  // ── 文件读写（open/save/图片预览统一走这里，彻底绕过渲染沙盒）─────────
  async readText(target) {
    return await fsp.readFile(target, 'utf-8')
  },

  async writeText(target, content) {
    await fsp.mkdir(path.dirname(target), { recursive: true })
    await fsp.writeFile(target, content, 'utf-8')
    return target
  },

  async readBase64(target) {
    const buf = await fsp.readFile(target)
    return buf.toString('base64')
  },

  // ── 增 ────────────────────────────────────────────────────────────────
  async mkdir(target) {
    await fsp.mkdir(target, { recursive: true })
    return target
  },

  // 在 dir 下新建目录（重名自动加序号），返回最终路径
  async createDir(dir, name) {
    const target = await uniquePath(dir, name)
    await fsp.mkdir(target, { recursive: true })
    return target
  },

  // 在 dir 下新建文件（重名自动加序号），返回最终路径
  async createFile(dir, name, content = '') {
    const target = await uniquePath(dir, name)
    await fsp.mkdir(path.dirname(target), { recursive: true })
    await fsp.writeFile(target, content, 'utf-8')
    return target
  },

  // ── 改 ────────────────────────────────────────────────────────────────
  // 在原目录内重命名为 newName，返回新路径（目标已存在则抛错）
  async rename(target, newName) {
    const dir = path.dirname(target)
    const next = path.join(dir, newName)
    if (next !== target) {
      try {
        await fsp.access(next, fs.constants.F_OK)
        throw new Error('目标名称已存在')
      } catch (err) {
        if (err && err.message === '目标名称已存在') {
          throw err
        }
      }
    }
    await fsp.rename(target, next)
    return next
  },

  // 移动到 destDir（保持原文件名，重名自动加序号），返回新路径
  async move(src, destDir) {
    const name = path.basename(src)
    const target = await uniquePath(destDir, name)
    await fsp.mkdir(destDir, { recursive: true })
    await fsp.rename(src, target)
    return target
  },

  // 复制到 destDir（重名自动加序号），返回新路径
  async copy(src, destDir) {
    const name = path.basename(src)
    const target = await uniquePath(destDir, name)
    await fsp.mkdir(destDir, { recursive: true })
    await fsp.cp(src, target, { recursive: true })
    return target
  },

  // 原地复制副本（同目录），返回新路径
  async duplicate(src) {
    const dir = path.dirname(src)
    const ext = path.extname(src)
    const base = path.basename(src, ext)
    const target = await uniquePath(dir, `${base} copy${ext}`)
    await fsp.cp(src, target, { recursive: true })
    return target
  },

  // ── 删（移到系统废纸篓，可恢复）────────────────────────────────────────
  async trash(target) {
    const shell = getShell()
    if (shell && typeof shell.trashItem === 'function') {
      await shell.trashItem(target)
      return true
    }
    if (window.mulby && window.mulby.shell && window.mulby.shell.trashItem) {
      await window.mulby.shell.trashItem(target)
      return true
    }
    throw new Error('当前环境不支持移动到废纸篓')
  },

  // ── 系统集成 ──────────────────────────────────────────────────────────
  async reveal(target) {
    const shell = getShell()
    if (shell && typeof shell.showItemInFolder === 'function') {
      shell.showItemInFolder(target)
      return true
    }
    if (window.mulby && window.mulby.shell && window.mulby.shell.showItemInFolder) {
      await window.mulby.shell.showItemInFolder(target)
      return true
    }
    return false
  },

  async openExternal(target) {
    const shell = getShell()
    if (shell && typeof shell.openPath === 'function') {
      await shell.openPath(target)
      return true
    }
    if (window.mulby && window.mulby.shell && window.mulby.shell.openPath) {
      await window.mulby.shell.openPath(target)
      return true
    }
    return false
  },

  // ── 文件监听（宿主缺口）──────────────────────────────────────────────
  // 对单个目录做非递归监听（跨平台安全，规避 Linux 不支持 recursive），
  // 去抖后回调。返回 dispose 函数。UI 只监听「当前展开的目录」即可。
  watch(dir, onChange) {
    let timer = null
    let watcher = null
    try {
      watcher = fs.watch(dir, { persistent: false }, () => {
        if (timer) {
          clearTimeout(timer)
        }
        timer = setTimeout(() => {
          try {
            onChange(dir)
          } catch {
            // ignore consumer errors
          }
        }, 150)
      })
      watcher.on('error', () => {
        // 目录被删除/不可访问时静默关闭
      })
    } catch {
      watcher = null
    }
    return () => {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      if (watcher) {
        try {
          watcher.close()
        } catch {
          // ignore
        }
        watcher = null
      }
    }
  },

  // ── 路径工具（渲染层缺口）────────────────────────────────────────────
  path: {
    join: (...parts) => path.join(...parts),
    dirname: (p) => path.dirname(p),
    basename: (p, ext) => path.basename(p, ext),
    extname: (p) => path.extname(p),
    normalize: (p) => path.normalize(p),
    relative: (from, to) => path.relative(from, to),
    isAbsolute: (p) => path.isAbsolute(p),
    sep: path.sep
  },

  // 常用系统目录（home/documents 等），便于「打开文件夹」给默认起点
  homedir: () => os.homedir()
}

try {
  window.mdeFs = api
} catch {
  // 极端环境下 window 不可用时忽略；fsBridge 会检测缺失并降级。
}

module.exports = api
