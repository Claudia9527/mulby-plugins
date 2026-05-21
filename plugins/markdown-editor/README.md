# Markdown 编辑器

一个轻量的 Mulby Markdown 编辑插件，提供左侧编辑、右侧实时预览、基础格式工具栏，以及草稿保存与 `.md` 导出能力。

## 功能

- 左侧 `textarea` 编辑，右侧基于 `react-markdown + remark-gfm` 的实时预览
- 基础工具栏：标题、粗体、斜体、链接、引用、代码、列表、任务列表、分割线
- 自动草稿保存到插件存储，也支持手动保存
- 支持从剪贴板粘贴、从本地打开 Markdown/TXT 文件、导出 `.md` 文件
- 支持通过划词把外部文本直接带入编辑器

## 触发方式

- 关键词：`markdown` / `markdown 编辑` / `Markdown 编辑器`
- 划词动作：`用 Markdown 编辑`

## 开发

```bash
cd plugins/markdown-editor
pnpm run build
pnpm run pack
```
