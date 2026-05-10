import type { ApiExampleModule } from './types'
import { restrictedModule } from './helpers'

export const restrictedExamples: ApiExampleModule[] = [
  restrictedModule('settings', [
    'Reading host settings may be useful for Mulby-owned settings UI, but third-party plugins should avoid changing global user preferences.'
  ]),
  restrictedModule('developer', [
    'Adding/removing plugin paths and reloading all plugins belongs in developer tools, not ordinary plugin flows.'
  ]),
  restrictedModule('system-plugin', [
    'System plugin attachment APIs coordinate Mulby-owned system plugin surfaces.'
  ]),
  restrictedModule('system-page', [
    'Opening system pages is documented, but this reference avoids firing navigation actions from sample buttons.'
  ]),
  restrictedModule('super-panel', [
    'Super Panel APIs are for the host panel implementation and panel-specific integrations.'
  ]),
  restrictedModule('tray-menu', [
    'Tray menu state APIs are specific to Mulby host tray menu UI.'
  ]),
  restrictedModule('app-events', [
    'Listen only to events relevant to your plugin. Do not use host navigation event APIs as ordinary plugin control flow.'
  ]),
  restrictedModule('ai-system-settings', [
    'Plugins should call AI models or expose tools; global MCP server, provider, and tool visibility settings belong in Mulby settings.'
  ]),
  restrictedModule('undocumented-host-internals', [
    'If a name is present in a local type file but missing from public docs, treat it as unavailable for third-party plugins.'
  ])
]
