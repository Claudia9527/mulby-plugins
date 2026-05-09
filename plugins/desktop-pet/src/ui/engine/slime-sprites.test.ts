import { ALL_EXPRESSIONS, ALL_POSES, type PetSpriteKey } from './pet-standard'
import { SLIME_SPRITE_SET } from './slime-sprites'

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message)
}

function testBuiltInGhostHasEveryPoseExpressionSprite() {
  const missing: PetSpriteKey[] = []

  for (const pose of ALL_POSES) {
    for (const expression of ALL_EXPRESSIONS) {
      const key = `${pose}_${expression}` as PetSpriteKey
      if (!SLIME_SPRITE_SET.sprites[key]) missing.push(key)
    }
  }

  assert(
    missing.length === 0,
    `Built-in ghost is missing ${missing.length} pose/expression sprites: ${missing.join(', ')}`
  )
}

testBuiltInGhostHasEveryPoseExpressionSprite()
