import type { ActiveItemDef } from '../types'

export const ACTIVE_ITEMS: ActiveItemDef[] = [
  {
    id: 'bomb',
    name: '爆裂炸弹',
    desc: '全屏造成 100 伤害',
    cooldown: 20000,
    color: '#ff5722',
    effectType: 'aoe_damage',
    value: 100,
  },
  {
    id: 'heal_potion',
    name: '治疗药水',
    desc: '回复全队 30% HP',
    cooldown: 30000,
    color: '#4caf50',
    effectType: 'heal_team',
    value: 0.3,
  },
  {
    id: 'teleport_scroll',
    name: '传送卷轴',
    desc: '随机传送到地图另一处',
    cooldown: 25000,
    color: '#2196f3',
    effectType: 'teleport',
    value: 0,
  },
  {
    id: 'time_watch',
    name: '时停怀表',
    desc: '全屏定身 3 秒',
    cooldown: 40000,
    color: '#00bcd4',
    effectType: 'freeze_all',
    value: 3000,
    duration: 3000,
  },
  {
    id: 'rage_potion',
    name: '狂暴药剂',
    desc: '攻击力×2 持续 5 秒',
    cooldown: 35000,
    color: '#e91e63',
    effectType: 'rage_buff',
    value: 2,
    duration: 5000,
  },
  {
    id: 'shield_rune',
    name: '护盾符文',
    desc: '全队获得 50 点护盾',
    cooldown: 25000,
    color: '#3f51b5',
    effectType: 'shield_team',
    value: 50,
  },
]

export function randomActiveItem(): ActiveItemDef {
  return ACTIVE_ITEMS[Math.floor(Math.random() * ACTIVE_ITEMS.length)]
}
