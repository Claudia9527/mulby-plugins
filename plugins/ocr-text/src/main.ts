/// <reference path="./types/mulby.d.ts" />
declare const mulby: any

const SWIFT_OCR_SOURCE = `
import Vision
import AppKit

let imagePath = CommandLine.arguments[1]
guard let data = try? Data(contentsOf: URL(fileURLWithPath: imagePath)),
      let image = NSImage(data: data),
      let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    fputs("ERROR: Cannot load image", stderr)
    exit(1)
}

let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.recognitionLanguages = ["zh-Hans", "zh-Hant", "en", "ja", "ko", "fr", "de", "es", "pt", "it"]
request.usesLanguageCorrection = true

let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
try handler.perform([request])

guard let observations = request.results else { exit(0) }
for observation in observations {
    if let topCandidate = observation.topCandidates(1).first {
        print(topCandidate.string)
    }
}
`

let cachedBinaryPath: string | null = null

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

export function onLoad() { console.log('[ocr-text] 插件已加载') }
export function onUnload() { console.log('[ocr-text] 插件已卸载') }
export function onEnable() { console.log('[ocr-text] 插件已启用') }
export function onDisable() { console.log('[ocr-text] 插件已禁用') }

export async function run(_context: BackendPluginContext) {
  await mulby.window.setAlwaysOnTop?.(false)
}

export const rpc = {
  async nativeOcr(imageBase64: string, mimeType: string) {
    try {
      const platform = await getPlatform()
      const tmpDir = await mulby.system.getPath('temp')
      const ext = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : 'png'
      const imagePath = `${tmpDir}/mulby_ocr_${Date.now()}.${ext}`

      const raw = base64ToUint8Array(imageBase64)
      await mulby.filesystem.writeFile(imagePath, raw)

      let text = ''

      if (platform === 'darwin') {
        text = await macOSOcr(imagePath, tmpDir)
      } else if (platform === 'win32') {
        text = await windowsOcr(imagePath)
      } else {
        await cleanup(imagePath)
        return { success: false, text: '', error: 'Linux 暂不支持原生 OCR，请切换到 AI 模式', platform }
      }

      await cleanup(imagePath)
      return { success: true, text: text.trim(), platform }
    } catch (error: any) {
      return { success: false, text: '', error: error?.message || '原生 OCR 识别失败', platform: 'unknown' }
    }
  },

  async getPlatformInfo() {
    const platform = await getPlatform()
    return { platform }
  },
}

async function getPlatform(): Promise<string> {
  const info = await mulby.system.getSystemInfo()
  return info?.platform || 'unknown'
}

async function ensureCompiledBinary(tmpDir: string): Promise<string> {
  if (cachedBinaryPath) {
    const exists = await mulby.filesystem.exists(cachedBinaryPath)
    if (exists) return cachedBinaryPath
  }

  const binaryPath = `${tmpDir}/mulby_ocr_bin`
  const exists = await mulby.filesystem.exists(binaryPath)
  if (exists) {
    cachedBinaryPath = binaryPath
    return binaryPath
  }

  const srcPath = `${tmpDir}/mulby_ocr_src_${Date.now()}.swift`
  await mulby.filesystem.writeFile(srcPath, SWIFT_OCR_SOURCE, 'utf-8')

  try {
    const result = await mulby.shell.runCommand({
      command: 'swiftc',
      args: ['-O', srcPath, '-o', binaryPath],
      timeoutMs: 60000,
    })

    await cleanup(srcPath)

    if (result.exitCode !== 0) {
      throw new Error(result.stderr || 'Swift 编译失败')
    }

    cachedBinaryPath = binaryPath
    return binaryPath
  } catch (error) {
    await cleanup(srcPath)
    throw error
  }
}

async function macOSOcr(imagePath: string, tmpDir: string): Promise<string> {
  try {
    const binaryPath = await ensureCompiledBinary(tmpDir)

    const result = await mulby.shell.runCommand({
      command: binaryPath,
      args: [imagePath],
      timeoutMs: 15000,
    })

    if (result.exitCode !== 0) {
      throw new Error(result.stderr || 'OCR 执行失败')
    }

    return result.stdout || ''
  } catch {
    return await macOSOcrFallback(imagePath, tmpDir)
  }
}

async function macOSOcrFallback(imagePath: string, tmpDir: string): Promise<string> {
  const scriptPath = `${tmpDir}/mulby_ocr_fb_${Date.now()}.swift`
  await mulby.filesystem.writeFile(scriptPath, SWIFT_OCR_SOURCE, 'utf-8')

  try {
    const result = await mulby.shell.runCommand({
      command: 'swift',
      args: [scriptPath, imagePath],
      timeoutMs: 30000,
    })

    await cleanup(scriptPath)

    if (result.exitCode !== 0) {
      throw new Error(result.stderr || 'macOS OCR 执行失败')
    }

    return result.stdout || ''
  } catch (error) {
    await cleanup(scriptPath)
    throw error
  }
}

async function windowsOcr(imagePath: string): Promise<string> {
  const psScript = `
Add-Type -AssemblyName System.Runtime.WindowsRuntime
[Windows.Media.Ocr.OcrEngine,Windows.Foundation,ContentType=WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.BitmapDecoder,Windows.Foundation,ContentType=WindowsRuntime] | Out-Null
[Windows.Storage.StorageFile,Windows.Foundation,ContentType=WindowsRuntime] | Out-Null

$asyncMethods = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 }

function Await($WinRTTask) {
    $method = $asyncMethods | Where-Object { $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1' } | Select-Object -First 1
    $genericMethod = $method.MakeGenericMethod($WinRTTask.GetType().GetGenericArguments())
    $task = $genericMethod.Invoke($null, @($WinRTTask))
    $task.Wait()
    return $task.Result
}

$ocr = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
$file = Await([Windows.Storage.StorageFile]::GetFileFromPathAsync("${imagePath.replace(/\\/g, '\\\\')}"))
$stream = Await($file.OpenReadAsync())
$decoder = Await([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream))
$bitmap = Await($decoder.GetSoftwareBitmapAsync())
$result = Await($ocr.RecognizeAsync($bitmap))
Write-Output $result.Text
  `.trim()

  const result = await mulby.shell.runCommand({
    command: 'powershell',
    args: ['-NoProfile', '-NonInteractive', '-Command', psScript],
    timeoutMs: 30000,
    shell: false,
  })

  if (result.exitCode !== 0) {
    throw new Error(result.stderr || 'Windows OCR 执行失败')
  }

  return result.stdout || ''
}

async function cleanup(path: string) {
  try { await mulby.filesystem.unlink(path) } catch {}
}

export const host = {}
const plugin = { onLoad, onUnload, onEnable, onDisable, run, rpc, host }
export default plugin
