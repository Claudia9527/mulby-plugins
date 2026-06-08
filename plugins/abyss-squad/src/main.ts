/// <reference path="./types/mulby.d.ts" />
// 深渊小队 - 插件后端

declare const mulby: any;

export function onLoad() {
  console.log('[abyss-squad] loaded')
}

export function onUnload() {
  console.log('[abyss-squad] unloaded')
}

export function onEnable() {
  console.log('[abyss-squad] enabled')
}

export function onDisable() {
  console.log('[abyss-squad] disabled')
}

export async function run(context: { featureCode?: string }) {
  mulby.notification.show('深渊小队 - 准备冒险！')
}

// RPC 方法 - 存储代理
export const rpc = {
  async saveGame(input: { data: unknown }) {
    await mulby.storage.set('gameSave', input.data)
    return { success: true }
  },
  async loadGame() {
    const data = await mulby.storage.get('gameSave')
    return data || null
  },
  async saveMeta(input: { data: unknown }) {
    await mulby.storage.set('metaProgress', input.data)
    return { success: true }
  },
  async loadMeta() {
    const data = await mulby.storage.get('metaProgress')
    return data || null
  }
}

const plugin = { onLoad, onUnload, onEnable, onDisable, run }
export default plugin
