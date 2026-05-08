/// <reference path="./types/mulby.d.ts" />

import {
  PET_PERFORM_ACTION_TOOL_NAME,
  PET_PRESENTATION_TOOL_NAME,
  PET_MOVE_TOOL_NAME,
  PET_SHOW_EXPRESSION_TOOL_NAME,
  PET_UPDATE_MOOD_TOOL_NAME,
  normalizePresentationToolCall,
} from './ui/engine/presentation'

type PluginContext = BackendPluginContext

const TAG = '[desktop-pet]'

function acknowledgePresentationTool(name: string, args: unknown) {
  const intent = normalizePresentationToolCall(name, args)
  if (!intent) {
    return {
      success: false,
      error: 'Invalid pet presentation tool arguments',
    }
  }

  return {
    success: true,
    applied: true,
    intent,
  }
}

export function onLoad() {
  console.log(`${TAG} loaded`)
}

export function onUnload() {
  console.log(`${TAG} unloaded`)
}

export function onEnable() {
  console.log(`${TAG} enabled`)
}

export function onDisable() {
  console.log(`${TAG} disabled`)
}

export async function run(context: PluginContext) {
  console.log(`${TAG} feature=${context.featureCode ?? 'pet'}`)
}

export const rpc = {
  [PET_PRESENTATION_TOOL_NAME]: (args: unknown) => acknowledgePresentationTool(PET_PRESENTATION_TOOL_NAME, args),
  [PET_SHOW_EXPRESSION_TOOL_NAME]: (args: unknown) => acknowledgePresentationTool(PET_SHOW_EXPRESSION_TOOL_NAME, args),
  [PET_PERFORM_ACTION_TOOL_NAME]: (args: unknown) => acknowledgePresentationTool(PET_PERFORM_ACTION_TOOL_NAME, args),
  [PET_MOVE_TOOL_NAME]: (args: unknown) => acknowledgePresentationTool(PET_MOVE_TOOL_NAME, args),
  [PET_UPDATE_MOOD_TOOL_NAME]: (args: unknown) => acknowledgePresentationTool(PET_UPDATE_MOOD_TOOL_NAME, args),
}

const plugin = { onLoad, onUnload, onEnable, onDisable, run }
export default plugin
