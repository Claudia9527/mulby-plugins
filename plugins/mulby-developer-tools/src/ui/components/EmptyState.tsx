import { FolderInput, FolderPlus, Plus, PackageOpen } from 'lucide-react'

interface Props {
  onCreate: () => void
  onImport: () => void
  onAddDir: () => void
}

export function EmptyState({ onCreate, onImport, onAddDir }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 py-12">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-teal-500/10 border border-emerald-500/20 flex items-center justify-center mb-5">
        <PackageOpen size={30} className="text-emerald-500" />
      </div>
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">还没有开发项目</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm">
        从零创建一个新插件、导入已有插件目录，或添加一个包含多个插件的开发目录开始。
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2.5 mt-6">
        <button onClick={onCreate} className="btn-primary">
          <Plus size={16} /> 创建第一个插件
        </button>
        <button onClick={onImport} className="btn-secondary">
          <FolderInput size={16} /> 导入已有插件
        </button>
        <button onClick={onAddDir} className="btn-secondary">
          <FolderPlus size={16} /> 添加开发目录
        </button>
      </div>
    </div>
  )
}
