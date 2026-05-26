# mulby-ai-chat · AI 助手插件

支持多轮对话的 AI 聊天助手，参考 Cherry Studio 交互风格，集成 Mulby 内置 AI 全部能力。

## 功能特性

| 功能 | 说明 |
|------|------|
| 多模型切换 | 顶栏下拉选择所有已配置模型（allModels） |
| 流式输出 | 实时打字效果，onChunk 回调 + 打字光标动画 |
| 多轮对话 | 完整历史上下文，持久化到 Mulby storage |
| 会话管理 | 左侧列表，支持新建 / 切换 / 删除，最多保存 50 条 |
| 附件上传 | 支持图片（vision）和文件，通过 ai.attachments.upload 上传 |
| AI Skills | 弹出面板选择启用的 Skills，支持手动 / 自动模式 |
| 联网搜索 | 工具栏联网开关，可选搜索源，AI 可主动搜索互联网 |
| 工作目录授权 | 动态授权项目目录，AI 可在授权目录内执行命令和读写文件 |
| 工具调用可视化 | 实时显示 AI 工具调用过程（名称、参数、结果、状态） |
| Markdown 渲染 | react-markdown + remark-gfm，代码块语法高亮 |
| 主题跟随 | 监听 onThemeChange，light/dark 双色板 CSS 变量实时切换 |
| Liquid Glass UI | iOS 26 风格毛玻璃+高斯模糊+半透明卡片+高光边框 |

## 触发方式

在 Mulby 搜索栏输入以下任一关键词：

- `ai`
- `chat`
- `助手`

## 界面说明

```
┌─ 侧边栏 ──────┬─ 对话区 ─────────────────────┐
│  [+ 新建对话]  │  消息列表（弹入动画）          │
│  会话 1 ✕     │  ···                          │
│  会话 2 ✕     │                               │
│  ···          ├─ 输入区 ─────────────────────┤
│               │  ┌────────────────────────┐  │
│               │  │ textarea               │  │
│               │  └────────────────────────┘  │
│               │  [模型] [📎] [⚡] [🌐] [📁] [▶] │
└───────────────┴──────────────────────────────┘
```

工具栏按钮从左到右：模型切换、附件上传、AI Skills、联网搜索、工作目录、发送/停止。

## 权限声明

```json
{
  "permissions": {
    "clipboard": true,
    "commandExecution": {
      "ai": {
        "enabled": true,
        "defaultProfile": "sandbox",
        "maxProfile": "workspace"
      }
    }
  }
}
```

- `commandExecution.ai` — 允许插件承载的 AI 使用 Mulby 内置命令工具（shell.exec、patch.apply、git.status 等）
- `defaultProfile: "sandbox"` — AI 生成命令默认在沙箱环境执行
- `maxProfile: "workspace"` — 最高可提升到 workspace 环境

## AI 命令执行流程

本插件通过 `window.mulby.ai.call()` 发起 AI 对话。当 AI 需要执行命令时，整个流程如下：

### 完整链路

```
[用户输入消息]
    ↓
[插件 UI] ai.call({ model, messages, skills, maxToolSteps: 200 })
    ↓ IPC
[Mulby 主进程 AI 引擎]
    ↓
[选择模型 → 调用 LLM]
    ↓ LLM 返回 tool_call (如 mulby_run_command)
[内置工具运行时 internal-tool-runtime]
    ↓
resolveRunCommandContext(toolContext)
    ├── 从 toolContext.pluginName 取出插件 ID = "mulby-ai-chat"
    ├── 校验 manifest: commandExecution.ai.enabled = true ✓
    ├── defaultProfile = "sandbox", maxProfile = "workspace"
    └── 调用 getPluginCommandDirectoryAccessRoots("mulby-ai-chat")
        → 返回 { read: [...], readwrite: [...] }
    ↓
[CommandRunnerService.runCommand(input, context)]
    ├── 合并 directoryAccessRoots 到 rootScope
    ├── 校验 cwd 在 rootScope 内
    ├── 黑名单/白名单/用户确认等策略
    ├── sandbox 后端准备 (macOS sandbox-exec / Windows Job Object / Linux namespace)
    └── spawn 执行命令
    ↓
[执行结果] → [AI 引擎] → [LLM 继续推理或输出]
    ↓ 流式 chunk 回传
[插件 UI 更新]
    ├── chunkType: 'tool-call'   → 显示工具调用中
    ├── chunkType: 'tool-result' → 显示命令结果
    └── chunkType: 'text'        → 流式显示 AI 回复
```

### 关键设计

1. **插件不直接执行命令** — 插件只负责发起 AI 对话和管理目录授权，命令执行完全在宿主侧闭环
2. **安全策略分层** — 命令执行经过总开关 → 插件权限校验 → profile 校验 → root scope → 黑白名单 → 用户确认 → sandbox 多层保护
3. **工具调用可视化** — AI 的 tool_call/tool_result 通过流式 chunk 回传，插件 UI 实时展示调用状态

## 目录授权（directoryAccess）

AI 执行命令时需要知道可以在哪个目录工作。通过 `directoryAccess` API 让用户在运行时授权项目目录。

### 使用流程

1. 用户点击工具栏的「工作目录」按钮
2. 弹出目录授权面板，显示已授权目录列表
3. 点击「选择目录」→ 弹出系统目录选择器
4. 用户选择项目目录 → 授权记录持久保存
5. 之后 AI 执行命令时，宿主自动将授权目录纳入可操作范围

### 授权模式

| 模式 | 说明 |
|------|------|
| `read` | AI 可在该目录下执行文件读取、目录列表、文本搜索、git status/diff |
| `readwrite` | 包含 read，并允许命令执行、patch.apply 把该目录作为可写 workspace root |

### 前端 API

```typescript
// 申请目录授权（弹出系统目录选择器）
const grant = await window.mulby.directoryAccess.request({
  mode: 'readwrite',
  reason: '在用户选择的项目目录中读写文件和执行命令'
})

// 列出已授权目录
const grants = await window.mulby.directoryAccess.list()

// 撤销授权（支持 grant ID 或目录路径）
await window.mulby.directoryAccess.revoke(grants[0].id)
```

### 后端 API

```typescript
export async function run(context: BackendPluginContext) {
  const grant = await context.api.directoryAccess.request({
    mode: 'readwrite',
    reason: '在用户选择的项目目录中运行 git 命令'
  })
  if (!grant) return

  const result = await context.api.shell.runCommand({
    command: 'git',
    args: ['status'],
    cwd: grant.path,
    executionProfile: 'workspace'
  })
  console.log(result.stdout)
}
```

### 注意事项

- 目录授权按插件 ID 隔离，持久保存，直到用户主动撤销
- 目录授权只扩展 root 范围，不替代命令执行权限（manifest 必须声明 `commandExecution`）
- 用户可在 Mulby 设置页安全区域查看和撤销所有插件的目录授权

## 快捷键

| 按键 | 动作 |
|------|------|
| `Enter` | 发送消息 |
| `Shift+Enter` | 文本框换行 |

## 依赖

- `react-markdown` + `remark-gfm` — Markdown 渲染
- `react-syntax-highlighter` — 代码高亮

## 构建

```bash
pnpm install
pnpm run build
pnpm run pack   # 打包为 .inplugin
```

## 注意事项

- 需要在 Mulby 中配置至少一个 AI Provider 才能正常使用
- 附件上传依赖 Mulby AI 附件 API，图片自动使用 vision 模式
- 会话历史每条会话最多保留 100 条消息
- AI 命令执行能力需要宿主全局命令执行开关开启
