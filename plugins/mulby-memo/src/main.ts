/// <reference path="./types/mulby.d.ts" />
declare const mulby: any

export function onLoad() {
  // Initialization if needed
}

export function onUnload() {
}

export function onEnable() {
}

export function onDisable() {
}

export async function run(context: BackendPluginContext) {
  if (context.featureCode === 'save_memo') {
    let newMemo: any = null;
    const now = Date.now();
    const id = now.toString();

    if (context.attachments && context.attachments.length > 0) {
      const attachment = context.attachments[0];
      if (attachment.kind === 'image' && attachment.path) {
        newMemo = {
          id,
          type: 'image',
          content: attachment.path,
          createdAt: now,
          tags: [],
          groupId: 'default'
        };
      }
    } else if (context.input) {
      const type = (context.input.includes('\n') && (context.input.includes('{') || context.input.includes('<'))) ? 'code' : 'text';
      newMemo = {
        id,
        type,
        content: context.input,
        createdAt: now,
        tags: [],
        groupId: 'default'
      };
    }

    if (newMemo) {
      const memos = (await context.api.storage.get('memos') as any[]) || [];
      memos.unshift(newMemo);
      await context.api.storage.set('memos', memos);
      await context.api.notification.show('已保存到备忘快贴');
      try {
        await context.api.messaging.send('mulby-memo', 'memo-saved', { id: newMemo.id });
      } catch (err) {
        // Ignore errors if UI is not active
      }
    }
  }
}

export const rpc = {
  async getMemos() {
    const memos = await mulby.storage.get('memos') || [];
    return memos;
  },

  async saveMemo(memo: any) {
    const memos = await mulby.storage.get('memos') || [];
    const index = memos.findIndex((m: any) => m.id === memo.id);
    if (index >= 0) {
      memos[index] = memo;
    } else {
      memos.unshift(memo);
    }
    await mulby.storage.set('memos', memos);
    return true;
  },

  async deleteMemo(id: string) {
    let memos = await mulby.storage.get('memos') || [];
    memos = memos.filter((m: any) => m.id !== id);
    await mulby.storage.set('memos', memos);
    return true;
  },

  async pasteMemo(memo: any) {
    if (memo.type === 'image') {
      await mulby.input.hideMainWindowPasteImage(memo.content);
    } else {
      await mulby.input.hideMainWindowPasteText(memo.content);
    }
    return true;
  },

  async pasteText(text: string) {
    await mulby.input.hideMainWindowPasteText(text);
    return true;
  },

  async getGroups() {
    const groups = await mulby.storage.get('groups') || [{ id: 'default', name: '未分组' }];
    const defaultGroup = groups.find((g: any) => g.id === 'default');
    if (defaultGroup && defaultGroup.name === '全部备忘') {
      defaultGroup.name = '未分组';
      await mulby.storage.set('groups', groups);
    }
    return groups;
  },

  async saveGroup(group: { id: string, name: string }) {
    const groups = await mulby.storage.get('groups') || [{ id: 'default', name: '未分组' }];
    const index = groups.findIndex((g: any) => g.id === group.id);
    if (index >= 0) {
      groups[index] = group;
    } else {
      groups.push(group);
    }
    await mulby.storage.set('groups', groups);
    return true;
  },

  async deleteGroup(id: string) {
    let groups = await mulby.storage.get('groups') || [{ id: 'default', name: '未分组' }];
    groups = groups.filter((g: any) => g.id !== id);
    await mulby.storage.set('groups', groups);
    
    // Fallback memos in this group to default
    let memos = await mulby.storage.get('memos') || [];
    let changed = false;
    memos = memos.map((m: any) => {
      if (m.groupId === id) {
        changed = true;
        return { ...m, groupId: 'default' };
      }
      return m;
    });
    if (changed) {
      await mulby.storage.set('memos', memos);
    }
    return true;
  }
}

const plugin = { onLoad, onUnload, onEnable, onDisable, run, rpc }
export default plugin

