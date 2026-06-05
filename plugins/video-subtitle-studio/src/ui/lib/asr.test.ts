import assert from 'node:assert/strict'
import {
  buildOpenAiTranscriptionRequest,
  normalizeOpenAiTranscription,
  normalizePlainTextTranscription,
  normalizeVolcengineTranscription
} from './asr'

assert.deepEqual(
  normalizeOpenAiTranscription({
    segments: [
      { id: 0, start: 1.2, end: 3.4, text: ' hello ' },
      { id: 1, start: 3.4, end: 5.0, text: 'world' }
    ]
  }).map((cue) => [cue.startMs, cue.endMs, cue.text]),
  [
    [1200, 3400, 'hello'],
    [3400, 5000, 'world']
  ]
)

assert.deepEqual(
  normalizeVolcengineTranscription({
    result: {
      utterances: [
        {
          start_time: 450,
          end_time: 1530,
          text: '关闭透传。',
          words: [{ start_time: 450, end_time: 770, text: '关', confidence: 0.91 }]
        }
      ]
    }
  })[0],
  {
    id: 'volc-0',
    startMs: 450,
    endMs: 1530,
    text: '关闭透传。',
    confidence: 0.91,
    words: [{ startMs: 450, endMs: 770, text: '关', confidence: 0.91 }]
  }
)

assert.deepEqual(normalizePlainTextTranscription('one sentence. second sentence.', 6000).map((cue) => cue.text), [
  'one sentence.',
  'second sentence.'
])

assert.deepEqual(
  buildOpenAiTranscriptionRequest({
    model: 'whisper-1',
    language: 'zh',
    prompt: 'Names: Mulby',
    timestampGranularity: 'segment'
  }),
  {
    model: 'whisper-1',
    language: 'zh',
    prompt: 'Names: Mulby',
    response_format: 'verbose_json',
    timestamp_granularities: ['segment']
  }
)

assert.throws(() => normalizeOpenAiTranscription({ segments: [] }), /没有返回可用字幕/)
