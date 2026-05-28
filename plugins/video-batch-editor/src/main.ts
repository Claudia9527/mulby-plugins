/// <reference path="./types/mulby.d.ts" />

declare const require: any

const { execFile } = require('node:child_process')
const { access, stat } = require('node:fs/promises')
const path = require('node:path')

type PluginContext = BackendPluginContext

type VideoPreset = 'mp4-h264' | 'mp4-h265' | 'webm' | 'cover-jpg'

type JobOptions = {
  preset: VideoPreset
  outputDirectory?: string
  trimStartSeconds?: number
  trimDurationSeconds?: number
  width?: number
  height?: number
  videoBitrateKbps?: number
  crf?: number
  watermarkText?: string
}

type VideoFileSummary = {
  path: string
  name: string
  size: number
  ok: boolean
  error?: string
}

type PreparedJob = {
  id: string
  sourcePath: string
  sourceName: string
  outputPath: string
  preset: VideoPreset
  args: string[]
  commandPreview: string
  status: 'ready'
}

const PLUGIN_TAG = '[video-batch-editor]'
const DEFAULT_FFMPEG_BIN = 'ffmpeg'
const VIDEO_EXTENSIONS = new Set([
  '.mp4',
  '.mov',
  '.m4v',
  '.mkv',
  '.webm',
  '.avi',
  '.wmv',
  '.flv',
  '.ts',
  '.mpeg',
  '.mpg'
])

let pendingPaths: string[] = []

function log(message: string) {
  console.log(`${PLUGIN_TAG} ${message}`)
}

export function onLoad() {
  log('loaded')
}

export function onUnload() {
  log('unloaded')
}

export function onEnable() {
  log('enabled')
}

export function onDisable() {
  log('disabled')
}

export async function run(context: PluginContext) {
  const raw = context.attachments ?? []
  pendingPaths = raw
    .map((attachment) => attachment.path)
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
  log(`run feature=${context.featureCode ?? ''} attachments=${pendingPaths.length}`)
}

function execFileText(command: string, args: string[], timeout = 5000): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(command, args, { timeout }, (error: Error | null, stdout: string, stderr: string) => {
      if (error) {
        reject(error)
        return
      }
      resolve(`${stdout || ''}${stderr || ''}`)
    })
  })
}

function isVideoFile(filePath: string) {
  return VIDEO_EXTENSIONS.has(path.extname(filePath).toLowerCase())
}

function quoteArg(value: string) {
  if (/^[A-Za-z0-9_./:=,+-]+$/.test(value)) return value
  return `"${value.replace(/(["\\$`])/g, '\\$1')}"`
}

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}

function normalizeOptions(options: JobOptions): Required<Omit<JobOptions, 'outputDirectory' | 'watermarkText'>> & {
  outputDirectory?: string
  watermarkText?: string
} {
  return {
    preset: options.preset ?? 'mp4-h264',
    outputDirectory: options.outputDirectory,
    trimStartSeconds: clampNumber(options.trimStartSeconds, 0, 0, 86400),
    trimDurationSeconds: clampNumber(options.trimDurationSeconds, 0, 0, 86400),
    width: clampNumber(options.width, 1920, 0, 7680),
    height: clampNumber(options.height, 1080, 0, 4320),
    videoBitrateKbps: clampNumber(options.videoBitrateKbps, 4500, 300, 100000),
    crf: clampNumber(options.crf, 23, 0, 51),
    watermarkText: options.watermarkText?.trim() || undefined
  }
}

function outputExtension(preset: VideoPreset) {
  if (preset === 'webm') return '.webm'
  if (preset === 'cover-jpg') return '.jpg'
  return '.mp4'
}

function buildOutputPath(sourcePath: string, options: ReturnType<typeof normalizeOptions>) {
  const parsed = path.parse(sourcePath)
  const outputDir = options.outputDirectory || parsed.dir
  const suffix = options.preset === 'cover-jpg' ? '_cover' : '_edited'
  return path.join(outputDir, `${parsed.name}${suffix}${outputExtension(options.preset)}`)
}

function buildArgs(sourcePath: string, outputPath: string, options: ReturnType<typeof normalizeOptions>) {
  const args: string[] = ['-y']

  if (options.trimStartSeconds > 0) {
    args.push('-ss', String(options.trimStartSeconds))
  }

  args.push('-i', sourcePath)

  if (options.trimDurationSeconds > 0) {
    args.push('-t', String(options.trimDurationSeconds))
  }

  if (options.preset === 'cover-jpg') {
    args.push('-frames:v', '1', '-q:v', '2', outputPath)
    return args
  }

  const filters: string[] = []
  if (options.width > 0 || options.height > 0) {
    const width = options.width > 0 ? String(options.width) : '-2'
    const height = options.height > 0 ? String(options.height) : '-2'
    filters.push(`scale=${width}:${height}:force_original_aspect_ratio=decrease`)
  }
  if (options.watermarkText) {
    const text = options.watermarkText.replace(/[':\\]/g, '\\$&')
    filters.push(`drawtext=text='${text}':x=w-tw-32:y=h-th-28:fontcolor=white@0.86:fontsize=28:shadowcolor=black@0.5:shadowx=2:shadowy=2`)
  }
  if (filters.length > 0) {
    args.push('-vf', filters.join(','))
  }

  if (options.preset === 'mp4-h265') {
    args.push('-c:v', 'libx265', '-crf', String(options.crf), '-tag:v', 'hvc1')
  } else if (options.preset === 'webm') {
    args.push('-c:v', 'libvpx-vp9', '-b:v', `${options.videoBitrateKbps}k`)
  } else {
    args.push('-c:v', 'libx264', '-crf', String(options.crf), '-preset', 'medium')
  }

  args.push('-c:a', options.preset === 'webm' ? 'libopus' : 'aac', '-movflags', '+faststart', outputPath)
  return args
}

function buildPreparedJob(sourcePath: string, index: number, options: ReturnType<typeof normalizeOptions>): PreparedJob {
  const outputPath = buildOutputPath(sourcePath, options)
  const args = buildArgs(sourcePath, outputPath, options)
  return {
    id: `${Date.now()}-${index}`,
    sourcePath,
    sourceName: path.basename(sourcePath),
    outputPath,
    preset: options.preset,
    args,
    commandPreview: [DEFAULT_FFMPEG_BIN, ...args].map(quoteArg).join(' '),
    status: 'ready'
  }
}

export const rpc = {
  async getPendingInit(): Promise<{ paths: string[] }> {
    const paths = [...pendingPaths]
    pendingPaths = []
    return { paths }
  },

  async detectFfmpeg(): Promise<{ ok: boolean; version?: string; error?: string }> {
    try {
      const output = await execFileText(DEFAULT_FFMPEG_BIN, ['-version'])
      const firstLine = output.split(/\r?\n/).find(Boolean) ?? ''
      return { ok: true, version: firstLine }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { ok: false, error: message }
    }
  },

  async inspectFiles(filePaths: string[]): Promise<{ files: VideoFileSummary[] }> {
    const unique = [...new Set((filePaths ?? []).filter((value) => typeof value === 'string' && value.length > 0))]
    const files: VideoFileSummary[] = []

    for (const filePath of unique) {
      try {
        await access(filePath)
        const fileStat = await stat(filePath)
        if (fileStat.isDirectory()) {
          files.push({
            path: filePath,
            name: path.basename(filePath),
            size: 0,
            ok: false,
            error: '暂未扫描文件夹，请选择具体视频文件'
          })
          continue
        }
        if (!isVideoFile(filePath)) {
          files.push({
            path: filePath,
            name: path.basename(filePath),
            size: fileStat.size,
            ok: false,
            error: '不是当前支持的视频扩展名'
          })
          continue
        }
        files.push({
          path: filePath,
          name: path.basename(filePath),
          size: fileStat.size,
          ok: true
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        files.push({
          path: filePath,
          name: path.basename(filePath),
          size: 0,
          ok: false,
          error: message
        })
      }
    }

    return { files }
  },

  async prepareJobs(filePaths: string[], options: JobOptions): Promise<{ jobs: PreparedJob[] }> {
    const normalized = normalizeOptions(options)
    const unique = [...new Set((filePaths ?? []).filter((value) => typeof value === 'string' && value.length > 0))]
    const jobs = unique
      .filter((filePath) => isVideoFile(filePath))
      .map((filePath, index) => buildPreparedJob(filePath, index, normalized))
    return { jobs }
  }
}

const plugin = { onLoad, onUnload, onEnable, onDisable, run }
export default plugin
