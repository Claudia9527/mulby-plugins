import React, { useEffect, useState, useRef } from 'react'
import { Eye, FileQuestion, Loader2, File, Image as ImageIcon, Music, Video, FileText, Archive } from 'lucide-react'
import { FileItem, getPreviewType, PreviewType, formatFileSize } from '../utils'
import { useMulby } from '../hooks/useMulby'

interface FilePreviewProps {
  file: FileItem | null
}

const MAX_TEXT_SIZE = 512 * 1024

export default function FilePreview({ file }: FilePreviewProps) {
  const { readFileAsText, readFileAsBase64, getFileStat } = useMulby()
  const [previewType, setPreviewType] = useState<PreviewType>('none')
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [fileInfo, setFileInfo] = useState<{ size: number; modifiedAt: number; createdAt: number } | null>(null)
  const abortRef = useRef(0)

  useEffect(() => {
    if (!file) {
      setPreviewType('none')
      setContent('')
      setFileInfo(null)
      return
    }

    const id = ++abortRef.current
    const type = getPreviewType(file.ext)
    setPreviewType(type)
    setContent('')
    setLoading(true)

    const load = async () => {
      try {
        const stat = await getFileStat(file.path)
        if (id !== abortRef.current) return
        if (stat) setFileInfo({ size: stat.size, modifiedAt: stat.modifiedAt, createdAt: stat.createdAt })

        if (type === 'image') {
          if (file.ext === '.svg') {
            const text = await readFileAsText(file.path)
            if (id !== abortRef.current) return
            setContent(`data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(text)))}`)
          } else {
            const base64 = await readFileAsBase64(file.path)
            if (id !== abortRef.current) return
            const mimeMap: Record<string, string> = {
              '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
              '.gif': 'image/gif', '.bmp': 'image/bmp', '.webp': 'image/webp',
              '.ico': 'image/x-icon',
            }
            setContent(`data:${mimeMap[file.ext] || 'image/png'};base64,${base64}`)
          }
        } else if (type === 'text') {
          if (stat && stat.size > MAX_TEXT_SIZE) {
            setContent(`[文件过大，仅预览前 ${formatFileSize(MAX_TEXT_SIZE)}]`)
          } else {
            const text = await readFileAsText(file.path)
            if (id !== abortRef.current) return
            setContent(typeof text === 'string' ? text : '')
          }
        } else if (type === 'video' || type === 'audio') {
          setContent(file.path)
        }
      } catch (err) {
        if (id !== abortRef.current) return
        setContent('')
        setPreviewType('none')
      } finally {
        if (id === abortRef.current) setLoading(false)
      }
    }
    load()
  }, [file?.path])

  if (!file) {
    return (
      <div className="preview-area flex-1 gap-2" style={{ color: 'var(--text-tertiary)' }}>
        <Eye size={40} strokeWidth={1} />
        <p className="text-sm mt-2">选择文件以预览</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="preview-area flex-1">
        <Loader2 size={28} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
      </div>
    )
  }

  const renderMeta = () => (
    <div className="absolute bottom-0 left-0 right-0 px-4 py-2 text-xs flex items-center gap-4"
      style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)', borderTop: '1px solid var(--border-color)' }}>
      <span className="truncate flex-1">{file.name}</span>
      {fileInfo && (
        <>
          <span>{formatFileSize(fileInfo.size)}</span>
          <span>{new Date(fileInfo.modifiedAt).toLocaleDateString()}</span>
        </>
      )}
    </div>
  )

  const iconForType = (): React.ReactNode => {
    const map: Record<string, React.ElementType> = {
      image: ImageIcon, text: FileText, video: Video, audio: Music, pdf: FileText, none: File,
    }
    const Icon = map[previewType] || FileQuestion
    return <Icon size={48} strokeWidth={1} style={{ color: 'var(--text-tertiary)' }} />
  }

  if (previewType === 'image' && content) {
    return (
      <div className="preview-area flex-1 relative p-4">
        <img src={content} alt={file.name} className="preview-img" draggable={false} />
        {renderMeta()}
      </div>
    )
  }

  if (previewType === 'text' && content) {
    return (
      <div className="preview-area flex-1 relative" style={{ alignItems: 'stretch', justifyContent: 'stretch' }}>
        <pre className="text-preview">{content}</pre>
        {renderMeta()}
      </div>
    )
  }

  if (previewType === 'audio' && content) {
    return (
      <div className="preview-area flex-1 relative gap-3 p-4">
        <Music size={48} strokeWidth={1} style={{ color: 'var(--accent)' }} />
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{file.name}</p>
        <audio controls src={`file://${content}`} className="w-4/5 max-w-md mt-2" />
        {renderMeta()}
      </div>
    )
  }

  if (previewType === 'video' && content) {
    return (
      <div className="preview-area flex-1 relative p-4">
        <video controls src={`file://${content}`} className="max-w-full max-h-full rounded" />
        {renderMeta()}
      </div>
    )
  }

  return (
    <div className="preview-area flex-1 relative gap-2 p-4">
      {iconForType()}
      <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{file.name}</p>
      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
        {file.ext ? `${file.ext.slice(1).toUpperCase()} 文件` : '未知类型'} · 不支持预览
      </p>
      {fileInfo && (
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {formatFileSize(fileInfo.size)} · {new Date(fileInfo.modifiedAt).toLocaleString()}
        </p>
      )}
      {renderMeta()}
    </div>
  )
}
