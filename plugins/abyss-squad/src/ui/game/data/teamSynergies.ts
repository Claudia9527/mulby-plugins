import type { TeamSynergyDef } from '../types'

export const TEAM_SYNERGIES: TeamSynergyDef[] = [
  {
    id: 'guardian_light',
    name: '守护之光',
    requiredHeroes: ['warrior', 'priest'],
    desc: '战士受治疗效果 +50%',
    color: '#f1c40f',
    effectType: 'heal_boost',
    value: 0.5,
  },
  {
    id: 'magic_arrow_rain',
    name: '魔法箭雨',
    requiredHeroes: ['mage', 'ranger'],
    desc: '远程攻击 10% 概率附加法术伤害',
    color: '#3498db',
    effectType: 'magic_proc',
    value: 0.1,
  },
  {
    id: 'shadow_double_kill',
    name: '暗影双杀',
    requiredHeroes: ['assassin', 'assassin'],
    desc: '暴击时额外触发一次攻击',
    color: '#9b59b6',
    effectType: 'double_attack',
    value: 1,
  },
  {
    id: 'iron_wall',
    name: '铁壁防线',
    requiredHeroes: ['warrior', 'warrior'],
    desc: '全队受伤 -15%',
    color: '#e74c3c',
    effectType: 'damage_reduce',
    value: 0.15,
  },
  {
    id: 'elemental_storm',
    name: '元素风暴',
    requiredHeroes: ['mage', 'mage'],
    desc: '技能伤害 +40%',
    color: '#2980b9',
    effectType: 'skill_boost',
    value: 0.4,
  },
  {
    id: 'survival_experts',
    name: '生存专家',
    requiredHeroes: ['ranger', 'priest'],
    desc: '每 10 秒全队回复 5% HP',
    color: '#2ecc71',
    effectType: 'team_regen',
    value: 0.05,
  },
  {
    id: 'lethal_combo',
    name: '致命连击',
    requiredHeroes: ['assassin', 'ranger'],
    desc: '攻速 +25%',
    color: '#e67e22',
    effectType: 'attack_speed',
    value: 0.25,
  },
]

export function checkTeamSynergies(heroIds: string[]): TeamSynergyDef[] {
  const active: TeamSynergyDef[] = []
  const idSet = heroIds
  for (const syn of TEAM_SYNERGIES) {
    // 统计英雄出现次数（支持同英雄组合）
    const needed = [...syn.requiredHeroes]
    const matched: string[] = []
    for (const hid of idSet) {
      const idx = needed.indexOf(hid)
      if (idx >= 0) {
        needed.splice(idx, 1)
        matched.push(hid)
      }
    }
    if (needed.length === 0) {
      active.push(syn)
    }
  }
  return active
}
