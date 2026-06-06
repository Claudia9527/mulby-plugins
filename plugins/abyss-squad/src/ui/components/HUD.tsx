import type { HeroState, ActiveSynergy } from '../game/types'

interface FloorInfo {
  level: number
  killed: number
  needed: number
  portalReady: boolean
}

interface Props {
  heroes: HeroState[]
  activeHeroIndex: number
  floorInfo?: FloorInfo
  crystals: number
  synergies: ActiveSynergy[]
  onQuit: () => void
}

export default function HUD({ heroes, activeHeroIndex, floorInfo, crystals, synergies, onQuit }: Props) {
  return (
    <div className="hud-overlay">
      {/* 顶部信息栏 */}
      <div className="hud-top">
        <div className="hud-floor">
          <span>第 {floorInfo?.level ?? 1} 层</span>
          {floorInfo && (
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${(floorInfo.killed / floorInfo.needed) * 100}%` }}
              />
            </div>
          )}
          <span className="kill-count">{floorInfo?.killed ?? 0}/{floorInfo?.needed ?? 0}</span>
        </div>
        <div className="hud-crystals">
          <span className="crystal-icon">◆</span>
          <span>{crystals}</span>
        </div>
        <button className="btn-quit" onClick={onQuit}>✕</button>
      </div>

      {/* 底部英雄栏 */}
      <div className="hud-bottom">
        {heroes.map((hero, i) => (
          <div
            key={i}
            className={`hud-hero ${i === activeHeroIndex ? 'active' : ''} ${hero.isDead ? 'dead' : ''}`}
          >
            <div className="hero-portrait" style={{ backgroundColor: hero.def.color }}>
              {hero.isDead ? '✕' : hero.def.name[0]}
            </div>
            <div className="hero-bars">
              <div className="hp-bar">
                <div
                  className="hp-fill"
                  style={{ width: `${(hero.hp / hero.maxHp) * 100}%` }}
                />
                <span className="hp-text">{Math.round(hero.hp)}/{hero.maxHp}</span>
              </div>
              <div className="xp-bar">
                <div className="xp-fill" style={{ width: `${(hero.xp / (30 + hero.level * 20)) * 100}%` }} />
                <span className="lv-text">Lv.{hero.level}</span>
              </div>
            </div>
            {/* 道具图标 */}
            <div className="hero-items">
              {hero.items.map((item, j) => (
                <div
                  key={j}
                  className={`item-slot ${item ? 'filled' : 'empty'}`}
                  title={item ? item.def.name : '空'}
                  style={item ? { borderColor: item.def.color } : {}}
                >
                  {item ? item.def.name[0] : '·'}
                </div>
              ))}
            </div>
            <span className="hero-key">{i + 1}</span>
          </div>
        ))}
      </div>

      {/* 协同效果列表 */}
      {synergies.length > 0 && (
        <div className="hud-synergies">
          {synergies.map((s, i) => (
            <div key={i} className="synergy-badge" style={{ backgroundColor: s.def.color }}>
              {s.def.name}
            </div>
          ))}
        </div>
      )}

      {floorInfo?.portalReady && (
        <div className="portal-hint">传送门已开启!</div>
      )}
    </div>
  )
}
