import {
  ACTION_LIST,
  EMOTION_LIST,
  extractStageDirectionIntents,
  extractInlineEmotionIntents,
  inferPresentationFromText,
  normalizePresentationToolCall,
  stripPresentationMarkers,
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
  assertDeepEqual(
    inferPresentationFromText('切，又戳我？你是戳上瘾了是吧？'),
    { face: 'angry', emotion: 'anger', pose: 'stand', animation: 'flicker' }
  )
}

function testStageDirectionsAreHiddenAndConvertedToPresentation() {
  const input = '（打了个呵欠飘到你鼠标旁边，绕着你的手转了两圈）我说你是不是手指头长刺了？'

  assertEqual(stripPresentationMarkers(input), '我说你是不是手指头长刺了？')
  assertDeepEqual(extractStageDirectionIntents(input), [
    { face: 'sleepy', emotion: 'sleepiness', pose: 'sit', animation: 'droop' },
    { face: 'excited', emotion: 'excitement', pose: 'walk_1', animation: 'wobble', movement: { dx: 80, dy: -20 } },
  ])
}

function testStageDirectionsCoverAttitudeAndTurningAway() {
  const input = '（一脸不耐烦地转过身去，把屁股对着你）我数三下。'

  assertEqual(stripPresentationMarkers(input), '我数三下。')
  assertDeepEqual(extractStageDirectionIntents(input), [
    { face: 'angry', emotion: 'anger', pose: 'stand', animation: 'flicker' },
    { face: 'shy', emotion: 'shyness', pose: 'stand', animation: 'hide', movement: { dx: -80, dy: 0 } },
  ])
}

function testStageDirectionsAfterToolStyleNarration() {
  const input = '（飘到桌角背对着你，尾巴还在不满地抖来抖去）看什么看？'

  assertEqual(stripPresentationMarkers(input), '看什么看？')
  assertDeepEqual(extractStageDirectionIntents(input), [
    { face: 'angry', emotion: 'anger', pose: 'stand', animation: 'flicker' },
    { face: 'excited', emotion: 'excitement', pose: 'walk_1', animation: 'wobble', movement: { dx: 80, dy: -20 } },
    { face: 'shy', emotion: 'shyness', pose: 'stand', animation: 'hide', movement: { dx: -80, dy: 0 } },
  ])
}

function testHintDoesNotOverridePartialStageDirection() {
  assertDeepEqual(inferPresentationFromText('（', 'user_click'), null)
}

testStripInlineEmotionMarkers()
testExtractInlineExpressionAliases()
testNormalizeToolCalls()
testListsCoverRuntimeAliases()
testInferPresentationFromPlainReply()
testStageDirectionsAreHiddenAndConvertedToPresentation()
testStageDirectionsCoverAttitudeAndTurningAway()
testStageDirectionsAfterToolStyleNarration()
testHintDoesNotOverridePartialStageDirection()
