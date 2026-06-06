import type { ItemDef } from '../types'

export const ITEMS: ItemDef[] = [
  // === 武器 ===
  { id: 'flame_sword', name: '火焰剑', slot: 'weapon', rarity: 'uncommon', desc: '攻击附带火焰，点燃敌人', color: '#e67e22', tags: ['fire', 'melee'], effect: { attackBonus: 8, special: 'burn_on_hit' } },
  { id: 'bounce_dagger', name: '弹射匕首', slot: 'weapon', rarity: 'common', desc: '攻击在敌人间弹射', color: '#95a5a6', tags: ['projectile', 'bounce'], effect: { attackBonus: 5, special: 'bounce_attack' } },
  { id: 'thunder_staff', name: '雷霆法杖', slot: 'weapon', rarity: 'rare', desc: '攻击释放闪电链', color: '#f39c12', tags: ['lightning', 'magic'], effect: { attackBonus: 10, special: 'lightning_chain' } },
  { id: 'blood_blade', name: '血刃', slot: 'weapon', rarity: 'uncommon', desc: '攻击吸血，但消耗少量生命', color: '#c0392b', tags: ['blood', 'lifesteal'], effect: { attackBonus: 15, lifesteal: 0.2, special: 'blood_cost' } },
  { id: 'frost_bow', name: '冰霜弓', slot: 'weapon', rarity: 'uncommon', desc: '攻击冻结敌人1秒', color: '#3498db', tags: ['ice', 'projectile'], effect: { attackBonus: 6, special: 'freeze_on_hit' } },
  // === 神器 ===
  { id: 'oil_flask', name: '油瓶', slot: 'artifact', rarity: 'common', desc: '敌人沾满油，遇火即燃', color: '#795548', tags: ['oil', 'fire_combo'], effect: { special: 'oil_cover' } },
  { id: 'conductive_charm', name: '导电护符', slot: 'artifact', rarity: 'uncommon', desc: '增强闪电效果，增加连锁目标', color: '#ffc107', tags: ['lightning', 'conductive'], effect: { special: 'enhance_lightning' } },
  { id: 'explosive_gem', name: '爆炸宝石', slot: 'artifact', rarity: 'rare', desc: '弹道命中时产生爆炸', color: '#ff5722', tags: ['explosion', 'projectile'], effect: { attackBonus: 3, special: 'explode_on_hit' } },
  { id: 'swift_boots', name: '迅捷之靴', slot: 'artifact', rarity: 'common', desc: '移动速度大幅提升', color: '#4caf50', tags: ['speed', 'boots'], effect: { speedBonus: 1.5, special: 'swift' } },
  { id: 'vampiric_cloak', name: '吸血斗篷', slot: 'artifact', rarity: 'rare', desc: '攻击恢复生命', color: '#880e4f', tags: ['lifesteal', 'vampire'], effect: { lifesteal: 0.15, hpBonus: 20 } },
  // === 饰品 ===
  { id: 'thorn_shield', name: '荆棘盾', slot: 'accessory', rarity: 'uncommon', desc: '反弹受到的伤害', color: '#4caf50', tags: ['thorns', 'defense'], effect: { hpBonus: 30, special: 'thorns' } },
  { id: 'lucky_coin', name: '幸运币', slot: 'accessory', rarity: 'common', desc: '暴击率提升', color: '#ffd700', tags: ['crit', 'luck'], effect: { critChance: 0.15 } },
  { id: 'crystal_amulet', name: '水晶护符', slot: 'accessory', rarity: 'rare', desc: '水晶掉落翻倍', color: '#e1bee7', tags: ['crystal', 'loot'], effect: { special: 'double_crystal' } },
  { id: 'healing_stone', name: '治愈石', slot: 'accessory', rarity: 'uncommon', desc: '每5秒恢复5%最大生命值', color: '#66bb6a', tags: ['heal', 'regen'], effect: { hpBonus: 15, special: 'periodic_heal' } },
  { id: 'berserker_ring', name: '狂战士戒指', slot: 'accessory', rarity: 'epic', desc: '攻击速度翻倍，防御减半', color: '#d32f2f', tags: ['berserk', 'speed'], effect: { attackBonus: 12, special: 'berserker' } },
]

export const ITEM_RARITY_COLORS: Record<string, string> = {
  common: '#95a5a6',
  uncommon: '#2ecc71',
  rare: '#3498db',
  epic: '#9b59b6',
}

export const ITEM_RARITY_NAMES: Record<string, string> = {
  common: '普通',
  uncommon: '精良',
  rare: '稀有',
  epic: '史诗',
}

export const ITEM_UNLOCK_COST: Record<string, number> = {
  uncommon: 20,
  rare: 40,
  epic: 80,
}
