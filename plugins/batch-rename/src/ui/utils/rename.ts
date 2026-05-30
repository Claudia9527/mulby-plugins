import { FileItem, ReplaceRule, InsertRule, NumberingRule } from '../types';

function splitNameAndExt(filename: string): { name: string, ext: string } {
  const lastDotIdx = filename.lastIndexOf('.');
  if (lastDotIdx === -1 || lastDotIdx === 0) {
    return { name: filename, ext: '' };
  }
  return {
    name: filename.substring(0, lastDotIdx),
    ext: filename.substring(lastDotIdx)
  };
}

export function applyReplaceRule(files: FileItem[], rule: ReplaceRule): FileItem[] {
  return files.map(file => {
    let newName = file.oldName;
    if (!rule.findText) return { ...file, newName: file.oldName };

    try {
      if (rule.useRegex) {
        const regex = new RegExp(rule.findText, 'g');
        if (rule.replaceExt) {
          newName = file.oldName.replace(regex, rule.replaceText);
        } else {
          const { name, ext } = splitNameAndExt(file.oldName);
          newName = name.replace(regex, rule.replaceText) + ext;
        }
      } else {
        if (rule.replaceExt) {
          newName = file.oldName.split(rule.findText).join(rule.replaceText);
        } else {
          const { name, ext } = splitNameAndExt(file.oldName);
          newName = name.split(rule.findText).join(rule.replaceText) + ext;
        }
      }
    } catch (e) {
      // Regex parse error
      newName = file.oldName;
    }
    
    return { ...file, newName };
  });
}

export function applyInsertRule(files: FileItem[], rule: InsertRule): FileItem[] {
  return files.map(file => {
    if (!rule.content) return { ...file, newName: file.oldName };

    let newName = file.oldName;
    const { name, ext } = splitNameAndExt(file.oldName);
    
    const targetText = rule.insertExt ? file.oldName : name;
    let newTargetText = targetText;

    if (rule.position === 'start') {
      newTargetText = rule.content + targetText;
    } else if (rule.position === 'end') {
      newTargetText = targetText + rule.content;
    } else if (rule.position === 'custom') {
      const idx = Math.min(Math.max(0, rule.customIndex), targetText.length);
      newTargetText = targetText.slice(0, idx) + rule.content + targetText.slice(idx);
    }

    if (rule.insertExt) {
      newName = newTargetText;
    } else {
      newName = newTargetText + ext;
    }

    return { ...file, newName };
  });
}

export function applyNumberingRule(files: FileItem[], rule: NumberingRule): FileItem[] {
  return files.map((file, index) => {
    const { name, ext } = splitNameAndExt(file.oldName);
    const num = rule.startNumber + index;
    const numStr = String(num).padStart(rule.digits, '0');
    
    const newName = `${rule.prefix}${numStr}${rule.suffix}${ext}`;
    return { ...file, newName };
  });
}
