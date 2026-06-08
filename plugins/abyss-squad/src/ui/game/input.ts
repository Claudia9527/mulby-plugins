import type { InputState } from './types'

export function createInputState(): InputState {
  return {
    keys: new Set(),
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
    mouseRightDown: false,
    justPressed: new Set(),
    justClicked: null,
  }
}

export function setupInputHandlers(canvas: HTMLCanvasElement, input: InputState) {
  const onKeyDown = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase()
    if (!input.keys.has(key)) {
      input.justPressed.add(key)
    }
    input.keys.add(key)
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
      e.preventDefault()
    }
  }

  const onKeyUp = (e: KeyboardEvent) => {
    input.keys.delete(e.key.toLowerCase())
  }

  const onMouseMove = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect()
    input.mouseX = e.clientX - rect.left
    input.mouseY = e.clientY - rect.top
  }

  const onMouseDown = (e: MouseEvent) => {
    if (e.button === 0) {
      input.mouseDown = true
      input.justClicked = 'left'
    } else if (e.button === 2) {
      input.mouseRightDown = true
      input.justClicked = 'right'
    }
  }

  const onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) input.mouseDown = false
    if (e.button === 2) input.mouseRightDown = false
  }

  const onContextMenu = (e: Event) => {
    e.preventDefault()
  }

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  canvas.addEventListener('mousemove', onMouseMove)
  canvas.addEventListener('mousedown', onMouseDown)
  canvas.addEventListener('mouseup', onMouseUp)
  canvas.addEventListener('contextmenu', onContextMenu)

  return () => {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    canvas.removeEventListener('mousemove', onMouseMove)
    canvas.removeEventListener('mousedown', onMouseDown)
    canvas.removeEventListener('mouseup', onMouseUp)
    canvas.removeEventListener('contextmenu', onContextMenu)
  }
}
