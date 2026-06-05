/// <reference path="./types/mulby.d.ts" />
declare const mulby: any

const API_BASE = 'https://hot.baiwumm.com/api'
const CACHE_TTL = 5 * 60 * 1000

interface CacheEntry { data: any; timestamp: number }
const cache = new Map<string, CacheEntry>()

function getCached(key: string): any | null {
  const e = cache.get(key)
  if (!e || Date.now() - e.timestamp > CACHE_TTL) { cache.delete(key); return null }
  return e.data
}
function setCache(key: string, data: any) { cache.set(key, { data, timestamp: Date.now() }) }

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

    try {
      const res = await mulby.http.get(`${API_BASE}/${platform}`)
      const json = JSON.parse(res.data)

      if (json.code === 200 && json.data) {
        const result = {
          name: platform,
          title: platform,
          total: json.data.length,
          updateTime: json.timestamp ? new Date(json.timestamp).toISOString() : new Date().toISOString(),
          data: json.data.map((item: any, i: number) => ({
            id: item.id || `${platform}-${i}`,
            title: item.title || '',
            desc: item.desc || '',
            url: item.url || item.mobileUrl || '',
            hot: typeof item.hot === 'number' ? item.hot : parseInt(String(item.hot || '0').replace(/[^\d]/g, ''), 10),
            author: item.author || '',
            cover: item.pic || '',
            label: item.label || '',
          })),
        }
        setCache(cacheKey, result)
        return result
      }
      return { name: platform, title: platform, total: 0, data: [], error: json.msg || '获取失败' }
    } catch (err: any) {
      return { name: platform, title: platform, total: 0, data: [], error: err.message || '网络错误' }
    }
  },

  async clearCache(): Promise<boolean> { cache.clear(); return true },

  async openInBrowser(url: string): Promise<boolean> {
    try { await mulby.shell.openExternal(url); return true } catch { return false }
  },
}

const plugin = { onLoad, onUnload, onEnable, onDisable, run, rpc }
export default plugin
