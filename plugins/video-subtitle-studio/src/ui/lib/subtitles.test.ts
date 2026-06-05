import assert from 'node:assert/strict'
import {
  exportJson,
  exportSrt,
  exportVtt,
  formatSrtTime,
  formatVttTime,
  mergeSubtitles,
  splitSubtitle,
  type SubtitleCue
} from './subtitles'

const cues: SubtitleCue[] = [
  { id: 'a', startMs: 1250, endMs: 3780, text: 'Hello world' },
  { id: 'b', startMs: 4200, endMs: 7100, text: 'Second line', translation: '第二行' }
]

assert.equal(formatSrtTime(3723456), '01:02:03,456')
assert.equal(formatVttTime(3723456), '01:02:03.456')

assert.equal(
  exportSrt(cues),
  [
    '1',
    '00:00:01,250 --> 00:00:03,780',
    'Hello world',
    '',
    '2',
    '00:00:04,200 --> 00:00:07,100',
    'Second line',
    '第二行',
    ''
  ].join('\n')
)

assert.equal(
  exportVtt(cues),
  ['WEBVTT', '', '00:00:01.250 --> 00:00:03.780', 'Hello world', '', '00:00:04.200 --> 00:00:07.100', 'Second line', '第二行', ''].join('\n')
)

assert.deepEqual(JSON.parse(exportJson(cues)), cues)

const split = splitSubtitle({ id: 'x', startMs: 0, endMs: 4000, text: 'first half second half' }, 1800, 10)
assert.deepEqual(split.map((cue) => [cue.startMs, cue.endMs, cue.text]), [
  [0, 1800, 'first half'],
  [1800, 4000, 'second half']
])

const merged = mergeSubtitles(
  { id: 'a', startMs: 0, endMs: 1000, text: 'Hello' },
  { id: 'b', startMs: 1000, endMs: 2000, text: 'world', translation: '世界' }
)
assert.deepEqual(merged, { id: 'a', startMs: 0, endMs: 2000, text: 'Hello world', translation: '世界' })
