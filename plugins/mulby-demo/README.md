# Mulby API Demo

`mulby-demo` is a reference Mulby plugin for third-party plugin developers. It demonstrates public plugin APIs with runnable examples and marks host-internal or settings-scoped APIs as documentation-only boundaries.

`mulby-demo` 是面向第三方插件开发者的 Mulby API 参考插件。它以安全可运行示例展示公开插件 API，并将宿主内部或仅限设置页使用的 API 标记为只读边界说明。界面内置 English / 中文切换，模块简介、注意事项和示例说明均提供双语内容。

## Features

- Browse Mulby public plugin APIs by module category.
- Run renderer examples through `window.mulby.*`.
- Run backend examples through `window.mulby.host.call('mulby-demo', ...)`, with RPC-safe delayed backend API resolution.
- Inspect manifest, lifecycle, host RPC, dynamic features, scheduler callbacks, and Plugin Tools.
- Exercise method-level public API coverage, including guarded calls for environment-mutating APIs such as Plugin Store install/update.
- Review restricted APIs that are intentionally excluded from runnable third-party examples.
- Switch between English and Chinese documentation in the UI.

## 功能

- 按模块分类浏览 Mulby 对第三方插件开放的公开 API。
- 通过 `window.mulby.*` 运行渲染端示例。
- 通过 `window.mulby.host.call('mulby-demo', ...)` 运行后端示例，并使用适配 RPC 的后端 API 延迟解析。
- 查看 manifest、生命周期、Host RPC、动态功能、调度器回调和 Plugin Tools 示例。
- 覆盖公开 API 的方法级示例，包括对会改变环境的 API 使用受控目标或错误捕获保护。
- 查看被排除在可运行第三方示例之外的内部或设置专属 API 边界。
- 在界面中切换英文和中文说明。

## Commands

- `mulby demo`, `mulby api`, `插件 API 示例`: open the reference UI.
- `mulby demo detached`: open the reference UI in a detached window.
- `mulby demo smoke`: run a silent coverage smoke demo.
- `mulby dynamic demo`: static placeholder that pairs with the dynamic features example.

## Public API Scope

The runnable modules cover:

- Manifest, lifecycle, Host RPC, Plugin Tools
- Storage V1/V2, encrypted storage, attachments, filesystem, clipboard, clipboard history
- HTTP, network, shell policy/audit/commands, desktop search, InBrowser
- Dialog, notification, window, sub input, theme, menu, tray
- Plugin discovery, run, preferences, command shortcuts, background/process controls, dynamic features, messaging, scheduler
- System, permissions, power events, screen, media, input, input monitor, shortcut, security, geolocation
- AI, TTS, Sharp, FFmpeg, Log diagnostics

Each public method in `src/shared/api-catalog.ts` must appear in at least one runnable example. The `test/method-coverage.test.mjs` test enforces this.

## 公开 API 范围

可运行模块覆盖：

- Manifest、生命周期、Host RPC、Plugin Tools
- Storage V1/V2、加密存储、附件、文件系统、剪贴板、剪贴板历史
- HTTP、网络、Shell 策略/审计/命令、桌面搜索、InBrowser
- 对话框、通知、窗口、子输入、主题、菜单、托盘
- 插件发现、运行、偏好、命令快捷键、后台/进程控制、动态功能、消息和调度器
- 插件商店读取、更新检查，以及受控安装/更新调用
- 系统、权限、电源事件、屏幕、媒体、输入、输入监听、全局快捷键、安全和地理位置
- AI、TTS、Sharp、FFmpeg 和日志诊断

`src/shared/api-catalog.ts` 中的每个公开方法都必须出现在至少一个可运行示例中，`test/method-coverage.test.mjs` 会强制检查这一点。

## Excluded Boundary APIs

The plugin documents but does not run examples for APIs that are internal, settings-scoped, or too environment-mutating for a third-party reference demo:

- `settings`
- `developer`
- `systemPlugin`
- `systemPage`
- `superPanel`
- `trayMenu`
- host navigation-oriented `app` events
- AI global MCP/web-search/plugin-tool settings
- undocumented host internals such as `onboarding` and `openclaw`

## Project Structure

```text
mulby-demo/
|- manifest.json
|- package.json
|- README.md
|- icon.png
|- assets/icon.svg
|- src/
|  |- main.ts
|  |- shared/api-catalog.ts
|  |- types/mulby.d.ts
|  `- ui/
|     |- App.tsx
|     |- i18n.ts
|     |- styles.css
|     |- examples/
|     |  |- registry.ts
|     |  |- types.ts
|     |  `- *.example.ts
|     `- hooks/useMulby.ts
`- test/
   |- i18n.test.mjs
   |- layout.test.mjs
   |- backend-rpc.test.mjs
   |- method-coverage.test.mjs
   `- registry.test.mjs
```

## Development

```bash
pnpm install
pnpm --filter mulby-demo test
pnpm --filter mulby-demo build
```

If the Mulby CLI is installed:

```bash
pnpm --filter mulby-demo pack
```

## Adding a New API Example

1. Add or update the API entry in `src/shared/api-catalog.ts`.
2. Add a focused module in `src/ui/examples/*.example.ts`.
3. Export that module list from `src/ui/examples/registry.ts`.
4. Add backend support in `src/main.ts` only when the API must run in backend context.
5. Add Chinese module and example text in `src/ui/i18n.ts`.
6. Run `pnpm --filter mulby-demo test` to confirm registry, layout, bilingual coverage, backend RPC safety, and method-level API coverage.
7. Run `pnpm --filter mulby-demo build` to verify the plugin bundle.

Example modules should include summary, methods, contexts, permissions, notes, runnable snippets, and a clear safety label.

## 新增 API 示例

1. 在 `src/shared/api-catalog.ts` 添加或更新 API 条目。
2. 在 `src/ui/examples/*.example.ts` 添加聚焦的模块示例。
3. 在 `src/ui/examples/registry.ts` 导出新的模块列表。
4. 只有 API 必须在后端上下文运行时，才在 `src/main.ts` 添加后端支持。
5. 在 `src/ui/i18n.ts` 补充中文模块说明和示例说明。
6. 运行 `pnpm --filter mulby-demo test` 检查注册表、布局、双语覆盖、后端 RPC 安全性和方法级 API 覆盖。
7. 运行 `pnpm --filter mulby-demo build` 验证插件打包产物。

每个示例模块应包含功能简介、方法列表、运行上下文、权限、注意事项、可运行代码片段和明确的安全标签。
