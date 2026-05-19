import { createInitialState, stopMouseFollow } from './behavior'

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message)
}

const bounds = { x: 0, y: 0, width: 1200, height: 800 }

function testStopMouseFollowCancelsChase() {
  const state = createInitialState(bounds)
  state.behavior = 'chase'
  state.velocity = { x: 7, y: 3 }
  state.animTimer = 900

  stopMouseFollow(state)

  assert(state.behavior === 'idle', `chase should become idle, got ${state.behavior}`)
  assert(state.velocity.x === 0 && state.velocity.y === 0, 'velocity should stop')
  assert(state.animTimer === 0, 'animation timer should reset for behavior change')
}

function testStopMouseFollowCancelsLook() {
  const state = createInitialState(bounds)
  state.behavior = 'look'
  state.velocity = { x: 2, y: 1 }

  stopMouseFollow(state)

  assert(state.behavior === 'idle', `look should become idle, got ${state.behavior}`)
  assert(state.velocity.x === 0 && state.velocity.y === 0, 'velocity should stop')
}

function testStopMouseFollowKeepsNonMouseBehavior() {
  const state = createInitialState(bounds)
  state.behavior = 'happy'
  state.velocity = { x: 4, y: -1 }

  stopMouseFollow(state)

  assert(state.behavior === 'happy', `non-mouse behavior should remain, got ${state.behavior}`)
  assert(state.velocity.x === 0 && state.velocity.y === 0, 'velocity should stop')
}

testStopMouseFollowCancelsChase()
testStopMouseFollowCancelsLook()
testStopMouseFollowKeepsNonMouseBehavior()
