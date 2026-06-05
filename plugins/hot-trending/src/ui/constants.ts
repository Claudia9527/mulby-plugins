import type { Category } from './types'

export const CATEGORIES: Category[] = [
  {
    id: 'trending',
    name: '热搜',
    icon: 'flame',
    platforms: [
      { id: 'weibo', name: '微博', icon: 'smartphone' },
      { id: 'baidu', name: '百度', icon: 'search' },
      { id: 'douyin', name: '抖音', icon: 'music' },
      { id: 'toutiao', name: '头条', icon: 'newspaper' },
    ],
  },
  {
    id: 'community',
    name: '社区',
    icon: 'messages-square',
    platforms: [
      { id: 'zhihu', name: '知乎', icon: 'lightbulb' },
      { id: 'v2ex', name: 'V2EX', icon: 'monitor' },
      { id: 'hupu', name: '虎扑', icon: 'trophy' },
      { id: 'tieba', name: '贴吧', icon: 'clipboard-list' },
    ],
  },
  {
    id: 'tech',
    name: '科技',
    icon: 'zap',
    platforms: [
      { id: '36kr', name: '36氪', icon: 'rocket' },
      { id: 'sspai', name: '少数派', icon: 'pen-tool' },
      { id: 'ithome', name: 'IT之家', icon: 'laptop' },
      { id: 'juejin', name: '掘金', icon: 'pickaxe' },
    ],
  },
  {
    id: 'video',
    name: '视频',
    icon: 'clapperboard',
    platforms: [
      { id: 'bilibili', name: 'B站', icon: 'tv' },
      { id: 'kuaishou', name: '快手', icon: 'bolt' },
      { id: 'acfun', name: 'AcFun', icon: 'play-circle' },
    ],
  },
  {
    id: 'news',
    name: '资讯',
    icon: 'megaphone',
    platforms: [
      { id: 'thepaper', name: '澎湃', icon: 'waves' },
      { id: 'qq-news', name: '腾讯', icon: 'bird' },
      { id: 'netease-news', name: '网易', icon: 'mail' },
      { id: 'sina-news', name: '新浪', icon: 'globe' },
    ],
  },
  {
    id: 'life',
    name: '生活',
    icon: 'rainbow',
    platforms: [
      { id: 'weread', name: '微信读书', icon: 'book-open' },
      { id: 'douban-group', name: '豆瓣', icon: 'drama' },
      { id: 'coolapk', name: '酷安', icon: 'apple' },
    ],
  },
]

export const DEFAULT_SETTINGS = {
  apiBase: 'https://api-hot.imsyy.top',
  autoRefreshInterval: 0,
  itemsPerPage: 50,
  defaultOpenMode: 'internal' as const,
}
