import { planAudioChunks, type AudioChunk } from './chunking'

export interface MulbyAudioApis {
  ffmpeg: any
  filesystem: any
  system: any
}

export interface ExtractedAudioChunk {
  chunk: AudioChunk
  path: string
}

export function joinPath(dir: string, name: string) {
  return `${dir.replace(/[\\/]$/, '')}/${name}`
}

export function toFileUrl(filePath: string) {
  const normalized = filePath.replace(/\\/g, '/')
  const prefix = normalized.startsWith('/') ? 'file://' : 'file:///'
  return `${prefix}${normalized.split('/').map(encodeURIComponent).join('/')}`
}

export function getMediaDurationMs(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? Math.round(video.duration * 1000) : 0
      video.removeAttribute('src')
      video.load()
      resolve(duration)
    }
    video.onerror = () => reject(new Error('无法读取视频时长，请检查文件格式。'))
    video.src = toFileUrl(filePath)
  })
}

export async function ensureFfmpeg(ffmpeg: any, onProgress?: (label: string) => void) {
  if (!ffmpeg?.isAvailable || !ffmpeg?.download || !ffmpeg?.run) {
    throw new Error('当前 Mulby 环境未启用 FFmpeg API。')
  }

  const available = await ffmpeg.isAvailable()
  if (available) return

  onProgress?.('正在下载 FFmpeg')
  const result = await ffmpeg.download((progress: { phase?: string; percent?: number }) => {
    const percent = typeof progress.percent === 'number' ? ` ${Math.round(progress.percent)}%` : ''
    onProgress?.(`正在下载 FFmpeg${percent}`)
  })

  if (!result?.success) {
    throw new Error(result?.error || 'FFmpeg 下载失败。')
  }
}

function seconds(ms: number) {
  return (Math.max(0, ms) / 1000).toFixed(3)
}

export async function extractAudioChunks(
  apis: MulbyAudioApis,
  videoPath: string,
  durationMs: number,
  onProgress?: (label: string) => void
): Promise<ExtractedAudioChunk[]> {
  await ensureFfmpeg(apis.ffmpeg, onProgress)

  const tempDir = await apis.system.getPath('temp')
  const jobId = `mulby-subtitle-${Date.now()}`
  const chunks = planAudioChunks({ durationMs, chunkMs: 8 * 60 * 1000, overlapMs: 5000 })
  const outputs: ExtractedAudioChunk[] = []

  for (const chunk of chunks) {
    const outputPath = joinPath(tempDir, `${jobId}-${String(chunk.index).padStart(3, '0')}.mp3`)
    const args = [
      '-y',
      '-ss',
      seconds(chunk.startMs),
      '-i',
      videoPath,
      '-t',
      seconds(chunk.endMs - chunk.startMs),
      '-vn',
      '-ac',
      '1',
      '-ar',
      '16000',
      '-b:a',
      '64k',
      outputPath
    ]

    onProgress?.(`提取音频分片 ${chunk.index + 1}/${chunks.length}`)
    const task = apis.ffmpeg.run(args, (progress: { percent?: number }) => {
      if (typeof progress.percent === 'number') {
        onProgress?.(`提取音频分片 ${chunk.index + 1}/${chunks.length} · ${Math.round(progress.percent)}%`)
      }
    })
    await task.promise
    outputs.push({ chunk, path: outputPath })
  }

  return outputs
}

export async function cleanupFiles(filesystem: any, paths: string[]) {
  await Promise.all(paths.map((path) => filesystem.unlink(path).catch(() => undefined)))
}
