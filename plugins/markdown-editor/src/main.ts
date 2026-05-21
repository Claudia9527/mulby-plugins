/// <reference path="./types/mulby.d.ts" />

declare const mulby: any

type PluginContext = BackendPluginContext

const PLUGIN_TAG = '[markdown-editor]'

function logLifecycle(message: string) {
  console.log(`${PLUGIN_TAG} ${message}`)
}

export function onLoad() {
  logLifecycle('插件已加载')
}

export function onUnload() {
  logLifecycle('插件已卸载')
}

export function onEnable() {
  logLifecycle('插件已启用')
}

export function onDisable() {
  logLifecycle('插件已禁用')
}

export async function run(context: PluginContext) {
  const featureCode = context.featureCode ?? 'open-editor'
  const input = context.input?.trim() ?? ''

  if (featureCode === 'edit-selection' && input.length === 0) {
    mulby.notification.show('没有接收到可编辑的选中文本。', 'warning')
  }

  logLifecycle(`触发功能: ${featureCode}, 输入长度: ${input.length}`)
}

const plugin = { onLoad, onUnload, onEnable, onDisable, run }
export default plugin
