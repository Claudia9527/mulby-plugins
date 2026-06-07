import type { AbilityDef, AbilityInstance } from '../game/types'
import { ABILITY_CATEGORY_COLORS } from '../game/data/abilities'

interface Props {
  choices: AbilityDef[]
  heroName?: string
  heroColor?: string
  heroAbilities?: AbilityInstance[]
  onSelect: (index: number) => void
}

export default function LevelUpModal({ choices, heroName, heroColor, heroAbilities, onSelect }: Props) {
  const uniqueCount = heroAbilities?.length ?? 0

  return (
    <div className="levelup-overlay">
      <div className="levelup-panel">
        <h2 className="levelup-title">
          {heroName ? (
            <><span style={{ color: heroColor }}>{heroName}</span> 升级!</>
          ) : '升级!'}
        </h2>
        <p className="levelup-subtitle">
          选择一个能力
          <span style={{ marginLeft: 12, fontSize: 12, color: '#888' }}>
            槽位: {uniqueCount}/6
          </span>
        </p>
        <div className="levelup-choices">
          {choices.map((choice, i) => {
            const existing = heroAbilities?.find(a => a.def.id === choice.id)
            const isUpgrade = !!existing
            const canUpgrade = isUpgrade && existing.stacks < choice.maxStacks
            return (
              <button
                key={i}
                className={`ability-card ${isUpgrade ? 'upgrade' : 'new'}`}
                onClick={() => onSelect(i)}
                disabled={isUpgrade && !canUpgrade}
                style={{ opacity: isUpgrade && !canUpgrade ? 0.5 : 1 }}
              >
                <div className="ability-icon" style={{ backgroundColor: choice.color }}>
                  {choice.name[0]}
                </div>
                <div className="ability-info">
                  <h4>
                    {choice.name}
                    {isUpgrade ? (
                      <span style={{ fontSize: 11, color: '#ffd700', marginLeft: 6 }}>
                        ▲ 强化 {existing.stacks}/{choice.maxStacks}
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: '#aaa', marginLeft: 6 }}>新能力</span>
                    )}
                  </h4>
                  <span className="ability-category" style={{ color: ABILITY_CATEGORY_COLORS[choice.category] }}>
                    {choice.category === 'attack' ? '攻击' : choice.category === 'defense' ? '防御' : choice.category === 'support' ? '辅助' : '变异'}
                  </span>
                  <p className="ability-desc">{choice.desc}</p>
                  <p className="ability-stacks">最多叠加 {choice.maxStacks} 次</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
