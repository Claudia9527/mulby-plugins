interface Props {
  crystals: number
  floor: number
  onContinue: () => void
  onMenu: () => void
  onRetry: () => void
}

export default function GameOver({ crystals, floor, onContinue, onMenu, onRetry }: Props) {
  const victory = floor >= 10

  return (
    <div className="gameover">
      <div className="gameover-panel">
        <h2 className={`gameover-title ${victory ? 'victory' : 'defeat'}`}>
          {victory ? '通关!' : '冒险结束'}
        </h2>
        <div className="gameover-stats">
          <div className="stat-row">
            <span>到达层数</span>
            <span className="stat-value">{floor} / 10</span>
          </div>
          <div className="stat-row">
            <span>获得水晶</span>
            <span className="stat-value crystal">◆ {crystals}</span>
          </div>
        </div>
        <div className="gameover-buttons">
          <button className="btn btn-primary" onClick={onContinue}>
            返回营地
          </button>
          <button className="btn btn-secondary" onClick={onRetry}>
            再来一局
          </button>
          <button className="btn btn-ghost" onClick={onMenu}>
            主菜单
          </button>
        </div>
      </div>
    </div>
  )
}
