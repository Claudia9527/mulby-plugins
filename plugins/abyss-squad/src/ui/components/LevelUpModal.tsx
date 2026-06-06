import type { AbilityDef } from '../game/types'
import { ABILITY_CATEGORY_COLORS } from '../game/data/abilities'

interface Props {
  choices: AbilityDef[]
  heroName?: string
  heroColor?: string
  onSelect: (index: number) => void
}

export default function LevelUpModal({ choices, heroName, heroColor, onSelect }: Props) {
  return (
    <div className="levelup-overlay">
      <div className="levelup-panel">
        <h2 className="levelup-title">
          {heroName ? (
            <><span style={{ color: heroColor }}>{heroName}</span> 升级!</>
          ) : '升级!'}
        </h2>
        <p className="levelup-subtitle">选择一个能力</p>
        <div className="levelup-choices">
          {choices.map((choice, i) => (
            <button key={i} className="ability-card" onClick={() => onSelect(i)}>
              <div className="ability-icon" style={{ backgroundColor: choice.color }}>
                {choice.name[0]}
              </div>
              <div className="ability-info">
                <h4>{choice.name}</h4>
                <span className="ability-category" style={{ color: ABILITY_CATEGORY_COLORS[choice.category] }}>
                  {choice.category === 'attack' ? '攻击' : choice.category === 'defense' ? '防御' : choice.category === 'support' ? '辅助' : '变异'}
                </span>
                <p className="ability-desc">{choice.desc}</p>
                <p className="ability-stacks">最多叠加 {choice.maxStacks} 次</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
