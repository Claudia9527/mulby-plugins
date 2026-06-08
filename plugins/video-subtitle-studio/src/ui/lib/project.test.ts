import assert from 'node:assert/strict'
import { parseProject, projectFileName, serializeProject, PROJECT_FORMAT, PROJECT_VERSION } from './project'
import type { SubtitleCue } from './subtitles'

const cues: SubtitleCue[] = [
  { id: 'cue-1', startMs: 1250, endMs: 3780, text: 'Hello world' },
  { id: 'cue-2', startMs: 4200, endMs: 7100, text: 'Second line', translation: '第二行' }
]

const serialized = serializeProject({
  videoPath: '/movies/demo.mp4',
  durationMs: 7200,
  cues,
  savedAt: '2026-06-05T00:00:00.000Z',
  meta: { provider: 'openai', targetLanguage: '英文' }
})

const roundTrip = parseProject(serialized)
assert.equal(roundTrip.format, PROJECT_FORMAT)
assert.equal(roundTrip.version, PROJECT_VERSION)
assert.equal(roundTrip.videoPath, '/movies/demo.mp4')
assert.equal(roundTrip.durationMs, 7200)
assert.equal(roundTrip.savedAt, '2026-06-05T00:00:00.000Z')
assert.deepEqual(roundTrip.cues, cues)
assert.deepEqual(roundTrip.meta, { provider: 'openai', targetLanguage: '英文' })

assert.equal(projectFileName('/movies/My Movie.mkv'), 'My Movie.vssproj')
assert.equal(projectFileName(''), 'subtitles.vssproj')

assert.throws(() => parseProject('not json'), /有效的 JSON/)
assert.throws(() => parseProject(JSON.stringify({ format: 'other' })), /工程文件/)
assert.throws(
  () => parseProject(JSON.stringify({ format: PROJECT_FORMAT, version: 999, cues: [] })),
  /版本/
)

const tolerant = parseProject(
  JSON.stringify({
    format: PROJECT_FORMAT,
    version: PROJECT_VERSION,
    videoPath: '/x.mp4',
    durationMs: '4000',
    cues: [
      { startMs: -5, endMs: '1000', text: 'no id' },
      { startMs: 0, endMs: 0 },
      null
    ]
  })
)
assert.equal(tolerant.durationMs, 4000)
assert.equal(tolerant.cues.length, 1)
assert.deepEqual(tolerant.cues[0], { id: 'cue-1', startMs: 0, endMs: 1000, text: 'no id' })
