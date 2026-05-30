# Mulby 插件开发经验总结：拖拽与沙盒权限绕过指南

在开发具有本地文件系统操作能力的 Mulby 插件（例如 `batch-rename`）时，处理系统拖拽事件与沙盒文件权限常常会遇到一些具有迷惑性的报错与问题。本文档总结了在实现文件/文件夹拖拽读取与操作时踩过的坑以及最终的最佳实践方案。

## 1. 全局拖拽事件（Drag & Drop）拦截的深坑

在前端 UI（`App.tsx` 等）中实现拖拽功能时，如果处理不当，经常会遇到 `event.dataTransfer` 为空或“无法提取到有效文件信息”的诡异现象。

**问题原因**：
根据 HTML5 Drag and Drop API 规范以及 Chromium 的安全机制，要让一个区域成为合法的拖拽释放目标（Drop Zone），**必须同时在 `dragenter` 和 `dragover` 事件中调用 `event.preventDefault()`**。
如果漏掉了 `dragenter`，Chromium 可能会在最终触发 `drop` 事件时，强行清空 `dataTransfer` 中的数据流，导致获取不到任何文件信息。

**最佳实践**：
为了防止内部深层嵌套的 DOM 节点打断拖拽事件流，建议直接在 `window` 对象上注册全局事件，并且必须补全所有关键钩子：

```typescript
useEffect(() => {
  const handleGlobalDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleGlobalDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleGlobalDrop = async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    
    // ... 执行业务逻辑
  };

  window.addEventListener('dragenter', handleGlobalDragEnter);
  window.addEventListener('dragover', handleGlobalDragOver);
  window.addEventListener('drop', handleGlobalDrop);

  return () => {
    window.removeEventListener('dragenter', handleGlobalDragEnter);
    window.removeEventListener('dragover', handleGlobalDragOver);
    window.removeEventListener('drop', handleGlobalDrop);
  };
}, []);
```

## 2. 拖拽路径提取的双保险策略

由于部分沙盒（如 iframe）环境下直接读取 `File.path` 可能被隐藏为空字符串，因此不能单纯依赖 `event.dataTransfer.files[i].path`。应当采取多通道提取、互相降级的策略：

1. **官方 API 提取法**：优先使用 `mulby.plugin.resolveDroppedFilePaths(files)`。它可以在宿主底层通过 Electron 的 `webUtils.getPathForFile` 提取真实物理路径，同时可能会附加宿主的沙盒挂载授权白名单。
2. **底层剪贴板协议解析法**：使用 `event.dataTransfer.getData('text/uri-list')`，这在 macOS 的 Finder 和 Windows 的资源管理器中是最稳定的路径传递通道，提取后需注意手动 `decodeURIComponent` 并剔除 `file://` 前缀。

## 3. UI 渲染沙盒限制与后端 RPC 绕过

**问题表现**：
如果通过解析 `text/uri-list` 拿到了用户拖进来的文件夹路径 `/Users/xxx/Documents/Folder`，并在前端直接调用 `mulby.filesystem.stat(filePath)` 尝试读取该目录，通常会报错 **“请检查宿主授权”**。这是因为该路径仅仅是通过字符串拖入的，未通过原生文件选择对话框触发，前端沙盒认定其为越权访问。

**破局方案**：
将文件系统的遍历（递归读取子文件）以及核心操作（如重命名、移动文件）**全部下放至插件的后端进程（`main.ts`）处理**。

1. **在 `main.ts` 中注册 RPC 接口**：
   后端进程是不受前端沙盒约束的，在 `main.ts` 中可以自由使用 `mulby.filesystem` 或直接 import Node 的 `fs` 进行大尺度文件系统操作。
   ```typescript
   export const rpc = {
     async getFilesFromPath(filePath: string) {
       const fs = mulby.filesystem;
       // ... 在这里递归 fs.stat 和 fs.readdir
       return results;
     },
     async executeRename(moves: {oldPath: string, newPath: string}[]) {
       const fs = mulby.filesystem;
       // ... 在这里执行 fs.move
       return { successCount };
     }
   }
   ```

2. **在 UI 前端通过宿主桥接调用**：
   在 `App.tsx` 中，不再使用受限的 `filesystem`，而是通过 `host.call` 将指令派发给后端。
   ```typescript
   const host = window.mulby?.host;
   const res: any = await host.call('batch-rename', 'getFilesFromPath', filePath);
   ```

## 4. 警惕 RPC 接口返回的数据包装格式

**深坑警告：`TypeError: XXX is not iterable`**

在使用 `host.call` 时，前端接收到的返回值并不是后端直接 return 的数据本体，而是经过宿主桥接层包装的结构对象：`{ data: [...] }`。

如果后端 `rpc` 方法返回了一个数组，在前端千万**不能**直接按数组处理或使用扩展运算符：
```typescript
// ❌ 错误示范：会导致 is not iterable 报错
const results = await host.call('plugin-id', 'methodName', args);
allItems = [...allItems, ...results]; 

// ✅ 正确示范：安全解包 .data 属性
const res: any = await host.call('plugin-id', 'methodName', args);
const results = res?.data || [];
allItems = [...allItems, ...results];
```

## 总结

开发桌面级涉及本地文件的插件应用时，应遵循**“前端负责展现与路径提取，后端负责高权限计算与文件读写”**的分层架构。合理运用 `dragenter`、多通道路径提取以及宿主提供的 RPC 通信机制，就能打造出像原生应用一样顺滑且健壮的用户体验。
