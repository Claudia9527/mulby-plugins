export interface FileItem {
  name: string
  path: string
  isDirectory: boolean
  size?: number
  ext: string
  icon?: string
}

export type CategoryId =
  | 'all'
  | 'image'
  | 'document'
  | 'spreadsheet'
  | 'video-audio'
  | 'archive'
  | 'text'
  | 'other'

export interface Category {
  id: CategoryId
  label: string
  icon: string
  extensions: string[]
}

export const CATEGORIES: Category[] = [
  { id: 'all', label: '全部', icon: 'layers', extensions: [] },
  {
    id: 'image',
    label: '图片',
    icon: 'image',
    extensions: [
      '.png', '.jpg', '.jpeg', '.bmp', '.gif', '.svg', '.ico', '.webp', '.psd', '.ai', '.tiff', '.tif',
    ],
  },
  {
    id: 'spreadsheet',
    label: '表格',
    icon: 'table',
    extensions: ['.xls', '.xlsx', '.csv'],
  },
  {
    id: 'document',
    label: '文档',
    icon: 'file-text',
    extensions: ['.docx', '.doc', '.pdf', '.ppt', '.pptx', '.pages', '.key', '.numbers'],
  },
  {
    id: 'video-audio',
    label: '音视频',
    icon: 'play-circle',
    extensions: [
      '.flac', '.mp4', '.m4a', '.mp3', '.ogv', '.ogm', '.ogg', '.oga', '.opus',
      '.webm', '.wav', '.avi', '.mkv', '.mov', '.aac', '.wma',
    ],
  },
  {
    id: 'archive',
    label: '压缩',
    icon: 'archive',
    extensions: ['.zip', '.gz', '.7z', '.rar', '.tar', '.bz2', '.xz'],
  },
  {
    id: 'text',
    label: '文本',
    icon: 'file-code',
    extensions: [
      '.txt', '.md', '.json', '.xml', '.yaml', '.yml', '.toml', '.ini', '.cfg',
      '.conf', '.log', '.sh', '.bash', '.zsh', '.bat', '.cmd', '.ps1',
      '.js', '.ts', '.jsx', '.tsx', '.py', '.rb', '.go', '.rs', '.java',
      '.c', '.cpp', '.h', '.hpp', '.cs', '.swift', '.kt', '.lua',
      '.html', '.htm', '.css', '.scss', '.less', '.sql', '.graphql',
    ],
  },
  { id: 'other', label: '其他', icon: 'file', extensions: [] },
]

export function getExtension(name: string): string {
  const lastDot = name.lastIndexOf('.')
  if (lastDot <= 0) return ''
  return name.slice(lastDot).toLowerCase()
}

export function getCategoryForFile(ext: string): CategoryId {
  if (!ext) return 'other'
  for (const cat of CATEGORIES) {
    if (cat.id === 'all' || cat.id === 'other') continue
    if (cat.extensions.includes(ext)) return cat.id
  }
  return 'other'
}

export function filterByCategory(files: FileItem[], category: CategoryId): FileItem[] {
  if (category === 'all') return files
  return files.filter((f) => getCategoryForFile(f.ext) === category)
}

export function formatFileSize(bytes?: number): string {
  if (bytes == null || bytes < 0) return ''
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const val = bytes / Math.pow(1024, i)
  return `${val < 10 ? val.toFixed(1) : Math.round(val)} ${units[i]}`
}

export function getParentDir(path: string): string {
  const sep = path.includes('\\') ? '\\' : '/'
  const parts = path.split(sep)
  parts.pop()
  return parts.join(sep)
}

const IMAGE_PREVIEW_EXTS = new Set(['.png', '.jpg', '.jpeg', '.bmp', '.gif', '.svg', '.ico', '.webp'])
const TEXT_PREVIEW_EXTS = new Set([
  '.txt', '.md', '.json', '.xml', '.yaml', '.yml', '.toml', '.ini', '.cfg',
  '.conf', '.log', '.sh', '.bash', '.zsh', '.bat', '.cmd', '.ps1',
  '.js', '.ts', '.jsx', '.tsx', '.py', '.rb', '.go', '.rs', '.java',
  '.c', '.cpp', '.h', '.hpp', '.cs', '.swift', '.kt', '.lua',
  '.html', '.htm', '.css', '.scss', '.less', '.sql', '.graphql', '.csv',
])
const VIDEO_AUDIO_EXTS = new Set([
  '.mp4', '.webm', '.ogv', '.ogm', '.ogg', '.mp3', '.wav', '.flac',
  '.m4a', '.oga', '.opus', '.aac',
])

export type PreviewType = 'image' | 'text' | 'video' | 'audio' | 'pdf' | 'none'

export function getPreviewType(ext: string): PreviewType {
  if (IMAGE_PREVIEW_EXTS.has(ext)) return 'image'
  if (TEXT_PREVIEW_EXTS.has(ext)) return 'text'
  if (ext === '.pdf') return 'pdf'
  const audioExts = new Set(['.mp3', '.wav', '.flac', '.m4a', '.oga', '.opus', '.aac', '.ogg', '.wma'])
  if (audioExts.has(ext)) return 'audio'
  if (VIDEO_AUDIO_EXTS.has(ext)) return 'video'
  return 'none'
}

export function getCategoryCounts(files: FileItem[]): Record<CategoryId, number> {
  const counts: Record<CategoryId, number> = {
    all: files.length,
    image: 0,
    document: 0,
    spreadsheet: 0,
    'video-audio': 0,
    archive: 0,
    text: 0,
    other: 0,
  }
  for (const f of files) {
    const cat = getCategoryForFile(f.ext)
    counts[cat]++
  }
  return counts
}
