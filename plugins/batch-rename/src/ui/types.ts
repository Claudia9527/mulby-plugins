export interface FileItem {
  id: string;
  path: string;
  oldName: string;
  newName: string;
  size: number;
  status?: 'pending' | 'success' | 'error';
  errorMessage?: string;
  ext: string; // extension including dot, e.g., ".png"
  dir: string; // parent directory
}

export type RenameTab = 'replace' | 'smart' | 'insert' | 'numbering' | 'manual';

// 各个规则的配置状态
export interface ReplaceRule {
  findText: string;
  replaceText: string;
  useRegex: boolean;
  replaceExt: boolean;
}

export interface SmartRule {
  prompt: string;
  isStreaming: boolean;
}

export interface InsertRule {
  content: string;
  position: 'start' | 'end' | 'custom';
  customIndex: number;
  insertExt: boolean;
}

export interface NumberingRule {
  prefix: string;
  suffix: string;
  startNumber: number;
  digits: number;
}

export interface AiModel {
  id: string;
  label: string;
  description: string;
}
