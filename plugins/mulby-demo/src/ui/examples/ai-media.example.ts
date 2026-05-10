import type { ApiExampleModule } from './types'
import { callBackendExample, catalogModule, mulby, unavailable } from './helpers'

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
        methods: ['tools.register', 'tools.unregister'],
        safety: 'safe',
        code: `await window.mulby.host.call('mulby-demo', 'getCatalogSummary')\nawait window.mulby.host.call('mulby-demo', 'runBackendExample', 'pluginToolEcho')\nawait window.mulby.host.call('mulby-demo', 'runBackendExample', 'pluginToolUnregister')`,
        async run() {
          const api = mulby()
          if (!api?.host) return unavailable('Plugin tool catalog')
          const data = await api.host.call('mulby-demo', 'getCatalogSummary')
          const register = await callBackendExample('pluginToolEcho')
          const unregister = await callBackendExample('pluginToolUnregister')
          return { ok: true, title: 'Plugin tool catalog', data: { data, register, unregister } }
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
        description: 'Reads models, settings, connection-test API availability, skill APIs, and backend AI snapshot without making a generation call.',
        methods: [
          'ai.allModels',
          'ai.models.fetch',
          'ai.settings.get',
          'ai.skills.listEnabled',
          'ai.skills.previewForCall'
        ],
        safety: 'safe',
        code: `const models = await window.mulby.ai.allModels()\nconst settings = await window.mulby.ai.settings.get()\nconst enabledSkills = await window.mulby.ai.skills.listEnabled()`,
        async run() {
          const api = mulby()
          if (!api?.ai) return unavailable('AI models')
          const models = await api.ai.allModels()
          const settings = await api.ai.settings.get()
          let enabledSkills: unknown[] | undefined
          let skills: unknown[] | undefined
          try {
            enabledSkills = await api.ai.skills?.listEnabled?.()
            skills = await api.ai.skills?.list?.()
          } catch {
            enabledSkills = undefined
            skills = undefined
          }
          const backend = await callBackendExample('backendAiSnapshot')
          return {
            ok: true,
            title: 'AI models',
            data: {
              models: models.map((model: any) => ({
                id: model.id,
                name: model.name ?? model.label,
                providerId: model.providerId ?? model.providerRef,
                enabled: model.enabled
              })),
              defaultModel: settings?.defaultModel,
              providers: settings?.providers?.map((provider: any) => ({ id: provider.id, type: provider.type, enabled: provider.enabled })),
              enabledSkillCount: Array.isArray(enabledSkills) ? enabledSkills.length : undefined,
              skillCount: Array.isArray(skills) ? skills.length : undefined,
              backend,
              rendererOnlyMethods: {
                modelsFetch: typeof api.ai.models?.fetch,
                testConnection: typeof api.ai.testConnection,
                testConnectionStream: typeof api.ai.testConnectionStream,
                skillsRefresh: typeof api.ai.skills?.refresh,
                skillsGet: typeof api.ai.skills?.get,
                skillsInstall: typeof api.ai.skills?.install,
                skillsRemove: typeof api.ai.skills?.remove,
                skillsEnable: typeof api.ai.skills?.enable,
                skillsDisable: typeof api.ai.skills?.disable,
                skillsPreview: typeof api.ai.skills?.preview,
                skillsResolve: typeof api.ai.skills?.resolve
              }
            }
          }
        }
      },
      {
        id: 'ai-token-estimate',
        label: 'Estimate tokens',
        description: 'Estimates tokens and exposes call, abort, attachment, and image APIs with safe availability checks.',
        methods: [
          'ai.call',
          'ai.abort',
          'ai.attachments.upload',
          'ai.attachments.get',
          'ai.attachments.delete',
          'ai.attachments.uploadToProvider',
          'ai.tokens.estimate',
          'ai.images.generate',
          'ai.images.generateStream',
          'ai.images.edit'
        ],
        safety: 'safe',
        code: `await window.mulby.ai.tokens.estimate({ messages: [{ role: 'user', content: 'Hello' }] })\n// window.mulby.ai.call({ messages: [{ role: 'user', content: 'Hello' }] })`,
        async run() {
          const api = mulby()
          if (!api?.ai?.tokens) return unavailable('AI token estimate')
          const data = await api.ai.tokens.estimate({
            messages: [{ role: 'user', content: 'Hello from Mulby demo' }]
          })
          return {
            ok: true,
            title: 'AI token estimate',
            data: {
              tokens: data,
              callable: {
                call: typeof api.ai.call,
                abort: typeof api.ai.abort,
                attachmentsUpload: typeof api.ai.attachments?.upload,
                attachmentsGet: typeof api.ai.attachments?.get,
                attachmentsDelete: typeof api.ai.attachments?.delete,
                attachmentsUploadToProvider: typeof api.ai.attachments?.uploadToProvider,
                imagesGenerate: typeof api.ai.images?.generate,
                imagesGenerateStream: typeof api.ai.images?.generateStream,
                imagesEdit: typeof api.ai.images?.edit
              }
            }
          }
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
        methods: ['tts.getVoices', 'tts.isSpeaking'],
        safety: 'safe',
        code: `const voices = await window.mulby.tts.getVoices()`,
        async run() {
          const api = mulby()
          if (!api?.tts) return unavailable('TTS voices')
          const voices = await api.tts.getVoices()
          const isSpeaking = await api.tts.isSpeaking()
          return {
            ok: true,
            title: 'TTS voices',
            data: {
              isSpeaking,
              voices: voices.slice(0, 10).map((voice: any) => ({
                name: voice.name,
                lang: voice.lang,
                default: voice.default
              }))
            }
          }
        }
      },
      {
        id: 'tts-speak',
        label: 'Speak short text',
        description: 'Speaks a short demo phrase, exercises pause/resume/stop, and reports completion.',
        methods: ['tts.speak', 'tts.stop', 'tts.pause', 'tts.resume'],
        safety: 'opens-system-ui',
        code: `const speaking = window.mulby.tts.speak('Mulby API demo')\nwindow.mulby.tts.pause()\nwindow.mulby.tts.resume()\nwindow.mulby.tts.stop()\nawait speaking`,
        async run() {
          const api = mulby()
          if (!api?.tts) return unavailable('TTS speak')
          const speakPromise = api.tts.speak('Mulby API demo')
          api.tts.pause()
          api.tts.resume()
          api.tts.stop()
          await speakPromise.catch(() => undefined)
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
        label: 'Process generated image with Sharp',
        description: 'Runs resize, extract, rotate, composite, metadata, toBuffer, toFile, getSharpVersion, and backend execute against generated demo pixels.',
        methods: ['sharp.resize', 'sharp.extract', 'sharp.rotate', 'sharp.composite', 'sharp.metadata', 'sharp.toBuffer', 'sharp.toFile', 'getSharpVersion', 'context.api.sharp.execute'],
        safety: 'safe',
        code: `const versions = await window.mulby.getSharpVersion()\nconst metadata = await window.mulby.sharp({ create: { width: 32, height: 32, channels: 4, background: '#2563eb' } }).resize(16, 16).metadata()`,
        async run() {
          const api = mulby()
          if (!api?.getSharpVersion || !api?.sharp) return unavailable('Sharp processing')
          const versions = await api.getSharpVersion()
          const input = {
            create: {
              width: 32,
              height: 32,
              channels: 4,
              background: { r: 37, g: 99, b: 235, alpha: 1 }
            }
          }
          const metadata = await api.sharp(input).resize(16, 16).extract({ left: 0, top: 0, width: 8, height: 8 }).rotate(90).metadata()
          const buffer = await api.sharp(input).composite([{ input, gravity: 'center' }]).png().toBuffer()
          const backend = await callBackendExample('backendSharpSample')
          return {
            ok: true,
            title: 'Sharp processing',
            data: {
              versions,
              metadata,
              bufferBytes: buffer?.byteLength ?? buffer?.length,
              toFile: 'Use the copied snippet with an explicit user-selected path to write an output file.',
              backend
            }
          }
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
        description: 'Checks whether FFmpeg is available, reads version/path, exposes download, and runs a no-op FFmpeg version command if available.',
        methods: ['ffmpeg.run', 'ffmpeg.isAvailable', 'ffmpeg.getVersion', 'ffmpeg.getPath', 'ffmpeg.download'],
        safety: 'safe',
        code: `const available = await window.mulby.ffmpeg.isAvailable()\nif (available) await window.mulby.ffmpeg.run(['-version']).promise`,
        async run() {
          const api = mulby()
          if (!api?.ffmpeg) return unavailable('FFmpeg status')
          const available = await api.ffmpeg.isAvailable()
          const version = available ? await api.ffmpeg.getVersion() : null
          const path = available ? await api.ffmpeg.getPath() : null
          let runResult: unknown = null
          if (available) {
            const task = api.ffmpeg.run(['-version'])
            runResult = await task.promise
          }
          return { ok: true, title: 'FFmpeg status', data: { available, version, path, runResult, download: typeof api.ffmpeg.download } }
        }
      }
    ]
  })
]
