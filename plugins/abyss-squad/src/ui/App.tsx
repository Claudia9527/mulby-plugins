import { useState, useEffect, useCallback } from 'react'
import MainMenu from './components/MainMenu'
import Hub from './components/Hub'
import GameCanvas from './components/GameCanvas'
import GameOver from './components/GameOver'
import type { GameScreen, MetaProgress } from './game/types'

const DEFAULT_META: MetaProgress = {
  crystals: 0,
  attackLevel: 0,
  healthLevel: 0,
  speedLevel: 0,
  unlockedHeroes: ['warrior', 'mage', 'ranger'],
  unlockedAbilities: [],
  unlockedItems: [],
  unlockedSynergies: [],
  weaponLevel: 0,
  totalRuns: 0,
  bestFloor: 0,
}

async function loadMeta(): Promise<MetaProgress> {
  try {
    const mulby = (window as any).mulby
    if (mulby?.storage) {
      const data = await mulby.storage.get('abyss-squad-meta')
      if (data) {
        const merged = { ...DEFAULT_META, ...data }
        // 确保关键数组字段有效
        if (!Array.isArray(merged.unlockedHeroes) || merged.unlockedHeroes.length === 0) {
          merged.unlockedHeroes = [...DEFAULT_META.unlockedHeroes]
        }
        return merged
      }
    }
  } catch { /* ignore */ }
  return DEFAULT_META
}

async function saveMeta(meta: MetaProgress) {
  try {
    const mulby = (window as any).mulby
    if (mulby?.storage) {
      await mulby.storage.set('abyss-squad-meta', meta)
    }
  } catch { /* ignore */ }
}

export default function App() {
  const [screen, setScreen] = useState<GameScreen>('menu')
  const [meta, setMeta] = useState<MetaProgress>(DEFAULT_META)
  const [loaded, setLoaded] = useState(false)
  const [runResult, setRunResult] = useState<{ crystals: number; floor: number } | null>(null)

  // 加载存档
  useEffect(() => {
    loadMeta().then(data => {
      setMeta(data)
      setLoaded(true)
    })
  }, [])

  // 自动保存
  const updateMeta = useCallback((updater: (prev: MetaProgress) => MetaProgress) => {
    setMeta(prev => {
      const next = updater(prev)
      saveMeta(next)
      return next
    })
  }, [])

  const handleStartRun = () => setScreen('game')
  const handleGoHub = () => setScreen('hub')
  const handleGoMenu = () => setScreen('menu')

  const handleRunEnd = (crystals: number, floor: number) => {
    setRunResult({ crystals, floor })
    updateMeta(prev => ({
      ...prev,
      crystals: prev.crystals + crystals,
      totalRuns: prev.totalRuns + 1,
      bestFloor: Math.max(prev.bestFloor, floor),
    }))
    setScreen('gameover')
  }

  const handleUpgrade = (key: string, cost: number) => {
    if (meta.crystals < cost) return
    updateMeta(prev => ({
      ...prev,
      crystals: prev.crystals - cost,
      [key]: ((prev as any)[key] || 0) + 1,
    }))
  }

  const handleUnlockHero = (heroId: string, cost: number) => {
    if (meta.crystals < cost) return
    updateMeta(prev => ({
      ...prev,
      crystals: prev.crystals - cost,
      unlockedHeroes: [...prev.unlockedHeroes, heroId],
    }))
  }

  if (!loaded) {
    return <div className="game-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>加载中...</div>
  }

  return (
    <div className="game-root">
      {screen === 'menu' && (
        <MainMenu onStart={handleStartRun} onHub={handleGoHub} />
      )}
      {screen === 'hub' && (
        <Hub
          meta={meta}
          onBack={handleGoMenu}
          onUpgrade={handleUpgrade}
          onUnlockHero={handleUnlockHero}
        />
      )}
      {screen === 'game' && (
        <GameCanvas meta={meta} onRunEnd={handleRunEnd} onQuit={handleGoMenu} />
      )}
      {screen === 'gameover' && runResult && (
        <GameOver
          crystals={runResult.crystals}
          floor={runResult.floor}
          onContinue={handleGoHub}
          onMenu={handleGoMenu}
          onRetry={handleStartRun}
        />
      )}
    </div>
  )
}
