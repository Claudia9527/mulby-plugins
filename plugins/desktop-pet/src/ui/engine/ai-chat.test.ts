import { compactPetReply } from './ai-chat'

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message)
}

function testCompactPetReplyRemovesPresentationNoiseAndKeepsBubbleShort() {
  const input = '[excited]喂喂喂，你键盘都冒火星子了！这是要冲出地球还是咋的？\n\n不过说真的，你这噼里啪啦的节奏还挺上头，我左摇右晃跟着打节拍。第三句不该出现在普通气泡里。'
  const actual = compactPetReply(input)

  assert(!actual.includes('[excited]'), 'presentation marker should be removed')
  assert(!actual.includes('第三句'), 'ordinary pet reply should keep at most two sentence-sized beats')
  assert(actual.length <= 70, `reply should fit a pet bubble, got ${actual.length}: ${actual}`)
}

testCompactPetReplyRemovesPresentationNoiseAndKeepsBubbleShort()
