/// <reference path="./types/mulby.d.ts" />
declare const mulby: any

const CACHE_TTL = 5 * 60 * 1000
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

interface CacheEntry { data: any; timestamp: number }
const cache = new Map<string, CacheEntry>()

function getCached(key: string): any | null {
  const entry = cache.get(key)
  if (!entry || Date.now() - entry.timestamp > CACHE_TTL) {
    if (entry) cache.delete(key)
    return null
  }
  return entry.data
}

function setCache(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() })
}

interface HotItem {
  id: string; title: string; desc: string; url: string
  hot: number; author: string; cover: string
}

function ok(title: string, data: HotItem[]) {
  return { name: title, title, total: data.length, updateTime: new Date().toISOString(), data }
}

function fail(title: string, error: string) {
  return { name: title, title, total: 0, data: [], error }
}

async function httpGet(url: string, headers?: Record<string, string>): Promise<any> {
  return mulby.http.get(url, { 'User-Agent': UA, ...headers })
}

// ─── Platform scrapers ────────────────────────────────────────

async function fetchWeibo(): Promise<any> {
  const res = await httpGet('https://weibo.com/ajax/side/hotSearch')
  const json = JSON.parse(res.data)
  const list = json?.data?.realtime || []
  return ok('微博热搜', list.map((item: any, i: number) => ({
    id: `weibo-${i}`,
    title: item.word || item.note || '',
    desc: item.label_name || '',
    url: `https://s.weibo.com/weibo?q=${encodeURIComponent(item.word || '')}&Refer=top`,
    hot: item.raw_hot || item.num || 0,
    author: '', cover: '',
  })))
}

async function fetchBaidu(): Promise<any> {
  const res = await httpGet('https://top.baidu.com/api/board?platform=wise&tab=realtime')
  const json = JSON.parse(res.data)
  const list = json?.data?.cards?.[0]?.content || []
  return ok('百度热搜', list.map((item: any, i: number) => ({
    id: `baidu-${i}`,
    title: item.word || item.query || '',
    desc: item.desc || '',
    url: item.url || `https://www.baidu.com/s?wd=${encodeURIComponent(item.word || '')}`,
    hot: parseInt(item.hotScore || item.rawHotScore || '0', 10),
    author: '', cover: item.img || '',
  })))
}

async function fetchZhihu(): Promise<any> {
  const res = await httpGet('https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total?limit=50', {
    'Referer': 'https://www.zhihu.com/hot',
  })
  const json = JSON.parse(res.data)
  const list = json?.data || []
  return ok('知乎热榜', list.map((item: any, i: number) => ({
    id: `zhihu-${i}`,
    title: item.target?.title || '',
    desc: item.target?.excerpt || '',
    url: `https://www.zhihu.com/question/${item.target?.id || ''}`,
    hot: parseInt(item.detail_text?.replace(/[^\d]/g, '') || '0', 10),
    author: '', cover: '',
  })))
}

async function fetchDouyin(): Promise<any> {
  const res = await httpGet('https://www.douyin.com/aweme/v1/web/hot/search/list/', {
    'Referer': 'https://www.douyin.com/',
  })
  const json = JSON.parse(res.data)
  const list = json?.data?.word_list || json?.word_list || []
  return ok('抖音热点', list.map((item: any, i: number) => ({
    id: `douyin-${i}`,
    title: item.word || '',
    desc: item.sentence_tag?.toString() || '',
    url: `https://www.douyin.com/search/${encodeURIComponent(item.word || '')}`,
    hot: item.hot_value || 0,
    author: '', cover: '',
  })))
}

async function fetchToutiao(): Promise<any> {
  const res = await httpGet('https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc')
  const json = JSON.parse(res.data)
  const list = json?.data || []
  return ok('今日头条', list.map((item: any, i: number) => ({
    id: `toutiao-${i}`,
    title: item.Title || '',
    desc: '',
    url: item.Url || '',
    hot: parseInt(item.HotValue || '0', 10),
    author: '', cover: item.Image?.url || '',
  })))
}

async function fetchBilibili(): Promise<any> {
  const res = await httpGet('https://api.bilibili.com/x/web-interface/ranking/v2?rid=0&type=all')
  const json = JSON.parse(res.data)
  const list = json?.data?.list || []
  return ok('B站热门', list.map((item: any, i: number) => ({
    id: `bilibili-${i}`,
    title: item.title || '',
    desc: item.desc || '',
    url: item.short_link_v2 || `https://www.bilibili.com/video/${item.bvid}`,
    hot: item.stat?.view || 0,
    author: item.owner?.name || '',
    cover: item.pic || '',
  })))
}

// ─── vvhan API fallback ───────────────────────────────────────

const VVHAN_MAP: Record<string, string> = {
  'tieba': 'baiduTiwordseba',
  'v2ex': 'v2ex',
  'hupu': 'huPu',
  '36kr': '36Kr',
  'sspai': 'ssPai',
  'ithome': 'itHome',
  'juejin': 'jueJin',
  'kuaishou': 'kuaiShou',
  'acfun': 'AcFun',
  'thepaper': 'pengPai',
  'qq-news': 'txNews',
  'netease-news': 'wyNews',
  'sina-news': 'xinLang',
  'weread': 'wxRead',
  'douban-group': 'douBan',
  'coolapk': 'coolApk',
}

async function fetchVvhan(platform: string, displayName: string): Promise<any> {
  const vvhanType = VVHAN_MAP[platform]
  if (!vvhanType) return fail(displayName, `不支持的平台: ${platform}`)

  const res = await httpGet(`https://api.vvhan.com/api/hotlist/${vvhanType}`)
  const json = JSON.parse(res.data)
  if (!json.success && !json.data) return fail(displayName, '接口返回异常')

  const list = json.data || []
  return ok(json.title || displayName, list.map((item: any, i: number) => ({
    id: `${platform}-${i}`,
    title: item.title || '',
    desc: item.desc || '',
    url: item.url || item.mobil_url || '',
    hot: typeof item.hot === 'number' ? item.hot : parseInt(String(item.hot).replace(/[^\d]/g, '') || '0', 10),
    author: item.author || '',
    cover: item.pic || '',
  })))
}

// ─── Dispatcher ───────────────────────────────────────────────

const DIRECT_FETCHERS: Record<string, () => Promise<any>> = {
  weibo: fetchWeibo,
  baidu: fetchBaidu,
  zhihu: fetchZhihu,
  douyin: fetchDouyin,
  toutiao: fetchToutiao,
  bilibili: fetchBilibili,
}

const PLATFORM_NAMES: Record<string, string> = {
  weibo: '微博热搜', baidu: '百度热搜', zhihu: '知乎热榜',
  douyin: '抖音热点', toutiao: '今日头条', bilibili: 'B站热门',
  tieba: '百度贴吧', v2ex: 'V2EX', hupu: '虎扑热帖',
  '36kr': '36氪', sspai: '少数派', ithome: 'IT之家', juejin: '掘金',
  kuaishou: '快手', acfun: 'AcFun',
  thepaper: '澎湃新闻', 'qq-news': '腾讯新闻',
  'netease-news': '网易新闻', 'sina-news': '新浪新闻',
  weread: '微信读书', 'douban-group': '豆瓣小组', coolapk: '酷安',
}

async function fetchPlatform(platform: string): Promise<any> {
  const name = PLATFORM_NAMES[platform] || platform
  const directFn = DIRECT_FETCHERS[platform]

  if (directFn) {
    try {
      return await directFn()
    } catch {
      // fallback to vvhan if direct fetch fails and mapping exists
      if (VVHAN_MAP[platform]) {
        try { return await fetchVvhan(platform, name) } catch {}
      }
      return fail(name, '获取数据失败')
    }
  }

  // No direct fetcher — use vvhan
  try {
    return await fetchVvhan(platform, name)
  } catch (err: any) {
    return fail(name, err.message || '网络错误')
  }
}

// ─── Plugin lifecycle ─────────────────────────────────────────

export function onLoad() {}
export function onUnload() {}
export function onEnable() {}
export function onDisable() {}
export async function run(_context: BackendPluginContext) {}

export const rpc = {
  async fetchHotList(platform: string): Promise<any> {
    const cacheKey = `hot:${platform}`
    const cached = getCached(cacheKey)
    if (cached) return cached

    const result = await fetchPlatform(platform)
    if (result.data?.length > 0) setCache(cacheKey, result)
    return result
  },

  async getSettings(): Promise<any> {
    try {
      return (await mulby.storage.get('settings')) || {}
    } catch { return {} }
  },

  async saveSettings(settings: any): Promise<boolean> {
    try { await mulby.storage.set('settings', settings); return true }
    catch { return false }
  },

  async clearCache(): Promise<boolean> {
    cache.clear()
    return true
  },

  async openInBrowser(url: string): Promise<boolean> {
    try { await mulby.shell.openExternal(url); return true }
    catch { return false }
  },
}

const plugin = { onLoad, onUnload, onEnable, onDisable, run, rpc }
export default plugin
