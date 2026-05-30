import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useMulby } from './hooks/useMulby';
import { FileItem, RenameTab, ReplaceRule, InsertRule, NumberingRule, SmartRule, AiModel } from './types';
import { applyReplaceRule, applyInsertRule, applyNumberingRule } from './utils/rename';
import { RulePanel } from './components/RulePanel';
import { FileTable } from './components/FileTable';
import { Play, Sparkles, UploadCloud, Trash2 } from 'lucide-react';

export default function App() {
  const { filesystem, notification, ai, storage } = useMulby('batch-rename');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [activeTab, setActiveTab] = useState<RenameTab>('replace');
  const [isExecuting, setIsExecuting] = useState(false);

  // 拖拽高亮状态
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // AI 模型状态与持久化
  const [aiModels, setAiModels] = useState<AiModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('openai:gpt-4o-mini');

  // 规则状态
  const [replaceRule, setReplaceRule] = useState<ReplaceRule>({ findText: '', replaceText: '', useRegex: false, replaceExt: false });
  const [insertRule, setInsertRule] = useState<InsertRule>({ content: '', position: 'start', customIndex: 0, insertExt: false });
  const [numberingRule, setNumberingRule] = useState<NumberingRule>({ prefix: '', suffix: '', startNumber: 1, digits: 3 });
  const [smartRule, setSmartRule] = useState<SmartRule>({ prompt: '', isStreaming: false });

  // 临时存储手动编辑和 AI 生成的结果
  const [customNames, setCustomNames] = useState<Record<string, string>>({});
  
  // 用于 AI 请求取消
  const aiRequestIdRef = useRef<string | null>(null);
  const abortedRef = useRef(false);

  useEffect(() => {
    // 接收插件初始化 data
    window.mulby?.onPluginInit?.((data: any) => {
      if (data.attachments) {
        const initialFiles: FileItem[] = data.attachments.map((a: any) => ({
          id: a.id,
          path: a.path || '',
          oldName: a.name,
          newName: a.name,
          size: a.size || 0,
          ext: a.ext || (a.name.includes('.') ? a.name.substring(a.name.lastIndexOf('.')) : ''),
          dir: a.path ? a.path.substring(0, a.path.lastIndexOf('/')) : ''
        }));
        setFiles(initialFiles);
        setCustomNames({});
      }
    });
  }, []);

  // 获取宿主中可用的所有 AI 模型
  useEffect(() => {
    if (ai) {
      ai.allModels()
        .then((models) => {
          if (Array.isArray(models)) {
            setAiModels(models);
            
            // 从宿主存储中加载已记住的模型
            const storedModel = storage.get('selectedModel') as string;
            if (storedModel && models.some(m => m.id === storedModel)) {
              setSelectedModel(storedModel);
            } else if (models.length > 0) {
              // 挑选最合适的默认模型（如 gpt-4o-mini 或 deepseek）
              const defaultTextModel = models.find(
                m => m.id.toLowerCase().includes('gpt-4o-mini') || m.id.toLowerCase().includes('deepseek')
              );
              if (defaultTextModel) {
                setSelectedModel(defaultTextModel.id);
              } else {
                setSelectedModel(models[0].id);
              }
            }
          }
        })
        .catch((err) => {
          console.error('获取 AI 模型列表失败:', err);
        });
    }
  }, [ai]);

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    storage.set('selectedModel', modelId);
  };

  // 递归/深度读取拖入的文件或目录下的所有子文件
  const getFilesFromPath = async (filePath: string): Promise<FileItem[]> => {
    try {
      const host = window.mulby?.host;
      if (host) {
        const res: any = await host.call('batch-rename', 'getFilesFromPath', filePath);
        // host.call returns { data: ... }
        return (res?.data || []) as FileItem[];
      }
    } catch (err: any) {
      console.error('读取拖入路径失败:', filePath, err);
      notification.show(`读取路径失败: ${filePath} (${err.message || err})`, 'error');
    }
    return [];
  };

  // 解析拖拽过来的文件系统 file:// 链接文本 (参考 pdf-tools 的极致高可靠设计)
  const parseDroppedPathText = (raw: string): string[] => {
    if (!raw) return [];
    const lines = raw
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
      .filter(line => !line.startsWith('#'));

    return lines.map(line => {
      if (line.startsWith('file://')) {
        try {
          // 解码 URL 字符（处理中文路径、空格等 % 编码）
          return decodeURIComponent(line.replace(/^file:\/\//, ''));
        } catch {
          return line.replace(/^file:\/\//, '');
        }
      }
      return line;
    });
  };

  // 综合提取拖拽过来的全部本地路径信息
  const collectFilePaths = (event: DragEvent): string[] => {
    const dt = event.dataTransfer;
    if (!dt) return [];

    const candidates = new Set<string>();

    // 1. 标准 Electron File.path 属性提取
    const fileList = dt.files;
    for (let i = 0; i < (fileList?.length || 0); i++) {
      const file = fileList[i] as File & { path?: string };
      if (typeof file.path === 'string' && file.path.length > 0) {
        candidates.add(file.path);
      }
    }

    // 2. 解码拖放 uri-list 信息（Mac Finder/Windows Explorer 最稳定的传输通道）
    const uriList = dt.getData('text/uri-list');
    for (const path of parseDroppedPathText(uriList)) {
      candidates.add(path);
    }

    // 3. 解码纯文本（备用）
    const plainText = dt.getData('text/plain');
    for (const path of parseDroppedPathText(plainText)) {
      candidates.add(path);
    }

    return [...candidates].filter(Boolean);
  };

  // 全局注册拖拽监听（100% 解决因内部子节点嵌套导致 dataTransfer 被清空的问题）
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

    const handleGlobalDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // 仅在拖拽移出 HTML 页面边界时取消高亮
      if (!e.relatedTarget || e.relatedTarget === document.documentElement) {
        setIsDraggingOver(false);
      }
    };

    const handleGlobalDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(false);

      if (!filesystem) {
        notification.show('文件系统接口未准备就绪', 'error');
        return;
      }

      let filePaths = collectFilePaths(e);

      // 尝试通过插件 API 注册拖拽文件以获取宿主授权并提取被隐藏的真实路径
      const pluginApi = window.mulby?.plugin;
      if (pluginApi && e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        try {
           const resolvedPaths = pluginApi.resolveDroppedFilePaths(Array.from(e.dataTransfer.files) as File[]);
           if (resolvedPaths && resolvedPaths.length > 0) {
             filePaths = [...filePaths, ...resolvedPaths];
           }
        } catch (err) {
           console.error('resolveDroppedFilePaths error', err);
        }
      }

      filePaths = [...new Set(filePaths)].filter(Boolean);

      if (filePaths.length === 0) {
        notification.show('未提取到有效的路径信息，请重试或通过宿主导入', 'warning');
        return;
      }

      notification.show('正在解析拖入的资源...', 'info');

      let allItems: FileItem[] = [];
      for (const filePath of filePaths) {
        const items = await getFilesFromPath(filePath);
        allItems = [...allItems, ...items];
      }

      if (allItems.length > 0) {
        setFiles(prev => {
          const existingPaths = new Set(prev.map(f => f.path));
          const filteredNew = allItems.filter(f => !existingPaths.has(f.path));
          if (filteredNew.length === 0) {
            notification.show('所有拖入的文件已在列表中', 'warning');
            return prev;
          }
          notification.show(`成功加载 ${filteredNew.length} 个新文件资产`, 'success');
          return [...prev, ...filteredNew];
        });
      } else {
        notification.show('未解析到任何有效的文件资产', 'warning');
      }
    };

    window.addEventListener('dragenter', handleGlobalDragEnter);
    window.addEventListener('dragover', handleGlobalDragOver);
    window.addEventListener('dragleave', handleGlobalDragLeave);
    window.addEventListener('drop', handleGlobalDrop);

    return () => {
      window.removeEventListener('dragenter', handleGlobalDragEnter);
      window.removeEventListener('dragover', handleGlobalDragOver);
      window.removeEventListener('dragleave', handleGlobalDragLeave);
      window.removeEventListener('drop', handleGlobalDrop);
    };
  }, [filesystem, files]); // 依赖 files 以确保能正确排重

  // 计算应用规则后的文件列表
  const previewFiles = useMemo(() => {
    if (activeTab === 'manual' || activeTab === 'smart') {
      return files.map(f => ({ ...f, newName: customNames[f.id] ?? f.oldName }));
    }
    if (activeTab === 'replace') return applyReplaceRule(files, replaceRule);
    if (activeTab === 'insert') return applyInsertRule(files, insertRule);
    if (activeTab === 'numbering') return applyNumberingRule(files, numberingRule);
    return files;
  }, [files, activeTab, replaceRule, insertRule, numberingRule, customNames]);

  const handleRemoveFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleManualEdit = (id: string, newName: string) => {
    setCustomNames(prev => ({ ...prev, [id]: newName }));
  };

  const handleSmartApply = async () => {
    if (!ai || !smartRule.prompt || files.length === 0) return;
    
    abortedRef.current = false;
    aiRequestIdRef.current = null;
    setSmartRule(prev => ({ ...prev, isStreaming: true }));

    const fileListStr = files.map((f, i) => `${i + 1}. ${f.oldName}`).join('\n');
    const prompt = `你是一个专业的文件重命名工具。请根据用户的要求重命名以下文件。
用户的要求是: "${smartRule.prompt}"

文件列表:
${fileListStr}

请输出一个JSON数组，只包含新的文件名，顺序与输入严格一致。例如: ["new1.jpg", "new2.jpg"]。不要输出任何其他解释文本。`;

    try {
      const req = ai.call(
        { 
          model: selectedModel, // 使用用户自定义选择的 AI 模型
          messages: [{ role: 'user', content: prompt }] 
        },
        (chunk: any) => {
          if (chunk.__requestId) {
            aiRequestIdRef.current = chunk.__requestId;
          }
          if (abortedRef.current) return;
        }
      );

      const finalMsg = await req;
      if (abortedRef.current) return;

      const content = finalMsg.content;
      // 尝试解析 JSON
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const newNames = JSON.parse(jsonMatch[0]);
        if (Array.isArray(newNames) && newNames.length === files.length) {
          const newCustomNames: Record<string, string> = {};
          files.forEach((f, i) => {
            newCustomNames[f.id] = newNames[i];
          });
          setCustomNames(newCustomNames);
          notification.show('智能重命名预览生成成功', 'success');
        } else {
          throw new Error('AI 返回的数量与文件数量不匹配');
        }
      } else {
        throw new Error('无法解析 AI 返回的结果');
      }

    } catch (err: any) {
      if (!abortedRef.current && err?.name !== 'AbortError') {
        notification.show(`生成失败: ${err.message}`, 'error');
      }
    } finally {
      setSmartRule(prev => ({ ...prev, isStreaming: false }));
    }
  };

  const executeRename = async () => {
    const host = window.mulby?.host;
    if (!host) return;
    setIsExecuting(true);
    
    const updatedFiles = [...previewFiles];
    const moves: { oldPath: string, newPath: string, file: FileItem }[] = [];

    for (let i = 0; i < updatedFiles.length; i++) {
      const file = updatedFiles[i];
      if (file.oldName === file.newName) {
        file.status = 'success';
        continue;
      }
      if (!file.path || !file.dir) {
        file.status = 'error';
        file.errorMessage = '无法获取文件路径';
        continue;
      }

      const separator = file.path.includes('\\') ? '\\' : '/';
      const newPath = file.dir.endsWith(separator) 
        ? `${file.dir}${file.newName}` 
        : `${file.dir}${separator}${file.newName}`;

      moves.push({ oldPath: file.path, newPath, file });
    }

    if (moves.length > 0) {
      try {
        const res: any = await host.call('batch-rename', 'executeRename', moves.map(m => ({ oldPath: m.oldPath, newPath: m.newPath })));
        const result = res?.data || { successCount: 0, errorCount: moves.length, errorMessages: ['未知错误'] };
        
        // 简单更新状态（如果有错误，这里暂不对应到具体文件，仅显示总结，或后续可改进）
        moves.forEach((m, i) => {
           if (i < result.successCount) {
              m.file.status = 'success';
              m.file.path = m.newPath;
              m.file.oldName = m.file.newName;
           } else {
              m.file.status = 'error';
              m.file.errorMessage = '重命名失败';
           }
        });
        
        setFiles([...updatedFiles]);
        
        if (result.errorCount === 0) {
          notification.show(`成功重命名 ${result.successCount} 个文件`, 'success');
        } else {
          notification.show(`执行完成，${result.successCount} 成功，${result.errorCount} 失败: ${result.errorMessages.join(', ')}`, 'warning');
        }
      } catch (err: any) {
        notification.show(`执行失败: ${err.message || '未知错误'}`, 'error');
      }
    }

    setIsExecuting(false);
    
    // 更新 customNames 缓存
    setCustomNames({});
  };

  return (
    <div className="relative flex flex-col h-screen text-gray-900 dark:text-gray-100 font-sans overflow-hidden bg-slate-50 dark:bg-[#070a13]">
      {/* 极光背景发光点 */}
      <div className="bg-glow-container">
        <div className="bg-glow-1"></div>
        <div className="bg-glow-2"></div>
      </div>

      {/* 拖入时高彩感官玻璃态蒙版 */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 pointer-events-none flex flex-col items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-lg border-4 border-dashed border-indigo-500/80 m-4 rounded-3xl animate-pulse">
          <div className="p-5 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-4">
            <UploadCloud size={56} className="text-indigo-400 stroke-[2]" />
          </div>
          <p className="text-base font-bold text-white tracking-wide">释放以导入文件和文件夹资产</p>
          <p className="text-xs text-slate-400 mt-1.5 font-medium">支持递归解析所有子文件夹中的文件</p>
        </div>
      )}

      {/* 顶部艺术导航栏 */}
      <header className="relative z-10 px-6 py-4 border-b border-gray-200/50 dark:border-white/5 bg-white/40 dark:bg-slate-900/30 backdrop-blur-md flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-500 dark:text-indigo-400 animate-pulse" />
          <h1 className="text-lg font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
            批量重命名
          </h1>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-semibold text-emerald-500 dark:text-emerald-400 uppercase tracking-wider">
            Active Deck
          </span>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="relative z-10 flex-1 overflow-hidden flex flex-col p-5 gap-5">
        <RulePanel 
          activeTab={activeTab}
          onTabChange={setActiveTab}
          replaceRule={replaceRule}
          onReplaceChange={setReplaceRule}
          insertRule={insertRule}
          onInsertChange={setInsertRule}
          numberingRule={numberingRule}
          onNumberingChange={setNumberingRule}
          smartRule={smartRule}
          onSmartChange={setSmartRule}
          onSmartApply={handleSmartApply}
          aiModels={aiModels}
          selectedModel={selectedModel}
          onModelChange={handleModelChange}
        />
        
        <div className="flex-1 overflow-hidden">
          <FileTable 
            files={previewFiles} 
            onRemove={handleRemoveFile}
            onManualEdit={handleManualEdit}
            isManualMode={activeTab === 'manual'}
          />
        </div>

        {/* 悬浮舱式底部操作栏 */}
        <footer className="glass-panel rounded-2xl px-6 py-4 flex justify-between items-center border border-gray-200/50 dark:border-white/10 shadow-2xl shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
              <span>已加载资产:</span>
              <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold">
                {files.length} 件
              </span>
            </div>
            {files.length > 0 && (
              <button
                onClick={() => {
                  setFiles([]);
                  setCustomNames({});
                }}
                disabled={isExecuting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="清空列表"
              >
                <Trash2 size={16} />
                清空
              </button>
            )}
          </div>
          <button 
            onClick={executeRename}
            disabled={files.length === 0 || isExecuting}
            className="super-btn flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold disabled:bg-gray-400/50 dark:disabled:bg-slate-800/50 disabled:shadow-none disabled:transform-none disabled:cursor-not-allowed transition-all"
          >
            <Play size={16} fill="currentColor" className="text-white" />
            {isExecuting ? '正在重置文件资产...' : '执行批量重命名'}
          </button>
        </footer>
      </main>
    </div>
  );
}
