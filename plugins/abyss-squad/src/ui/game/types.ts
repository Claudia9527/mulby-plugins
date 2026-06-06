// ========== 游戏屏幕状态 ==========
export type GameScreen = 'menu' | 'hub' | 'game' | 'gameover'

// ========== 基础向量 ==========
export interface Vec2 {
  x: number
  y: number
}

// ========== 英雄系统 ==========
export type HeroId = 'warrior' | 'mage' | 'ranger' | 'priest' | 'assassin'

export interface HeroDef {
  id: HeroId
  name: string
  color: string
  maxHp: number
  attack: number
  speed: number
  range: number
  attackSpeed: number  // 攻击间隔(ms)
  skill: string
  skillDesc: string
  size: number
}

export interface HeroState {
  def: HeroDef
  x: number
  y: number
  hp: number
  maxHp: number
  xp: number
  level: number
  abilities: AbilityInstance[]
  items: (ItemInstance | null)[]  // 3 slots: weapon, artifact, accessory
  attackCooldown: number
  skillCooldown: number
  isActive: boolean
  isDead: boolean
  buffs: Buff[]
  vx: number
  vy: number
  targetX: number
  targetY: number
}

// ========== 能力系统 ==========
export type AbilityCategory = 'attack' | 'defense' | 'support' | 'mutant'

export interface AbilityDef {
  id: string
  name: string
  category: AbilityCategory
  desc: string
  color: string
  maxStacks: number
  tags: string[]  // 用于协同检测
}

export interface AbilityInstance {
  def: AbilityDef
  stacks: number
}

// ========== 道具系统 ==========
export type ItemSlot = 'weapon' | 'artifact' | 'accessory'
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic'

export interface ItemDef {
  id: string
  name: string
  slot: ItemSlot
  rarity: ItemRarity
  desc: string
  color: string
  tags: string[]
  effect: ItemEffect
}

export interface ItemEffect {
  attackBonus?: number
  hpBonus?: number
  speedBonus?: number
  critChance?: number
  lifesteal?: number
  special?: string  // 特殊效果标识
}

export interface ItemInstance {
  def: ItemDef
}

// ========== Buff/Debuff ==========
export interface Buff {
  id: string
  name: string
  duration: number    // 剩余时间(ms)
  value: number
  isDebuff: boolean
  color?: string
}

// ========== 敌人系统 ==========
export type EnemyType = 'melee' | 'ranged' | 'tank' | 'fast' | 'boss'

export interface EnemyDef {
  id: string
  name: string
  type: EnemyType
  color: string
  maxHp: number
  attack: number
  speed: number
  range: number
  attackSpeed: number
  size: number
  xpValue: number
  crystalValue: number
  isBoss?: boolean
}

export interface EnemyState {
  id: number
  def: EnemyDef
  x: number
  y: number
  hp: number
  maxHp: number
  attackCooldown: number
  buffs: Buff[]
  isDead: boolean
  targetHeroId: number  // 小队中目标索引
  stunTimer: number
  slowTimer: number
  burnTimer: number
  burnDps: number
  oilCovered: boolean
  hitFlash: number      // 受击闪白计时器(ms)
  knockbackVx: number   // 击退X速度
  knockbackVy: number   // 击退Y速度
}

// ========== 弹道 ==========
export interface Projectile {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  damage: number
  radius: number
  isEnemy: boolean
  pierce: number
  bounceCount: number
  maxBounces: number
  color: string
  isAoe?: boolean
  aoeRadius?: number
  lifesteal?: number
  splitCount?: number
  chainCount?: number
  burnDamage?: number
  slowAmount?: number
}

// ========== 掉落物 ==========
export interface LootDrop {
  id: number
  x: number
  y: number
  type: 'item' | 'crystal' | 'health' | 'xp'
  itemDef?: ItemDef
  value: number
  pickupRadius: number
}

// ========== 房间/地图 ==========
export type RoomType = 'combat' | 'elite' | 'treasure' | 'shop' | 'event' | 'boss' | 'start'

export interface Room {
  id: number
  type: RoomType
  x: number
  y: number
  width: number
  height: number
  cleared: boolean
  enemies: EnemyState[]
  loot: LootDrop[]
  connections: number[]  // 连接的房间id
  visited: boolean
}

export interface Floor {
  level: number
  rooms: Room[]
  currentRoomId: number
  enemies: EnemyState[]
  loot: LootDrop[]
}

// ========== 协同效果 ==========
export interface SynergyDef {
  id: string
  name: string
  desc: string
  tags: string[]      // 需要的标签组合
  color: string
  effect: SynergyEffect
}

export interface SynergyEffect {
  type: 'aoe_burn' | 'infinite_bounce' | 'thorns_lifesteal' | 'chain_lightning' | 'time_stop' | 'split_explosion' | 'damage_mult' | 'shield_burst' | 'poison_cloud' | 'freeze_field'
  value: number
  duration?: number
}

export interface ActiveSynergy {
  def: SynergyDef
  triggerCooldown: number
}

// ========== 地下城状态 ==========
export interface DungeonState {
  floor: Floor
  heroes: HeroState[]
  projectiles: Projectile[]
  activeSynergies: ActiveSynergy[]
  crystals: number
  floorLevel: number
  isPaused: boolean
  isLevelUpPending: boolean
  levelUpChoices: AbilityDef[]
  activeHeroIndex: number
  gameTime: number
  damageNumbers: DamageNumber[]
  particles: Particle[]
  synergyPopup: { name: string; desc: string; color: string; timer: number } | null
  screenShake: number
  hitstop: number        // 顿帧计时器(ms)
  attackArcs: AttackArc[] // 近战攻击弧光
}

export interface DamageNumber {
  id: number
  x: number
  y: number
  value: number
  color: string
  timer: number
  vy: number
  isCrit: boolean
}

export interface Particle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  color: string
  size: number
  life: number
  maxLife: number
}

export interface AttackArc {
  id: number
  x: number
  y: number
  angle: number    // 朝向角度
  radius: number   // 弧光半径
  color: string
  timer: number    // 剩余时间(ms)
  maxTimer: number // 总时间
}

// ========== 局外进度 ==========
export interface MetaProgress {
  crystals: number
  attackLevel: number
  healthLevel: number
  speedLevel: number
  unlockedHeroes: string[]
  unlockedAbilities: string[]
  unlockedItems: string[]
  unlockedSynergies: string[]
  weaponLevel: number
  totalRuns: number
  bestFloor: number
}

// ========== 输入状态 ==========
export interface InputState {
  keys: Set<string>
  mouseX: number
  mouseY: number
  mouseDown: boolean
  mouseRightDown: boolean
  justPressed: Set<string>
  justClicked: 'left' | 'right' | null
}

// ========== 相机 ==========
export interface Camera {
  x: number
  y: number
  width: number
  height: number
}
