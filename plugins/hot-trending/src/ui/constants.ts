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
      { id: 'quark', name: '夸克', icon: 'zap' },
    ],
  },
  {
    id: 'social',
    name: '社交',
    icon: 'messages-square',
    platforms: [
      { id: 'xiaohongshu', name: '小红书', icon: 'book-open' },
      { id: 'zhihu', name: '知乎', icon: 'lightbulb' },
      { id: 'zhihu-daily', name: '知乎日报', icon: 'lightbulb' },
      { id: 'baidutieba', name: '贴吧', icon: 'clipboard-list' },
      { id: 'hupu', name: '虎扑', icon: 'trophy' },
      { id: 'kuaishou', name: '快手', icon: 'bolt' },
    ],
  },
  {
    id: 'tech',
    name: '科技',
    icon: 'zap',
    platforms: [
      { id: '36kr', name: '36氪', icon: 'rocket' },
      { id: 'juejin', name: '掘金', icon: 'pickaxe' },
      { id: 'github-trending', name: 'GitHub', icon: 'globe' },
      { id: 'hello-github', name: 'HelloGitHub', icon: 'globe' },
      { id: 'csdn', name: 'CSDN', icon: 'laptop' },
      { id: 'ithome', name: 'IT之家', icon: 'laptop' },
      { id: 'huxiu', name: '虎嗅', icon: 'megaphone' },
      { id: 'ifanr', name: '爱范儿', icon: 'megaphone' },
      { id: 'woshipm', name: '产品经理', icon: 'pen-tool' },
    ],
  },
  {
    id: 'video',
    name: '影音',
    icon: 'clapperboard',
    platforms: [
      { id: 'bilibili', name: 'B站', icon: 'tv' },
      { id: 'douban-movic', name: '豆瓣电影', icon: 'drama' },
      { id: 'netease-music', name: '网易云音乐', icon: 'music' },
      { id: 'lol', name: '英雄联盟', icon: 'trophy' },
    ],
  },
  {
    id: 'news',
    name: '资讯',
    icon: 'megaphone',
    platforms: [
      { id: 'qq', name: '腾讯新闻', icon: 'bird' },
      { id: 'netease', name: '网易新闻', icon: 'mail' },
      { id: 'thepaper', name: '澎湃新闻', icon: 'waves' },
      { id: 'dongchedi', name: '懂车帝', icon: 'zap' },
    ],
  },
  {
    id: 'life',
    name: '生活',
    icon: 'rainbow',
    platforms: [
      { id: 'weread', name: '微信读书', icon: 'book-open' },
      { id: 'history-today', name: '历史今天', icon: 'globe' },
    ],
  },
]

export const DEFAULT_SETTINGS = {
  apiBase: 'https://hot.baiwumm.com/api',
  autoRefreshInterval: 0,
  itemsPerPage: 50,
  defaultOpenMode: 'internal' as const,
}
