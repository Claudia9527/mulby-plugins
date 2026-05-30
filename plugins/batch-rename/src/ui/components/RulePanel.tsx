import React from 'react';
import { ReplaceRule, InsertRule, NumberingRule, SmartRule, RenameTab, AiModel } from '../types';
import { Search, Wand2, Plus, ListOrdered, Edit3, Send, ArrowRightLeft, Languages, Calendar, Binary, Eraser, Type } from 'lucide-react';

interface RulePanelProps {
  activeTab: RenameTab;
  onTabChange: (tab: RenameTab) => void;
  
  replaceRule: ReplaceRule;
  onReplaceChange: (rule: ReplaceRule) => void;
  
  insertRule: InsertRule;
  onInsertChange: (rule: InsertRule) => void;
  
  numberingRule: NumberingRule;
  onNumberingChange: (rule: NumberingRule) => void;

  smartRule: SmartRule;
  onSmartChange: (rule: SmartRule) => void;
  onSmartApply: () => void;
  
  aiModels: AiModel[];
  selectedModel: string;
  onModelChange: (model: string) => void;
}

export function RulePanel(props: RulePanelProps) {
  const tabs: { id: RenameTab; label: string; icon: React.ReactNode }[] = [
    { id: 'replace', label: '查找替换', icon: <Search size={15} /> },
    { id: 'smart', label: '智能 AI 重命名', icon: <Wand2 size={15} /> },
    { id: 'insert', label: '插入内容', icon: <Plus size={15} /> },
    { id: 'numbering', label: '自动编号', icon: <ListOrdered size={15} /> },
    { id: 'manual', label: '手动编辑', icon: <Edit3 size={15} /> },
  ];

  // AI 快捷 Prompt 灵感芯片
  const promptSuggestions = [
    { label: '拼音转英文', icon: <Languages size={13} className="text-indigo-400 shrink-0" />, prompt: '将所有中文文件名翻译为对应的英文' },
    { label: '追加当前日期', icon: <Calendar size={13} className="text-pink-400 shrink-0" />, prompt: '在文件名后面追加今天的日期，格式为 YYYYMMDD' },
    { label: '补全序列号', icon: <Binary size={13} className="text-cyan-400 shrink-0" />, prompt: '所有文件按1到N依次增加序号并补足3位' },
    { label: '移除所有空格', icon: <Eraser size={13} className="text-amber-400 shrink-0" />, prompt: '去除文件名中所有的空格' },
    { label: '英文转大驼峰', icon: <Type size={13} className="text-emerald-400 shrink-0" />, prompt: '将英文文件名转换为大驼峰 CamelCase 格式' }
  ];

  const handlePromptChipClick = (promptText: string) => {
    props.onSmartChange({ ...props.smartRule, prompt: promptText });
  };

  return (
    <div className="glass-panel rounded-2xl overflow-hidden border border-gray-200/50 dark:border-white/10 shadow-lg shrink-0">
      {/* 赛博风格导航按钮组 */}
      <div className="flex overflow-x-auto bg-white/20 dark:bg-slate-900/30 border-b border-gray-200/40 dark:border-white/5 backdrop-blur-md">
        {tabs.map(tab => {
          const isActive = props.activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => props.onTabChange(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 text-xs font-semibold tracking-wider uppercase transition-all duration-200 border-b-2 border-transparent whitespace-nowrap ${
                isActive 
                  ? 'tab-glow-active' 
                  : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-slate-500/5'
              }`}
            >
              <span className={isActive ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-400'}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
      
      {/* 规则配置内容区 */}
      <div className="p-6 bg-transparent">
        {props.activeTab === 'replace' && (
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">查找文本</label>
              <input 
                type="text" 
                value={props.replaceRule.findText}
                onChange={e => props.onReplaceChange({ ...props.replaceRule, findText: e.target.value })}
                className="glass-input w-full px-4 py-2.5 rounded-xl focus:outline-none text-sm"
                placeholder="输入要查找的字符..."
              />
            </div>
            
            <div className="flex justify-center items-center text-gray-400 dark:text-gray-600 mt-6 shrink-0">
              <div className="p-2 rounded-full bg-slate-500/10 border border-slate-500/10">
                <ArrowRightLeft size={16} className="text-indigo-500 dark:text-indigo-400" />
              </div>
            </div>

            <div className="flex-1">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">替换为</label>
              <input 
                type="text" 
                value={props.replaceRule.replaceText}
                onChange={e => props.onReplaceChange({ ...props.replaceRule, replaceText: e.target.value })}
                className="glass-input w-full px-4 py-2.5 rounded-xl focus:outline-none text-sm"
                placeholder="输入替换后的字符..."
              />
            </div>

            <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row gap-4 mt-6 shrink-0">
              <label className="flex items-center gap-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={props.replaceRule.useRegex}
                  onChange={e => props.onReplaceChange({ ...props.replaceRule, useRegex: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 bg-transparent"
                />
                <span>使用正则表达式</span>
              </label>
              <label className="flex items-center gap-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={props.replaceRule.replaceExt}
                  onChange={e => props.onReplaceChange({ ...props.replaceRule, replaceExt: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 bg-transparent"
                />
                <span>包含扩展名</span>
              </label>
            </div>
          </div>
        )}

        {props.activeTab === 'smart' && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                用一句话描述您想怎样重命名文件（将调用 AI 模型进行智能解析）
              </label>
              
              {props.aiModels && props.aiModels.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">AI 模型:</span>
                  <select 
                    value={props.selectedModel}
                    onChange={e => props.onModelChange(e.target.value)}
                    className="glass-input text-xs px-2.5 py-1 rounded-lg focus:outline-none bg-transparent appearance-none pr-8 border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer"
                    style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='rgb(99, 102, 241)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '12px' }}
                  >
                    {props.aiModels.map(m => (
                      <option key={m.id} value={m.id} className="dark:bg-slate-900 text-gray-800 dark:text-gray-200">
                        {m.label || m.id}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="relative">
              <div className="flex gap-3">
                <input 
                  type="text" 
                  value={props.smartRule.prompt}
                  onChange={e => props.onSmartChange({ ...props.smartRule, prompt: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && !props.smartRule.isStreaming && props.onSmartApply()}
                  className="flex-1 glass-input px-4 py-3 rounded-xl focus:outline-none text-sm pr-10"
                  placeholder="例如：按创建时间加序号 / 首字母转换为大写..."
                  disabled={props.smartRule.isStreaming}
                />
                <button 
                  onClick={props.onSmartApply}
                  disabled={!props.smartRule.prompt || props.smartRule.isStreaming}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed flex items-center gap-2 transition-all active:scale-95"
                >
                  {props.smartRule.isStreaming ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <Send size={14} />
                  )}
                  <span>生成 AI 预览</span>
                </button>
              </div>
              {/* AI 生成中的脉冲极光线 */}
              {props.smartRule.isStreaming && (
                <div className="absolute bottom-[-8px] left-0 right-0 px-1">
                  <div className="pulse-wave"></div>
                </div>
              )}
            </div>

            {/* 灵感快捷芯片 */}
            <div className="flex flex-wrap gap-2 mt-2">
              {promptSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handlePromptChipClick(suggestion.prompt)}
                  disabled={props.smartRule.isStreaming}
                  className="prompt-chip text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5"
                >
                  {suggestion.icon}
                  <span>{suggestion.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {props.activeTab === 'insert' && (
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">插入内容</label>
              <input 
                type="text" 
                value={props.insertRule.content}
                onChange={e => props.onInsertChange({ ...props.insertRule, content: e.target.value })}
                className="glass-input w-full px-4 py-2.5 rounded-xl focus:outline-none text-sm"
                placeholder="输入要插入的文本..."
              />
            </div>
            
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">插入位置</label>
              <div className="flex gap-3">
                <select 
                  value={props.insertRule.position}
                  onChange={e => props.onInsertChange({ ...props.insertRule, position: e.target.value as any })}
                  className="glass-input flex-1 px-4 py-2.5 rounded-xl focus:outline-none text-sm bg-transparent appearance-none"
                  style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px' }}
                >
                  <option value="start" className="dark:bg-slate-900">文件名开头</option>
                  <option value="end" className="dark:bg-slate-900">文件名末尾</option>
                  <option value="custom" className="dark:bg-slate-900">指定索引位置</option>
                </select>

                {props.insertRule.position === 'custom' && (
                  <input 
                    type="number" 
                    min="0"
                    value={props.insertRule.customIndex}
                    onChange={e => props.onInsertChange({ ...props.insertRule, customIndex: Number(e.target.value) })}
                    className="glass-input w-24 px-4 py-2.5 rounded-xl focus:outline-none text-sm"
                    placeholder="位置"
                  />
                )}
              </div>
            </div>

            <div className="flex items-center gap-2.5 mt-6 shrink-0">
              <label className="flex items-center gap-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={props.insertRule.insertExt}
                  onChange={e => props.onInsertChange({ ...props.insertRule, insertExt: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 bg-transparent"
                />
                <span>包含扩展名</span>
              </label>
            </div>
          </div>
        )}

        {props.activeTab === 'numbering' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">序号前缀</label>
              <input 
                type="text" 
                value={props.numberingRule.prefix}
                onChange={e => props.onNumberingChange({ ...props.numberingRule, prefix: e.target.value })}
                className="glass-input w-full px-4 py-2.5 rounded-xl focus:outline-none text-sm"
                placeholder="例如：img_"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">开始序号</label>
              <input 
                type="number" 
                value={props.numberingRule.startNumber}
                onChange={e => props.onNumberingChange({ ...props.numberingRule, startNumber: Number(e.target.value) })}
                className="glass-input w-full px-4 py-2.5 rounded-xl focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">固定位数</label>
              <input 
                type="number" 
                min="1" max="10"
                value={props.numberingRule.digits}
                onChange={e => props.onNumberingChange({ ...props.numberingRule, digits: Number(e.target.value) })}
                className="glass-input w-full px-4 py-2.5 rounded-xl focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">序号后缀</label>
              <input 
                type="text" 
                value={props.numberingRule.suffix}
                onChange={e => props.onNumberingChange({ ...props.numberingRule, suffix: e.target.value })}
                className="glass-input w-full px-4 py-2.5 rounded-xl focus:outline-none text-sm"
                placeholder="例如：_raw"
              />
            </div>
          </div>
        )}

        {props.activeTab === 'manual' && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-xs text-indigo-600/90 dark:text-indigo-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></span>
            <span>当前已激活<strong>手动自由编辑模式</strong>。您可以直接在下方列表中双击或点击“新文件名”进行自由更改，也支持批量粘贴文本。</span>
          </div>
        )}
      </div>
    </div>
  );
}
