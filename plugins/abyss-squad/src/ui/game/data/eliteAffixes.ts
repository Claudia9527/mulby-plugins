import type { EliteAffixDef } from '../types'

export const ELITE_AFFIXES: EliteAffixDef[] = [
  {
    affix: 'swift',
    name: '迅捷',
    color: '#00e5ff',
    speedMult: 2,
    hpMult: 0.8,
    bonusCrystal: 3,
    bonusXp: 15,
  },
  {
    affix: 'vampiric',
    name: '吸血',
    color: '#880e4f',
    hpMult: 1.2,
    special: 'lifesteal_on_hit',
    bonusCrystal: 4,
    bonusXp: 20,
  },
  {
    affix: 'splitter',
    name: '分裂',
    color: '#76ff03',
    hpMult: 0.7,
    special: 'split_on_death',
    bonusCrystal: 3,
    bonusXp: 10,
  },
  {
    affix: 'shielded',
    name: '护盾',
    color: '#ffd600',
    hpMult: 1.0,
    special: 'periodic_shield',
    bonusCrystal: 5,
    bonusXp: 25,
  },
  {
    affix: 'enraged',
    name: '狂怒',
    color: '#ff1744',
    atkMult: 1.0,
    hpMult: 1.3,
    special: 'enrage_below_half',
    bonusCrystal: 4,
    bonusXp: 20,
  },
]

export function getRandomAffix(): EliteAffixDef {
  return ELITE_AFFIXES[Math.floor(Math.random() * ELITE_AFFIXES.length)]
}
