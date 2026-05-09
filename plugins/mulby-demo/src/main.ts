/// <reference path="./types/mulby.d.ts" />

import { getCatalogSummary, publicApiCatalog, restrictedApiCatalog } from './shared/api-catalog'

type PluginContext = BackendPluginContext

interface SchedulerCallbackContext extends PluginContext {
  payload?: any
  task?: any
}

const lifecycleState = {
  loadedAt: '',
  loadCount: 0,
  enableCount: 0,
  disableCount: 0,
  unloadCount: 0,
  lastRun: null as null | {
    featureCode?: string
    input?: string
    attachmentCount: number
    at: string
  }
}

let apiRef: any | null = null

function rememberApi(context?: PluginContext) {
  if (context?.api) {
    apiRef = context.api
  }
  return apiRef
}

function toError(error: unknown) {
  return error instanceof Error ? { message: error.message, stack: error.stack } : { message: String(error) }
}

async function filesystemRoundtrip(api: any) {
  const base = await api.system.getPath('temp')
  const filePath = api.filesystem.join
    ? api.filesystem.join(base, `mulby-demo-${Date.now()}.txt`)
    : `${base}/mulby-demo-${Date.now()}.txt`
  const content = `Mulby demo filesystem roundtrip ${new Date().toISOString()}`

  await api.filesystem.writeFile(filePath, content, 'utf-8')
  const exists = await api.filesystem.exists(filePath)
  const readBack = await api.filesystem.readFile(filePath, 'utf-8')
  const stat = await api.filesystem.stat(filePath)
  await api.filesystem.unlink(filePath)

  return {
    filePath,
    exists,
    readBack,
    size: stat?.size
  }
}

async function shellRunCommand(api: any) {
  return api.shell.runCommand({
    command: process.execPath,
    args: ['-e', 'console.log(JSON.stringify({source:"mulby-demo", ok:true}))'],
    timeoutMs: 10000,
    shell: false
  })
}

async function registerDynamicFeature(api: any) {
  const feature = {
    code: 'dynamic-docs-storage',
    explain: '动态注册：打开 Storage API 示例',
    mode: 'ui',
    route: '#storage',
    cmds: [
      { type: 'keyword', value: 'mulby demo storage' }
    ]
  }

  await api.features.setFeature(feature)
  const features = await api.features.getFeatures(['dynamic-docs-storage'])
  return { feature, features }
}

async function schedulerDescribe(api: any) {
  const expression = '0 */30 * * * *'
  return {
    expression,
    valid: await api.scheduler.validateCron(expression),
    nextTime: await api.scheduler.getNextCronTime(expression),
    description: await api.scheduler.describeCron(expression)
  }
}

async function schedulerDelayTask(api: any) {
  const task = await api.scheduler.schedule({
    name: 'Mulby demo delayed notification',
    type: 'delay',
    delay: 5000,
    callback: 'onDemoScheduledTask',
    payload: {
      message: 'Mulby demo scheduler callback executed.'
    },
    timeout: 10000
  })

  return {
    id: task.id,
    name: task.name,
    status: task.status,
    nextRunTime: task.nextRunTime
  }
}

async function lifecycleSnapshot(api: any) {
  const stored = await api.storage.get('mulby-demo:lifecycle')
  return {
    ...lifecycleState,
    stored
  }
}

const backendExamples: Record<string, (api: any) => Promise<unknown>> = {
  filesystemRoundtrip,
  shellRunCommand,
  registerDynamicFeature,
  schedulerDescribe,
  schedulerDelayTask,
  lifecycleState: lifecycleSnapshot
}

export async function onLoad(context?: PluginContext) {
  const api = rememberApi(context)
  lifecycleState.loadedAt = new Date().toISOString()
  lifecycleState.loadCount += 1

  if (api?.storage) {
    await api.storage.set('mulby-demo:lifecycle', {
      loadedAt: lifecycleState.loadedAt,
      loadCount: lifecycleState.loadCount
    })
  }

  if (api?.tools) {
    await api.tools.register('mulby_demo_echo', async (args: any) => ({
      ok: true,
      echoed: args,
      at: new Date().toISOString()
    }))

    await api.tools.register('mulby_demo_catalog', async () => ({
      ...getCatalogSummary(),
      publicApis: publicApiCatalog.map((entry) => entry.code),
      restrictedApis: restrictedApiCatalog.map((entry) => entry.code)
    }))
  }
}

export async function onUnload(context?: PluginContext) {
  const api = rememberApi(context)
  lifecycleState.unloadCount += 1
  if (api?.tools) {
    await api.tools.unregister('mulby_demo_echo')
    await api.tools.unregister('mulby_demo_catalog')
  }
}

export async function onEnable(context?: PluginContext) {
  rememberApi(context)
  lifecycleState.enableCount += 1
}

export async function onDisable(context?: PluginContext) {
  rememberApi(context)
  lifecycleState.disableCount += 1
}

export async function run(context: PluginContext) {
  const api = rememberApi(context)
  lifecycleState.lastRun = {
    featureCode: context.featureCode,
    input: context.input,
    attachmentCount: context.attachments?.length ?? 0,
    at: new Date().toISOString()
  }

  if (context.featureCode === 'run-smoke-demo' && api) {
    const summary = getCatalogSummary()
    await api.notification.show(`Mulby demo covers ${summary.publicApiCount} public API modules.`, 'success')
    return summary
  }

  return lifecycleState.lastRun
}

export async function onDemoScheduledTask(context: SchedulerCallbackContext) {
  const api = rememberApi(context)
  const message = context.payload?.message ?? 'Mulby demo scheduler callback executed.'
  if (api?.notification) {
    await api.notification.show(message, 'success')
  }
  return {
    ok: true,
    message,
    taskId: context.task?.id,
    at: new Date().toISOString()
  }
}

export const host = {
  async echo(_context: PluginContext, payload: unknown) {
    return {
      ok: true,
      payload,
      at: new Date().toISOString()
    }
  },

  async listBackendExamples() {
    return Object.keys(backendExamples)
  },

  async getCatalogSummary() {
    return {
      ...getCatalogSummary(),
      publicApis: publicApiCatalog.map((entry) => ({
        code: entry.code,
        title: entry.title,
        category: entry.category
      })),
      restrictedApis: restrictedApiCatalog.map((entry) => ({
        code: entry.code,
        title: entry.title,
        reason: entry.reason
      }))
    }
  },

  async runBackendExample(context: PluginContext, exampleId: string) {
    const api = rememberApi(context)
    if (!api) {
      throw new Error('Mulby backend API context is not available.')
    }

    const example = backendExamples[exampleId]
    if (!example) {
      throw new Error(`Unknown backend example: ${exampleId}`)
    }

    try {
      return await example(api)
    } catch (error) {
      return {
        ok: false,
        exampleId,
        error: toError(error)
      }
    }
  }
}

export const rpc = {
  echo: host.echo,
  listBackendExamples: host.listBackendExamples,
  getCatalogSummary: host.getCatalogSummary,
  runBackendExample: host.runBackendExample
}

export default {
  onLoad,
  onUnload,
  onEnable,
  onDisable,
  run,
  onDemoScheduledTask,
  host,
  rpc
}
