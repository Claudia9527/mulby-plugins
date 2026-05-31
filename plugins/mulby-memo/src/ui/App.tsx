import { useEffect, useState, useMemo } from 'react'
import { Search, Code, Image as ImageIcon, Type, Trash2, CheckCircle2, Plus, Edit2, Copy, Send, X, CheckSquare, Square, Folder, LayoutGrid, Check } from 'lucide-react'
import { useMulby } from './hooks/useMulby'

interface MemoItem {
  id: string
  type: 'text' | 'code' | 'image'
  content: string
  tags: string[]
  createdAt: number
  groupId: string
}

interface Group {
  id: string
  name: string
}

export default function App() {
  const [memos, setMemos] = useState<MemoItem[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [activeGroupId, setActiveGroupId] = useState<string>('all')
  
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'text' | 'code' | 'image'>('all')
  
  const [isMultiSelect, setIsMultiSelect] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  
  const [previewMemo, setPreviewMemo] = useState<MemoItem | null>(null)
  
  // editingMemo = null means modal is closed
  // if id exists, we are editing. If not, creating new.
  const [editingMemo, setEditingMemo] = useState<Partial<MemoItem> | null>(null)
  
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)

  const { host, notification } = useMulby('mulby-memo') as any

  const fetchData = async () => {
    try {
      const [memosRes, groupsRes] = await Promise.all([
        host.call('getMemos'),
        host.call('getGroups')
      ])
      
      const fetchedMemos = (memosRes.data as any[]) || []
      // Migrate old memos that don't have groupId
      fetchedMemos.forEach((m: any) => {
        if (!m.groupId) m.groupId = 'default'
      })
      
      setMemos(fetchedMemos)
      setGroups((groupsRes.data as Group[]) || [{ id: 'default', name: '未分组' }])
    } catch (e) {
      console.error('Failed to fetch data', e)
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const initialTheme = (params.get('theme') as 'light' | 'dark') || 'light'
    document.documentElement.classList.toggle('dark', initialTheme === 'dark')

    ;(window as any).mulby?.onThemeChange?.((newTheme: 'light' | 'dark') => {
      document.documentElement.classList.toggle('dark', newTheme === 'dark')
    })

    ;(window as any).mulby?.onPluginEnter?.(() => fetchData())

    const handleMessage = (msg: any) => {
      if (msg.type === 'memo-saved') fetchData()
    }
    ;(window as any).mulby?.messaging?.on(handleMessage)
    window.addEventListener('focus', fetchData)

    fetchData()

    return () => {
      ;(window as any).mulby?.messaging?.off(handleMessage)
      window.removeEventListener('focus', fetchData)
    }
  }, [])

  const handleDeleteMemo = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await host.call('deleteMemo', id)
    fetchData()
    notification.show('已删除备忘', 'success')
  }

  const handleCopy = async (content: string) => {
    await navigator.clipboard.writeText(content)
    notification.show('已复制到剪贴板', 'success')
  }

  const handlePaste = async (memo: MemoItem) => {
    await host.call('pasteMemo', memo)
  }

  const handleCombinePaste = async () => {
    const selectedMemos = memos.filter(m => selectedIds.has(m.id))
    const invalid = selectedMemos.some(m => m.type === 'image')
    if (invalid) {
      notification.show('不能组合粘贴图片，请取消选择图片', 'error')
      return
    }
    const combined = selectedMemos.map(m => m.content).join('\n\n')
    await host.call('pasteText', combined)
    setIsMultiSelect(false)
    setSelectedIds(new Set())
  }

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingGroup) return
    if (!editingGroup.name.trim()) return
    
    const groupToSave = {
      id: editingGroup.id || Date.now().toString(),
      name: editingGroup.name
    }
    await host.call('saveGroup', groupToSave)
    setEditingGroup(null)
    fetchData()
  }

  const handleDeleteGroup = async (id: string) => {
    if (id === 'default') return
    if (confirm('确定删除此分组吗？分组下的内容将移动到默认分组。')) {
      await host.call('deleteGroup', id)
      if (activeGroupId === id) setActiveGroupId('all')
      fetchData()
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      if (event.target?.result) {
        setEditingMemo({ ...editingMemo, content: event.target.result as string })
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSaveMemo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMemo || !editingMemo.content) {
      notification.show('内容不能为空', 'error')
      return
    }
    
    const memoToSave = {
      id: editingMemo.id || Date.now().toString(),
      type: editingMemo.type || 'text',
      content: editingMemo.content,
      groupId: editingMemo.groupId || 'default',
      tags: editingMemo.tags || [],
      createdAt: editingMemo.createdAt || Date.now()
    }
    await host.call('saveMemo', memoToSave)
    setEditingMemo(null)
    if (previewMemo?.id === memoToSave.id) {
      setPreviewMemo(memoToSave as MemoItem)
    }
    fetchData()
  }

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setSelectedIds(newSet)
  }

  const filteredMemos = useMemo(() => {
    return memos.filter(memo => {
      if (activeGroupId !== 'all' && memo.groupId !== activeGroupId) return false
      if (activeTab !== 'all' && memo.type !== activeTab) return false
      if (searchQuery) {
        if (memo.type === 'image') return false
        return memo.content.toLowerCase().includes(searchQuery.toLowerCase())
      }
      return true
    })
  }, [memos, activeGroupId, activeTab, searchQuery])

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-48 flex-none border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="font-semibold text-sm">分组管理</span>
          <button onClick={() => setEditingGroup({ id: '', name: '' })} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div
            onClick={() => setActiveGroupId('all')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${activeGroupId === 'all' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-medium' : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="flex-1">全部备忘</span>
          </div>
          
          {groups.map(g => (
            <div
              key={g.id}
              onClick={() => setActiveGroupId(g.id)}
              onDragOver={(e) => {
                e.preventDefault()
                e.currentTarget.classList.add('bg-blue-50', 'dark:bg-blue-900/20')
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove('bg-blue-50', 'dark:bg-blue-900/20')
              }}
              onDrop={async (e) => {
                e.preventDefault()
                e.currentTarget.classList.remove('bg-blue-50', 'dark:bg-blue-900/20')
                const memoId = e.dataTransfer.getData('memoId')
                if (memoId) {
                  const memo = memos.find(m => m.id === memoId)
                  if (memo && memo.groupId !== g.id) {
                    await host.call('saveMemo', { ...memo, groupId: g.id })
                    fetchData()
                  }
                }
              }}
              className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${activeGroupId === g.id ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-medium' : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
            >
              <Folder className="w-4 h-4" />
              <span className="flex-1 truncate">{g.name}</span>
              {g.id !== 'default' && (
                <div className="hidden group-hover:flex items-center gap-1">
                  <Edit2 onClick={(e) => { e.stopPropagation(); setEditingGroup(g) }} className="w-3.5 h-3.5 hover:text-blue-500" />
                  <Trash2 onClick={(e) => { e.stopPropagation(); handleDeleteGroup(g.id) }} className="w-3.5 h-3.5 hover:text-red-500" />
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <header className="flex-none p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 backdrop-blur flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="搜索备忘录..."
                className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              onClick={() => {
                setIsMultiSelect(!isMultiSelect)
                if (isMultiSelect) setSelectedIds(new Set())
              }}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${isMultiSelect ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700'}`}
            >
              多选
            </button>
            <button
              onClick={() => setEditingMemo({ type: 'text', groupId: activeGroupId === 'all' ? 'default' : activeGroupId })}
              className="flex items-center gap-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> 新建
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {['all', 'text', 'code', 'image'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {tab === 'all' && '全类型'}
                {tab === 'text' && '文本'}
                {tab === 'code' && '代码'}
                {tab === 'image' && '图片'}
              </button>
            ))}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4">
          {filteredMemos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <CheckCircle2 className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm">当前分类下暂无记录</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMemos.map(memo => (
                <div
                  key={memo.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('memoId', memo.id)
                  }}
                  onClick={() => isMultiSelect ? toggleSelect(memo.id) : setPreviewMemo(memo)}
                  className={`group relative flex flex-col bg-white dark:bg-slate-800 rounded-xl border shadow-sm transition-all cursor-pointer overflow-hidden
                    ${isMultiSelect && selectedIds.has(memo.id) ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200 dark:border-slate-700/50 hover:shadow-md hover:border-blue-400/50'}
                  `}
                >
                  {isMultiSelect && (
                    <div className="absolute top-2 right-2 z-10 text-blue-500 bg-white dark:bg-slate-800 rounded-full">
                      {selectedIds.has(memo.id) ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-slate-300 dark:text-slate-600" />}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                      {memo.type === 'text' && <><Type className="w-3.5 h-3.5" />文本</>}
                      {memo.type === 'code' && <><Code className="w-3.5 h-3.5" />代码</>}
                      {memo.type === 'image' && <><ImageIcon className="w-3.5 h-3.5" />图片</>}
                    </div>
                    {!isMultiSelect && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCopy(memo.content) }}
                          className="p-1 rounded text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                          title="复制"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handlePaste(memo) }}
                          className="p-1 rounded text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                          title="粘贴发送"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteMemo(e, memo.id)}
                          className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="p-3 flex-1">
                    {memo.type === 'image' ? (
                      <div className="relative w-full h-32 rounded bg-slate-100 dark:bg-slate-900 overflow-hidden">
                        <img src={memo.content} className="absolute inset-0 w-full h-full object-cover" alt="memo" />
                      </div>
                    ) : (
                      <pre className="text-xs font-mono whitespace-pre-wrap break-words line-clamp-6 text-slate-700 dark:text-slate-300">
                        {memo.content}
                      </pre>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
        
        {/* Multi-select bar */}
        {isMultiSelect && selectedIds.size > 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-800 dark:bg-slate-700 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-4">
            <span className="text-sm font-medium">已选择 {selectedIds.size} 项</span>
            <div className="w-px h-4 bg-slate-600"></div>
            <button onClick={handleCombinePaste} className="flex items-center gap-1.5 text-sm font-medium hover:text-blue-300 transition-colors">
              <Send className="w-4 h-4" /> 组合粘贴
            </button>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewMemo && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-full overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
              <h3 className="font-semibold flex items-center gap-2">
                {previewMemo.type === 'text' && <Type className="w-4 h-4" />}
                {previewMemo.type === 'code' && <Code className="w-4 h-4" />}
                {previewMemo.type === 'image' && <ImageIcon className="w-4 h-4" />}
                内容预览
              </h3>
              <div className="flex items-center gap-2">
                <button onClick={() => { setEditingMemo(previewMemo); setPreviewMemo(null) }} className="p-2 text-slate-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors" title="编辑">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => setPreviewMemo(null)} className="p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50/30 dark:bg-slate-900/30">
              {previewMemo.type === 'image' ? (
                <img src={previewMemo.content} className="max-w-full rounded-lg shadow-sm mx-auto" alt="preview" />
              ) : (
                <pre className="text-sm font-mono whitespace-pre-wrap break-words text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  {previewMemo.content}
                </pre>
              )}
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 bg-white dark:bg-slate-800">
              <button
                onClick={() => {
                  handleCopy(previewMemo.content)
                  setPreviewMemo(null)
                }}
                className="px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors"
              >
                <Copy className="w-4 h-4" /> 复制
              </button>
              <button
                onClick={() => {
                  handlePaste(previewMemo)
                  setPreviewMemo(null)
                }}
                className="px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white transition-colors"
              >
                <Send className="w-4 h-4" /> 粘贴发送
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit/Add Memo Modal */}
      {editingMemo && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveMemo} className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col border border-slate-200 dark:border-slate-700">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h3 className="font-semibold">{editingMemo.id ? '编辑备忘' : '新增备忘'}</h3>
              <button type="button" onClick={() => setEditingMemo(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex gap-4">
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-medium text-slate-500">类型</label>
                  <select
                    value={editingMemo.type}
                    onChange={e => setEditingMemo({ ...editingMemo, type: e.target.value as any })}
                    disabled={editingMemo.type === 'image' && !!editingMemo.id} // cannot change away from image if editing an image
                    className="w-full p-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none"
                  >
                    <option value="text">文本</option>
                    <option value="code">代码</option>
                    <option value="image">图片</option>
                  </select>
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-medium text-slate-500">分组</label>
                  <select
                    value={editingMemo.groupId}
                    onChange={e => setEditingMemo({ ...editingMemo, groupId: e.target.value })}
                    className="w-full p-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none"
                  >
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500">内容</label>
                {editingMemo.type === 'image' ? (
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-center relative overflow-hidden group min-h-[160px] flex items-center justify-center">
                    {editingMemo.content ? (
                      <>
                        <img src={editingMemo.content} className="max-h-48 mx-auto rounded shadow-sm" alt="edit preview" />
                        {!editingMemo.id && (
                          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-white text-sm font-medium">更换图片</span>
                            <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleImageUpload} />
                          </div>
                        )}
                        {editingMemo.id && <p className="absolute bottom-2 left-0 right-0 text-xs text-slate-400 bg-black/60 text-white py-1">图片内容暂不支持修改，只能修改分组</p>}
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors m-2">
                        <ImageIcon className="w-8 h-8 text-slate-400 mb-2" />
                        <span className="text-sm font-medium text-slate-500">点击或拖拽上传图片</span>
                        <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleImageUpload} />
                      </div>
                    )}
                  </div>
                ) : (
                  <textarea
                    autoFocus
                    required
                    value={editingMemo.content || ''}
                    onChange={e => setEditingMemo({ ...editingMemo, content: e.target.value })}
                    rows={8}
                    className="w-full p-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    placeholder="输入内容..."
                  />
                )}
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/80 rounded-b-2xl">
              <button type="button" onClick={() => setEditingMemo(null)} className="px-4 py-2 rounded-lg font-medium text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700">
                取消
              </button>
              <button type="submit" className="px-4 py-2 rounded-lg font-medium text-sm bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-2">
                <Check className="w-4 h-4" /> 保存
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Group Modal */}
      {editingGroup && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveGroup} className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl shadow-2xl flex flex-col border border-slate-200 dark:border-slate-700">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h3 className="font-semibold">{editingGroup.id ? '重命名分组' : '新建分组'}</h3>
            </div>
            <div className="p-4">
              <input
                autoFocus
                required
                type="text"
                value={editingGroup.name}
                onChange={e => setEditingGroup({ ...editingGroup, name: e.target.value })}
                placeholder="分组名称"
                className="w-full p-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/80 rounded-b-2xl">
              <button type="button" onClick={() => setEditingGroup(null)} className="px-4 py-2 rounded-lg font-medium text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700">
                取消
              </button>
              <button type="submit" className="px-4 py-2 rounded-lg font-medium text-sm bg-blue-500 hover:bg-blue-600 text-white">
                保存
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
