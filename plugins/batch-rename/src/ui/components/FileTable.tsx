import React from 'react';
import { FileItem } from '../types';
import { FileText, X, Check, AlertCircle, Image, Music, Video, FileCode, ArrowRight, UploadCloud } from 'lucide-react';

interface FileTableProps {
  files: FileItem[];
  onRemove: (id: string) => void;
  onManualEdit?: (id: string, newName: string) => void;
  isManualMode: boolean;
}

export function FileTable({ files, onRemove, onManualEdit, isManualMode }: FileTableProps) {
  // 根据扩展名匹配文件类型彩色图标
  const getFileIcon = (ext: string) => {
    const cleanExt = ext.toLowerCase().replace('.', '');
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'heic'].includes(cleanExt)) {
      return <Image size={15} className="text-cyan-500 shrink-0" />;
    }
    if (['mp3', 'wav', 'ogg', 'flac', 'aac'].includes(cleanExt)) {
      return <Music size={15} className="text-pink-500 shrink-0" />;
    }
    if (['mp4', 'mkv', 'avi', 'mov', 'wmv'].includes(cleanExt)) {
      return <Video size={15} className="text-purple-500 shrink-0" />;
    }
    if (['js', 'ts', 'tsx', 'jsx', 'html', 'css', 'json', 'py', 'go', 'sh'].includes(cleanExt)) {
      return <FileCode size={15} className="text-amber-500 shrink-0" />;
    }
    return <FileText size={15} className="text-slate-400 dark:text-slate-500 shrink-0" />;
  };

  if (files.length === 0) {
    return (
      <div className="glass-panel border-2 border-dashed border-gray-300 dark:border-white/10 rounded-2xl p-12 flex flex-col items-center justify-center text-center h-full max-h-[360px] transition-all">
        <div className="p-4 rounded-full bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/10 mb-4 animate-bounce">
          <UploadCloud size={40} className="text-indigo-500 dark:text-indigo-400 opacity-80" />
        </div>
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 tracking-wide mb-1">
          当前资产仓库为空
        </h3>
        <p className="text-xs text-gray-400 max-w-[280px] leading-relaxed">
          拖拽文件到这里，或在外部右键选择“批量重命名”将其导入系统
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl border border-gray-200/50 dark:border-white/10 overflow-hidden flex flex-col h-full shadow-lg">
      {/* 头部标题列 */}
      <div className="grid grid-cols-[50px_1fr_1.2fr_60px] gap-4 px-6 py-3.5 bg-white/20 dark:bg-slate-900/30 border-b border-gray-200/40 dark:border-white/5 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest select-none shrink-0">
        <div className="text-center">状态</div>
        <div>原始文件名</div>
        <div>重命名后文件名</div>
        <div className="text-center">动作</div>
      </div>
      
      {/* 文件项卡片列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5 scroll-container bg-transparent">
        {files.map((file, i) => {
          const isRenamed = file.oldName !== file.newName;
          return (
            <div 
              key={file.id} 
              className="asset-card grid grid-cols-[50px_1fr_1.2fr_60px] gap-4 px-4 py-3 items-center rounded-xl text-xs group transition-all"
            >
              {/* 状态单元格 */}
              <div className="flex justify-center select-none shrink-0">
                {file.status === 'success' && (
                  <span className="status-pill-success p-1 rounded-full flex items-center justify-center" title="重命名成功">
                    <Check size={12} className="stroke-[3]" />
                  </span>
                )}
                {file.status === 'error' && (
                  <span className="status-pill-error p-1 rounded-full flex items-center justify-center" title={file.errorMessage}>
                    <AlertCircle size={12} className="stroke-[3]" />
                  </span>
                )}
                {!file.status && (
                  <span className="inline-block px-2 py-0.5 rounded bg-gray-200/50 dark:bg-slate-800 text-[10px] text-gray-400 dark:text-gray-500 font-bold min-w-[18px] text-center">
                    {i + 1}
                  </span>
                )}
              </div>

              {/* 原始文件名 */}
              <div className="flex items-center gap-2 overflow-hidden pr-2">
                {getFileIcon(file.ext)}
                <span className="truncate text-gray-600 dark:text-slate-300 font-medium" title={file.oldName}>
                  {file.oldName}
                </span>
              </div>

              {/* 重命名预览对比 */}
              <div className="flex items-center gap-2 overflow-hidden pr-2">
                {isManualMode ? (
                  <input 
                    type="text" 
                    value={file.newName}
                    onChange={(e) => onManualEdit && onManualEdit(file.id, e.target.value)}
                    className="glass-input w-full px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none"
                  />
                ) : isRenamed ? (
                  <div className="flex items-center gap-2 max-w-full overflow-hidden">
                    <div className="p-1 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 shrink-0">
                      <ArrowRight size={10} className="text-indigo-500 dark:text-indigo-400 stroke-[2.5]" />
                    </div>
                    <span className="change-badge px-2.5 py-1 rounded-lg truncate text-[11px]" title={file.newName}>
                      {file.newName}
                    </span>
                  </div>
                ) : (
                  <span className="text-gray-400 dark:text-slate-500 truncate" title={file.newName}>
                    保持原样
                  </span>
                )}
              </div>

              {/* 手动移除文件按钮 */}
              <div className="flex justify-center select-none">
                <button 
                  onClick={() => onRemove(file.id)} 
                  className="p-1.5 rounded-lg bg-gray-500/5 dark:bg-slate-500/5 text-gray-400 hover:text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 opacity-0 group-hover:opacity-100 transition-all active:scale-90"
                  title="从列表移出"
                >
                  <X size={12} className="stroke-[2.5]" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
