import type { HeroState, ActiveSynergy, ActiveItemState, TeamSynergyDef } from '../game/types'

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
  activeItem?: ActiveItemState | null
  teamSynergies?: TeamSynergyDef[]
  onQuit: () => void
}

export default function HUD({ heroes, activeHeroIndex, floorInfo, crystals, synergies, activeItem, teamSynergies, onQuit }: Props) {
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
            {/* 能力数量 */}
            <div style={{ fontSize: 10, color: '#ccc', marginTop: 2 }}>
              {hero.abilities.length > 0 && (
                <span title={hero.abilities.map(a => `${a.def.name}×${a.stacks}`).join(', ')}>
                  ⚡{hero.abilities.length}/6
                </span>
              )}
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

      {/* 队伍协同徽章 */}
      {teamSynergies && teamSynergies.length > 0 && (
        <div className="hud-synergies" style={{ bottom: 90 }}>
          {teamSynergies.map((s, i) => (
            <div key={i} className="synergy-badge" style={{ backgroundColor: s.color, fontSize: 10 }} title={s.desc}>
              🤝 {s.name}
            </div>
          ))}
        </div>
      )}

      {/* 主动道具 Q 键 */}
      {activeItem && (
        <div style={{
          position: 'absolute', bottom: 95, right: 16,
          background: 'rgba(0,0,0,0.7)', borderRadius: 8, padding: '6px 10px',
          border: `2px solid ${activeItem.def.color}`, textAlign: 'center', minWidth: 60,
        }}>
          <div style={{ color: activeItem.def.color, fontSize: 11, fontWeight: 'bold' }}>{activeItem.def.name}</div>
          {activeItem.cooldownRemaining > 0 ? (
            <div style={{ color: '#888', fontSize: 12 }}>{Math.ceil(activeItem.cooldownRemaining / 1000)}s</div>
          ) : (
            <div style={{ color: '#4caf50', fontSize: 12, fontWeight: 'bold' }}>Q 就绪</div>
          )}
          {activeItem.buffTimer > 0 && (
            <div style={{ color: '#e91e63', fontSize: 10 }}>🔥 {Math.ceil(activeItem.buffTimer / 1000)}s</div>
          )}
        </div>
      )}

      {floorInfo?.portalReady && (
        <div className="portal-hint">传送门已开启!</div>
      )}
    </div>
  )
}
