import {
  ACTION_LIST,
  EMOTION_LIST,
  extractInlineEmotionIntents,
  inferPresentationFromText,
  normalizePresentationToolCall,
  stripInlineEmotionMarkers,
} from './presentation'

function assertEqual<T>(actual: T, expected: T) {
  if (actual !== expected) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}

function assertDeepEqual(actual: unknown, expected: unknown) {
  const actualJson = JSON.stringify(actual)
  const expectedJson = JSON.stringify(expected)
  if (actualJson !== expectedJson) {
    throw new Error(`Expected ${expectedJson}, got ${actualJson}`)
  }
}

function testStripInlineEmotionMarkers() {
  const input = '[surprised]噗--你说啥？[excited]好好好！[happy]慢慢讲。'
  const actual = stripInlineEmotionMarkers(input)
  assertEqual(actual, '噗--你说啥？好好好！慢慢讲。')
}

function testExtractInlineExpressionAliases() {
  const input = '[surprised]喂喂喂！\n\n[excited]左摇右晃。\n\n[happy]该歇就歇。'
  assertDeepEqual(extractInlineEmotionIntents(input), [
    { face: 'surprised', emotion: 'surprise' },
    { face: 'excited', emotion: 'excitement' },
    { face: 'happy', emotion: 'joy' },
  ])
}

function testNormalizeToolCalls() {
  assertDeepEqual(
    normalizePresentationToolCall('pet_show_expression', { expression: 'happy', emotion: 'joy' }),
    { face: 'happy', emotion: 'joy' }
  )
  assertDeepEqual(
    normalizePresentationToolCall('pet_perform_action', { action: 'jump', emotion: 'excitement', durationMs: 3000 }),
    { face: 'excited', pose: 'jump', emotion: 'excitement', animation: 'ascend', durationMs: 3000 }
  )
  assertDeepEqual(
    normalizePresentationToolCall('pet_update_mood', { emotion: 'anger' }),
    { face: 'angry', emotion: 'anger' }
  )
  assertDeepEqual(
    normalizePresentationToolCall('pet_move', { direction: 'up', distance: 90, durationMs: 1200 }),
    { face: 'neutral', pose: 'walk_1', movement: { dx: 0, dy: -90 }, durationMs: 1200 }
  )
}

function testListsCoverRuntimeAliases() {
  for (const value of ['happy', 'excited', 'surprised', 'sad', 'sleepy', 'angry', 'shy', 'neutral']) {
    if (!EMOTION_LIST.includes(value as never)) throw new Error(`Missing emotion alias: ${value}`)
  }
  for (const value of ['move_left', 'move_right', 'move_up', 'move_down', 'wobble', 'celebrate', 'wave', 'jump']) {
    if (!ACTION_LIST.includes(value as never)) throw new Error(`Missing action: ${value}`)
  }
}

function testInferPresentationFromPlainReply() {
  assertDeepEqual(
    inferPresentationFromText('喂喂喂，你键盘都冒火星子了！这是要冲出地球吗？'),
    { face: 'surprised', emotion: 'surprise', pose: 'stand', animation: 'phase' }
  )
  assertDeepEqual(
    inferPresentationFromText('这节奏还挺上头，我左摇右晃跟着打节拍。'),
    { face: 'excited', emotion: 'excitement', pose: 'wave', animation: 'wobble' }
  )
}

testStripInlineEmotionMarkers()
testExtractInlineExpressionAliases()
testNormalizeToolCalls()
testListsCoverRuntimeAliases()
testInferPresentationFromPlainReply()
