/**
 * Vibe 插件「契约」模型与序列化。
 *
 * 设计理念（借鉴 develop-mulby-plugin 技能）：把 manifest.json 当作插件的唯一契约/真相。
 * 新建与改造都先确认一份结构化契约，再由本工具**确定性地**写出 manifest.json（而非交给 AI 猜），
 * AI 只负责按契约实现 src/ 代码。这样可控、可编辑、可验证。
 */

export type FeatureMode = 'ui' | 'silent' | 'detached'
export type PluginTemplate = 'react' | 'basic'

/** Mulby 宿主支持的全部触发类型（与 search-matcher 的 MatchType 对齐） */
export type TriggerType = 'keyword' | 'regex' | 'over' | 'files' | 'img' | 'window'

/**
 * 统一的触发描述。一个字段超集，按 type 取用对应字段；序列化时只写出该 type 需要的字段。
 * `sample` 仅用于 UI 一键试用（不写入 manifest）。
 */
export interface VibeTrigger {
  type: TriggerType
  /** keyword：关键词文本 */
  value?: string
  /** regex：正则字符串；files：匹配文件名的正则 */
  match?: string
  /** 指令显示名（regex/over/files/img/window） */
  label?: string
  /** regex 的人类说明 */
  explain?: string
  /** 输入长度限制（regex/over/files 文件数） */
  minLength?: number
  maxLength?: number
  /** files/img：扩展名（不带点亦可） */
  exts?: string[]
  /** files：文件类型过滤 */
  fileType?: 'file' | 'directory' | 'any'
  /** over：排除正则 */
  exclude?: string
  /** window：应用/标题/bundleId 匹配（"/正则/" 或精确） */
  app?: string
  title?: string
  bundleId?: string
  /** 仅 UI：一键试用时填入搜索框的示例输入（regex/over 用） */
  sample?: string
}

export const TRIGGER_TYPES: Array<{ value: TriggerType; label: string; hint: string }> = [
  { value: 'keyword', label: '关键词', hint: '输入该词触发（支持拼音/首字母），可绑快捷键' },
  { value: 'regex', label: '正则匹配', hint: '输入文本匹配正则即触发：金额/URL/IP/手机号等' },
  { value: 'over', label: '任意文本', hint: '对任意输入文本生效（可设长度/排除）' },
  { value: 'files', label: '文件拖入', hint: '拖入文件/文件夹触发（可限扩展名）' },
  { value: 'img', label: '图片拖入', hint: '拖入图片触发' },
  { value: 'window', label: '活跃窗口', hint: '匹配前台应用/窗口触发' }
]

export interface VibeFeature {
  /** 唯一功能码 */
  code: string
  /** 人类可读说明 */
  explain: string
  /** 运行模式 */
  mode: FeatureMode
  /** 触发方式（支持 keyword/regex/over/files/img/window 多种） */
  triggers: VibeTrigger[]
}

export interface VibeTool {
  name: string
  description: string
}

const numOrU = (v: any): number | undefined => (typeof v === 'number' && isFinite(v) ? v : undefined)
const arrOrU = (v: any): string[] | undefined => (Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : undefined)

/** 把宿主 cmd（或字符串简写）解析为 VibeTrigger */
export function cmdToTrigger(c: any): VibeTrigger | null {
  if (typeof c === 'string') {
    const v = c.trim()
    return v ? { type: 'keyword', value: v } : null
  }
  if (!c || typeof c !== 'object') return null
  switch (c.type) {
    case 'keyword':
      return c.value ? { type: 'keyword', value: String(c.value) } : null
    case 'regex':
      return c.match
        ? { type: 'regex', match: String(c.match), label: c.label && String(c.label), explain: c.explain && String(c.explain), minLength: numOrU(c.minLength), maxLength: numOrU(c.maxLength) }
        : null
    case 'over':
      return { type: 'over', label: c.label && String(c.label), exclude: c.exclude && String(c.exclude), minLength: numOrU(c.minLength), maxLength: numOrU(c.maxLength) }
    case 'files':
      return { type: 'files', label: c.label && String(c.label), exts: arrOrU(c.exts), fileType: ['file', 'directory', 'any'].includes(c.fileType) ? c.fileType : undefined, match: c.match && String(c.match), minLength: numOrU(c.minLength), maxLength: numOrU(c.maxLength) }
    case 'img':
      return { type: 'img', label: c.label && String(c.label), exts: arrOrU(c.exts) }
    case 'window': {
      const t: VibeTrigger = { type: 'window', label: c.label && String(c.label), app: c.app && String(c.app), title: c.title && String(c.title), bundleId: c.bundleId && String(c.bundleId) }
      return t.app || t.title || t.bundleId ? t : null
    }
    default:
      return null
  }
}

/** 解析 AI 返回的触发描述（cmd/字符串），并保留 sample */
function normalizeTrigger(raw: any): VibeTrigger | null {
  const t = cmdToTrigger(raw)
  if (!t) return null
  if (raw && typeof raw === 'object' && typeof raw.sample === 'string' && raw.sample.trim()) t.sample = raw.sample.trim()
  return t
}

/** 把 VibeTrigger 序列化为宿主 cmd（剔除空字段与 UI-only 的 sample），无效返回 null */
export function triggerToCmd(t: VibeTrigger): Record<string, unknown> | null {
  switch (t.type) {
    case 'keyword': {
      const value = (t.value || '').trim()
      return value ? { type: 'keyword', value } : null
    }
    case 'regex': {
      const match = (t.match || '').trim()
      if (!match) return null
      const c: Record<string, unknown> = { type: 'regex', match }
      if (t.label?.trim()) c.label = t.label.trim()
      if (t.explain?.trim()) c.explain = t.explain.trim()
      if (typeof t.minLength === 'number') c.minLength = t.minLength
      if (typeof t.maxLength === 'number') c.maxLength = t.maxLength
      return c
    }
    case 'over': {
      const c: Record<string, unknown> = { type: 'over' }
      if (t.label?.trim()) c.label = t.label.trim()
      if (t.exclude?.trim()) c.exclude = t.exclude.trim()
      if (typeof t.minLength === 'number') c.minLength = t.minLength
      if (typeof t.maxLength === 'number') c.maxLength = t.maxLength
      return c
    }
    case 'files': {
      const c: Record<string, unknown> = { type: 'files' }
      if (t.label?.trim()) c.label = t.label.trim()
      const exts = (t.exts || []).map((e) => e.trim()).filter(Boolean)
      if (exts.length) c.exts = exts
      if (t.fileType && t.fileType !== 'any') c.fileType = t.fileType
      if (t.match?.trim()) c.match = t.match.trim()
      if (typeof t.minLength === 'number') c.minLength = t.minLength
      if (typeof t.maxLength === 'number') c.maxLength = t.maxLength
      return c
    }
    case 'img': {
      const c: Record<string, unknown> = { type: 'img' }
      if (t.label?.trim()) c.label = t.label.trim()
      const exts = (t.exts || []).map((e) => e.trim()).filter(Boolean)
      if (exts.length) c.exts = exts
      return c
    }
    case 'window': {
      const c: Record<string, unknown> = { type: 'window' }
      if (t.label?.trim()) c.label = t.label.trim()
      if (t.app?.trim()) c.app = t.app.trim()
      if (t.title?.trim()) c.title = t.title.trim()
      if (t.bundleId?.trim()) c.bundleId = t.bundleId.trim()
      return c.app || c.title || c.bundleId ? c : null
    }
  }
}

/** 触发的一行可读描述（UI 摘要用） */
export function triggerLabel(t: VibeTrigger): string {
  switch (t.type) {
    case 'keyword': return `关键词「${t.value || ''}」`
    case 'regex': return `正则 ${t.match || ''}${t.label ? `（${t.label}）` : ''}`
    case 'over': return `任意文本${t.label ? `（${t.label}）` : ''}`
    case 'files': return `文件${t.exts?.length ? ` ${t.exts.join('/')}` : ''}`
    case 'img': return '图片拖入'
    case 'window': return `窗口 ${t.app || t.title || t.bundleId || ''}`
  }
}

/**
 * 契约编辑器暴露的布尔权限开关，严格对齐官方 manifest-schema.json 的 permissions。
 * 注意：schema 中并无 "shell" 权限（openExternal 等无需声明）。
 * `sensitive` 为敏感/隐私权限，UI 折叠在「敏感权限」分组，默认不展开。
 */
export const PERMISSION_OPTIONS = [
  { key: 'clipboard', label: '剪贴板', sensitive: false },
  { key: 'notification', label: '系统通知', sensitive: false },
  { key: 'filesystem', label: '文件读写', sensitive: false },
  { key: 'ai', label: 'AI 能力', sensitive: false },
  { key: 'runCommand', label: '执行命令', sensitive: true },
  { key: 'webview', label: '内嵌网页', sensitive: true },
  { key: 'microphone', label: '麦克风', sensitive: true },
  { key: 'camera', label: '摄像头', sensitive: true },
  { key: 'screen', label: '屏幕录制', sensitive: true },
  { key: 'geolocation', label: '定位', sensitive: true },
  { key: 'accessibility', label: '辅助功能', sensitive: true },
  { key: 'inputMonitor', label: '输入监听', sensitive: true },
  { key: 'contacts', label: '通讯录', sensitive: true },
  { key: 'calendar', label: '日历', sensitive: true }
] as const

export type PermissionKey = (typeof PERMISSION_OPTIONS)[number]['key']

/** 插件分类（manifest.type，enum 对齐 schema） */
export type PluginCategory = 'utility' | 'productivity' | 'developer' | 'system' | 'media' | 'network' | 'ai' | 'entertainment' | 'other'
export const CATEGORY_OPTIONS: Array<{ value: PluginCategory; label: string }> = [
  { value: 'utility', label: '实用工具' },
  { value: 'productivity', label: '效率' },
  { value: 'developer', label: '开发者' },
  { value: 'system', label: '系统' },
  { value: 'media', label: '媒体' },
  { value: 'network', label: '网络' },
  { value: 'ai', label: 'AI' },
  { value: 'entertainment', label: '娱乐' },
  { value: 'other', label: '其他' }
]

export type PlatformKey = 'darwin' | 'win32' | 'linux'
export const PLATFORM_OPTIONS: Array<{ value: PlatformKey; label: string }> = [
  { value: 'darwin', label: 'macOS' },
  { value: 'win32', label: 'Windows' },
  { value: 'linux', label: 'Linux' }
]

/** 独立窗口配置（VibeContract 暴露的常用子集，对齐 schema WindowOptions） */
export interface VibeWindow {
  width?: number
  height?: number
  minWidth?: number
  minHeight?: number
  type?: 'default' | 'borderless' | 'fullscreen'
  alwaysOnTop?: boolean
  transparent?: boolean
  resizable?: boolean
}

/** 插件行为设置（对齐 schema pluginSetting 常用子集） */
export interface VibeBehavior {
  single?: boolean
  defaultDetached?: boolean
  background?: boolean
  persistent?: boolean
}

export interface VibeContract {
  name: string
  displayName: string
  description: string
  version: string
  template: PluginTemplate
  /** 分类（manifest.type） */
  type?: PluginCategory
  /** 作者 */
  author?: string
  /** 平台限制（空 = 全平台） */
  platform?: PlatformKey[]
  features: VibeFeature[]
  permissions: Record<string, boolean>
  tools: VibeTool[]
  /** 独立窗口配置（react/detached 时有意义） */
  window?: VibeWindow
  /** 行为设置 */
  behavior?: VibeBehavior
  needIcon: boolean
  /** 改造模式上下文 */
  isEdit?: boolean
  targetPath?: string
  pluginId?: string
  /** AI 对本次改动的一句话说明（仅改造模式） */
  editSummary?: string
}

export const toKebab = (input: string) =>
  (input || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'my-plugin'

/** 取首个功能 */
export function primaryFeature(c: VibeContract): VibeFeature | undefined {
  return c.features[0]
}

/** 取一个可用于「一键试用」的示例输入：优先关键词，其次 regex/over 的 sample，最后插件名 */
export function primaryTrigger(c: VibeContract): string {
  const ts = c.features[0]?.triggers || []
  const kw = ts.find((t) => t.type === 'keyword' && t.value?.trim())
  if (kw?.value) return kw.value.trim()
  const sampled = ts.find((t) => t.sample?.trim())
  if (sampled?.sample) return sampled.sample.trim()
  return c.name
}

/** 取首个功能码（plugin.run 需要 featureCode） */
export function primaryFeatureCode(c: VibeContract): string {
  return c.features[0]?.code || 'main'
}

/** 一份合理的默认契约（AI 规划失败时兜底，或编辑器初值） */
export function defaultContract(sentence: string): VibeContract {
  const name = toKebab(sentence).split('-').slice(0, 4).join('-') || 'my-plugin'
  return {
    name,
    displayName: (sentence || name).slice(0, 12),
    description: sentence || name,
    version: '1.0.0',
    template: 'react',
    type: 'utility',
    platform: [],
    features: [
      { code: 'main', explain: sentence || '打开插件', mode: 'detached', triggers: [{ type: 'keyword', value: name }] }
    ],
    permissions: { clipboard: true, notification: true },
    tools: [],
    window: { width: 480, height: 600 },
    behavior: { single: true, defaultDetached: true },
    needIcon: true
  }
}

const CATEGORY_SET = new Set(CATEGORY_OPTIONS.map((o) => o.value))
function parseCategory(v: any): PluginCategory | undefined {
  return typeof v === 'string' && CATEGORY_SET.has(v as PluginCategory) ? (v as PluginCategory) : undefined
}
function parsePlatform(v: any): PlatformKey[] {
  const valid = new Set<PlatformKey>(['darwin', 'win32', 'linux'])
  const arr = Array.isArray(v) ? v : (typeof v === 'string' ? [v] : [])
  return arr.map((x) => String(x)).filter((x): x is PlatformKey => valid.has(x as PlatformKey))
}
function parseWindow(v: any): VibeWindow | undefined {
  if (!v || typeof v !== 'object') return undefined
  const w: VibeWindow = {}
  if (numOrU(v.width)) w.width = v.width
  if (numOrU(v.height)) w.height = v.height
  if (numOrU(v.minWidth)) w.minWidth = v.minWidth
  if (numOrU(v.minHeight)) w.minHeight = v.minHeight
  if (['default', 'borderless', 'fullscreen'].includes(v.type)) w.type = v.type
  if (typeof v.alwaysOnTop === 'boolean') w.alwaysOnTop = v.alwaysOnTop
  if (typeof v.transparent === 'boolean') w.transparent = v.transparent
  if (typeof v.resizable === 'boolean') w.resizable = v.resizable
  return Object.keys(w).length ? w : undefined
}
function parseBehavior(v: any): VibeBehavior | undefined {
  if (!v || typeof v !== 'object') return undefined
  const b: VibeBehavior = {}
  if (typeof v.single === 'boolean') b.single = v.single
  if (typeof v.defaultDetached === 'boolean') b.defaultDetached = v.defaultDetached
  if (typeof v.background === 'boolean') b.background = v.background
  if (typeof v.persistent === 'boolean') b.persistent = v.persistent
  return Object.keys(b).length ? b : undefined
}

/** 把 AI 返回的 JSON 规范化为契约（带兜底） */
export function normalizeContract(raw: any, sentence: string): VibeContract {
  const base = defaultContract(sentence)
  if (!raw || typeof raw !== 'object') return base

  const template: PluginTemplate = raw.template === 'basic' ? 'basic' : 'react'

  const features: VibeFeature[] = Array.isArray(raw.features) && raw.features.length
    ? raw.features
        .filter((f: any) => f && (f.code || f.explain))
        .map((f: any, i: number) => {
          let triggers: VibeTrigger[] = []
          if (Array.isArray(f.triggers)) triggers = f.triggers.map(normalizeTrigger).filter(Boolean) as VibeTrigger[]
          else if (Array.isArray(f.cmds)) triggers = f.cmds.map(normalizeTrigger).filter(Boolean) as VibeTrigger[]
          else if (Array.isArray(f.keywords)) triggers = f.keywords.map((k: any) => String(k).trim()).filter(Boolean).map((v: string) => ({ type: 'keyword' as const, value: v }))
          else if (f.keyword) triggers = [{ type: 'keyword', value: String(f.keyword) }]
          if (!triggers.length) triggers = [{ type: 'keyword', value: toKebab(String(raw.name || base.name)) }]
          return {
            code: toKebab(String(f.code || `feature-${i + 1}`)).replace(/-/g, '_') || `feature_${i + 1}`,
            explain: String(f.explain || f.code || '功能'),
            mode: (['ui', 'silent', 'detached'].includes(f.mode) ? f.mode : (template === 'react' ? 'detached' : 'silent')) as FeatureMode,
            triggers
          }
        })
    : base.features

  const permissions: Record<string, boolean> = { ...base.permissions }
  if (raw.permissions && typeof raw.permissions === 'object') {
    for (const opt of PERMISSION_OPTIONS) {
      if (typeof raw.permissions[opt.key] === 'boolean') permissions[opt.key] = raw.permissions[opt.key]
    }
  }

  const tools: VibeTool[] = Array.isArray(raw.tools)
    ? raw.tools
        .filter((t: any) => t && typeof t.name === 'string' && t.name.trim())
        .map((t: any) => ({ name: String(t.name).trim(), description: String(t.description || '') }))
    : []

  const behavior = parseBehavior(raw.behavior) || parseBehavior(raw.pluginSetting) || {
    single: true,
    defaultDetached: features.some((f) => f.mode === 'detached')
  }
  const window = template === 'react' ? (parseWindow(raw.window) || base.window) : parseWindow(raw.window)

  return {
    name: toKebab(String(raw.name || base.name)),
    displayName: String(raw.displayName || base.displayName).slice(0, 24),
    description: String(raw.description || base.description),
    version: '1.0.0',
    template,
    type: parseCategory(raw.type) || 'utility',
    author: typeof raw.author === 'string' && raw.author.trim() ? raw.author.trim() : undefined,
    platform: parsePlatform(raw.platform),
    features: features.length ? features : base.features,
    permissions,
    tools,
    window,
    behavior,
    needIcon: raw.needIcon !== false
  }
}

/** 从已有 manifest 文本解析出契约（改造模式） */
export function manifestToContract(raw: string, fallbackName: string): VibeContract | null {
  let mf: any
  try { mf = JSON.parse(raw) } catch { return null }
  if (!mf || typeof mf !== 'object') return null

  const id = String(mf.id || mf.name || fallbackName).trim()
  const name = String(mf.name || id).trim()
  const template: PluginTemplate = mf.ui ? 'react' : 'basic'

  const features: VibeFeature[] = Array.isArray(mf.features) && mf.features.length
    ? mf.features.map((f: any, i: number) => ({
        code: String(f.code || `feature_${i + 1}`),
        explain: String(f.explain || f.code || '功能'),
        mode: (['ui', 'silent', 'detached'].includes(f.mode) ? f.mode : (mf.ui ? 'detached' : 'silent')) as FeatureMode,
        triggers: Array.isArray(f.cmds)
          ? (f.cmds.map(cmdToTrigger).filter(Boolean) as VibeTrigger[])
          : []
      }))
    : [{ code: 'main', explain: mf.description || '打开插件', mode: (mf.ui ? 'detached' : 'silent') as FeatureMode, triggers: [{ type: 'keyword', value: name }] }]

  const permissions: Record<string, boolean> = {}
  for (const opt of PERMISSION_OPTIONS) {
    permissions[opt.key] = !!(mf.permissions && mf.permissions[opt.key])
  }

  const tools: VibeTool[] = Array.isArray(mf.tools)
    ? mf.tools.filter((t: any) => t?.name).map((t: any) => ({ name: String(t.name), description: String(t.description || '') }))
    : []

  return {
    name: name || id,
    displayName: String(mf.displayName || name || id),
    description: String(mf.description || ''),
    version: String(mf.version || '1.0.0'),
    template,
    type: parseCategory(mf.type),
    author: typeof mf.author === 'string' && mf.author.trim() ? mf.author.trim() : undefined,
    platform: parsePlatform(mf.platform),
    features,
    permissions,
    tools,
    window: parseWindow(mf.window),
    behavior: parseBehavior(mf.pluginSetting),
    needIcon: false,
    isEdit: true,
    pluginId: id || name
  }
}

/** 把契约确定性地序列化为 manifest 对象；改造时在 base（原 manifest）上做最小覆盖 */
export function contractToManifest(c: VibeContract, base?: any): Record<string, unknown> {
  const m: Record<string, any> = base && typeof base === 'object' ? { ...base } : {}

  m.id = m.id || c.name
  m.name = m.name || c.name
  m.version = c.version || m.version || '1.0.0'
  m.displayName = c.displayName
  m.description = c.description
  m.main = m.main || 'dist/main.js'
  m.icon = m.icon || 'icon.png'

  if (c.type) m.type = c.type
  if (c.author?.trim()) m.author = c.author.trim()

  // 平台：0 或 3 个 = 全平台 → 省略；1 个写字符串，2 个写数组
  const plats = (c.platform || []).filter((p, i, a) => a.indexOf(p) === i)
  if (plats.length === 1) m.platform = plats[0]
  else if (plats.length === 2) m.platform = plats
  else delete m.platform

  // 是否真的需要界面：只有存在 ui/detached 功能才声明 ui 入口。
  // 关键：即使 template 选了 react，但所有功能都是 silent（纯命令/无界面），也不写 ui，
  // 否则宿主会按「有界面」尝试打开窗口，而插件其实没有 UI → 打开失败。
  const needsUi = c.features.some((f) => f.mode === 'ui' || f.mode === 'detached')
  if (c.template === 'react' && needsUi) {
    m.ui = m.ui || 'ui/index.html'
  } else {
    delete m.ui
  }

  m.features = c.features.map((f) => {
    const cmds = (f.triggers || []).map(triggerToCmd).filter(Boolean) as Record<string, unknown>[]
    return {
      code: f.code,
      explain: f.explain,
      mode: f.mode,
      cmds: cmds.length ? cmds : [{ type: 'keyword', value: f.code || c.name }]
    }
  })

  // 窗口：保留 base.window，叠加契约里有值的字段；basic 模板无界面则不写
  const winSrc = c.window || {}
  const winClean: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(winSrc)) {
    if (v !== undefined && v !== '' && !(typeof v === 'number' && !isFinite(v))) winClean[k] = v
  }
  if (needsUi) {
    const merged = { ...(base?.window && typeof base.window === 'object' ? base.window : {}), ...winClean }
    if (Object.keys(merged).length) m.window = merged
  } else {
    delete m.window
  }

  // 权限：保留 base 中结构化/未覆盖的权限（commandExecution、envKeys 等），只写为 true 的布尔开关
  const perms: Record<string, any> = {}
  if (base?.permissions && typeof base.permissions === 'object') {
    for (const [k, v] of Object.entries(base.permissions)) {
      if (!PERMISSION_OPTIONS.some((o) => o.key === k)) perms[k] = v
    }
  }
  for (const opt of PERMISSION_OPTIONS) if (c.permissions[opt.key]) perms[opt.key] = true
  if (Object.keys(perms).length) m.permissions = perms
  else delete m.permissions

  // pluginSetting：保留 base，叠加行为设置
  const ps: Record<string, any> = (m.pluginSetting && typeof m.pluginSetting === 'object') ? { ...m.pluginSetting } : {}
  const beh = c.behavior || {}
  if (typeof beh.single === 'boolean') ps.single = beh.single
  if (typeof beh.defaultDetached === 'boolean') ps.defaultDetached = beh.defaultDetached
  if (typeof beh.background === 'boolean') ps.background = beh.background
  if (typeof beh.persistent === 'boolean') ps.persistent = beh.persistent
  if (ps.single === undefined) ps.single = true
  if (ps.defaultDetached === undefined) ps.defaultDetached = c.features.some((f) => f.mode === 'detached')
  // 无界面插件强制非独立窗口，纠正历史上被错误置为 true 的 base manifest
  if (!needsUi) ps.defaultDetached = false
  m.pluginSetting = ps

  if (c.tools.length) {
    m.tools = c.tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: { type: 'object', properties: {}, additionalProperties: true }
    }))
  } else if (m.tools) {
    delete m.tools
  }

  return m
}

/** 序列化为 manifest.json 文本（2 空格缩进 + 末尾换行） */
export function manifestJson(c: VibeContract, base?: any): string {
  return JSON.stringify(contractToManifest(c, base), null, 2) + '\n'
}

/** 契约的一行摘要（用于时间线/日志） */
export function contractSummary(c: VibeContract): string {
  const feat = c.features.map((f) => `${f.code}(${f.mode})`).join(', ')
  return `${c.name} · ${c.template} · ${feat || '无功能'}`
}
