# 贡献指南

感谢你对 Mulby 插件生态的关注！本文档将帮助你快速上手开发和发布 Mulby 插件。

## 快速开始

### 1. Fork 并克隆仓库

```bash
# Fork 本仓库（在 GitHub 页面点击 Fork）
git clone https://github.com/<你的用户名>/mulby-plugins.git
cd mulby-plugins
```

### 2. 安装依赖

```bash
# 推荐使用 corepack 启用 pnpm
corepack enable
pnpm install
```

### 3. 创建新插件

```bash
# 安装 mulby-cli
npm install -g mulby-cli

# 在 plugins/ 下创建新插件（选择 react 或 basic 模板）
cd plugins
mulby create my-plugin
```

模板选择：
- **react** — 适合有可见 UI 的插件（推荐大多数场景）
- **basic** — 适合纯后端 / 命令式插件

### 4. 本地开发

```bash
cd plugins/my-plugin
pnpm run dev        # 启动开发模式
```

### 5. 构建与验证

```bash
pnpm run build      # 构建后端 + UI
pnpm run pack       # 打包为 .inplugin
```

打包后在本地 Mulby 客户端安装 `.inplugin` 测试主要功能。

### 6. 提交 PR

```bash
git checkout -b feature/my-plugin
git add plugins/my-plugin/
git commit -m "feat: add my-plugin"
git push origin feature/my-plugin
```

在 GitHub 上向 `main`（或 `dev`）分支提交 Pull Request。

---

## 插件目录规范

每个插件位于 `plugins/<plugin-name>/`，最少包含：

```
plugins/my-plugin/
├── manifest.json       # 必须 - 插件合约
├── package.json        # 必须 - 含 build 和 pack 脚本
├── src/
│   ├── main.ts         # 必须 - 后端入口
│   └── ui/             # UI 插件需要
│       ├── App.tsx
│       ├── main.tsx
│       └── index.html
├── icon.png            # 推荐 - 512×512 插件图标
└── README.md           # 推荐 - 插件说明
```

### manifest.json 必填字段

| 字段 | 说明 | 示例 |
|------|------|------|
| `name` | 插件目录名（kebab-case） | `"my-plugin"` |
| `displayName` | 显示名称 | `"我的插件"` |
| `version` | 语义化版本 | `"1.0.0"` |
| `author` | 作者名 | `"YourName"` |
| `description` | 一句话描述 | `"做某件事的插件"` |
| `main` | 后端入口 | `"dist/main.js"` |

### 命名规范

- 插件目录名使用 **kebab-case**（如 `my-plugin`，不是 `myPlugin`）
- 不要加 `mulby-` 前缀（如用 `clipboard-history` 而非 `mulby-clipboard-history`）
- 目录名应与 `manifest.json` 的 `name` 字段一致

### package.json 必需脚本

```json
{
  "scripts": {
    "build": "npm run build:backend && npm run build:ui",
    "build:backend": "esbuild src/main.ts --bundle --platform=node --outfile=dist/main.js",
    "build:ui": "vite build",
    "pack": "mulby pack"
  }
}
```

---

## PR 规范

### 一个 PR 只改一个插件

为了方便审核和增量发布，请确保每个 PR 只涉及一个插件目录。如果你同时开发了多个插件，请分别提交 PR。

### 版本号递增

每次发布更新时，`manifest.json` 中的 `version` 必须递增，遵循 [语义化版本](https://semver.org/lang/zh-CN/)：

- **修订号**（1.0.0 → 1.0.1）：Bug 修复
- **次版本号**（1.0.0 → 1.1.0）：新增功能（向后兼容）
- **主版本号**（1.0.0 → 2.0.0）：破坏性变更

### 提交消息建议

```
feat: add clipboard-history plugin       # 新增插件
fix(screen-pin): resolve drag offset     # 修复 bug
update(ai-chat): add model selection     # 功能更新
```

---

## CI 自动检查

提交 PR 后，CI 会自动运行以下检查：

| 检查项 | 说明 |
|--------|------|
| **变更检测** | 识别本次 PR 修改了哪些插件 |
| **Manifest 校验** | 检查必填字段、版本格式、ID 冲突 |
| **结构完整性** | 检查必要文件是否存在 |
| **构建测试** | 执行 `pnpm run build` 和 `pnpm run pack` |
| **范围检查** | 确认 PR 只改了插件目录 |

CI 完成后会在 PR 评论区生成详细报告，并上传 `.inplugin` 产物供审核者下载测试。

### 本地预检

提交 PR 前，可以在本地运行校验：

```bash
# 校验插件结构和 manifest
node scripts/validate-plugin.js my-plugin

# 完整构建验证
cd plugins/my-plugin
pnpm run build && pnpm run pack
```

---

## 审核与发布流程

```
你的 PR ──→ CI 自动检查 ──→ 维护者审核 ──→ 合并到 main ──→ CI 自动发布
                                                              ├─ 构建变更插件
                                                              ├─ 发布到 GitHub Release
                                                              └─ 更新 plugins.json 索引
```

1. PR 合并后，CI 会**自动检测变更的插件**并执行增量发布
2. 只有你修改的插件会被构建和发布，不影响其他插件
3. `.inplugin` 文件发布到 GitHub Release，`plugins.json` 索引自动更新

你无需手动发布，专注于写好插件就行。

---

## 常见问题

### CI 检查失败怎么办？

查看 PR 评论区的 CI Report，里面会详细列出哪些检查未通过。常见问题：

- `manifest.json` 缺少必填字段 → 补全字段
- `package.json` 缺少 `build` 或 `pack` 脚本 → 添加脚本
- 构建失败 → 在本地 `pnpm run build` 排查错误

### 可以在一个 PR 里修改多个插件吗？

可以，但不推荐。CI 会发出警告提示。为了审核效率和发布隔离，建议每个 PR 只修改一个插件。

### 如何更新已发布的插件？

1. 修改代码
2. 在 `manifest.json` 中递增 `version`
3. 提交 PR
4. 合并后 CI 自动发布新版本

### 开发时需要测试其他插件的功能怎么办？

本仓库是 pnpm workspace，所有插件共享依赖。你可以在本地运行任何插件：

```bash
cd plugins/<other-plugin>
pnpm run dev
```

---

## AI 辅助开发

推荐使用 [mulby-skills](https://github.com/Unicellular-SU/mulby-skills) 中的 **develop-mulby-plugin** skill，在 Cursor / Claude 等 AI IDE 中辅助开发插件。

该 skill 提供了完整的 Mulby 插件开发指导，包括：

- 插件脚手架创建与模板选择（react / basic）
- `manifest.json` 合约设计与 features 配置
- Mulby 全部宿主 API 的选用参考
- 已有前端应用转换为 Mulby 插件的流程
- uTools / zTools / Rubick 等生态插件迁移指南
- 插件图标设计与生成
- 构建、打包与交付验证

**安装方式**：将 `develop-mulby-plugin` skill 目录放到你的 AI 工具的 skills 目录下即可使用。详见 [mulby-skills 仓库说明](https://github.com/Unicellular-SU/mulby-skills)。

## 技术栈参考

大多数插件使用以下技术栈：

- **UI 框架**: React 18 + TypeScript
- **构建工具**: Vite（UI）+ esbuild（后端）
- **样式**: Tailwind CSS 或原生 CSS Variables
- **状态管理**: React hooks / Zustand
- **打包**: mulby-cli

也支持其他框架（如 Vue），参考 `plugins/he-calendar/`。

---

## 行为准则

- 尊重其他贡献者
- 不提交恶意代码或含有恶意行为的插件
- 不包含敏感信息（API Key、Token 等）
- 遵循 MIT 开源协议

---

## 需要帮助？

- 查看现有插件源码学习最佳实践
- 参考 `plugins/mulby-showcase/` 了解所有 Mulby API
- 在 Issues 中提问或讨论

感谢你的贡献！
