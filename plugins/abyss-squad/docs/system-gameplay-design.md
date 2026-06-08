# 深渊小队 — 系统级玩法扩展设计方案

> 本文档描述可在后续版本实现的系统级玩法扩展，包含事件房间、精英敌人、主动道具、队伍协同和成就系统。

---

## 1. 事件房间（Event Rooms）

### 设计目标
打破"战斗 → 传送门 → 下一层"的单线节奏，在每 2~3 层之间插入一个事件房间，提供战略选择。

### 实现方案

#### 数据结构
在 `types.ts` 中扩展 `RoomType`（已有 `'event'` 类型）并新增事件定义：

```typescript
export type EventType = 'merchant' | 'altar' | 'treasure_trap' | 'mystery_box'

export interface GameEvent {
  id: string
  type: EventType
  title: string
  desc: string
  choices: EventChoice[]
}

export interface EventChoice {
  label: string
  effect: (engine: GameEngine) => void
}
```

#### 事件类型

**神秘商人（Merchant）**
- 出现概率：每 3 层必出现 1 次
- 选项：
  - 花 20 水晶购买指定道具（从3个随机道具中选1）
  - 花 15 水晶回复全队 50% HP
  - 花 30 水晶刷新当前英雄的能力池（重新随机可获取能力）

**献祭祭坛（Altar）**
- 出现概率：随机
- 选项：
  - 献祭 20% 当前 HP → 随机获得一个能力（可超出6槽，但随机替换一个已有能力）
  - 献祭一个已有道具 → 获得更高品质的随机道具
  - 离开（无消耗）

**宝箱房（Treasure Trap）**
- 出现概率：随机
- 选项：
  - 开启宝箱：获得一个稀有/史诗道具，但同时生成 3 个强力敌人
  - 谨慎搜刮：获得 10 水晶 + 15% HP 回复，无风险
  - 离开

#### 触发时机
在 `nextFloor()` 中检查：
```typescript
if (this.state.floorLevel % 2 === 0 && this.state.floorLevel < 10) {
  // 进入事件层（不战斗，显示事件UI）
  this.state.isEventPending = true
  this.currentEvent = this.generateRandomEvent()
}
```

#### UI 层
新增 `EventRoom.tsx` 组件，显示事件描述和选项按钮。

---

## 2. 精英敌人系统（Elite Enemies）

### 设计目标
在非 Boss 层增加随机高强度敌人，打破节奏单调感，并提供额外奖励。

### 词缀系统

```typescript
export type EliteAffix = 'swift' | 'vampiric' | 'splitter' | 'shielded' | 'enraged'

export interface EliteDef {
  affix: EliteAffix
  name: string       // 前缀名："迅捷的史莱姆"
  color: string      // 发光颜色
  modifiers: {
    speed?: number   // 速度倍率
    hp?: number      // HP倍率
    attack?: number  // 攻击倍率
    special?: string // 特殊行为标识
  }
  bonusCrystal: number // 额外水晶奖励
  bonusXp: number      // 额外经验奖励
}
```

#### 词缀列表

| 词缀 | 效果 | 颜色 |
|---|---|---|
| 迅捷 | 速度×2，HP×0.8 | #00e5ff |
| 吸血 | 攻击恢复自身5%HP | #880e4f |
| 分裂 | 死亡时分裂为2个小怪 | #76ff03 |
| 护盾 | 每10秒获得吸收护盾 | #ffd600 |
| 狂怒 | HP低于50%时攻击×2 | #ff1744 |

#### 生成规则
```typescript
// setupWave 中：每层 5%~15% 概率将1只普通怪升级为精英
const eliteChance = 0.05 + floorLevel * 0.01
if (Math.random() < eliteChance && !isBossFloor) {
  this.upgradeToElite(lastSpawnedEnemy, floorLevel)
}
```

#### 视觉表现
精英敌人比普通敌人：
- 体型大 30%（`size *= 1.3`）
- 外围有词缀颜色的发光圈（在 renderer 中绘制）
- 头顶显示词缀名称

---

## 3. 主动道具（Active Items）

### 设计目标
增加玩家主动操作维度，不再全是被动效果。

### 数据结构
新增第4个道具槽位（主动槽），用 `Q` 键触发：

```typescript
export interface ActiveItemDef {
  id: string
  name: string
  desc: string
  cooldown: number   // 冷却时间(ms)
  color: string
  effect: (engine: GameEngine, hero: HeroState) => void
}
```

#### 主动道具列表

| 道具 | 冷却 | 效果 |
|---|---|---|
| 爆裂炸弹 | 20s | 全屏造成 100 伤害 |
| 治疗药水 | 30s | 回复全队 30% HP |
| 传送卷轴 | 25s | 随机传送到地图另一处（脱离包围） |
| 时停怀表 | 40s | 全屏定身 3 秒 |
| 狂暴药剂 | 35s | 攻击力×2 持续 5 秒 |
| 护盾符文 | 25s | 全队获得 50 点护盾 |

#### 获取方式
- Boss 必掉（从主动道具池中随机）
- 神秘商人可购买
- 事件房间特殊奖励

#### UI 显示
HUD 中英雄栏右侧显示主动道具图标 + 冷却进度环，按 Q 触发。

---

## 4. 英雄队伍协同被动（Team Synergies）

### 设计目标
鼓励特定英雄组合上阵，增加队伍构成策略。

### 数据结构

```typescript
export interface TeamSynergyDef {
  id: string
  name: string
  requiredHeroes: HeroId[]  // 需要同时上阵的英雄
  desc: string
  effect: TeamSynergyEffect
}
```

#### 协同列表

| 协同 | 英雄组合 | 效果 |
|---|---|---|
| 守护之光 | 战士 + 牧师 | 战士受治疗效果 +50% |
| 魔法箭雨 | 法师 + 游侠 | 远程攻击 10% 概率附加法术伤害 |
| 暗影双杀 | 刺客 + 刺客 | 暴击时额外触发一次攻击 |
| 铁壁防线 | 战士 + 战士 | 全队受伤 -15% |
| 元素风暴 | 法师 + 法师 | 技能伤害 +40% |
| 生存专家 | 游侠 + 牧师 | 每10秒全队回复 5% HP |
| 致命连击 | 刺客 + 游侠 | 攻速 +25% |

#### 检测时机
在游戏初始化（constructor）时，检查上阵英雄组合，将激活的队伍协同存入 `state.activeTeamSynergies`。

#### 实现位置
- `getHeroAttack` / `damageHero` 中检查队伍协同并应用加成
- HUD 中以特殊徽章显示已激活的队伍协同

---

## 5. 成就系统（Achievements）

### 设计目标
提供局外目标感，增加重玩价值。

### 数据结构

```typescript
export interface AchievementDef {
  id: string
  name: string
  desc: string
  condition: (meta: MetaProgress, runStats: RunStats) => boolean
  reward: { crystals?: number; unlockAbility?: string; unlockHero?: string }
}

export interface RunStats {
  heroesUsed: HeroId[]
  synergiesTriggered: string[]
  maxFloor: number
  enemiesKilled: number
  itemsCollected: string[]
  victory: boolean
}
```

#### 成就列表

**基础成就**
| 成就 | 条件 | 奖励 |
|---|---|---|
| 初次冒险 | 完成第1次游戏 | 20 水晶 |
| 深入地下 | 到达第5层 | 30 水晶 |
| 征服深渊 | 通关第10层 | 100 水晶 + 解锁狂战士戒指 |
| 协同大师 | 单局触发3种协同 | 50 水晶 |
| 全能战队 | 使用过所有5个英雄 | 解锁新能力"影子分身" |

**挑战成就**
| 成就 | 条件 | 奖励 |
|---|---|---|
| 法师独裁 | 全法师阵容通关第5层 | 解锁"连锁闪电"进阶版 |
| 无伤Boss | 击杀Boss时全队满血 | 50 水晶 |
| 速通达人 | 10分钟内通关 | 解锁新道具"时停怀表" |
| 收集狂 | 单局收集8个道具 | 30 水晶 |

#### 存储
成就进度保存在 `mulby.storage` 的 `abyss-squad-achievements` 键中。

#### UI
营地（Hub）中增加"成就墙"入口，显示已解锁/待解锁成就列表。

---

## 实现优先级

| 优先级 | 系统 | 复杂度 | 影响 |
|---|---|---|---|
| P0 | 事件房间 | 中 | 大幅提升节奏感 |
| P1 | 精英敌人 | 低 | 增加战斗变化 |
| P1 | 英雄队伍协同 | 低 | 增加策略深度 |
| P2 | 主动道具 | 中 | 增加操作维度 |
| P2 | 成就系统 | 低 | 增加重玩价值 |

---

## 技术注意事项

1. **事件房间**需要在 `DungeonState` 中添加 `isEventPending` 和 `currentEvent` 字段，并在 `update()` 中暂停游戏逻辑
2. **精英敌人**只需修改 `spawnEnemy()` 和渲染器，不影响其他系统
3. **主动道具**需要新增道具槽（第4槽）和 Q 键绑定，HUD 需要新组件
4. **队伍协同**在 constructor 中检测，只需读取 `meta.unlockedHeroes` 前3个
5. **成就系统**完全在局外（Hub/App）处理，不影响游戏内性能
