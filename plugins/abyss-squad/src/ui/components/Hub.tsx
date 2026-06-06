import { useState } from 'react'
import type { MetaProgress } from '../game/types'
import { HEROES, HERO_UNLOCK_COST } from '../game/data/heroes'

interface Props {
  meta: MetaProgress
  onBack: () => void
  onUpgrade: (key: string, cost: number) => void
  onUnlockHero: (heroId: string, cost: number) => void
}

type Tab = 'training' | 'smith' | 'library' | 'tavern' | 'shrine'

export default function Hub({ meta, onBack, onUpgrade, onUnlockHero }: Props) {
  const [tab, setTab] = useState<Tab>('training')

  const trainingCost = (level: number) => 10 + level * 5
  const smithCost = 20 + meta.weaponLevel * 15
  const allHeroes = Object.values(HEROES)
  const unlockedSet = new Set(meta.unlockedHeroes)

  return (
    <div className="hub">
      <div className="hub-header">
        <button className="btn btn-back" onClick={onBack}>← 返回</button>
        <h2 className="hub-title">营地</h2>
        <div className="crystal-display">
          <span className="crystal-icon">◆</span>
          <span>{meta.crystals}</span>
        </div>
      </div>

      <div className="hub-tabs">
        {(['training', 'smith', 'library', 'tavern', 'shrine'] as Tab[]).map(t => (
          <button
            key={t}
            className={`tab-btn ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'training' ? '训练营' : t === 'smith' ? '铁匠铺' : t === 'library' ? '图书馆' : t === 'tavern' ? '酒馆' : '神龛'}
          </button>
        ))}
      </div>

      <div className="hub-content">
        {tab === 'training' && (
          <div className="upgrade-grid">
            <UpgradeCard
              name="攻击强化"
              desc={`攻击力 +5%/级 (当前 ${meta.attackLevel} 级)`}
              level={meta.attackLevel}
              cost={trainingCost(meta.attackLevel)}
              crystals={meta.crystals}
              onUpgrade={() => onUpgrade('attackLevel', trainingCost(meta.attackLevel))}
              color="#e74c3c"
            />
            <UpgradeCard
              name="生命强化"
              desc={`生命值 +5%/级 (当前 ${meta.healthLevel} 级)`}
              level={meta.healthLevel}
              cost={trainingCost(meta.healthLevel)}
              crystals={meta.crystals}
              onUpgrade={() => onUpgrade('healthLevel', trainingCost(meta.healthLevel))}
              color="#2ecc71"
            />
            <UpgradeCard
              name="速度强化"
              desc={`移速 +3%/级 (当前 ${meta.speedLevel} 级)`}
              level={meta.speedLevel}
              cost={trainingCost(meta.speedLevel)}
              crystals={meta.crystals}
              onUpgrade={() => onUpgrade('speedLevel', trainingCost(meta.speedLevel))}
              color="#3498db"
            />
          </div>
        )}

        {tab === 'smith' && (
          <div className="upgrade-grid">
            <UpgradeCard
              name="锻造武器"
              desc={`提升初始武器品质 (当前 ${meta.weaponLevel} 级)`}
              level={meta.weaponLevel}
              cost={smithCost}
              crystals={meta.crystals}
              onUpgrade={() => onUpgrade('weaponLevel', smithCost)}
              color="#f39c12"
              maxLevel={5}
            />
          </div>
        )}

        {tab === 'tavern' && (
          <div className="hero-grid">
            {allHeroes.map(hero => {
              const unlocked = unlockedSet.has(hero.id)
              const cost = HERO_UNLOCK_COST[hero.id] || 0
              return (
                <div key={hero.id} className={`hero-card ${unlocked ? 'unlocked' : 'locked'}`}>
                  <div className="hero-avatar" style={{ backgroundColor: hero.color }}>
                    {hero.name[0]}
                  </div>
                  <div className="hero-info">
                    <h4>{hero.name}</h4>
                    <p>HP:{hero.maxHp} ATK:{hero.attack}</p>
                    <p className="hero-skill">{hero.skill}: {hero.skillDesc}</p>
                  </div>
                  {!unlocked && cost > 0 && (
                    <button
                      className="btn btn-small"
                      disabled={meta.crystals < cost}
                      onClick={() => onUnlockHero(hero.id, cost)}
                    >
                      ◆{cost} 解锁
                    </button>
                  )}
                  {unlocked && <span className="badge-unlocked">已解锁</span>}
                </div>
              )
            })}
          </div>
        )}

        {tab === 'library' && (
          <div className="info-panel">
            <p>图书馆可以解锁新的能力进入局内随机池</p>
            <p className="stat">已解锁额外能力: {meta.unlockedAbilities.length}</p>
            <p className="stat hint">更多能力 = 更多意想不到的组合!</p>
          </div>
        )}

        {tab === 'shrine' && (
          <div className="info-panel">
            <p>神龛可以解锁新的协同组合</p>
            <p className="stat">已解锁额外协同: {meta.unlockedSynergies.length}</p>
            <p className="stat hint">集齐特定能力+道具触发超强效果!</p>
          </div>
        )}
      </div>

      <div className="hub-stats">
        <span>总冒险次数: {meta.totalRuns}</span>
        <span>最高层数: {meta.bestFloor}</span>
      </div>
    </div>
  )
}

function UpgradeCard({ name, desc, level, cost, crystals, onUpgrade, color, maxLevel = 20 }: {
  name: string; desc: string; level: number; cost: number; crystals: number
  onUpgrade: () => void; color: string; maxLevel?: number
}) {
  return (
    <div className="upgrade-card">
      <div className="card-header" style={{ borderColor: color }}>
        <h3 style={{ color }}>{name}</h3>
        <span className="card-level">Lv.{level}/{maxLevel}</span>
      </div>
      <p className="card-desc">{desc}</p>
      <div className="card-bar">
        <div className="card-bar-fill" style={{ width: `${(level / maxLevel) * 100}%`, backgroundColor: color }} />
      </div>
      {level < maxLevel ? (
        <button
          className="btn btn-upgrade"
          disabled={crystals < cost}
          onClick={onUpgrade}
        >
          ◆{cost} 升级
        </button>
      ) : (
        <span className="max-badge">已满级</span>
      )}
    </div>
  )
}
