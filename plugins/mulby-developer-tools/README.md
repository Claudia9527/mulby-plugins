# Mulby 开发者工具（mulby-developer-tools）

插件开发工作台：在一个可视化界面里**创建 / 导入 / 添加 / 构建 / 打包 / 刷新 / 移除**插件项目，并通过 **Vibe Coding** 用自然语言按固定流程创作新插件。

> 形态：React + Vite + Tailwind + lucide-react 的 detached 窗口工作台；后台 `main` 极简，核心逻辑在 UI 内通过 `window.mulby.developer.*` 与宿主交互。

---

## 功能

### 工作台（Workbench）
- **多来源项目列表**：按来源分组（最近创建 / 最近导入 / 已添加目录 / 开发目录迁移），每项显示类型徽标（单插件 / 集合）与健康状态点。
- **详情与状态徽标**：选中项目查看 manifest 摘要与每个插件的状态——`有效 / manifest 无效`、`已构建 / 未构建`、`已加载 / 未加载`、`ID 冲突`，错误可展开查看详情与修复建议。
- **操作**（lucide 图标）：创建 `Plus`、导入 `FolderInput`、添加目录 `FolderPlus`、构建 `Hammer`、打包 `Package`、刷新 `RefreshCw`、打开目录 `FolderOpen`、移除 `Trash2`、README `FileText`。
- **诊断日志区**：构建 / 打包 / 创建的流式输出与时间戳，支持清空。
- **四态覆盖**：`loading`（骨架 + spinner）、`error`（全局错误条 + 行内错误详情）、`empty`（创建/导入/添加引导）、`success`（toast + 状态徽标转绿）。

### Vibe Coding 面板
按 `docs/superpowers/specs/2026-06-02-vibe-coding-workflow.md` 的 **8 阶段分步向导**逐步推进，每个阶段有 Gate 校验，未达成不可跳跃：

0. 需求澄清 → 1. 模板选择 → 2. 脚手架 → 3. 契约锁定 → 4. 最小闭环 → 5. 增量完善 → 6. 图标与 README → 7. 验证与交付

向导直接调用宿主：`createPlugin`（阶段 2）/ `validatePlugin`（阶段 3-4）/ `buildPlugin`（阶段 4、7）/ `packPlugin`（阶段 7）/ `addPluginProject`。

---

## 触发命令

| 关键词 | 说明 |
|---|---|
| `开发者工具` / `dev` / `developer` | 打开开发者工作台（feature `code: workbench`，`mode: detached`） |

---

## 用法

1. 在 Mulby 主输入框键入 `开发者工具` 打开工作台。
2. **创建插件**：点击「创建」→ 填写名称（kebab-case）、选择目标目录与模板（React / Basic）→ 生成脚手架并自动加入列表。
3. **导入 / 添加目录**：点击「导入」或「添加目录」选择目录，宿主自动判别单插件（含 `manifest.json`）或集合目录。
4. **构建 / 打包 / 刷新**：在右侧详情中对选中项目执行对应操作，输出写入诊断日志区。
5. **Vibe Coding**：切换到「Vibe Coding」页签，按向导逐阶段完成插件创作。

---

## 宿主接口依赖

UI 通过 `window.mulby.developer.*` 调用宿主 Developer IPC（契约以 `docs/apis/developer.md` + `electron.d.ts` 为准）：

`listPluginProjects` · `addPluginProject` · `removePluginProject` · `reloadPlugin` · `validatePlugin` · `createPlugin` · `buildPlugin` · `packPlugin` · `openPluginDir` · `selectDirectory`

> **演示模式**：当宿主对应接口尚未就绪时，UI 自动降级为 Mock 数据（顶栏显示「演示模式（Mock）」徽标），接口落地后自动切换为真实调用，无需改动 UI。

---

## 开发与构建

```bash
npm run build        # 构建后端 dist/main.js + 前端 ui/index.html
npm run build:backend
npm run build:ui
npm run pack         # 构建并打包为 .inplugin
```

依赖：`react` `react-dom` `lucide-react`（运行）；`vite` `@vitejs/plugin-react` `tailwindcss` `postcss` `autoprefixer` `esbuild` `typescript`（开发）。

---

## 配置项

无需额外配置。窗口尺寸默认 1100×720（最小 880×560），可在 `manifest.json` 的 `window` 字段调整。
