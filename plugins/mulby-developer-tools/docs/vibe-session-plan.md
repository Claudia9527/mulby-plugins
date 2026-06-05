# Vibe Session 实施方案

## 问题陈述

1. **对话只在交付页可用** — 修 bug 必须在特定页面，关了就丢上下文
2. **无法恢复上次开发** — 关窗口后，所有状态丢失，无法续接
3. **"AI 改造"从头来** — 工作台入口总是重新走向导流程
4. **流程断裂** — 发现运行时问题时，修复路径不顺畅

## 设计目标

- **对话贯穿全程** — 任何阶段都能对话修改
- **会话可持久化/恢复** — 关了窗口也能回来
- **智能入口** — 已有会话的插件不从头开始
- **多会话切换** — 可以同时开发多个插件，快速跳转

---

## Phase 1：会话持久化与对话全局化（最小可行）

### 1.1 数据模型

```typescript
// src/ui/types/session.ts

interface VibeSession {
  id: string                      // uuid
  pluginPath: string              // 插件根目录，也是唯一标识
  pluginName: string              // manifest.name 或目录名
  
  state: VibeSessionState
  contract: VibeContract | null
  
  // 用户对话历史（持久化核心）
  messages: VibeMessage[]
  
  // 生成阶段的元数据
  sentence: string                // 用户原始需求描述
  vibeMode: 'create' | 'edit'
  genDepth: 'full' | 'minimal'
  selectedModel: string
  
  // 时间戳
  createdAt: number
  lastActiveAt: number
  
  // git 版本快照
  lastCommitHash?: string
}

type VibeSessionState = 
  | 'initial'       // 刚创建，还没契约
  | 'contract'      // 有契约，还没生成
  | 'generating'    // 正在生成中
  | 'ready'         // 已生成/已载入，可对话修改
  | 'error'         // 构建失败等

interface VibeMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  // AI 执行摘要（可选，用于 UI 折叠展示）
  actions?: VibeAction[]
}

interface VibeAction {
  type: 'file_changed' | 'build' | 'load' | 'error' | 'fix'
  detail: string
}
```

### 1.2 存储策略

使用 `window.mulby.storage` 持久化（宿主提供的插件级存储，跨窗口）：

```typescript
// key = 'vibe-sessions'
// value = VibeSession[]（按 lastActiveAt 排序）

// key = 'vibe-active-session'  
// value = sessionId | null

const SESSIONS_KEY = 'vibe-sessions'
const ACTIVE_KEY = 'vibe-active-session'
```

容量控制：
- 最多保留 20 个会话
- 每个会话最多 50 条消息
- 超限时按 lastActiveAt 淘汰最旧的
- messages 内容如果单条过长（>10KB），只保留摘要

### 1.3 会话生命周期

```
创建新插件：
  → 创建 session(state='initial')
  → 用户描述 → state='contract'
  → 生成代码 → state='generating' → state='ready'

从工作台"AI 改造"进入：
  → 检查是否有 pluginPath 匹配的 session
  → 有 → 恢复 session（state='ready'）
  → 无 → 创建 session(state='ready', contract=从 manifest 读取)

对话修改：
  → state='ready' + 用户发消息
  → AI 执行修改 → 追加 message → 自动构建
  → state 保持 'ready'

关闭窗口 → 自动保存当前 session
再次打开 → 恢复上次活跃的 session
```

### 1.4 UI 变化

#### A. 顶部会话指示器

在 Vibe 面板顶部显示当前会话信息：

```
┌─────────────────────────────────────────┐
│ 📦 my-clipboard-tool  ●就绪            │  ← 会话指示器
│ ~/plugins/my-clipboard-tool             │
│ [切换会话 ▼]  [新建]                    │
├─────────────────────────────────────────┤
│ ... 主内容区（根据 state 渲染）...        │
├─────────────────────────────────────────┤
│ 💬 对话（始终可见）                       │  ← 全局对话
│ [_____________________________] [发送]   │
└─────────────────────────────────────────┘
```

#### B. 对话从交付页提取到全局

现有 `FollowupCard`（仅在交付页出现）→ 变成全局 `ChatPanel`（始终在底部）

行为自适应：
- `state='initial'` → 对话框作为需求输入（替代当前的 textarea）
- `state='contract'` → 对话修改契约
- `state='ready'` → 对话修改代码（即现在的 followup 功能）

#### C. 会话切换下拉

点击顶部"切换会话"→ 下拉列表展示所有持久化的会话：
- 显示插件名 + 状态 + 最后活跃时间
- 点击切换
- 底部"新建会话"入口

### 1.5 与工作台的集成

`editTarget` prop 已经存在——当工作台点击"AI 改造"时传入：

```typescript
// 现有逻辑
useEffect(() => {
  if (editTarget) { /* 进入编辑模式，从头走契约流程 */ }
}, [editTarget])

// 改为
useEffect(() => {
  if (editTarget) {
    const existing = sessions.find(s => s.pluginPath === editTarget.path)
    if (existing) {
      switchToSession(existing.id)  // 恢复已有会话
    } else {
      createSession({ pluginPath: editTarget.path, state: 'ready', ... })
    }
  }
}, [editTarget])
```

### 1.6 组件拆分

当前 `VibePanel.tsx` 有 2070 行，需要拆分：

```
src/ui/components/
├── VibePanel.tsx              (主容器，管理 session 状态)
├── vibe/
│   ├── SessionProvider.tsx    (Context: 当前 session + 增删改查)
│   ├── SessionSwitcher.tsx    (顶部会话选择器 + 下拉列表)
│   ├── ChatPanel.tsx          (全局对话，自适应行为)
│   ├── ContractStage.tsx      (契约编辑阶段)
│   ├── GenerateStage.tsx      (生成阶段 + timeline)
│   ├── DeliverStage.tsx       (交付/就绪阶段，已存在)
│   ├── useVibeSession.ts     (session CRUD + 持久化 hook)
│   └── useVibeAgent.ts       (AI 调用逻辑抽取)
```

---

## Phase 2：全局对话深度集成

### 2.1 对话上下文管理

AI 调用时的上下文构建：

```typescript
function buildConversationContext(session: VibeSession): AiMessage[] {
  const messages: AiMessage[] = []
  
  // 系统消息：根据 state 选择 prompt
  messages.push({ role: 'system', content: getSystemPrompt(session) })
  
  // 对话历史（最近 N 条，避免 token 爆炸）
  const recentMessages = session.messages.slice(-10)
  for (const msg of recentMessages) {
    messages.push({ role: msg.role, content: msg.content })
  }
  
  return messages
}
```

### 2.2 自适应 System Prompt

```typescript
function getSystemPrompt(session: VibeSession): string {
  switch (session.state) {
    case 'initial':
      return '你是 Mulby 插件顾问，帮助用户定义插件需求...'
    case 'contract':
      return '你是 Mulby 插件架构师，帮助用户完善契约...'  
    case 'ready':
      return followupSystemPrompt(session.contract!, session.pluginPath)
    default:
      return '...'
  }
}
```

### 2.3 对话消息流式渲染

复用现有 `onAgentChunk` 机制，但适配到 ChatPanel：
- 用户发送 → 显示在消息列表
- AI 响应流式显示
- 工具调用显示为折叠的"操作卡片"（类似现在的 timeline events）

---

## Phase 3：多会话管理

### 3.1 会话列表侧边栏

当会话数 > 1 时，左侧显示可折叠的会话列表：
- 当前活跃会话高亮
- 每项显示：插件名 + 状态 emoji + 相对时间
- 右键菜单：删除、在 Finder 中打开、复制路径

### 3.2 会话间切换

切换时：
- 保存当前 session 状态到 storage
- 加载目标 session
- 恢复 UI 状态（contract, createdPath, built 等）

### 3.3 过期清理

- 30 天未活跃的 session 自动标记为"归档"
- 归档会话不占主列表空间，需手动恢复
- 插件目录不存在的 session 自动标记为"已失效"

---

## 实施顺序

### Phase 1 实施步骤（建议分 5 个 PR）

1. **PR1: 数据模型 + 持久化 hook**
   - 新建 `src/ui/types/session.ts`
   - 新建 `src/ui/hooks/useVibeSession.ts`（CRUD + storage 读写）
   - 单元测试验证 session 生命周期

2. **PR2: SessionProvider + 当前面板适配**
   - 新建 `SessionProvider.tsx`（React Context）
   - VibePanel 内部状态 → 从 session 读取/写入
   - 保持现有 UI 不变，只改数据流

3. **PR3: 会话指示器 + 切换**
   - 顶部显示当前会话
   - "切换会话"下拉
   - 工作台"AI 改造"集成（恢复而非重新开始）

4. **PR4: 全局对话**
   - 从 DeliverStage 提取 `ChatPanel` 到顶层
   - 自适应行为（根据 state）
   - 消息持久化

5. **PR5: 清理与优化**
   - 移除冗余的 localStorage 使用
   - 会话淘汰策略
   - 错误恢复（corrupt session 处理）

### 预估工作量

| 步骤 | 复杂度 | 预估时间 |
|------|--------|---------|
| PR1 | 中 | 数据模型 + hook |
| PR2 | 高 | 状态迁移，需仔细不破坏现有 |
| PR3 | 中 | UI 组件 + 入口适配 |
| PR4 | 高 | 对话系统重构 |
| PR5 | 低 | 清理 |

---

## 风险与注意事项

1. **向后兼容**：现有的"新建插件"流程必须继续工作
2. **性能**：session 持久化不能阻塞 UI（异步写入 + debounce）
3. **存储大小**：`window.mulby.storage` 可能有大小限制，需要消息压缩策略
4. **并发**：多窗口同时编辑同一 session 的冲突处理（简单方案：last-write-wins）
5. **2070 行大文件**：重构 VibePanel 时要分步进行，每步保持可工作

---

## 开放问题（需确认）

1. `window.mulby.storage` 是否有大小限制？如果有，是否考虑用文件系统存储？
2. 对话历史要保留多少条？全部 vs 最近 N 条 + 摘要？
3. 会话是否需要"导出/分享"能力？
4. 从工作台进入"已就绪"的插件，是否也需要显示向导的前几步（让用户看到契约）？还是直接进入对话模式？
