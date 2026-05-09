import type { ApiExampleModule } from './types'
import { catalogModule, mulby, unavailable } from './helpers'

export const aiMediaExamples: ApiExampleModule[] = [
  catalogModule('tools', {
    title: 'Plugin Tools',
    category: 'ai-media',
    contexts: ['backend', 'manifest'],
    notes: [
      'Tool names declared in manifest must match handlers registered in `onLoad`.',
      'Handlers should return JSON-compatible values and validate user-provided arguments.'
    ],
    examples: [
      {
        id: 'tools-catalog',
        label: 'Inspect registered demo tools',
        description: 'Reads catalog summary through backend host RPC; AI Agents can call the same data through `mulby_demo_catalog`.',
        safety: 'safe',
        code: `await window.mulby.host.call('mulby-demo', 'getCatalogSummary')`,
        async run() {
          const api = mulby()
          if (!api?.host) return unavailable('Plugin tool catalog')
          const data = await api.host.call('mulby-demo', 'getCatalogSummary')
          return { ok: true, title: 'Plugin tool catalog', data }
        }
      }
    ]
  }),
  catalogModule('ai', {
    title: 'AI',
    category: 'ai-media',
    contexts: ['renderer', 'backend'],
    notes: [
      'AI calls depend on user-configured providers and models. Read models/settings before assuming availability.',
      'For pure-text workflows that must avoid tool execution, explicitly disable tool injection via the documented AI options.'
    ],
    examples: [
      {
        id: 'ai-models',
        label: 'List configured models',
        description: 'Reads available AI models without making a generation call.',
        safety: 'safe',
        code: `const models = await window.mulby.ai.allModels()`,
        async run() {
          const api = mulby()
          if (!api?.ai) return unavailable('AI models')
          const models = await api.ai.allModels()
          return {
            ok: true,
            title: 'AI models',
            data: models.map((model: any) => ({
              id: model.id,
              name: model.name,
              providerId: model.providerId,
              enabled: model.enabled
            }))
          }
        }
      },
      {
        id: 'ai-token-estimate',
        label: 'Estimate tokens',
        description: 'Estimates tokens for a tiny message when token estimation is available.',
        safety: 'safe',
        code: `await window.mulby.ai.tokens.estimate({ messages: [{ role: 'user', content: 'Hello' }] })`,
        async run() {
          const api = mulby()
          if (!api?.ai?.tokens) return unavailable('AI token estimate')
          const data = await api.ai.tokens.estimate({
            messages: [{ role: 'user', content: 'Hello from Mulby demo' }]
          })
          return { ok: true, title: 'AI token estimate', data }
        }
      }
    ]
  }),
  catalogModule('tts', {
    title: 'Text To Speech',
    category: 'ai-media',
    contexts: ['renderer'],
    notes: ['Use `getVoices` before choosing language-specific voice options.'],
    examples: [
      {
        id: 'tts-voices',
        label: 'List voices',
        description: 'Reads available speech synthesis voices.',
        safety: 'safe',
        code: `const voices = await window.mulby.tts.getVoices()`,
        async run() {
          const api = mulby()
          if (!api?.tts) return unavailable('TTS voices')
          const voices = await api.tts.getVoices()
          return {
            ok: true,
            title: 'TTS voices',
            data: voices.slice(0, 10).map((voice: any) => ({
              name: voice.name,
              lang: voice.lang,
              default: voice.default
            }))
          }
        }
      },
      {
        id: 'tts-speak',
        label: 'Speak short text',
        description: 'Speaks a short demo phrase.',
        safety: 'opens-system-ui',
        code: `await window.mulby.tts.speak('Mulby API demo')`,
        async run() {
          const api = mulby()
          if (!api?.tts) return unavailable('TTS speak')
          await api.tts.speak('Mulby API demo')
          return { ok: true, title: 'TTS speak', data: { spoken: true } }
        }
      }
    ]
  }),
  catalogModule('sharp', {
    title: 'Sharp Image Processing',
    category: 'ai-media',
    contexts: ['renderer', 'backend'],
    notes: [
      'Use host-provided Sharp APIs instead of bundling native `sharp` into the plugin.',
      'Backend `context.api.sharp.execute` is useful for silent image processing.'
    ],
    examples: [
      {
        id: 'sharp-version',
        label: 'Read Sharp version',
        description: 'Reads host Sharp runtime versions when exposed.',
        safety: 'safe',
        code: `const versions = await window.mulby.getSharpVersion()`,
        async run() {
          const api = mulby()
          if (!api?.getSharpVersion) return unavailable('Sharp version')
          const data = await api.getSharpVersion()
          return { ok: true, title: 'Sharp version', data }
        }
      }
    ]
  }),
  catalogModule('ffmpeg', {
    title: 'FFmpeg',
    category: 'ai-media',
    contexts: ['renderer'],
    notes: [
      'Download may be large and should be user-triggered.',
      'This reference checks availability and version without downloading.'
    ],
    examples: [
      {
        id: 'ffmpeg-status',
        label: 'Read FFmpeg status',
        description: 'Checks whether FFmpeg is available and reads version/path if possible.',
        safety: 'safe',
        code: `const available = await window.mulby.ffmpeg.isAvailable()`,
        async run() {
          const api = mulby()
          if (!api?.ffmpeg) return unavailable('FFmpeg status')
          const available = await api.ffmpeg.isAvailable()
          const version = available ? await api.ffmpeg.getVersion() : null
          const path = available ? await api.ffmpeg.getPath() : null
          return { ok: true, title: 'FFmpeg status', data: { available, version, path } }
        }
      }
    ]
  })
]
