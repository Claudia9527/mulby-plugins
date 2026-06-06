import { useEffect, useRef, useState, useCallback } from 'react'
import { GameEngine, type GameEvent } from '../game/engine'
import { GameRenderer } from '../game/renderer'
import { createInputState, setupInputHandlers } from '../game/input'
import type { MetaProgress, AbilityDef } from '../game/types'
import HUD from './HUD'
import LevelUpModal from './LevelUpModal'

interface Props {
  meta: MetaProgress
  onRunEnd: (crystals: number, floor: number) => void
  onQuit: () => void
}

export default function GameCanvas({ meta, onRunEnd, onQuit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<GameEngine | null>(null)
  const rendererRef = useRef<GameRenderer | null>(null)
  const [tick, setTick] = useState(0)
  const [levelUpChoices, setLevelUpChoices] = useState<AbilityDef[] | null>(null)
  const [synergyPopup, setSynergyPopup] = useState<{ name: string; desc: string; color: string } | null>(null)

  const handleEvent = useCallback((event: GameEvent) => {
    switch (event.type) {
      case 'level_up':
        setLevelUpChoices(event.choices)
        break
      case 'synergy':
        setSynergyPopup({ name: event.name, desc: event.desc, color: event.color })
        setTimeout(() => setSynergyPopup(null), 3000)
        break
      case 'run_end':
        onRunEnd(event.crystals, event.floor)
        break
    }
  }, [onRunEnd])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const engine = new GameEngine(meta, handleEvent)
    const renderer = new GameRenderer(ctx, 800, 600)
    engineRef.current = engine
    rendererRef.current = renderer

    const cleanup = setupInputHandlers(canvas, engine.input)
    engine.start()

    // 渲染循环 (与引擎更新同步)
    let animFrame = 0
    const renderLoop = () => {
      renderer.render(engine.state, engine.camera)

      // 传送门
      if (engine.getFloorInfo().portalReady) {
        renderer.drawPortal(380, 280)
      }

      // 触发React状态更新 (每10帧一次)
      if (Date.now() % 200 < 20) setTick(t => t + 1)

      animFrame = requestAnimationFrame(renderLoop)
    }
    animFrame = requestAnimationFrame(renderLoop)

    return () => {
      engine.stop()
      cancelAnimationFrame(animFrame)
      cleanup()
    }
  }, [])

  const handleSelectAbility = (index: number) => {
    engineRef.current?.selectAbility(index)
    setLevelUpChoices(null)
  }

  const engine = engineRef.current
  const floorInfo = engine?.getFloorInfo()
  const activeHero = engine?.getActiveHero()
  const heroes = engine?.state.heroes || []
  const synergies = engine?.state.activeSynergies || []

  return (
    <div className="game-container">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="game-canvas"
        tabIndex={0}
      />

      <HUD
        heroes={heroes}
        activeHeroIndex={engine?.state.activeHeroIndex ?? 0}
        floorInfo={floorInfo}
        crystals={engine?.state.crystals ?? 0}
        synergies={synergies}
        onQuit={onQuit}
      />

      {levelUpChoices && (
        <LevelUpModal choices={levelUpChoices} onSelect={handleSelectAbility} />
      )}

      {synergyPopup && (
        <div className="synergy-popup" style={{ borderColor: synergyPopup.color }}>
          <div className="synergy-flash" style={{ backgroundColor: synergyPopup.color }} />
          <h3 style={{ color: synergyPopup.color }}>{synergyPopup.name}</h3>
          <p>{synergyPopup.desc}</p>
        </div>
      )}
    </div>
  )
}
