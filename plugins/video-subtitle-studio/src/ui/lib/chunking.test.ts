import assert from 'node:assert/strict'
import {
  dedupeOverlappingSegments,
  mergeChunkResults,
  planAudioChunks,
  shiftSegments
} from './chunking'

assert.deepEqual(planAudioChunks({ durationMs: 60_000, chunkMs: 480_000, overlapMs: 5_000 }), [
  { index: 0, startMs: 0, endMs: 60_000, trimStartMs: 0, trimEndMs: 60_000 }
])

assert.deepEqual(planAudioChunks({ durationMs: 1_100_000, chunkMs: 480_000, overlapMs: 5_000 }), [
  { index: 0, startMs: 0, endMs: 480_000, trimStartMs: 0, trimEndMs: 480_000 },
  { index: 1, startMs: 475_000, endMs: 955_000, trimStartMs: 480_000, trimEndMs: 955_000 },
  { index: 2, startMs: 950_000, endMs: 1_100_000, trimStartMs: 955_000, trimEndMs: 1_100_000 }
])

assert.deepEqual(
  shiftSegments([{ id: 's1', startMs: 1000, endMs: 2200, text: 'shift me' }], 475_000),
  [{ id: 's1', startMs: 476_000, endMs: 477_200, text: 'shift me' }]
)

assert.deepEqual(
  dedupeOverlappingSegments([
    { id: 'a', startMs: 0, endMs: 2000, text: 'hello' },
    { id: 'b', startMs: 1800, endMs: 3200, text: 'hello' },
    { id: 'c', startMs: 3300, endMs: 4300, text: 'world' }
  ]).map((cue) => cue.id),
  ['a', 'c']
)

const merged = mergeChunkResults([
  {
    chunk: { index: 0, startMs: 0, endMs: 10_000, trimStartMs: 0, trimEndMs: 10_000 },
    cues: [{ id: 'a', startMs: 8800, endMs: 10_000, text: 'alpha' }]
  },
  {
    chunk: { index: 1, startMs: 9000, endMs: 19_000, trimStartMs: 10_000, trimEndMs: 19_000 },
    cues: [
      { id: 'dup', startMs: 800, endMs: 1800, text: 'alpha' },
      { id: 'b', startMs: 2200, endMs: 5200, text: 'beta' }
    ]
  }
])

assert.deepEqual(merged.map((cue) => [cue.startMs, cue.endMs, cue.text]), [
  [8800, 10_000, 'alpha'],
  [11_200, 14_200, 'beta']
])
