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
**4 阶段分步向导**，可在已抵达的步骤间自由跳转：

0. 描述（一句话需求 / 选插件改造）→ 1. 契约（结构化 manifest，可编辑）→ 2. 生成（AI agent 自主写码）→ 3. 交付（构建·载入·验证·迭代）

**「能编译」≠「能跑」——两道真实验证门禁：**
- **契约一致性校验（静态、自动）**：后端 `check_conformance` 比对 manifest 与真实文件/源码（UI 形态是否自洽、声明的功能码是否有处理分支、`manifest.tools` 是否都 `register()`、`preload` 路径是否存在…）。AI 在生成结束前必须自检并据 error 修复；交付页也会展示问题并提供「AI 修复一致性问题」。这把 `develop-mulby-plugin` 技能 Handoff Checklist 的关键项变成了可机械执行的门禁。
- **运行验证（动态、手动）**：「运行验证」按钮用契约里的示例输入（regex/over 的 `sample`、或关键词的空输入）真实调用 `plugin.run` 跑一遍每个功能，验证「确实能执行」而非仅「能编译载入」。有副作用（可能写剪贴板/弹通知/开窗口），故由用户手动触发。

**知识单一真相源**：生成阶段优先挂载宿主维护的 `develop-mulby-plugin` 技能（`ai.call({ skills })`），Mulby API 文档通过 `read_file({path:"@skill/apis/<namespace>.md"})` 从已安装技能目录按需读取，不再打包副本。探测不到则优雅回退。

向导直接调用宿主：`createPlugin`（阶段 2）/ `validatePlugin` · `buildPlugin` · `check_conformance` · `plugin.run`（阶段 3）/ `packPlugin` / `addPluginProject`。

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
