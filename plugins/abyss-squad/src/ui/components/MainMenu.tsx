interface Props {
  onStart: () => void
  onHub: () => void
}

export default function MainMenu({ onStart, onHub }: Props) {
  return (
    <div className="main-menu">
      <div className="menu-bg" />
      <div className="menu-content">
        <h1 className="game-title">
          <span className="title-glow">深渊小队</span>
          <span className="title-sub">ABYSS SQUAD</span>
        </h1>
        <p className="game-desc">控制3人小队在地下城中战斗<br/>收集能力、触发协同、永久升级</p>
        <div className="menu-buttons">
          <button className="btn btn-primary btn-large" onClick={onStart}>
            开始冒险
          </button>
          <button className="btn btn-secondary" onClick={onHub}>
            营地
          </button>
        </div>
        <div className="controls-hint">
          <span>WASD 移动</span>
          <span>空格 技能</span>
          <span>1-3 切换英雄</span>
        </div>
      </div>
    </div>
  )
}
