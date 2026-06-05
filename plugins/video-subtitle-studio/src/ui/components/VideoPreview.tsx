import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { toFileUrl } from '../lib/audio'

export interface VideoPreviewHandle {
  seek: (ms: number, play?: boolean) => void
}

interface VideoPreviewProps {
  videoPath: string
  caption?: string
  onTimeUpdate: (ms: number) => void
}

export const VideoPreview = forwardRef<VideoPreviewHandle, VideoPreviewProps>(function VideoPreview(
  { videoPath, caption, onTimeUpdate },
  ref
) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useImperativeHandle(ref, () => ({
    seek: (ms: number, play?: boolean) => {
      const video = videoRef.current
      if (!video) return
      video.currentTime = Math.max(0, ms) / 1000
      if (play) void video.play().catch(() => undefined)
    }
  }), [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const handle = () => onTimeUpdate(Math.round(video.currentTime * 1000))
    video.addEventListener('timeupdate', handle)
    video.addEventListener('seeked', handle)
    return () => {
      video.removeEventListener('timeupdate', handle)
      video.removeEventListener('seeked', handle)
    }
  }, [onTimeUpdate])

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black">
      <video
        ref={videoRef}
        className="aspect-video max-h-[42vh] w-full bg-black"
        src={videoPath ? toFileUrl(videoPath) : undefined}
        controls
        preload="metadata"
      />
      {caption && (
        <div className="pointer-events-none absolute inset-x-0 bottom-12 flex justify-center px-4">
          <span className="max-w-[92%] rounded-md bg-black/65 px-3 py-1 text-center text-sm leading-snug text-white shadow-lg sm:text-base">
            {caption}
          </span>
        </div>
      )}
    </div>
  )
})
