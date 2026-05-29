# 待办番茄 v2 — UI/UX 设计方案

> 版本：v2.0  
> 作者：UX/UI 视觉与交互设计师  
> 日期：2026-05-28  
> 基于：PRD-v2-优化方案.md + 现有代码分析

---

## 目录

1. [设计原则](#1-设计原则)
2. [设计系统](#2-设计系统)
3. [P0 — 主面板 ListView 改造](#3-p0--主面板-listview-改造)
4. [P0 — 删除撤销 Toast](#4-p0--删除撤销-toast)
5. [P0 — 便签窗 StickyView 增强](#5-p0--便签窗-stickyview-增强)
6. [P1 — 统计可视化 StatsView](#6-p1--统计可视化-statsview)
7. [P1 — 子任务/清单](#7-p1--子任务清单)
8. [P1 — AI 能力增强](#8-p1--ai-能力增强)
9. [P1 — 番茄钟 FocusView 改进](#9-p1--番茄钟-focusview-改进)
10. [动效与过渡规范](#10-动效与过渡规范)
11. [无障碍设计](#11-无障碍设计)
12. [组件清单与文件映射](#12-组件清单与文件映射)

---

## 1. 设计原则

### 1.1 核心理念

| 原则 | 说明 |
|------|------|
| **轻量不轻薄** | 保持 Mulby 插件的紧凑身材，但每个像素都传递价值 |
| **键鼠双修** | 所有功能均可纯键盘完成，同时鼠标用户零学习成本 |
| **信息密度适中** | 新增字段（优先级、截止日期、子任务进度）用图标/色彩/微标签承载，不增加视觉噪声 |
| **可逆安全** | 破坏性操作提供明确的撤销路径，构建使用信任感 |
| **暗色友好** | 所有新增元素在亮/暗两套主题下同等可读 |

### 1.2 设计约束

- 主窗口尺寸：720×640（最小 400×360，最大 1200×900）
- 便签窗尺寸：320×480（调整后，最小 280×300）
- 番茄钟窗口：560×520
- 字体栈：系统字体（-apple-system, BlinkMacSystemFont, Segoe UI, Roboto）
- 图标库：lucide-react（已使用，继续沿用）
- CSS 方案：CSS Variables + Tailwind utilities（保持现有架构）

---

## 2. 设计系统

### 2.1 色彩扩展

在现有变量基础上，新增语义色彩：

```css
/* ===== 优先级色彩 ===== */
:root {
  --priority-high: #ef4444;      /* 红色 — 高优 */
  --priority-high-bg: rgba(239, 68, 68, 0.08);
  --priority-medium: #f59e0b;    /* 琥珀 — 中优 */
  --priority-medium-bg: rgba(245, 158, 11, 0.08);
  --priority-low: #22c55e;       /* 绿色 — 低优 */
  --priority-low-bg: rgba(34, 197, 94, 0.08);

  /* ===== 截止日期状态色 ===== */
  --due-overdue: #ef4444;        /* 过期 — 红 */
  --due-overdue-bg: rgba(239, 68, 68, 0.06);
  --due-today: #f97316;          /* 今天 — 橙 */
  --due-today-bg: rgba(249, 115, 22, 0.06);
  --due-tomorrow: #eab308;       /* 明天 — 黄 */
  --due-soon: var(--text-2);     /* 更远 — 次文本色 */

  /* ===== 统计图表 ===== */
  --chart-bar: var(--accent);
  --chart-bar-hover: var(--accent-hover);
  --chart-focus: #8b5cf6;        /* 紫色 — 专注时长 */
  --chart-grid: var(--border);

  /* ===== Toast ===== */
  --toast-bg: var(--surface);
  --toast-border: var(--border);
  --toast-shadow: 0 4px 24px rgba(0,0,0,0.12);

  /* ===== 子任务 ===== */
  --checklist-check: var(--accent);
  --checklist-line: var(--border);
  --checklist-bg: rgba(0,0,0,0.02);
}

/* 暗色覆盖 */
:root.dark {
  --priority-high: #f87171;
  --priority-high-bg: rgba(248, 113, 113, 0.12);
  --priority-medium: #fbbf24;
  --priority-medium-bg: rgba(251, 191, 36, 0.12);
  --priority-low: #4ade80;
  --priority-low-bg: rgba(74, 222, 128, 0.12);

  --due-overdue: #f87171;
  --due-overdue-bg: rgba(248, 113, 113, 0.1);
  --due-today: #fb923c;
  --due-today-bg: rgba(251, 146, 60, 0.1);
  --due-tomorrow: #facc15;

  --chart-focus: #a78bfa;
  --toast-shadow: 0 4px 24px rgba(0,0,0,0.4);
  --checklist-bg: rgba(255,255,255,0.03);
}
```

### 2.2 间距与圆角

| Token | 值 | 用途 |
|-------|----|------|
| `--sp-1` | 4px | 紧凑间距（图标-文字） |
| `--sp-2` | 8px | 元素内间距 |
| `--sp-3` | 12px | 组件间距 |
| `--sp-4` | 16px | 区块间距 |
| `--sp-5` | 20px | 页面边距 |
| `--radius-s` | 6px | 小元素（badge、dot） |
| `--radius-m` | 8px | 中等元素（卡片、输入框） |
| `--radius-l` | 12px | Toast、弹窗 |
| `--radius-full` | 9999px | 圆形按钮 |

### 2.3 字号层级

| 级别 | 大小 | 行高 | 用途 |
|------|------|------|------|
| Title | 15px | 1.3 | 头部标题 |
| Body | 14px | 1.5 | 待办标题、正文 |
| Caption | 12px | 1.4 | 截止日期、统计、Tab |
| Micro | 11px | 1.3 | 快捷键提示、辅助信息 |
| Tiny | 10px | 1.2 | 角标数字 |

---

## 3. P0 — 主面板 ListView 改造

### 3.1 输入区域增强

#### 布局结构

```
┌─────────────────────────────────────────────────────┐
│  [ 添加待办，Enter 保存                    ] [添加]  │
│  ┌──────┐ ┌──────┐                                  │
│  │ 📅   │ │ ⚡   │    ← 仅在输入框有内容时显示       │
│  │ 日期 │ │ 优先级│                                  │
│  └──────┘ └──────┘                                  │
└─────────────────────────────────────────────────────┘
```

**交互规则：**

1. 输入框 `placeholder="添加待办… 支持 !优先级 @截止日期"`
2. 输入框下方的日期和优先级按钮仅当输入框 `value.length > 0` 时 fade-in 出现
3. 按钮使用 `btn-ghost` 风格，紧凑排列在输入框正下方左侧

**日期选择器（DatePicker Popover）：**

```
┌──────────────────────┐
│  📅 截止日期           │
│  ┌──────┐ ┌──────┐   │
│  │ 今天 │ │ 明天 │   │
│  └──────┘ └──────┘   │
│  ┌──────┐ ┌──────┐   │
│  │ 后天 │ │下周一│   │
│  └──────┘ └──────┘   │
│  ─────────────────── │
│  自定义:  [____/__]  │
│              ▼       │
│  ┌── 2026 年 6 月 ──┐│
│  │ 日 一 二 三 四 五 六│
│  │ .. .. .. .. .. .. ..│
│  └──────────────────┘│
└──────────────────────┘
```

- 快捷按钮组：今天 / 明天 / 后天 / 下周一
- 自定义日期输入 `YYYY-MM-DD` 或点击展开内联日历
- 内联日历是轻量实现，仅当月视图，左右箭头切换月份
- 选择后自动关闭，输入框旁显示选中日期 tag：`📅 6/15`
- 点击 tag 的 × 可清除

**优先级选择器（Priority Popover）：**

```
┌────────────────────┐
│  ⚡ 优先级           │
│                     │
│  🔴  高  — 紧急重要  │
│  🟡  中  — 需要关注  │
│  🟢  低  — 有空再做  │
│  ⚪  无  — 不设优先级 │
└────────────────────┘
```

- 使用 Popover（不是下拉菜单），视觉更友好
- 每项左侧圆点 + 文字 + 辅助描述
- 选择后输入框旁显示对应颜色的圆点 tag
- 键盘：`1/2/3/0` 快速选择（弹窗打开时）

**已选标记显示：**

当用户在输入区设置了日期或优先级后，在输入框和操作按钮之间显示彩色 tag：

```
[ 添加待办...                    ] 🔴 📅6/15 [添加]
```

Tag 样式：
- 圆角 `radius-s`，padding `2px 8px`
- 优先级 tag 背景色使用对应 `--priority-*-bg`
- 日期 tag 背景色根据紧急程度变化（过期红、今日橙、其他淡灰）
- 每个 tag 右侧有 `×` 清除按钮（12×12 的小叉）

### 3.2 待办列表项改造

#### 当前结构 → 新结构对比

**v1 单行结构：**
```
[ ○ ] [📌] 任务标题                                [🗑]
```

**v2 增强结构：**
```
[ ○ ] 🔴 任务标题                    📅 明天  3/5  [🗑]
       └ 过期任务：红色背景条             ↑      ↑
                                     截止日期 子任务进度
```

#### 详细布局规范

```
┌─ todo-item ──────────────────────────────────────────┐
│                                                       │
│  ┌─────┐  ●  任务标题文字                             │
│  │check│     └─ 📌(如有置顶)                          │
│  │ btn │                                              │
│  └─────┘           ┌───────┐  ┌──────┐  ┌────┐ ┌──┐ │
│                    │ 📅明天  │  │ 🍅×3 │  │ 2/5│ │🗑│ │
│                    └───────┘  └──────┘  └────┘ └──┘ │
│                     截止日期   专注番茄    子任务  删除 │
└──────────────────────────────────────────────────────┘
```

#### 各元素规范

**优先级圆点（Priority Dot）：**

| 状态 | 样式 |
|------|------|
| 高优 | 8×8 实心圆，`--priority-high`，标题前 |
| 中优 | 8×8 实心圆，`--priority-medium`，标题前 |
| 低优 | 8×8 实心圆，`--priority-low`，标题前 |
| 无优先级 | 不显示圆点 |

CSS Class: `.priority-dot`
```css
.priority-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.priority-dot--high { background: var(--priority-high); }
.priority-dot--medium { background: var(--priority-medium); }
.priority-dot--low { background: var(--priority-low); }
```

**截止日期标签（Due Badge）：**

| 状态 | 文案 | 颜色 | 背景 |
|------|------|------|------|
| 已过期 | `过期 N天` | `--due-overdue` | `--due-overdue-bg` |
| 今天到期 | `今天` | `--due-today` | `--due-today-bg` |
| 明天到期 | `明天` | `--due-tomorrow` | 透明 |
| 7 天内 | `周X` | `--due-soon` | 透明 |
| 更远 | `M/D` | `--text-3` | 透明 |

CSS Class: `.due-badge`
```css
.due-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}
.due-badge--overdue {
  color: var(--due-overdue);
  background: var(--due-overdue-bg);
  font-weight: 600;
}
.due-badge--today {
  color: var(--due-today);
  background: var(--due-today-bg);
}
.due-badge--tomorrow { color: var(--due-tomorrow); }
.due-badge--normal { color: var(--text-3); }
```

**专注番茄徽章（Pomodoro Badge）：**

仅在 `focusMinutes > 0` 时显示：

```
🍅 ×3
```

- 番茄图标使用 emoji 🍅（体积小、语义明确）
- 数字 = `Math.floor(focusMinutes / settings.pomodoroMinutes)` 或直接使用分钟数 `42min`
- 颜色：`--text-3`，hover 时显示 tooltip："已专注 42 分钟"
- 字号：`11px`

**子任务进度（Checklist Progress）：**

```
3/5
```

- 仅在 `checklist && checklist.length > 0` 时显示
- 格式：`已完成/总数`
- 全完成时颜色变为 `--accent`
- 字号：`11px`，颜色 `--text-3`

**过期行高亮：**

当 `dueDate < today && !done` 时，整个 `todo-item` 追加 `.overdue` 类：

```css
.todo-item.overdue {
  border-left: 3px solid var(--due-overdue);
  background: var(--due-overdue-bg);
}
```

### 3.3 Tab 栏扩展

从 3 个 Tab 扩展为 4 个：

```
┌──────┬──────┬──────┬──────┐
│ 全部 │进行中│已完成│ 统计 │
│  1   │  2   │  3   │  4   │
└──────┴──────┴──────┴──────┘
```

- "统计"Tab 图标用 `BarChart3`（lucide）
- 切换到"统计"时隐藏待办列表区域，显示 StatsView 组件
- 快捷键 `4` 切换

### 3.4 快速捕获语法提示

在输入框获得焦点时，下方显示一行淡色提示：

```
提示：!高优 !!中优 !!!低优 @明天 @下周一 @6.15
```

- 首次出现时使用 slide-down 动画
- 3 秒后自动淡出（或失焦时淡出）
- 用户可在设置中关闭此提示

---

## 4. P0 — 删除撤销 Toast

### 4.1 视觉设计

```
┌─────────────────────────────────────────────────┐
│                                                  │
│   🗑  已删除「提交周报」          [撤销]  ━━━━  │
│                                          ↑       │
│                                      倒计时进度条 │
└─────────────────────────────────────────────────┘
```

**位置与尺寸：**
- 位于窗口底部，水平居中
- 距底部 16px
- 最大宽度 420px，内边距 12px 16px
- 圆角 `--radius-l`（12px）

**外观：**
- 背景：`--surface`
- 边框：`1px solid var(--border)`
- 阴影：`--toast-shadow`
- 进度条：底部 3px 高度的 `--accent` 色条，从右向左缩减（5s 动画）

**文字：**
- 垃圾桶图标 `Trash2`（16px），颜色 `--text-2`
- 文案 `已删除「{标题}」`，标题最长截断 20 字符 + `…`
- `[撤销]` 按钮，颜色 `--accent`，字号 13px，加粗，hover 有下划线

### 4.2 动效

| 阶段 | 动画 | 时长 | 缓动 |
|------|------|------|------|
| 进入 | slide-up + fade-in（从底部 20px 滑入） | 200ms | ease-out |
| 进度条 | 宽度从 100% → 0% | 5000ms | linear |
| 退出 | slide-down + fade-out | 200ms | ease-in |
| 撤销成功 | Toast 变绿闪烁 → 退出 | 300ms | ease-out |

```css
@keyframes toast-enter {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes toast-exit {
  from { transform: translateY(0); opacity: 1; }
  to { transform: translateY(20px); opacity: 0; }
}

@keyframes toast-progress {
  from { width: 100%; }
  to { width: 0%; }
}
```

### 4.3 交互细节

| 触发 | 行为 |
|------|------|
| 按 `d`（未确认态） | 该项标记待删除状态，`todo-item` 添加 `.pending-delete` 样式（轻微红色闪烁） |
| 再按 `d` 或 `Shift+D` | 该项立即从列表移除，Toast 弹出 |
| Toast 可见时点击 `[撤销]` 或按 `Ctrl/Cmd+Z` | 清除 timeout，item 恢复到原位置，Toast 关闭 |
| 5s 倒计时结束 | Toast 退场动画，真正从 storage 删除 |
| Toast 可见时又删除另一项 | 前一项立即执行真删除，新 Toast 替换旧的 |

**待删除状态样式（`.pending-delete`）：**
```css
.todo-item.pending-delete {
  animation: shake 0.3s ease;
  background: var(--due-overdue-bg);
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-4px); }
  40%, 80% { transform: translateX(4px); }
}
```

### 4.4 Toast 组件结构（React）

```tsx
interface UndoToastProps {
  item: TodoItem
  onUndo: () => void
  onExpire: () => void
  duration?: number // 默认 5000ms
}
```

---

## 5. P0 — 便签窗 StickyView 增强

### 5.1 整体布局改造

**v1 布局：**
```
┌─ 320×420 ─────────────┐
│ [待办便签]      8 项   │
│ ─────────────────────  │
│ ○ 任务1                │
│ ○ 任务2                │
│ ○ 任务3                │
│ ...（最多 8 条）       │
│ 还有 3 项…             │
│ ───────────────────    │
│ 单击勾选完成           │
└────────────────────────┘
```

**v2 布局：**
```
┌─ 320×480 ─────────────┐
│ [待办便签]     12 项   │
│ ─────────────────────  │
│ [快速添加…       ]     │  ← 新增输入框
│ ─────────────────────  │
│ ☰ 🔴 任务1    📅明天  │  ← 拖拽手柄 + 优先级 + 日期
│ ☰ 🟡 任务2    📅6/15  │
│ ☰    任务3             │
│ ☰    任务4             │
│ ☰    任务5             │
│ ☰    任务6             │
│ ...（滚动展示全部）    │
│                        │
│ ───────────────────    │
│ 拖拽排序 · 单击完成    │  ← 更新提示
└────────────────────────┘
```

### 5.2 快速添加输入框

**设计规格：**
- 位置：标题栏下方，固定不滚动
- 高度：36px（紧凑）
- 样式：延续便签纸风格，浅色 border-bottom（虚线），无左右边框
- `placeholder="快速添加…"`
- Enter 提交，Esc 清空
- 输入时没有额外的按钮（保持简洁），按 Enter 即添加

```css
.sticky-input {
  width: 100%;
  padding: 8px 16px;
  border: none;
  border-bottom: 1px dashed var(--sticky-border);
  background: transparent;
  color: inherit;
  font-size: 14px;
  outline: none;
}
.sticky-input::placeholder {
  color: inherit;
  opacity: 0.4;
}
.sticky-input:focus {
  background: rgba(0,0,0,0.03);
}
:root.dark .sticky-input:focus {
  background: rgba(255,255,255,0.05);
}
```

### 5.3 拖拽排序

**拖拽手柄：**
- 每行最左侧显示拖拽手柄图标 `GripVertical`（lucide），12px，颜色 `opacity: 0.3`
- hover 时手柄 `opacity: 0.7`，cursor 变为 `grab`
- 拖拽中 cursor 变为 `grabbing`

**拖拽中视觉反馈：**
- 被拖拽项：添加 `box-shadow: 0 4px 12px rgba(0,0,0,0.15)`，略微放大 `scale(1.02)`
- 放置目标位置：显示 2px 高度的 `--accent` 色指示线
- 释放后：item 平滑滑入新位置（200ms transition）

**技术建议：**
- 使用 HTML5 Drag and Drop API 或 `@dnd-kit/core` 库
- 排序结果写入 `TodoItem.sortOrder` 字段
- 便签窗排序独立于主面板排序

### 5.4 优先级与截止日期展示

每条便签项右侧紧凑显示：

```
🔴 任务标题                  📅 明天
```

- 优先级圆点：6×6（比主面板略小），位于标题前
- 截止日期：右对齐，字号 11px
- 过期日期文字标红
- 今日截止文字标橙

### 5.5 窗口尺寸调整

```json
{
  "width": 320,
  "height": 480,
  "minWidth": 280,
  "minHeight": 300
}
```

---

## 6. P1 — 统计可视化 StatsView

### 6.1 入口

主面板 Tab 栏第 4 个 "统计" Tab，快捷键 `4`。

### 6.2 整体布局

```
┌──────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────┐    │
│  │          汇总卡片区（3 张卡片）            │    │
│  └──────────────────────────────────────────┘    │
│                                                   │
│  ┌──────────────┐                                │
│  │ 7天 │ 30天   │  ← 时间范围切换               │
│  └──────────────┘                                │
│                                                   │
│  ┌──────────────────────────────────────────┐    │
│  │                                           │    │
│  │           柱状图（番茄数+专注分钟）        │    │
│  │                                           │    │
│  │  ██                                       │    │
│  │  ██    ██                    ██            │    │
│  │  ██    ██          ██  ██    ██            │    │
│  │  ██    ██    ██    ██  ██    ██    ██      │    │
│  │ ─────────────────────────────────────     │    │
│  │  周一  周二  周三  周四 周五  周六  今天    │    │
│  │                                           │    │
│  │  ■ 番茄数  ■ 专注时长(h)                   │    │
│  └──────────────────────────────────────────┘    │
│                                                   │
│  ┌──────────────────────────────────────────┐    │
│  │  📊 详细数据                               │    │
│  │  完成待办 12 项 · 平均 3.2 🍅/天           │    │
│  └──────────────────────────────────────────┘    │
└──────────────────────────────────────────────────┘
```

### 6.3 汇总卡片

三张等宽卡片，水平排列：

```
┌──────────┐  ┌──────────┐  ┌──────────┐
│  🍅 23   │  │  ⏱ 9.6h  │  │  ✅ 15   │
│ 本周番茄  │  │ 本周专注  │  │ 完成待办  │
│ ↑12% vs │  │ ↑8% vs   │  │ ↑3 vs    │
│ 上周      │  │ 上周      │  │ 上周      │
└──────────┘  └──────────┘  └──────────┘
```

**卡片样式：**
- 背景：`--surface`
- 边框：`1px solid var(--border)`
- 圆角：`--radius-m`
- 内边距：12px
- 数字字号：24px，`font-weight: 700`，`font-variant-numeric: tabular-nums`
- 标签字号：12px，颜色 `--text-2`
- 趋势箭头：上升绿色 `↑`，下降红色 `↓`，持平灰色 `→`

### 6.4 柱状图

**设计规格：**
- 使用纯 CSS/SVG 实现（不引入 chart.js 等重库），或使用轻量库如 `recharts`（如果项目已有 React 生态）
- 双系列：番茄数（`--chart-bar`）+ 专注时长（`--chart-focus`），并排双柱
- X 轴：日期标签（7天视图显示星期，30天视图显示日期）
- Y 轴：隐藏数字轴线，仅用网格线暗示量级
- 柱子圆角顶部 4px
- hover 柱子时显示 tooltip：`5月27日 周二 — 4个番茄 · 1.7小时`
- 空白日显示灰色虚线占位柱

**图表尺寸：**
- 高度：180px（7天）/ 160px（30天，柱子更细）
- 宽度：100%，柱宽自适应

**图例：**
- 位于图表下方
- 使用小色块 + 文字：`■ 番茄数  ■ 专注时长(h)`
- 字号 11px，颜色 `--text-3`

### 6.5 时间范围切换

两个 segment 按钮：`7天` / `30天`

```css
.stats-range {
  display: inline-flex;
  border: 1px solid var(--border);
  border-radius: var(--radius-m);
  overflow: hidden;
}
.stats-range__btn {
  padding: 4px 14px;
  font-size: 12px;
  background: transparent;
  color: var(--text-2);
  border: none;
  cursor: pointer;
}
.stats-range__btn.active {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}
```

### 6.6 详细数据行

底部一行总结：
- 完成待办 N 项
- 平均 N.N 🍅/天
- 最长连续专注 N 天

字号 12px，颜色 `--text-2`，用 `·` 分隔

---

## 7. P1 — 子任务/清单

### 7.1 展开/折叠交互

**默认折叠状态（有子任务时）：**

```
[ ○ ] 🔴 准备项目提案          📅 下周一  3/5  [🗑]
```

`3/5` 即为子任务进度摘要。

**展开状态（按 Tab 或点击展开箭头）：**

```
[ ○ ] 🔴 准备项目提案          📅 下周一  3/5  [🗑]
  │
  ├─ [✓] 收集竞品信息
  ├─ [✓] 整理用户反馈
  ├─ [✓] 撰写大纲
  ├─ [ ] 制作PPT
  ├─ [ ] 团队评审
  │
  └─ [添加子任务…         ]
```

### 7.2 子任务列表样式

```css
.checklist {
  margin-left: 36px;  /* 对齐父任务标题 */
  padding: 4px 0 8px;
  border-left: 2px solid var(--checklist-line);
}

.checklist-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0 4px 12px;
  font-size: 13px;
  position: relative;
}

.checklist-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  width: 12px;
  height: 2px;
  background: var(--checklist-line);
}

.checklist-item.done .checklist-text {
  text-decoration: line-through;
  color: var(--text-3);
}

.checklist-add {
  margin-left: 12px;
  padding: 4px 0;
}

.checklist-add input {
  border: none;
  border-bottom: 1px dashed var(--border);
  background: transparent;
  padding: 4px 0;
  font-size: 13px;
  color: var(--text-1);
  width: 100%;
  outline: none;
}

.checklist-add input::placeholder {
  color: var(--text-3);
}
```

### 7.3 子任务 Checkbox 样式

使用自定义 checkbox（非原生）：

```
未完成：[ ] — 16×16 圆角方框，border: var(--border)
已完成：[✓] — 背景 var(--accent)，白色对勾，border: transparent
```

```css
.checklist-check {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1.5px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
  transition: all 120ms;
}

.checklist-check.checked {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.checklist-check:hover {
  border-color: var(--accent);
}
```

### 7.4 进度条（可选增强）

父任务标题下方可选显示一条极细进度条：

```css
.checklist-progress {
  height: 2px;
  background: var(--border);
  border-radius: 1px;
  margin: 4px 0 0 36px;
  overflow: hidden;
}

.checklist-progress__fill {
  height: 100%;
  background: var(--accent);
  border-radius: 1px;
  transition: width 300ms ease;
}
```

### 7.5 键盘交互

| 快捷键 | 场景 | 行为 |
|--------|------|------|
| `Tab` | 选中有子任务的项 | 展开/折叠子任务列表 |
| `n` | 子任务列表展开时 | 聚焦子任务添加输入框 |
| `j/k` | 子任务列表展开时 | 在子任务间上下移动 |
| `Space/Enter` | 聚焦某子任务 | 切换子任务完成状态 |
| `d` | 聚焦某子任务 | 删除子任务（无需确认） |
| `Esc` | 子任务模式下 | 退出子任务模式，回到父列表 |

### 7.6 AI 拆解导入子任务

AI 拆解完成后，预览区新增选项：

```
┌─ 预览 (5) ─────────────────────────────────┐
│ · 收集竞品信息                              │
│ · 整理用户反馈                              │
│ · 撰写大纲                                  │
│ · 制作PPT                                   │
│ · 团队评审                                  │
│                                              │
│ [一键导入为独立待办]  [导入为子任务 ▼]       │
└──────────────────────────────────────────────┘
```

点击"导入为子任务 ▼"弹出待办选择菜单：
- 列出所有未完成待办
- 选择后，拆解结果写入该待办的 `checklist`

---

## 8. P1 — AI 能力增强

### 8.1 AI 面板改造

**v1 布局（当前）：**
```
── AI 助手 ──────────────
[模型选择 ▼]
[文本输入框]
[智能拆解] [今日总结]
```

**v2 布局：**
```
── AI 助手 ──────────────────────────
[模型选择 ▼]                 [刷新]
┌──────────────────────────────────┐
│ [文本输入框]                      │
└──────────────────────────────────┘
[智能拆解] [今日总结] [今日规划] [复盘]
```

新增两个按钮：
- **今日规划** 📋：根据待办数据生成今日建议
- **每日复盘** 📊：对比昨日完成情况 + 效率简评

### 8.2 智能优先级建议（Inline Suggestion）

用户输入新待办并按 Enter 后，如果 AI 检测到优先级/日期线索，在待办项下方弹出一个轻量 inline 提示：

```
┌─────────────────────────────────────────────────┐
│ [ ✓ ] 紧急修复线上Bug                            │
│       ┌──────────────────────────────┐          │
│       │ 💡 建议：高优先级 🔴          │          │
│       │    [采纳]  [忽略]            │          │
│       └──────────────────────────────┘          │
└─────────────────────────────────────────────────┘
```

**触发条件（前端关键词匹配，无需调 AI）：**
- 含"紧急"、"尽快"、"今天必须"、"ASAP" → 建议高优
- 含"下周"、"有空"、"以后" → 建议低优
- 含明确日期（"明天"、"周五"、"6/15"）→ 建议对应截止日期

**样式：**
- 背景：`--accent-soft`
- 圆角：`--radius-s`
- 灯泡图标 `Lightbulb`
- 2 秒后自动淡出（如不操作）
- 点击"采纳"后，自动更新待办的 `priority`/`dueDate`
- 点击"忽略"或超时后消失

### 8.3 今日规划面板

点击"今日规划"后，替换 AI 面板的内容区域：

```
┌── 今日规划 ──────────────────────────────────┐
│                                               │
│  🎯 建议今日完成以下任务：                     │
│                                               │
│  1. 🔴 紧急修复线上Bug       📅 今天          │
│     → 预计 2 个番茄                           │
│                                               │
│  2. 🟡 完善用户文档          📅 明天          │
│     → 预计 3 个番茄                           │
│                                               │
│  3.    回复客户邮件                            │
│     → 预计 1 个番茄                           │
│                                               │
│  ─────────────────────────────────────        │
│  预计总耗时：6 个番茄（约 2.5 小时）           │
│                                               │
│  [全部设为今日焦点]  [关闭]                    │
└───────────────────────────────────────────────┘
```

### 8.4 每日复盘面板

```
┌── 昨日复盘 ──────────────────────────────────┐
│                                               │
│  📊 2026-05-27 复盘                           │
│                                               │
│  ✅ 完成 5 项  ❌ 未完成 3 项                  │
│  🍅 6 个番茄 · ⏱ 2.5 小时                    │
│                                               │
│  未完成项：                                    │
│  · 完善用户文档 (📅 今天截止)                  │
│  · 整理测试报告                                │
│  · 准备周报                                    │
│                                               │
│  💬 AI 简评：                                  │
│  "昨日完成率 62%，主要卡在文档工作上。          │
│   建议今天优先处理截止的文档任务。"             │
│                                               │
│  [关闭]                                        │
└───────────────────────────────────────────────┘
```

---

## 9. P1 — 番茄钟 FocusView 改进

### 9.1 完成动画

番茄钟倒计时归零时的视觉反馈：

**动画序列（总时长 ~1.5s）：**

1. **圆环变色**（0-300ms）：`stroke` 从 `--accent` 渐变为 `#22c55e`（绿色）
2. **圆环填满**（300-600ms）：`progress` 从当前值平滑到 1，圆环完整
3. **打勾动画**（600-1200ms）：中央区域显示一个 SVG 对勾，从无到有的 stroke-dasharray 绘制动画
4. **脉冲缩放**（800-1500ms）：整个计时器区域 `scale(1) → scale(1.08) → scale(1)`

```css
@keyframes ring-complete {
  0% { stroke: var(--accent); }
  100% { stroke: #22c55e; }
}

@keyframes checkmark-draw {
  0% { stroke-dashoffset: 50; }
  100% { stroke-dashoffset: 0; }
}

@keyframes pulse-scale {
  0% { transform: scale(1); }
  50% { transform: scale(1.08); }
  100% { transform: scale(1); }
}
```

### 9.2 番茄计数展示

当前任务名称下方新增累计信息：

```
┌───────────────────────────────────────┐
│                                        │
│          当前任务                       │
│     [准备项目提案          ▼]          │
│       准备项目提案                      │
│     已专注 3 个番茄 · 1.25小时         │  ← 新增
│                                        │
│         ┌───────────────┐              │
│         │               │              │
│         │    25:00      │              │
│         │               │              │
│         └───────────────┘              │
│                                        │
└───────────────────────────────────────┘
```

**样式：**
- 字号 12px，颜色 `--text-3`
- 居中显示，位于任务名和计时器之间
- 使用 `🍅` emoji 增加亲和力

### 9.3 休息阶段增强

休息阶段（短休息/长休息）时，圆环颜色变为柔和蓝绿色 `#06b6d4`（cyan），与专注阶段的红/橙色形成对比，暗示"放松"。

```css
.focus-ring__fg--break {
  stroke: #06b6d4;
}
```

背景也可微调为更柔和的色调。

---

## 10. 动效与过渡规范

### 10.1 全局过渡策略

| 类别 | 时长 | 缓动 |
|------|------|------|
| 颜色/透明度变化 | 120ms | ease |
| 布局尺寸变化 | 200ms | ease-out |
| 列表项进入/退出 | 250ms | ease-out / ease-in |
| 弹窗/Popover | 180ms | ease-out |
| 图表绘制 | 400ms | ease-in-out |

### 10.2 列表项动画

- **新增项**：从上方 slide-down + fade-in（250ms）
- **删除项**：高度收缩 + fade-out（200ms），然后空间合拢
- **拖拽项**：浮起 shadow + 半透明，其他项 smooth 让位
- **展开子任务**：高度从 0 展开（200ms），内容 fade-in

### 10.3 减少动画偏好

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 11. 无障碍设计

### 11.1 ARIA 标注

| 组件 | ARIA 属性 |
|------|-----------|
| 待办列表 | `role="listbox"` + `aria-label="待办列表"` |
| 待办项 | `role="option"` + `aria-selected` |
| 优先级圆点 | `aria-label="高/中/低优先级"` |
| 截止日期 | `aria-label="截止日期: 6月15日"` |
| 子任务展开 | `aria-expanded="true/false"` |
| 子任务 checkbox | `role="checkbox"` + `aria-checked` |
| Toast | `role="alert"` + `aria-live="polite"` |
| Tab 栏 | `role="tablist"` / `role="tab"` / `aria-selected` |
| 统计图表 | `role="img"` + `aria-label="最近7天番茄统计"` |
| 日期选择器 | `role="dialog"` + `aria-label="选择截止日期"` |

### 11.2 焦点管理

- Toast 出现时不夺取焦点，但 `Ctrl+Z` 全局可用
- Popover 打开时焦点陷阱在 Popover 内
- 子任务展开时焦点可在父子项间流转
- Esc 关闭任何浮层后焦点回到触发元素

### 11.3 色彩对比度

所有文本颜色与背景至少满足 WCAG AA 标准（4.5:1）。优先级圆点辅以 `aria-label`，不仅依赖颜色区分。

---

## 12. 组件清单与文件映射

### 12.1 新增组件

| 组件 | 文件 | 职责 |
|------|------|------|
| `UndoToast` | `src/ui/components/UndoToast.tsx` | 删除撤销 Toast |
| `PriorityPicker` | `src/ui/components/PriorityPicker.tsx` | 优先级选择 Popover |
| `DatePicker` | `src/ui/components/DatePicker.tsx` | 日期选择 Popover + 日历 |
| `DueBadge` | `src/ui/components/DueBadge.tsx` | 截止日期状态标签 |
| `PriorityDot` | `src/ui/components/PriorityDot.tsx` | 优先级圆点 |
| `ChecklistPanel` | `src/ui/components/ChecklistPanel.tsx` | 子任务列表（展开区域） |
| `ChecklistItem` | `src/ui/components/ChecklistItem.tsx` | 单个子任务项 |
| `StatsView` | `src/ui/views/StatsView.tsx` | 统计可视化面板 |
| `BarChart` | `src/ui/components/BarChart.tsx` | 轻量柱状图 |
| `StatCard` | `src/ui/components/StatCard.tsx` | 汇总数据卡片 |
| `AiPlanPanel` | `src/ui/components/AiPlanPanel.tsx` | AI 今日规划 |
| `AiReviewPanel` | `src/ui/components/AiReviewPanel.tsx` | AI 每日复盘 |
| `InlineSuggestion` | `src/ui/components/InlineSuggestion.tsx` | 内联 AI 建议提示 |
| `CompletionAnim` | `src/ui/components/CompletionAnim.tsx` | 番茄钟完成动画 |

### 12.2 修改文件

| 文件 | 变更 |
|------|------|
| `src/ui/views/ListView.tsx` | 新增优先级/日期输入、Tab 扩展、子任务展开、Toast 集成 |
| `src/ui/views/StickyView.tsx` | 新增输入框、移除 MAX_VISIBLE、拖拽排序、优先级日期展示 |
| `src/ui/views/FocusView.tsx` | 完成动画、番茄计数、休息阶段配色 |
| `src/ui/components/AiAssistPanel.tsx` | 新增规划/复盘按钮、子任务导入选项 |
| `src/ui/styles.css` | 新增所有上述 CSS 变量和样式 |
| `src/types/todo.ts` | 新增 `dueDate`, `priority`, `checklist`, `sortOrder`, `DailyRecord` 等类型 |
| `src/store/todoStore.ts` | 排序逻辑、撤销缓冲、历史记录 |
| `src/store/parseQuickCapture.ts` | `!` 优先级和 `@` 日期语法解析 |
| `src/ui/hooks/useTodos.ts` | 适配新字段和新 RPC |
| `src/ui/App.tsx` | 无变更（路由逻辑不变） |
| `manifest.json` | 版本号 → 2.0.0 |

### 12.3 组件依赖关系

```
App
├── ListView
│   ├── PriorityPicker (new)
│   ├── DatePicker (new)
│   ├── DueBadge (new)
│   ├── PriorityDot (new)
│   ├── ChecklistPanel (new)
│   │   └── ChecklistItem (new)
│   ├── UndoToast (new)
│   ├── InlineSuggestion (new)
│   ├── StatsView (new, Tab 4)
│   │   ├── StatCard (new)
│   │   └── BarChart (new)
│   └── AiAssistPanel (modified)
│       ├── AiPlanPanel (new)
│       └── AiReviewPanel (new)
├── StickyView (modified)
│   ├── PriorityDot (reuse)
│   └── DueBadge (reuse)
└── FocusView (modified)
    └── CompletionAnim (new)
```

---

## 附录 A：交互状态矩阵

### 待办项状态组合

| 优先级 | 有截止日期 | 已过期 | 有子任务 | 已完成 | 视觉表现 |
|--------|-----------|--------|---------|--------|---------|
| 高 | 是 | 是 | 是 | 否 | 🔴圆点 + 红色左边框 + 红色日期 + 进度badge |
| 高 | 是 | 否 | 否 | 否 | 🔴圆点 + 正常日期 |
| 中 | 否 | - | 是 | 否 | 🟡圆点 + 进度badge |
| 低 | 是 | 否 | 否 | 否 | 🟢圆点 + 正常日期 |
| 无 | 否 | - | 否 | 否 | 无圆点，纯标题（同 v1） |
| 任意 | 任意 | - | 任意 | 是 | 标题删除线 + 灰色 + 圆点淡化50% |

### Tab 内容映射

| Tab | 内容区 | AI 面板 |
|-----|--------|---------|
| 全部 | 所有待办 | 可见 |
| 进行中 | 未完成待办 | 可见 |
| 已完成 | 已完成待办 | 可见 |
| 统计 | StatsView 组件 | 隐藏 |

---

## 附录 B：快捷键完整表

| 快捷键 | 作用域 | 行为 |
|--------|--------|------|
| `n` / `Ctrl+N` | 主面板 | 聚焦新建输入框 |
| `j` / `↓` | 待办列表 | 下移选中项 |
| `k` / `↑` | 待办列表 | 上移选中项 |
| `Space` / `Enter` | 选中待办 | 切换完成状态 |
| `e` | 选中待办 | 进入编辑模式 |
| `d` | 选中待办 | 标记待删除 / 确认删除 |
| `Shift+D` | 选中待办 | 直接删除（进入 Toast 撤销流程） |
| `Ctrl/Cmd+Z` | Toast 可见 | 撤销删除 |
| `p` | 选中待办 | 切换置顶/焦点 |
| `Tab` | 选中待办 | 展开/折叠子任务 |
| `/` | 主面板 | 打开搜索过滤 |
| `1` | 主面板 | 切换到"全部"Tab |
| `2` | 主面板 | 切换到"进行中"Tab |
| `3` | 主面板 | 切换到"已完成"Tab |
| `4` | 主面板 | 切换到"统计"Tab |
| `f` | 主面板 | 打开专注/番茄钟窗口 |
| `s` | 主面板 | 打开便签窗 |
| `?` | 主面板 | 显示/隐藏快捷键帮助 |
| `n` | 子任务展开中 | 添加新子任务 |
| `j/k` | 子任务展开中 | 子任务间移动 |
| `Space/Enter` | 选中子任务 | 切换子任务完成 |
| `d` | 选中子任务 | 删除子任务 |
| `Esc` | 子任务/搜索/编辑 | 退出当前模式 |
| `Space` | 番茄钟 | 开始/暂停 |
| `R` | 番茄钟 | 重置 |
| `S` | 番茄钟 | 跳过休息 |
| `Esc` | 番茄钟 | 关闭窗口 |

---

## 附录 C：实施优先级建议

### Phase 1（P0 核心体验 — 2周）

1. **数据模型变更**：`TodoItem` 新增 `dueDate`, `priority`, `sortOrder`
2. **输入增强**：PriorityPicker + DatePicker + 快速捕获语法解析
3. **列表项改造**：PriorityDot + DueBadge + 新排序逻辑
4. **删除撤销**：UndoToast 组件 + 键盘绑定
5. **便签窗升级**：输入框 + 移除限制 + 拖拽排序 + 优先级/日期展示

### Phase 2（P1 高价值特性 — 2周）

6. **统计可视化**：StatsView + BarChart + StatCard + 数据记录
7. **子任务/清单**：ChecklistPanel + ChecklistItem + AI 拆解联动
8. **AI 增强**：AiPlanPanel + AiReviewPanel + InlineSuggestion
9. **番茄钟改进**：CompletionAnim + 番茄计数 + 休息配色
