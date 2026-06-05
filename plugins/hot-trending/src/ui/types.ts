export interface HotItem {
  id: string
  title: string
  desc: string
  cover: string
  url: string
  hot: number
  author: string
  timestamp: string
}

export interface HotListResponse {
  name: string
  title: string
  type: string
  total: number
  updateTime: string
  data: HotItem[]
  error?: string
}

export interface Platform {
  id: string
  name: string
  icon: string
}

export interface Category {
  id: string
  name: string
  icon: string
  platforms: Platform[]
}

export interface AppSettings {
  apiBase: string
  autoRefreshInterval: number
  itemsPerPage: number
  defaultOpenMode: 'internal' | 'browser'
}
