import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type PointerEvent } from 'react'
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ClipboardList,
  Crop,
  Download,
  FileDown,
  FileVideo2,
  FolderOpen,
  Gauge,
  Import,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  RotateCw,
  Scissors,
  Settings2,
  Sparkles,
  Square,
  Trash2,
  Wand2
} from 'lucide-react'
import { useMulby } from './hooks/useMulby'

const PLUGIN_ID = 'video-batch-editor'

type VideoPreset = 'mp4-h264' | 'mp4-h265' | 'webm' | 'cover-jpg'
type TimeMode = 'full' | 'range' | 'first' | 'remove-start'
type CropMode = 'none' | 'manual' | 'center-square' | 'center-portrait' | 'center-landscape'
type OrientationMode = 'keep' | 'landscape' | 'portrait' | 'square' | 'rotate-left' | 'rotate-right'
type FfmpegStatus = 'checking' | 'available' | 'missing' | 'idle' | 'downloading' | 'running'
type JobRunStatus = 'ready' | 'running' | 'done' | 'failed' | 'stopped'
type ConfigScope = 'global' | 'current'
type JobConfigSource = 'global' | 'override'

type VideoFileSummary = {
  path: string
  name: string
  size: number
  ok: boolean
  error?: string
}

type ScanSkippedItem = {
  path: string
  name: string
  reason: string
}

type PreparedJob = {
  id: string
  sourcePath: string
  sourceName: string
  outputPath: string
  preset: VideoPreset
  args: string[]
  commandPreview: string
  status: JobRunStatus
  configSource?: JobConfigSource
  error?: string
}

type VideoPreview = {
  path: string
  url: string
  name: string
}

type CropSelection = {
  x: number
  y: number
  width: number
  height: number
}

type CropDragState = {
  startX: number
  startY: number
  currentX: number
  currentY: number
}

type TimelineDragTarget = 'start' | 'end' | 'playhead' | null

type TimelineDragState = {
  target: TimelineDragTarget
}

type PreviewViewport = {
  x: number
  y: number
  width: number
  height: number
}

type JobOptions = {
  preset: VideoPreset
  outputDirectory?: string
  timeMode: TimeMode
  trimStartSeconds: number
  trimDurationSeconds: number
  removeStartSeconds: number
  cropMode: CropMode
  cropX: number
  cropY: number
  cropWidth: number
  cropHeight: number
  orientationMode: OrientationMode
  width: number
  height: number
  videoBitrateKbps: number
  crf: number
  watermarkText: string
}

type PluginInitData = {
  attachments?: { path?: string; name?: string }[]
}

const VIDEO_FILTER = [
  'mp4',
  'mov',
  'm4v',
  'mkv',
  'webm',
  'avi',
  'wmv',
  'flv',
  'ts',
  'mpeg',
  'mpg'
]

const PRESETS: Array<{ value: VideoPreset; label: string; hint: string }> = [
  { value: 'mp4-h264', label: 'MP4 / H.264', hint: '通用上传' },
  { value: 'mp4-h265', label: 'MP4 / H.265', hint: '体积优先' },
  { value: 'webm', label: 'WebM / VP9', hint: '网页分发' },
  { value: 'cover-jpg', label: '封面 JPG', hint: '截帧导出' }
]

const TIME_MODES: Array<{ value: TimeMode; label: string }> = [
  { value: 'full', label: '完整视频' },
  { value: 'range', label: '指定片段' },
  { value: 'first', label: '截取开头' },
  { value: 'remove-start', label: '去掉开头' }
]

const CROP_MODES: Array<{ value: CropMode; label: string }> = [
  { value: 'none', label: '不裁剪' },
  { value: 'manual', label: '手动裁剪' },
  { value: 'center-square', label: '中心 1:1' },
  { value: 'center-portrait', label: '中心 9:16' },
  { value: 'center-landscape', label: '中心 16:9' }
]

const ORIENTATION_MODES: Array<{ value: OrientationMode; label: string }> = [
  { value: 'keep', label: '保持原方向' },
  { value: 'landscape', label: '转横屏 16:9' },
  { value: 'portrait', label: '转竖屏 9:16' },
  { value: 'square', label: '转方屏 1:1' },
  { value: 'rotate-left', label: '左转 90°' },
  { value: 'rotate-right', label: '右转 90°' }
]

const DEFAULT_OPTIONS: JobOptions = {
  preset: 'mp4-h264',
  outputDirectory: '',
  timeMode: 'full',
  trimStartSeconds: 0,
  trimDurationSeconds: 10,
  removeStartSeconds: 0,
  cropMode: 'none',
  cropX: 0,
  cropY: 0,
  cropWidth: 1080,
  cropHeight: 1080,
  orientationMode: 'keep',
  width: 1920,
  height: 1080,
  videoBitrateKbps: 4500,
  crf: 23,
  watermarkText: ''
}

function unwrapHostData<T>(value: unknown): T | undefined {
  if (!value || typeof value !== 'object') return value as T | undefined
  if ('data' in value) return (value as { data?: T }).data
  return value as T
}

function pathsFromOpenDialog(result: unknown): string[] {
  if (Array.isArray(result)) {
    return result.filter((value): value is string => typeof value === 'string' && value.length > 0)
  }
  if (result && typeof result === 'object') {
    const data = result as { canceled?: boolean; filePaths?: string[] }
    if (data.canceled) return []
    if (Array.isArray(data.filePaths)) {
      return data.filePaths.filter((value): value is string => typeof value === 'string' && value.length > 0)
    }
  }
  return []
}

function formatBytes(value: number) {
  if (value <= 0) return '-'
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(2)} MB`
  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function formatSeconds(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '00:00'
  const totalSeconds = Math.floor(value)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function baseName(filePath: string) {
  const normalized = filePath.replace(/\\/g, '/')
  const index = normalized.lastIndexOf('/')
  return index >= 0 ? normalized.slice(index + 1) : normalized
}

function presetLabel(value: VideoPreset) {
  return PRESETS.find((preset) => preset.value === value)?.label ?? value
}

function optionLabel<T extends string>(items: Array<{ value: T; label: string }>, value: T) {
  return items.find((item) => item.value === value)?.label ?? value
}

function jobStatusLabel(status: JobRunStatus) {
  if (status === 'running') return '处理中'
  if (status === 'done') return '完成'
  if (status === 'failed') return '失败'
  if (status === 'stopped') return '已停止'
  return '待执行'
}

function formatProgress(progress: FFmpegRunProgress | null) {
  if (!progress) return '等待进度'
  const items: string[] = []
  if (typeof progress.percent === 'number' && Number.isFinite(progress.percent)) {
    items.push(`${progress.percent.toFixed(1)}%`)
  }
  if (progress.time) items.push(progress.time)
  if (progress.speed) items.push(progress.speed)
  if (progress.size) items.push(progress.size)
  return items.length ? items.join(' / ') : '处理中'
}

function progressPercent(progress: FFmpegRunProgress | null) {
  if (!progress || typeof progress.percent !== 'number' || !Number.isFinite(progress.percent)) return 0
  return Math.max(0, Math.min(100, progress.percent))
}

function downloadProgressText(progress: FFmpegDownloadProgress | null) {
  if (!progress) return ''
  if (progress.phase === 'extracting') return `解压中 ${progress.percent.toFixed(0)}%`
  if (progress.phase === 'done') return '下载完成'
  return `下载中 ${progress.percent.toFixed(0)}%`
}

function formatTimestampForFile(date: Date) {
  return date.toISOString().replace(/[:.]/g, '-')
}

function clampValue(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, value))
}

function normalizeSelection(selection: CropSelection): CropSelection {
  return {
    x: clampValue(selection.x, 0, 1),
    y: clampValue(selection.y, 0, 1),
    width: clampValue(selection.width, 0, 1),
    height: clampValue(selection.height, 0, 1)
  }
}

function selectionFromPoints(startX: number, startY: number, currentX: number, currentY: number): CropSelection {
  const x = clampValue(Math.min(startX, currentX), 0, 1)
  const y = clampValue(Math.min(startY, currentY), 0, 1)
  const width = clampValue(Math.abs(currentX - startX), 0, 1 - x)
  const height = clampValue(Math.abs(currentY - startY), 0, 1 - y)
  return { x, y, width, height }
}

function fitContainViewport(stageWidth: number, stageHeight: number, videoWidth: number, videoHeight: number): PreviewViewport {
  if (stageWidth <= 0 || stageHeight <= 0 || videoWidth <= 0 || videoHeight <= 0) {
    return { x: 0, y: 0, width: 1, height: 1 }
  }

  const stageRatio = stageWidth / stageHeight
  const videoRatio = videoWidth / videoHeight

  if (videoRatio > stageRatio) {
    const height = stageWidth / videoRatio
    return {
      x: 0,
      y: (stageHeight - height) / 2 / stageHeight,
      width: 1,
      height: height / stageHeight
    }
  }

  const width = stageHeight * videoRatio
  return {
    x: (stageWidth - width) / 2 / stageWidth,
    y: 0,
    width: width / stageWidth,
    height: 1
  }
}

function normalizeOptionsForHost(options: JobOptions): JobOptions {
  return {
    ...options,
    outputDirectory: options.outputDirectory || undefined,
    watermarkText: options.watermarkText.trim() || ''
  }
}

function normalizeOptionsForCompare(options: JobOptions): JobOptions {
  return {
    ...DEFAULT_OPTIONS,
    ...options,
    outputDirectory: options.outputDirectory || '',
    watermarkText: options.watermarkText.trim()
  }
}

function areOptionsEquivalent(left: JobOptions, right: JobOptions) {
  return JSON.stringify(normalizeOptionsForCompare(left)) === JSON.stringify(normalizeOptionsForCompare(right))
}

export default function App() {
  const { dialog, filesystem, host, notification, shell, ffmpeg } = useMulby(PLUGIN_ID)
  const [files, setFiles] = useState<VideoFileSummary[]>([])
  const [jobs, setJobs] = useState<PreparedJob[]>([])
  const [ffmpegStatus, setFfmpegStatus] = useState<FfmpegStatus>('idle')
  const [ffmpegMessage, setFfmpegMessage] = useState('未检测')
  const [ffmpegPath, setFfmpegPath] = useState<string | null>(null)
  const [downloadProgress, setDownloadProgress] = useState<FFmpegDownloadProgress | null>(null)
  const [runProgress, setRunProgress] = useState<FFmpegRunProgress | null>(null)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [activeJobName, setActiveJobName] = useState('')
  const [busy, setBusy] = useState(false)
  const activeTaskRef = useRef<FFmpegTask | null>(null)
  const stopRequestedRef = useRef(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const previewStageRef = useRef<HTMLDivElement | null>(null)
  const timelineRef = useRef<HTMLDivElement | null>(null)
  const [selectedPath, setSelectedPath] = useState('')
  const [preview, setPreview] = useState<VideoPreview | null>(null)
  const [previewMessage, setPreviewMessage] = useState('选择一个视频后可预览')
  const [previewFrameUrl, setPreviewFrameUrl] = useState('')
  const [videoDuration, setVideoDuration] = useState(0)
  const [videoNaturalSize, setVideoNaturalSize] = useState({ width: 0, height: 0 })
  const [currentTime, setCurrentTime] = useState(0)
  const [videoPlaying, setVideoPlaying] = useState(false)
  const [cropSelection, setCropSelection] = useState<CropSelection | null>(null)
  const [cropDrag, setCropDrag] = useState<CropDragState | null>(null)
  const [timelineDrag, setTimelineDrag] = useState<TimelineDragState | null>(null)
  const [focusCropPreview, setFocusCropPreview] = useState(false)
  const [configScope, setConfigScope] = useState<ConfigScope>('global')
  const [globalConfig, setGlobalConfig] = useState<JobOptions>(DEFAULT_OPTIONS)
  const [overrideConfigs, setOverrideConfigs] = useState<Record<string, JobOptions>>({})

  useEffect(() => {
    if (!cropSelection) {
      setFocusCropPreview(false)
    }
  }, [cropSelection])

  const validFiles = useMemo(() => files.filter((file) => file.ok), [files])
  const invalidCount = files.length - validFiles.length
  const runnableJobs = useMemo(() => jobs.filter((job) => job.status !== 'done'), [jobs])
  const failedJobs = useMemo(() => jobs.filter((job) => job.status === 'failed' || job.status === 'stopped'), [jobs])
  const selectedFile = useMemo(() => validFiles.find((file) => file.path === selectedPath) ?? validFiles[0] ?? null, [selectedPath, validFiles])
  const selectedOverrideConfig = selectedFile ? overrideConfigs[selectedFile.path] : undefined
  const isOverrideConfigChanged = useCallback((filePath: string) => {
    const overrideConfig = overrideConfigs[filePath]
    return Boolean(overrideConfig && !areOptionsEquivalent(overrideConfig, globalConfig))
  }, [globalConfig, overrideConfigs])
  const hasSelectedOverride = selectedFile ? isOverrideConfigChanged(selectedFile.path) : false
  const options = configScope === 'current' && selectedOverrideConfig ? selectedOverrideConfig : globalConfig
  const configPanelTitle = configScope === 'current' ? '当前视频配置' : '批量处理配置'
  const configPanelHint = configScope === 'current'
    ? selectedFile ? `仅作用于：${selectedFile.name}` : '未选中可配置的视频'
    : `当前配置将应用到 ${validFiles.length} 个视频`
  const displayedSelection = cropDrag ? selectionFromPoints(cropDrag.startX, cropDrag.startY, cropDrag.currentX, cropDrag.currentY) : cropSelection
  const hasPreview = preview !== null
  const selectionOverlayStyle = useMemo(() => {
    if (!displayedSelection) return undefined
    const stage = previewStageRef.current
    const viewport = stage
      ? fitContainViewport(stage.clientWidth, stage.clientHeight, videoNaturalSize.width, videoNaturalSize.height)
      : { x: 0, y: 0, width: 1, height: 1 }
    return {
      left: `${(viewport.x + displayedSelection.x * viewport.width) * 100}%`,
      top: `${(viewport.y + displayedSelection.y * viewport.height) * 100}%`,
      width: `${displayedSelection.width * viewport.width * 100}%`,
      height: `${displayedSelection.height * viewport.height * 100}%`
    }
  }, [displayedSelection, videoNaturalSize.height, videoNaturalSize.width])
  const effectiveTrimStartSeconds = options.timeMode === 'full' ? 0 : options.trimStartSeconds
  const trimEndSeconds = videoDuration > 0
    ? options.timeMode === 'full' ? videoDuration : Math.min(videoDuration, options.trimStartSeconds + options.trimDurationSeconds)
    : options.trimStartSeconds + options.trimDurationSeconds
  const trimStartPercent = videoDuration > 0 ? clampValue(effectiveTrimStartSeconds / videoDuration * 100, 0, 100) : 0
  const trimEndPercent = videoDuration > 0 ? clampValue(trimEndSeconds / videoDuration * 100, 0, 100) : 0
  const currentTimePercent = videoDuration > 0 ? clampValue(currentTime / videoDuration * 100, 0, 100) : 0
  const trimRangeWidthPercent = Math.max(0, trimEndPercent - trimStartPercent)
  const cropStats = cropSelection
    ? `X ${options.cropX} / Y ${options.cropY} / ${options.cropWidth} x ${options.cropHeight}`
    : '未框选画面'
  const hasPreviewModification = options.timeMode !== 'full' || options.cropMode !== 'none' || options.orientationMode !== 'keep'
  const previewHint = useMemo(() => {
    const parts: string[] = []
    if (options.timeMode === 'range') {
      parts.push(`${formatSeconds(options.trimStartSeconds)} - ${formatSeconds(trimEndSeconds)}`)
    } else if (options.timeMode === 'first') {
      parts.push(`前 ${formatSeconds(options.trimDurationSeconds)}`)
    } else if (options.timeMode === 'remove-start') {
      parts.push(`去掉前 ${formatSeconds(options.removeStartSeconds)}`)
    } else {
      parts.push('完整视频')
    }
    if (options.cropMode === 'manual' && cropSelection) {
      parts.push(`裁剪 ${Math.round(cropSelection.width * 100)}% x ${Math.round(cropSelection.height * 100)}%`)
    } else if (options.cropMode !== 'none') {
      parts.push(optionLabel(CROP_MODES, options.cropMode))
    }
    if (options.orientationMode !== 'keep') {
      parts.push(optionLabel(ORIENTATION_MODES, options.orientationMode))
    }
    return parts.join(' / ')
  }, [cropSelection, options.cropMode, options.orientationMode, options.removeStartSeconds, options.timeMode, options.trimDurationSeconds, options.trimStartSeconds, trimEndSeconds])
  const previewChangeText = hasPreview
    ? hasPreviewModification ? `当前修改：${previewHint}` : '默认配置'
    : previewMessage
  const cropFocusFrameStyle = useMemo<CSSProperties | undefined>(() => {
    if (!focusCropPreview || !displayedSelection || !videoNaturalSize.width || !videoNaturalSize.height) return undefined
    const stage = previewStageRef.current
    const stageAspect = stage && stage.clientWidth > 0 && stage.clientHeight > 0
      ? stage.clientWidth / stage.clientHeight
      : 16 / 9
    const cropAspect = displayedSelection.width * videoNaturalSize.width / (displayedSelection.height * videoNaturalSize.height)
    if (cropAspect > stageAspect) {
      return {
        width: '100%',
        height: `${stageAspect / cropAspect * 100}%`
      }
    }
    return {
      width: `${cropAspect / stageAspect * 100}%`,
      height: '100%'
    }
  }, [displayedSelection, focusCropPreview, videoNaturalSize.height, videoNaturalSize.width])
  const cropFocusVideoStyle = useMemo<CSSProperties | undefined>(() => {
    if (!focusCropPreview || !displayedSelection) return undefined
    const width = Math.max(displayedSelection.width, 0.01)
    const height = Math.max(displayedSelection.height, 0.01)
    return {
      position: 'absolute',
      left: `${-displayedSelection.x / width * 100}%`,
      top: `${-displayedSelection.y / height * 100}%`,
      width: `${100 / width}%`,
      height: `${100 / height}%`,
      objectFit: 'fill'
    }
  }, [displayedSelection, focusCropPreview])
  const isRunning = activeJobId !== null
  const canPrepare = validFiles.length > 0 && !busy && !isRunning
  const canRunJobs = runnableJobs.length > 0 && ffmpegStatus === 'available' && !busy && !isRunning
  const canRetryJobs = failedJobs.length > 0 && ffmpegStatus === 'available' && !busy && !isRunning

  const summary = useMemo(() => ({
    total: files.length,
    ready: validFiles.length,
    invalid: invalidCount,
    jobs: jobs.length
  }), [files.length, invalidCount, jobs.length, validFiles.length])

  const updateOptions = useCallback((updater: JobOptions | ((previous: JobOptions) => JobOptions)) => {
    if (configScope === 'current' && selectedFile) {
      setOverrideConfigs((previous) => {
        const base = previous[selectedFile.path] ?? globalConfig
        const next = typeof updater === 'function'
          ? (updater as (previous: JobOptions) => JobOptions)(base)
          : updater
        const nextConfigs = { ...previous }
        if (areOptionsEquivalent(next, globalConfig)) {
          delete nextConfigs[selectedFile.path]
        } else {
          nextConfigs[selectedFile.path] = next
        }
        return nextConfigs
      })
    } else {
      setGlobalConfig((previous) => (
        typeof updater === 'function'
          ? (updater as (previous: JobOptions) => JobOptions)(previous)
          : updater
      ))
    }
    setJobs([])
  }, [configScope, globalConfig, selectedFile])

  const syncManualCropFromSelection = useCallback((selection: CropSelection, naturalSize = videoNaturalSize) => {
    if (!naturalSize.width || !naturalSize.height) return
    const normalized = normalizeSelection(selection)
    const cropWidth = Math.max(2, Math.floor(Math.round(normalized.width * naturalSize.width) / 2) * 2)
    const cropHeight = Math.max(2, Math.floor(Math.round(normalized.height * naturalSize.height) / 2) * 2)
    const cropX = clampValue(Math.round(normalized.x * naturalSize.width), 0, Math.max(0, naturalSize.width - cropWidth))
    const cropY = clampValue(Math.round(normalized.y * naturalSize.height), 0, Math.max(0, naturalSize.height - cropHeight))

    updateOptions((previous) => ({
      ...previous,
      cropMode: 'manual',
      cropX,
      cropY,
      cropWidth,
      cropHeight
    }))
    setJobs([])
  }, [updateOptions, videoNaturalSize])

  const capturePreviewFrame = useCallback((keepMessage = false) => {
    const video = videoRef.current
    if (!video || !video.videoWidth || !video.videoHeight) return ''
    try {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const context = canvas.getContext('2d')
      if (!context) return ''
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/png')
      setPreviewFrameUrl(dataUrl)
      if (!keepMessage) {
        setPreviewMessage(`当前帧 ${formatSeconds(video.currentTime)}`)
      }
      return dataUrl
    } catch {
      if (!keepMessage) {
        setPreviewMessage('当前环境无法读取视频帧')
      }
      return ''
    }
  }, [])

  const seekPreview = useCallback((time: number) => {
    const video = videoRef.current
    if (!video || !Number.isFinite(time)) return
    const nextTime = clampValue(time, 0, videoDuration || video.duration || 0)
    video.currentTime = nextTime
    setCurrentTime(nextTime)
  }, [videoDuration])

  const togglePreviewPlayback = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      if (videoDuration > 0 && (video.currentTime < effectiveTrimStartSeconds || video.currentTime >= trimEndSeconds)) {
        video.currentTime = effectiveTrimStartSeconds
        setCurrentTime(effectiveTrimStartSeconds)
      }
      void video.play()
    } else {
      video.pause()
    }
  }, [effectiveTrimStartSeconds, trimEndSeconds, videoDuration])

  const inspectAndMergePaths = useCallback(async (paths: string[]) => {
    const nextPaths = paths.filter(Boolean)
    if (!nextPaths.length) return
    setBusy(true)
    setJobs([])
    try {
      const response = await host.call('inspectFiles', nextPaths)
      const data = unwrapHostData<{ files?: VideoFileSummary[] }>(response)
      const rows = data?.files ?? nextPaths.map((filePath) => ({
        path: filePath,
        name: baseName(filePath),
        size: 0,
        ok: true
      }))

      setFiles((previous) => {
        const map = new Map(previous.map((file) => [file.path, file]))
        for (const row of rows) {
          map.set(row.path, row)
        }
        return Array.from(map.values())
      })
    } catch (error) {
      notification.show(error instanceof Error ? error.message : '导入失败', 'error')
    } finally {
      setBusy(false)
    }
  }, [host, notification])

  const scanAndMergeDirectories = useCallback(async (directoryPaths: string[]) => {
    const nextPaths = directoryPaths.filter(Boolean)
    if (!nextPaths.length) return
    setBusy(true)
    setJobs([])
    try {
      const response = await host.call('scanDirectories', nextPaths)
      const data = unwrapHostData<{
        files?: VideoFileSummary[]
        skipped?: ScanSkippedItem[]
        skippedCount?: number
        truncated?: boolean
      }>(response)
      const rows = data?.files ?? []

      setFiles((previous) => {
        const map = new Map(previous.map((file) => [file.path, file]))
        for (const row of rows) {
          map.set(row.path, row)
        }
        return Array.from(map.values())
      })

      const skippedCount = data?.skippedCount ?? data?.skipped?.length ?? 0
      const truncatedText = data?.truncated ? '，已达到扫描上限' : ''
      const type = rows.length > 0 ? 'success' : 'warning'
      notification.show(`已从文件夹导入 ${rows.length} 个视频，跳过 ${skippedCount} 项${truncatedText}`, type)
    } catch (error) {
      notification.show(error instanceof Error ? error.message : '文件夹扫描失败', 'error')
    } finally {
      setBusy(false)
    }
  }, [host, notification])

  useEffect(() => {
    if (!selectedFile && selectedPath) {
      setSelectedPath('')
    }
    if (!selectedPath && validFiles[0]) {
      setSelectedPath(validFiles[0].path)
    }
  }, [selectedFile, selectedPath, validFiles])

  useEffect(() => {
    let canceled = false

    if (!selectedFile) {
      setPreview(null)
      setVideoDuration(0)
      setVideoNaturalSize({ width: 0, height: 0 })
      setCurrentTime(0)
      setPreviewFrameUrl('')
      setCropSelection(null)
      setFocusCropPreview(false)
      setPreviewMessage('选择一个视频后可预览')
      return
    }

    setPreviewMessage('正在加载预览')
    setPreview(null)
    setPreviewFrameUrl('')
    setVideoDuration(0)
    setVideoNaturalSize({ width: 0, height: 0 })
    setCurrentTime(0)
    setCropSelection(null)
    setFocusCropPreview(false)

    void (async () => {
      try {
        const response = await host.call('getVideoPreview', selectedFile.path)
        const data = unwrapHostData<{ url?: string; name?: string }>(response)
        if (canceled) return
        if (data?.url) {
          setPreview({
            path: selectedFile.path,
            url: data.url,
            name: data.name || selectedFile.name
          })
          setPreviewMessage('预览就绪')
        } else {
          setPreview(null)
          setPreviewMessage('无法生成预览地址')
        }
      } catch (error) {
        if (canceled) return
        setPreview(null)
        setPreviewMessage(error instanceof Error ? error.message : '视频预览加载失败')
      }
    })()

    return () => {
      canceled = true
    }
  }, [host, selectedFile])

  const checkFfmpeg = useCallback(async () => {
    if (!ffmpeg) {
      setFfmpegStatus('missing')
      setFfmpegPath(null)
      setFfmpegMessage('当前 Mulby 版本未提供内置 FFmpeg')
      return
    }
    setFfmpegStatus('checking')
    setFfmpegMessage('检测中')
    try {
      const available = await ffmpeg.isAvailable()
      if (available) {
        const [version, runtimePath] = await Promise.all([
          ffmpeg.getVersion(),
          ffmpeg.getPath()
        ])
        setFfmpegStatus('available')
        setFfmpegPath(runtimePath)
        setFfmpegMessage(version ? `内置 FFmpeg 可用：${version}` : '内置 FFmpeg 可用')
      } else {
        setFfmpegStatus('missing')
        setFfmpegPath(null)
        setFfmpegMessage('内置 FFmpeg 未安装')
      }
    } catch (error) {
      setFfmpegStatus('missing')
      setFfmpegPath(null)
      setFfmpegMessage(error instanceof Error ? error.message : '检测失败')
    }
  }, [ffmpeg])

  const downloadFfmpeg = useCallback(async () => {
    if (!ffmpeg || busy || isRunning) return
    setFfmpegStatus('downloading')
    setFfmpegMessage('正在下载内置 FFmpeg')
    setDownloadProgress(null)
    try {
      const result = await ffmpeg.download((progress) => {
        setDownloadProgress(progress)
        setFfmpegMessage(downloadProgressText(progress))
      })
      if (!result.success) {
        setFfmpegStatus('missing')
        setFfmpegMessage(result.error || 'FFmpeg 下载失败')
        notification.show(result.error || 'FFmpeg 下载失败', 'error')
        return
      }
      notification.show('FFmpeg 下载完成', 'success')
      setDownloadProgress(null)
      await checkFfmpeg()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'FFmpeg 下载失败'
      setFfmpegStatus('missing')
      setFfmpegMessage(message)
      notification.show(message, 'error')
    }
  }, [busy, checkFfmpeg, ffmpeg, isRunning, notification])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const initialTheme = params.get('theme') === 'dark' ? 'dark' : 'light'
    document.documentElement.classList.toggle('dark', initialTheme === 'dark')

    window.mulby?.onThemeChange?.((theme) => {
      document.documentElement.classList.toggle('dark', theme === 'dark')
    })

    window.mulby?.onPluginInit?.((data: PluginInitData) => {
      const paths = (data.attachments ?? [])
        .map((attachment) => attachment.path)
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
      void inspectAndMergePaths(paths)
    })

    void (async () => {
      try {
        const response = await host.call('getPendingInit')
        const data = unwrapHostData<{ paths?: string[] }>(response)
        if (data?.paths?.length) {
          await inspectAndMergePaths(data.paths)
        }
      } catch {
        /* Mulby host may not be ready during browser-only preview. */
      }
      await checkFfmpeg()
    })()
  }, [checkFfmpeg, host, inspectAndMergePaths])

  const pickFiles = async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: '选择视频文件',
        filters: [{ name: 'Video', extensions: VIDEO_FILTER }],
        properties: ['openFile', 'multiSelections', 'showHiddenFiles']
      })
      await inspectAndMergePaths(pathsFromOpenDialog(result))
    } catch (error) {
      notification.show(error instanceof Error ? error.message : '无法打开文件选择框', 'error')
    }
  }

  const pickDirectories = async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: '选择视频文件夹',
        properties: ['openDirectory', 'multiSelections', 'showHiddenFiles']
      })
      await scanAndMergeDirectories(pathsFromOpenDialog(result))
    } catch (error) {
      notification.show(error instanceof Error ? error.message : '无法打开文件夹选择框', 'error')
    }
  }

  const pickOutputDirectory = async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: '选择输出目录',
        properties: ['openDirectory', 'showHiddenFiles']
      })
      const [directory] = pathsFromOpenDialog(result)
      if (directory) {
        updateOptions((previous) => ({ ...previous, outputDirectory: directory }))
      }
    } catch (error) {
      notification.show(error instanceof Error ? error.message : '无法选择输出目录', 'error')
    }
  }

  const prepareJobs = async () => {
    if (!canPrepare) return
    setBusy(true)
    try {
      const preparedGroups = await Promise.all(validFiles.map(async (file) => {
        const overrideConfig = overrideConfigs[file.path]
        const hasChangedOverride = Boolean(overrideConfig && !areOptionsEquivalent(overrideConfig, globalConfig))
        const finalConfig = hasChangedOverride && overrideConfig ? overrideConfig : globalConfig
        const response = await host.call(
          'prepareJobs',
          [file.path],
          normalizeOptionsForHost(finalConfig)
        )
        const data = unwrapHostData<{ jobs?: PreparedJob[] }>(response)
        return (data?.jobs ?? []).map((job) => ({
          ...job,
          configSource: hasChangedOverride ? 'override' as const : 'global' as const
        }))
      }))
      const nextJobs = preparedGroups.flat()
      setJobs(nextJobs.map((job) => ({ ...job, status: 'ready' as const, error: undefined })))
      notification.show(`已生成 ${nextJobs.length} 个任务`, nextJobs.length > 0 ? 'success' : 'warning')
    } catch (error) {
      notification.show(error instanceof Error ? error.message : '任务生成失败', 'error')
    } finally {
      setBusy(false)
    }
  }

  const selectPreviewFile = (filePath: string) => {
    if (isRunning) return
    setSelectedPath(filePath)
  }

  const removeFile = (filePath: string) => {
    if (isRunning) return
    setFiles((previous) => previous.filter((file) => file.path !== filePath))
    setJobs((previous) => previous.filter((job) => job.sourcePath !== filePath))
    setOverrideConfigs((previous) => {
      if (!previous[filePath]) return previous
      const next = { ...previous }
      delete next[filePath]
      return next
    })
    if (selectedPath === filePath) {
      setSelectedPath('')
    }
  }

  const clearFiles = () => {
    if (isRunning) return
    setFiles([])
    setJobs([])
    setSelectedPath('')
    setOverrideConfigs({})
  }

  const clearJobs = () => {
    if (busy || isRunning) return
    setJobs([])
    setRunProgress(null)
    setActiveJobId(null)
    setActiveJobName('')
  }

  const showSettingsHint = () => {
    notification.show('当前版本暂无独立设置页。FFmpeg 状态在顶部查看，视频处理参数在右侧配置面板调整。', 'info')
  }

  const stopQueue = () => {
    if (!activeTaskRef.current) return
    stopRequestedRef.current = true
    activeTaskRef.current.quit()
    notification.show('已请求停止当前 FFmpeg 任务', 'info')
  }

  const runQueue = async (jobIds?: string[]) => {
    const targetIdSet = jobIds ? new Set(jobIds) : null
    const selectedJobs = jobs.filter((job) => (
      targetIdSet ? targetIdSet.has(job.id) : job.status !== 'done'
    ))
    if (!ffmpeg || !selectedJobs.length || ffmpegStatus !== 'available' || busy || isRunning) return
    setBusy(true)
    setFfmpegStatus('running')
    stopRequestedRef.current = false
    let successCount = 0
    let failedCount = 0
    let stoppedCount = 0

    try {
      for (const job of selectedJobs) {
        if (stopRequestedRef.current) break
        setActiveJobId(job.id)
        setActiveJobName(job.sourceName)
        setRunProgress(null)
        setJobs((previous) => previous.map((item) => (
          item.id === job.id ? { ...item, status: 'running', error: undefined } : item
        )))

        const task = ffmpeg.run(job.args, (progress) => {
          setRunProgress(progress)
        })
        activeTaskRef.current = task

        try {
          await task.promise
          if (stopRequestedRef.current) {
            stoppedCount += 1
            setJobs((previous) => previous.map((item) => (
              item.id === job.id ? { ...item, status: 'stopped' } : item
            )))
            break
          }
          successCount += 1
          setJobs((previous) => previous.map((item) => (
            item.id === job.id ? { ...item, status: 'done' } : item
          )))
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          if (stopRequestedRef.current) {
            stoppedCount += 1
            setJobs((previous) => previous.map((item) => (
              item.id === job.id ? { ...item, status: 'stopped', error: message } : item
            )))
            break
          }
          failedCount += 1
          setJobs((previous) => previous.map((item) => (
            item.id === job.id ? { ...item, status: 'failed', error: message } : item
          )))
        } finally {
          activeTaskRef.current = null
        }
      }

      if (stopRequestedRef.current) {
        notification.show(`队列已停止，成功 ${successCount}，失败 ${failedCount}，停止 ${stoppedCount}`, 'warning')
      } else if (failedCount > 0) {
        notification.show(`队列完成：成功 ${successCount}，失败 ${failedCount}`, 'warning')
      } else {
        notification.show(`队列完成：成功 ${successCount}`, 'success')
      }
    } finally {
      setBusy(false)
      setActiveJobId(null)
      setActiveJobName('')
      setRunProgress(null)
      stopRequestedRef.current = false
      await checkFfmpeg()
    }
  }

  const retryFailedJobs = async () => {
    if (!canRetryJobs) return
    await runQueue(failedJobs.map((job) => job.id))
  }

  const revealOutput = async (job: PreparedJob) => {
    if (!window.mulby?.shell?.showItemInFolder) {
      notification.show('当前 Mulby 版本未提供输出定位 API', 'error')
      return
    }
    try {
      await shell.showItemInFolder(job.outputPath)
    } catch (error) {
      notification.show(error instanceof Error ? error.message : '无法定位输出文件', 'error')
    }
  }

  const exportRunLog = async () => {
    if (!files.length && !jobs.length) {
      notification.show('暂无可导出的日志', 'warning')
      return
    }
    if (!window.mulby?.dialog?.showSaveDialog || !window.mulby?.filesystem?.writeFile) {
      notification.show('当前 Mulby 版本未提供日志导出 API', 'error')
      return
    }

    try {
      const exportedAt = new Date()
      const savePath = await dialog.showSaveDialog({
        title: '导出处理日志',
        defaultPath: `video-batch-editor-log-${formatTimestampForFile(exportedAt)}.json`,
        buttonLabel: '导出',
        filters: [{ name: 'JSON', extensions: ['json'] }]
      })
      if (!savePath) return

      const payload = {
        pluginId: PLUGIN_ID,
        exportedAt: exportedAt.toISOString(),
        ffmpeg: {
          status: ffmpegStatus,
          message: ffmpegMessage,
          path: ffmpegPath
        },
        configScope,
        globalConfig: {
          ...globalConfig,
          outputDirectory: globalConfig.outputDirectory || null,
          watermarkText: globalConfig.watermarkText.trim() || null
        },
        overrideConfigs,
        summary,
        files,
        jobs
      }

      await filesystem.writeFile(savePath, JSON.stringify(payload, null, 2), 'utf-8')
      notification.show('日志已导出', 'success')
    } catch (error) {
      notification.show(error instanceof Error ? error.message : '日志导出失败', 'error')
    }
  }

  const updateNumberOption = (key: keyof Pick<JobOptions, 'trimStartSeconds' | 'trimDurationSeconds' | 'removeStartSeconds' | 'cropX' | 'cropY' | 'cropWidth' | 'cropHeight' | 'width' | 'height' | 'videoBitrateKbps' | 'crf'>, value: string) => {
    const numeric = value === '' ? 0 : Number(value)
    updateOptions((previous) => ({ ...previous, [key]: Number.isFinite(numeric) ? numeric : 0 }))
  }

  const updateOption = <T extends keyof JobOptions>(key: T, value: JobOptions[T]) => {
    updateOptions((previous) => ({ ...previous, [key]: value }))
  }

  const applyTimeRange = (start: number, end: number) => {
    const duration = videoDuration || Math.max(end, start, 0.1)
    const minGap = duration >= 0.1 ? 0.1 : duration
    const nextStart = clampValue(start, 0, Math.max(0, duration - minGap))
    const nextEnd = clampValue(end, nextStart + minGap, duration)
    updateOptions((previous) => ({
      ...previous,
      timeMode: 'range',
      trimStartSeconds: Number(nextStart.toFixed(2)),
      trimDurationSeconds: Number(Math.max(minGap, nextEnd - nextStart).toFixed(2))
    }))
  }

  const captureScreenshot = async () => {
    const dataUrl = capturePreviewFrame()
    if (!dataUrl) {
      notification.show('当前帧不可截图', 'warning')
      return
    }
    if (!window.mulby?.dialog?.showSaveDialog || !window.mulby?.filesystem?.writeFile) {
      notification.show('当前 Mulby 版本未提供截图保存 API', 'error')
      return
    }

    try {
      const selectedName = selectedFile ? baseName(selectedFile.path).replace(/\.[^.]+$/, '') : 'frame'
      const savePath = await dialog.showSaveDialog({
        title: '保存当前帧截图',
        defaultPath: `${selectedName}-frame-${formatTimestampForFile(new Date())}.png`,
        buttonLabel: '保存',
        filters: [{ name: 'PNG', extensions: ['png'] }]
      })
      if (!savePath) return
      await filesystem.writeFile(savePath, dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64')
      notification.show('当前帧截图已保存', 'success')
    } catch (error) {
      notification.show(error instanceof Error ? error.message : '截图保存失败', 'error')
    }
  }

  const pointerToSelectionPoint = (event: PointerEvent<HTMLDivElement>) => {
    const rect = previewStageRef.current?.getBoundingClientRect()
    if (!rect) return null
    const viewport = fitContainViewport(rect.width, rect.height, videoNaturalSize.width, videoNaturalSize.height)
    const localX = (event.clientX - rect.left) / rect.width
    const localY = (event.clientY - rect.top) / rect.height
    return {
      x: clampValue((localX - viewport.x) / viewport.width, 0, 1),
      y: clampValue((localY - viewport.y) / viewport.height, 0, 1)
    }
  }

  const startCropDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (focusCropPreview || !hasPreview || !videoNaturalSize.width || !videoNaturalSize.height) return
    const point = pointerToSelectionPoint(event)
    if (!point) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setCropDrag({
      startX: point.x,
      startY: point.y,
      currentX: point.x,
      currentY: point.y
    })
  }

  const moveCropDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!cropDrag) return
    const point = pointerToSelectionPoint(event)
    if (!point) return
    setCropDrag((previous) => previous ? {
      ...previous,
      currentX: point.x,
      currentY: point.y
    } : null)
  }

  const finishCropDrag = () => {
    if (!cropDrag) return
    const selection = selectionFromPoints(cropDrag.startX, cropDrag.startY, cropDrag.currentX, cropDrag.currentY)
    setCropDrag(null)
    if (selection.width < 0.02 || selection.height < 0.02) return
    setCropSelection(selection)
    syncManualCropFromSelection(selection)
  }

  const clearCropSelection = () => {
    setCropSelection(null)
    setFocusCropPreview(false)
    updateOption('cropMode', 'none')
  }

  const timelinePointToSeconds = (event: PointerEvent<HTMLDivElement>) => {
    const rect = timelineRef.current?.getBoundingClientRect()
    if (!rect || !videoDuration) return null
    const ratio = clampValue((event.clientX - rect.left) / rect.width, 0, 1)
    return ratio * videoDuration
  }

  const applyTimelineDrag = (target: TimelineDragTarget, time: number) => {
    if (!target || !videoDuration) return
    if (target === 'start') {
      const nextStart = clampValue(time, 0, Math.max(0, trimEndSeconds - 0.1))
      applyTimeRange(nextStart, trimEndSeconds)
      seekPreview(nextStart)
      return
    }
    if (target === 'end') {
      const nextEnd = clampValue(time, effectiveTrimStartSeconds + 0.1, videoDuration)
      applyTimeRange(effectiveTrimStartSeconds, nextEnd)
      seekPreview(nextEnd)
      return
    }
    const nextTime = clampValue(time, effectiveTrimStartSeconds, trimEndSeconds)
    seekPreview(nextTime)
  }

  const startTimelineDrag = (target: TimelineDragTarget, event: PointerEvent<HTMLButtonElement | HTMLDivElement>) => {
    if (!target || !videoDuration) return
    const time = timelinePointToSeconds(event as PointerEvent<HTMLDivElement>)
    if (time === null) return
    event.preventDefault()
    event.stopPropagation()
    event.nativeEvent.stopImmediatePropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    setTimelineDrag({ target })
    applyTimelineDrag(target, time)
  }

  const moveTimelineDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!timelineDrag?.target) return
    const time = timelinePointToSeconds(event)
    if (time === null) return
    applyTimelineDrag(timelineDrag.target, time)
  }

  const finishTimelineDrag = () => {
    setTimelineDrag(null)
  }

  const seekWithinTrimRange = (event: PointerEvent<HTMLDivElement>) => {
    if (!videoDuration) return
    const time = timelinePointToSeconds(event)
    if (time === null || time < effectiveTrimStartSeconds || time > trimEndSeconds) return
    event.preventDefault()
    seekPreview(time)
  }

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const list = event.dataTransfer?.files
    if (!list?.length) return
    const paths: string[] = []
    for (let index = 0; index < list.length; index += 1) {
      const file = list[index] as File & { path?: string }
      if (file.path) paths.push(file.path)
    }
    if (paths.length > 0) {
      void inspectAndMergePaths(paths)
    } else {
      notification.show('未读取到本地路径', 'warning')
    }
  }

  const ffmpegClassName = `status-pill ${ffmpegStatus}`
  const ffmpegTooltip = [
    ffmpegStatus === 'available' ? '安装状态：可用' : ffmpegStatus === 'missing' ? '安装状态：未安装' : `安装状态：${ffmpegMessage}`,
    `版本：${ffmpegMessage}`,
    `路径：${ffmpegPath || '未读取'}`
  ].join('\n')

  return (
    <div className="app-shell" onDragOver={onDragOver} onDrop={onDrop}>
      <header className="runtime-bar">
        <div className="toolbar-title">
          <FileVideo2 size={18} />
          <span>视频批量编辑</span>
        </div>
        <div className="toolbar-actions">
          <div className={ffmpegClassName} title={ffmpegTooltip}>
            {ffmpegStatus === 'available' ? <CheckCircle2 size={15} /> : ffmpegStatus === 'checking' || ffmpegStatus === 'downloading' || ffmpegStatus === 'running' ? <Loader2 size={15} /> : <AlertCircle size={15} />}
            <span>{ffmpegStatus === 'available' ? 'FFmpeg 可用' : ffmpegStatus === 'missing' ? 'FFmpeg 未安装' : ffmpegMessage}</span>
          </div>
          {(downloadProgress || runProgress) && (
            <div className="runtime-inline-progress" aria-hidden>
              <span style={{ width: `${downloadProgress ? downloadProgress.percent : progressPercent(runProgress)}%` }} />
            </div>
          )}
          <button type="button" className="icon-button" onClick={checkFfmpeg} aria-label="重新检测 FFmpeg" title="重新检测 FFmpeg">
            <RefreshCw size={18} />
          </button>
          {ffmpegStatus === 'missing' && (
            <button type="button" className="secondary-button compact-button" onClick={downloadFfmpeg} disabled={!ffmpeg || busy || isRunning} title="下载内置 FFmpeg">
              <Download size={16} />
              下载 FFmpeg
            </button>
          )}
          <button type="button" className="icon-button" onClick={showSettingsHint} aria-label="设置说明" title="设置说明">
            <Settings2 size={18} />
          </button>
        </div>
      </header>

      <main className="workspace">
        <section className="queue-panel">
          <div className="panel-head queue-head">
            <div>
              <h2>文件队列</h2>
              <p title={`${summary.ready} 可处理 / ${summary.total} 总数 / ${summary.invalid} 异常 / ${summary.jobs} 任务`}>
                {summary.ready} 可处理 / {summary.total} 总数 / {summary.invalid} 异常
              </p>
            </div>
            <div className="head-actions">
              <button type="button" className="primary-button compact-button" onClick={pickFiles} disabled={busy} title="导入视频文件">
                <Import size={17} />
                导入视频
              </button>
              <button type="button" className="secondary-button compact-button" onClick={pickDirectories} disabled={busy} title="导入文件夹中的视频">
                <FolderOpen size={17} />
                导入文件夹
              </button>
              <button type="button" className="ghost-button" onClick={clearFiles} disabled={!files.length || busy} aria-label="清空队列" title="清空文件队列">
                <Trash2 size={17} />
              </button>
            </div>
          </div>

          <div className="queue-list" aria-label="文件队列">
            {files.length === 0 ? (
              <div className="empty-state queue-empty">
                <FileVideo2 size={24} />
                <span>暂无视频</span>
              </div>
            ) : files.map((file) => (
              <article
                className={`queue-card ${selectedFile?.path === file.path ? 'selected-row' : ''}`}
                key={file.path}
                role="button"
                tabIndex={isRunning ? -1 : 0}
                title={`${file.name}\n${file.path}`}
                onClick={() => selectPreviewFile(file.path)}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    selectPreviewFile(file.path)
                  }
                }}
              >
                <div className="file-cell file-select-button">
                  <FileVideo2 size={18} />
                  <div>
                    <strong title={file.name}>{file.name}</strong>
                    <small title={file.path}>{file.path}</small>
                  </div>
                </div>
                <span className="queue-meta" title={`大小：${formatBytes(file.size)}`}>{formatBytes(file.size)}</span>
                <span className={`queue-state ${file.ok ? 'state-ok' : 'state-error'}`} title={`状态：${file.ok ? '就绪' : file.error ?? '异常'}`}>
                  {file.ok ? '就绪' : file.error ?? '异常'}
                </span>
                {isOverrideConfigChanged(file.path) && (
                  <span className="override-badge" title="该视频有不同于全局配置的单独配置">已单独配置</span>
                )}
                <button
                  type="button"
                  className="icon-button subtle"
                  onClick={(event) => {
                    event.stopPropagation()
                    removeFile(file.path)
                  }}
                  onKeyDown={(event) => {
                    event.stopPropagation()
                  }}
                  aria-label={`移除 ${file.name}`}
                  title={`移除 ${file.name}`}
                >
                  <Trash2 size={16} />
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="preview-panel">
          <div className="panel-head">
            <div>
              <div className="preview-title-line">
                <h2>预览与裁剪</h2>
                {preview && (
                  <span className="preview-file-name" title={preview.path}>{preview.name}</span>
                )}
              </div>
              <p className="preview-mod-summary" title={previewChangeText}>{previewChangeText}</p>
            </div>
            <button type="button" className="secondary-button compact-button" onClick={captureScreenshot} disabled={!previewFrameUrl && !hasPreview} title="保存当前帧截图">
              <Camera size={16} />
              当前帧截图
            </button>
          </div>

          <div className="preview-workbench">
            <div className="video-preview-column">
              <div
                className={`video-stage ${focusCropPreview && displayedSelection ? 'focus-crop' : ''}`}
                ref={previewStageRef}
                onPointerDown={startCropDrag}
                onPointerMove={moveCropDrag}
                onPointerUp={finishCropDrag}
                onPointerCancel={finishCropDrag}
              >
                {preview && focusCropPreview && displayedSelection ? (
                  <div className="crop-focus-frame" style={cropFocusFrameStyle}>
                    <video
                      ref={videoRef}
                      src={preview.url}
                      playsInline
                      style={cropFocusVideoStyle}
                      onLoadedMetadata={(event) => {
                        const video = event.currentTarget
                        const duration = Number.isFinite(video.duration) ? video.duration : 0
                        setVideoDuration(duration)
                        setVideoNaturalSize({ width: video.videoWidth, height: video.videoHeight })
                        setCurrentTime(video.currentTime)
                        setPreviewMessage(`${video.videoWidth} x ${video.videoHeight} / ${formatSeconds(duration)}`)
                      }}
                      onTimeUpdate={(event) => {
                        const video = event.currentTarget
                        if (videoDuration > 0 && video.currentTime > trimEndSeconds + 0.05) {
                          video.pause()
                          video.currentTime = trimEndSeconds
                          setCurrentTime(trimEndSeconds)
                          capturePreviewFrame(true)
                          return
                        }
                        setCurrentTime(video.currentTime)
                        capturePreviewFrame(true)
                      }}
                      onPlay={() => {
                        setVideoPlaying(true)
                      }}
                      onPause={() => {
                        setVideoPlaying(false)
                      }}
                      onEnded={() => {
                        setVideoPlaying(false)
                      }}
                      onSeeked={() => {
                        capturePreviewFrame()
                      }}
                      onLoadedData={() => {
                        capturePreviewFrame()
                      }}
                      onError={() => {
                        setPreviewMessage('视频预览加载失败')
                      }}
                    />
                  </div>
                ) : preview ? (
                  <video
                    ref={videoRef}
                    src={preview.url}
                    playsInline
                    onLoadedMetadata={(event) => {
                      const video = event.currentTarget
                      const duration = Number.isFinite(video.duration) ? video.duration : 0
                      setVideoDuration(duration)
                      setVideoNaturalSize({ width: video.videoWidth, height: video.videoHeight })
                      setCurrentTime(video.currentTime)
                      setPreviewMessage(`${video.videoWidth} x ${video.videoHeight} / ${formatSeconds(duration)}`)
                    }}
                    onTimeUpdate={(event) => {
                      const video = event.currentTarget
                      if (videoDuration > 0 && video.currentTime > trimEndSeconds + 0.05) {
                        video.pause()
                        video.currentTime = trimEndSeconds
                        setCurrentTime(trimEndSeconds)
                        capturePreviewFrame(true)
                        return
                      }
                      setCurrentTime(video.currentTime)
                      capturePreviewFrame(true)
                    }}
                    onPlay={() => {
                      setVideoPlaying(true)
                    }}
                    onPause={() => {
                      setVideoPlaying(false)
                    }}
                    onEnded={() => {
                      setVideoPlaying(false)
                    }}
                    onSeeked={() => {
                      capturePreviewFrame()
                    }}
                    onLoadedData={() => {
                      capturePreviewFrame()
                    }}
                    onError={() => {
                      setPreviewMessage('视频预览加载失败')
                    }}
                  />
                ) : (
                  <div className="preview-placeholder">
                    <FileVideo2 size={34} />
                    <span>{previewMessage}</span>
                  </div>
                )}

                {displayedSelection && !focusCropPreview && (
                  <div
                    className="crop-overlay"
                    style={selectionOverlayStyle}
                  />
                )}

                {displayedSelection && (
                  <div className="crop-readout" title={cropStats}>
                    {focusCropPreview ? `裁剪区域预览 / ${cropStats}` : cropStats}
                  </div>
                )}
              </div>

              <div className="timeline-panel">
                <div className="timeline-meta">
                  <span>{formatSeconds(effectiveTrimStartSeconds)}</span>
                  <strong title={`${formatSeconds(currentTime)} / ${formatSeconds(videoDuration)}`}>
                    {formatSeconds(currentTime)} / {formatSeconds(videoDuration)}
                  </strong>
                  <span>{formatSeconds(trimEndSeconds)}</span>
                </div>
                <div
                  className={`trim-timeline ${videoDuration ? '' : 'disabled'}`}
                  ref={timelineRef}
                  onPointerDown={seekWithinTrimRange}
                  onPointerMove={moveTimelineDrag}
                  onPointerUp={finishTimelineDrag}
                  onPointerCancel={finishTimelineDrag}
                >
                  <div className="trim-muted trim-muted-left" style={{ width: `${trimStartPercent}%` }} />
                  <div
                    className="trim-range"
                    style={{
                      left: `${trimStartPercent}%`,
                      width: `${trimRangeWidthPercent}%`
                    }}
                  />
                  <div className="trim-muted trim-muted-right" style={{ left: `${trimEndPercent}%` }} />
                  <button
                    type="button"
                    className="trim-handle start"
                    style={{ left: `${trimStartPercent}%` }}
                    onPointerDown={(event) => startTimelineDrag('start', event)}
                    disabled={!videoDuration}
                    aria-label="裁剪起点"
                    title="拖动设置截取起点"
                  />
                  <button
                    type="button"
                    className="trim-handle end"
                    style={{ left: `${trimEndPercent}%` }}
                    onPointerDown={(event) => startTimelineDrag('end', event)}
                    disabled={!videoDuration}
                    aria-label="裁剪终点"
                    title="拖动设置截取终点"
                  />
                  <button
                    type="button"
                    className="playhead"
                    style={{ left: `${currentTimePercent}%` }}
                    onPointerDown={(event) => startTimelineDrag('playhead', event)}
                    disabled={!videoDuration}
                    aria-label="播放头"
                    title="拖动定位播放头"
                  />
                </div>
                <div className="timeline-actions">
                  <button type="button" className="secondary-button compact-button" onClick={togglePreviewPlayback} disabled={!hasPreview} title={videoPlaying ? '暂停预览' : '播放预览'}>
                    {videoPlaying ? <Pause size={16} /> : <Play size={16} />}
                    {videoPlaying ? '暂停' : '播放'}
                  </button>
                  <button type="button" className="secondary-button compact-button" onClick={() => seekPreview(effectiveTrimStartSeconds)} disabled={!videoDuration} title="定位到截取起点">
                    定位起点
                  </button>
                  <button type="button" className="secondary-button compact-button" onClick={() => seekPreview(trimEndSeconds)} disabled={!videoDuration} title="定位到截取终点">
                    定位终点
                  </button>
                  <button
                    type="button"
                    className="secondary-button compact-button"
                    onClick={() => setFocusCropPreview((previous) => !previous)}
                    disabled={!cropSelection}
                    title={focusCropPreview ? '显示完整画面' : '放大显示裁剪区域'}
                  >
                    {focusCropPreview ? '显示完整画面' : '只看裁剪区域'}
                  </button>
                  <button type="button" className="secondary-button compact-button" onClick={clearCropSelection} disabled={!cropSelection} title="清除画面框选">
                    清除框选
                  </button>
                </div>
              </div>
            </div>
          </div>

          <section className="jobs-panel">
            <div className="panel-head jobs-head">
              <div>
                <h2>任务预览</h2>
                <p>{jobs.length > 0 ? `${jobs.length} 条命令 / ${failedJobs.length} 条可重试` : '未生成命令'}</p>
              </div>
              <div className="head-actions">
                <button type="button" className="secondary-button compact-button" onClick={retryFailedJobs} disabled={!canRetryJobs} title="重试失败或已停止的任务">
                  <RefreshCw size={16} />
                  重试失败
                </button>
                <button type="button" className="secondary-button compact-button" onClick={clearJobs} disabled={!jobs.length || busy || isRunning} title="清空任务预览">
                  <Trash2 size={16} />
                  清空任务
                </button>
                <button type="button" className="secondary-button compact-button" onClick={exportRunLog} disabled={(!files.length && !jobs.length) || busy} title="导出处理日志">
                  <FileDown size={16} />
                  导出日志
                </button>
              </div>
            </div>

            <div className="job-list">
              {jobs.length === 0 ? (
                <div className="empty-state compact-empty">
                  <ClipboardList size={24} />
                  <span>暂无任务</span>
                </div>
              ) : jobs.map((job) => (
                <article className="job-row" key={job.id}>
                  <div className="job-title">
                    <strong>{job.sourceName}</strong>
                    <div className="job-badges">
                      <em className={`config-source ${job.configSource ?? 'global'}`}>
                        {job.configSource === 'override' ? '单独配置' : '全局配置'}
                      </em>
                      <span>{presetLabel(job.preset)}</span>
                      <em className={`job-status ${job.status}`}>{jobStatusLabel(job.status)}</em>
                    </div>
                  </div>
                  <code>{job.commandPreview}</code>
                  {activeJobId === job.id && (
                    <div className="job-progress">{formatProgress(runProgress)}</div>
                  )}
                  {job.error && <div className="job-error" title={job.error}>{job.error}</div>}
                  <div className="job-output-row">
                    <small title={job.outputPath}>{job.outputPath}</small>
                    <button
                      type="button"
                      className="icon-button subtle"
                      onClick={() => void revealOutput(job)}
                      disabled={job.status !== 'done' || isRunning}
                      aria-label={`定位输出 ${job.sourceName}`}
                      title={`定位输出 ${job.sourceName}`}
                    >
                      <FolderOpen size={16} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>

        <aside className="config-panel">
          <div className="panel-head compact">
            <div>
              <h2>{configPanelTitle}</h2>
              <p title={configPanelHint}>{activeJobName ? `正在处理 ${activeJobName}` : configPanelHint}</p>
            </div>
            <span className="panel-icon" aria-label="当前配置面板" title="当前配置面板">
              <Settings2 size={20} />
            </span>
          </div>

          <div className="scope-panel">
            <span>作用范围</span>
            <div className="scope-toggle" role="radiogroup" aria-label="配置作用范围">
              <button
                type="button"
                className={configScope === 'global' ? 'active' : ''}
                onClick={() => setConfigScope('global')}
                aria-pressed={configScope === 'global'}
              >
                应用到全部视频
              </button>
              <button
                type="button"
                className={configScope === 'current' ? 'active' : ''}
                onClick={() => setConfigScope('current')}
                disabled={!selectedFile}
                aria-pressed={configScope === 'current'}
              >
                仅当前选中视频
              </button>
            </div>
            {configScope === 'current' && selectedFile && (
              <p title={selectedFile.path}>
                {hasSelectedOverride ? '已存在单独配置' : '尚未修改，当前仍等同全局配置'}
              </p>
            )}
          </div>

          <div className="config-scroll">
          {(downloadProgress || runProgress) && (
            <div className="runtime-panel">
              <div className="runtime-row">
                <span>{activeJobName ? '任务进度' : '下载进度'}</span>
                <strong title={activeJobName ? formatProgress(runProgress) : downloadProgress ? downloadProgressText(downloadProgress) : ''}>
                  {activeJobName ? formatProgress(runProgress) : downloadProgress ? downloadProgressText(downloadProgress) : ''}
                </strong>
              </div>
              {(downloadProgress || runProgress) && (
                <div className="progress-track" aria-hidden>
                  <span style={{ width: `${downloadProgress ? downloadProgress.percent : progressPercent(runProgress)}%` }} />
                </div>
              )}
            </div>
          )}

          <label className="field compact-field">
            <span>导出预设</span>
            <select
              value={options.preset}
              onChange={(event) => updateOption('preset', event.target.value as VideoPreset)}
            >
              {PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label} - {preset.hint}
                </option>
              ))}
            </select>
          </label>

          <div className="config-group">
            <div className="group-title">
              <Scissors size={15} />
              <span>批量截取</span>
              <em>{optionLabel(TIME_MODES, options.timeMode)}</em>
            </div>
            <label className="field compact-field">
              <span>截取方式</span>
              <select
                value={options.timeMode}
                onChange={(event) => updateOption('timeMode', event.target.value as TimeMode)}
              >
                {TIME_MODES.map((mode) => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label}
                  </option>
                ))}
              </select>
            </label>

            {options.timeMode === 'range' && (
              <div className="field-grid">
                <label className="field compact-field">
                  <span>起点秒</span>
                  <input
                    type="number"
                    min={0}
                    value={options.trimStartSeconds}
                    onChange={(event) => updateNumberOption('trimStartSeconds', event.target.value)}
                  />
                </label>
                <label className="field compact-field">
                  <span>时长秒</span>
                  <input
                    type="number"
                    min={0}
                    value={options.trimDurationSeconds}
                    onChange={(event) => updateNumberOption('trimDurationSeconds', event.target.value)}
                  />
                </label>
              </div>
            )}

            {options.timeMode === 'first' && (
              <label className="field compact-field">
                <span>截取前 N 秒</span>
                <input
                  type="number"
                  min={1}
                  value={options.trimDurationSeconds}
                  onChange={(event) => updateNumberOption('trimDurationSeconds', event.target.value)}
                />
              </label>
            )}

            {options.timeMode === 'remove-start' && (
              <label className="field compact-field">
                <span>去掉开头秒数</span>
                <input
                  type="number"
                  min={0}
                  value={options.removeStartSeconds}
                  onChange={(event) => updateNumberOption('removeStartSeconds', event.target.value)}
                />
              </label>
            )}
          </div>

          {options.preset !== 'cover-jpg' && (
            <div className="config-group">
              <div className="group-title">
                <Crop size={15} />
                <span>画面裁剪</span>
                <em>{optionLabel(CROP_MODES, options.cropMode)}</em>
              </div>
              <label className="field compact-field">
                <span>裁剪模式</span>
                <select
                  value={options.cropMode}
                  onChange={(event) => updateOption('cropMode', event.target.value as CropMode)}
                >
                  {CROP_MODES.map((mode) => (
                    <option key={mode.value} value={mode.value}>
                      {mode.label}
                    </option>
                  ))}
                </select>
              </label>

              {options.cropMode === 'manual' && (
                <>
                  <div className="field-grid">
                    <label className="field compact-field">
                      <span>X</span>
                      <input
                        type="number"
                        min={0}
                        value={options.cropX}
                        onChange={(event) => updateNumberOption('cropX', event.target.value)}
                      />
                    </label>
                    <label className="field compact-field">
                      <span>Y</span>
                      <input
                        type="number"
                        min={0}
                        value={options.cropY}
                        onChange={(event) => updateNumberOption('cropY', event.target.value)}
                      />
                    </label>
                  </div>
                  <div className="field-grid">
                    <label className="field compact-field">
                      <span>裁剪宽度</span>
                      <input
                        type="number"
                        min={2}
                        step={2}
                        value={options.cropWidth}
                        onChange={(event) => updateNumberOption('cropWidth', event.target.value)}
                      />
                    </label>
                    <label className="field compact-field">
                      <span>裁剪高度</span>
                      <input
                        type="number"
                        min={2}
                        step={2}
                        value={options.cropHeight}
                        onChange={(event) => updateNumberOption('cropHeight', event.target.value)}
                      />
                    </label>
                  </div>
                </>
              )}
            </div>
          )}

          {options.preset !== 'cover-jpg' && (
            <div className="config-group">
              <div className="group-title">
                <RotateCw size={15} />
                <span>横竖屏转换</span>
                <em>{optionLabel(ORIENTATION_MODES, options.orientationMode)}</em>
              </div>
              <label className="field compact-field">
                <span>方向/比例</span>
                <select
                  value={options.orientationMode}
                  onChange={(event) => updateOption('orientationMode', event.target.value as OrientationMode)}
                >
                  {ORIENTATION_MODES.map((mode) => (
                    <option key={mode.value} value={mode.value}>
                      {mode.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {options.preset !== 'cover-jpg' && options.orientationMode === 'keep' && (
            <div className="config-group compact-group">
              <div className="group-title">
                <span>输出尺寸</span>
                <em>{options.width || '-'} x {options.height || '-'}</em>
              </div>
              <div className="field-grid">
                <label className="field compact-field">
                  <span>宽度</span>
                  <input
                    type="number"
                    min={0}
                    step={2}
                    value={options.width}
                    onChange={(event) => updateNumberOption('width', event.target.value)}
                  />
                </label>
                <label className="field compact-field">
                  <span>高度</span>
                  <input
                    type="number"
                    min={0}
                    step={2}
                    value={options.height}
                    onChange={(event) => updateNumberOption('height', event.target.value)}
                  />
                </label>
              </div>
            </div>
          )}

          {options.preset !== 'cover-jpg' && (
            <div className="config-group">
              <div className="group-title">
                <Gauge size={15} />
                <span>编码参数</span>
                <em>{options.preset === 'webm' ? `${options.videoBitrateKbps} kbps` : `CRF ${options.crf}`}</em>
              </div>
              <label className="field compact-field">
                <span><Gauge size={14} /> 码率 kbps</span>
                <input
                  type="number"
                  min={300}
                  value={options.videoBitrateKbps}
                  onChange={(event) => updateNumberOption('videoBitrateKbps', event.target.value)}
                />
              </label>

              <label className="field compact-field range-field">
                <span>CRF {options.crf}</span>
                <input
                  type="range"
                  min={0}
                  max={51}
                  value={options.crf}
                  onChange={(event) => updateNumberOption('crf', event.target.value)}
                />
              </label>

              <label className="field compact-field">
                <span><Sparkles size={14} /> 文字水印</span>
                <input
                  type="text"
                  value={options.watermarkText}
                  placeholder="可选"
                  onChange={(event) => {
                    updateOption('watermarkText', event.target.value)
                  }}
                />
              </label>
            </div>
          )}

          <label className="field compact-field output-field">
            <span>输出目录</span>
            <div className="directory-row">
              <input
                type="text"
                value={options.outputDirectory}
                placeholder="默认原目录"
                onChange={(event) => updateOption('outputDirectory', event.target.value)}
              />
              <button type="button" className="icon-button" onClick={pickOutputDirectory} aria-label="选择输出目录" title="选择输出目录">
                <FolderOpen size={17} />
              </button>
            </div>
          </label>
          </div>

          <div className="config-action-bar action-row">
            <button type="button" className="primary-button wide" onClick={prepareJobs} disabled={!canPrepare} title="根据当前配置生成任务预览">
              <Wand2 size={18} />
              生成任务
            </button>
            {isRunning ? (
              <button type="button" className="secondary-button wide danger" onClick={stopQueue} title="停止当前 FFmpeg 任务">
                <Square size={18} />
                停止任务
              </button>
            ) : (
              <button type="button" className="secondary-button wide" onClick={() => void runQueue()} disabled={!canRunJobs} title="执行任务队列">
                <Play size={18} />
                执行队列
              </button>
            )}
          </div>
        </aside>
      </main>
    </div>
  )
}
