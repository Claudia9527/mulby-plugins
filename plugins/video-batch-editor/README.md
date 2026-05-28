# 视频批量编辑

Mulby 插件：面向本地视频文件的批量处理工作台。当前阶段已搭好 React 插件项目、Mulby manifest、后端 RPC 边界和首版工作台 UI。

## 当前能力

- 批量导入视频文件，支持从 Mulby 文件附件启动。
- 检测本机 `ffmpeg` 是否可用。
- 校验常见视频扩展名。
- 配置导出预设：MP4/H.264、MP4/H.265、WebM/VP9、封面 JPG。
- 配置裁剪起点、裁剪时长、分辨率、码率、CRF 和文字水印。
- 生成 FFmpeg 命令预览和输出路径。

当前版本先做“项目骨架 + 命令生成预览”，暂未真正执行视频队列。后续开发会在已有 `prepareJobs` RPC 基础上接入进度解析、队列执行、暂停/取消、失败重试和日志导出。

## 触发方式

| 方式 | 说明 |
| --- | --- |
| `视频批量` | 打开视频批量编辑工作台 |
| `批量视频` | 打开视频批量编辑工作台 |
| `视频批量编辑` | 打开视频批量编辑工作台 |
| `video batch` | 打开视频批量编辑工作台 |
| 文件附件 | 从选中的文件进入工作台并预填队列 |

## 前置条件

需要本机可执行 `ffmpeg` 命令。当前版本通过 `ffmpeg -version` 做探测，后续可以扩展为自定义 FFmpeg 路径或随插件/宿主配置。

## 开发

```bash
cd plugins/video-batch-editor
pnpm install
pnpm run build
pnpm run pack
```

## 项目结构

```text
video-batch-editor/
├── manifest.json
├── package.json
├── src/
│   ├── main.ts
│   ├── types/mulby.d.ts
│   └── ui/
│       ├── App.tsx
│       ├── hooks/useMulby.ts
│       ├── index.html
│       ├── main.tsx
│       └── styles.css
├── assets/icon.svg
└── icon.png
```

## 后续开发重点

1. 接入真实 FFmpeg 执行队列。
2. 解析 FFmpeg `progress` 输出并同步到 UI。
3. 增加任务暂停、取消、重试和失败日志。
4. 支持水印图片、封面批量截图和模板保存。
5. 增加导出日志和处理结果管理。

## 许可证

MIT License
