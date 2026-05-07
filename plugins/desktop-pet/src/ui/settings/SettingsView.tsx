import { useState, useEffect, type ReactNode } from 'react'
import { DEFAULT_PERSONALITY, type PetPersonality } from '../engine/ai-chat'
import type { PetStats, PetMood } from '../engine/pet-stats'
import type { PetMemory } from '../engine/pet-memory'
import './settings.css'

function Icon({ d, color = 'currentColor', size = 16 }: { d: string; color?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
}

const ICONS = {
  heart: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
  calendar: 'M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM16 2v4M8 2v4M3 10h18',
  clock: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 6v6l4 2',
  target: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 12h0',
  hand: 'M18 11V6a2 2 0 0 0-4 0v1M14 10V4a2 2 0 0 0-4 0v6M10 10V5a2 2 0 0 0-4 0v9',
  gift: 'M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z',
  smile: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01',
  pin: 'M12 2l3 9h-6zM12 11v11M8 22h8',
  trash: 'M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
  mapPin: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  refresh: 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15',
} as const

function StatsIcon({ icon, children }: { icon: keyof typeof ICONS; children: ReactNode }) {
  return <span className="stats-icon"><Icon d={ICONS[icon]} color="var(--accent)" />{children}</span>
}

const MOOD_LABELS: Record<PetMood, string> = {
  ecstatic: '欣喜若狂', happy: '开心', content: '满足', neutral: '平静',
  bored: '无聊', lonely: '孤独', sad: '难过', grumpy: '暴躁', sleepy: '困倦',
}

const TRAITS = [
  { id: 'lively', label: '活泼', desc: '开朗爱说话，偶尔喵一下' },
  { id: 'quiet', label: '安静', desc: '温柔少语，慵懒可爱' },
  { id: 'sarcastic', label: '毒舌', desc: '吐槽但关心，犀利有趣' },
  { id: 'warm', label: '暖心', desc: '温暖治愈，总是鼓励你' },
] as const

const FREQUENCIES = [
  { id: 'high', label: '频繁' },
  { id: 'medium', label: '适中' },
  { id: 'low', label: '偶尔' },
  { id: 'click-only', label: '仅点击' },
] as const

export default function SettingsView() {
  const [personality, setPersonality] = useState<PetPersonality>(DEFAULT_PERSONALITY)
  const [models, setModels] = useState<Array<{ id: string; label: string }>>([])
  const [toast, setToast] = useState('')
  const [tab, setTab] = useState<'personality' | 'stats' | 'memory'>('personality')
  const [stats, setStats] = useState<PetStats | null>(null)
  const [memories, setMemories] = useState<PetMemory[]>([])
  const [memoryFilter, setMemoryFilter] = useState<'all' | 'pinned'>('all')
  const [geoInfo, setGeoInfo] = useState<{ latitude: number; longitude: number; city?: string; region?: string } | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  useEffect(() => {
    const load = async () => {
      try {
        const saved = await window.mulby.storage.get('pet-personality')
        if (saved) setPersonality(saved as PetPersonality)
      } catch {}

      try {
        const allModels = await window.mulby.ai.allModels()
        const textModels = allModels.filter((m: any) =>
          !m.id.includes('image') && !m.id.includes('embed') && !m.id.includes('rerank')
        )
        setModels(textModels.map((m: any) => ({ id: m.id, label: m.label || m.id })))
        if (!personality.model && textModels.length > 0) {
          setPersonality(p => ({ ...p, model: textModels[0].id }))
        }
      } catch {}

      try {
        const savedStats = await window.mulby.storage.get('pet-stats')
        if (savedStats) setStats(savedStats as PetStats)
      } catch {}

      try {
        const savedMems = await window.mulby.storage.get('pet-memories')
        if (Array.isArray(savedMems)) setMemories(savedMems as PetMemory[])
      } catch {}

      try {
        const savedGeo = await window.mulby.storage.get('pet-geo')
        if (savedGeo && typeof savedGeo === 'object') {
          setGeoInfo(savedGeo as typeof geoInfo)
        }
      } catch {}
    }
    load()
  }, [])

  const handleFetchGeo = async () => {
    setGeoLoading(true)
    try {
      const status = await window.mulby.geolocation.getAccessStatus()
      let canGet = status === 'granted'
      if (status === 'not-determined') {
        const newStatus = await window.mulby.geolocation.requestAccess()
        canGet = newStatus === 'granted'
      }
      if (!canGet) {
        showToast('未获得定位权限')
        setGeoLoading(false)
        return
      }

      const pos = await window.mulby.geolocation.getCurrentPosition()
      if (!pos) {
        showToast('无法获取位置')
        setGeoLoading(false)
        return
      }

      const geo: NonNullable<typeof geoInfo> = { latitude: pos.latitude, longitude: pos.longitude }

      try {
        const resp = await window.mulby.http.get(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.latitude}&lon=${pos.longitude}&zoom=10&accept-language=zh`,
          { 'User-Agent': 'MulbyDesktopPet/1.0' }
        )
        if (resp.status === 200) {
          const data = JSON.parse(resp.data)
          geo.city = data.address?.city || data.address?.town || data.address?.county || ''
          geo.region = data.address?.state || data.address?.province || ''
        }
      } catch {}

      await window.mulby.storage.set('pet-geo', geo)
      setGeoInfo(geo)
      showToast(geo.city ? `已定位到 ${geo.city}` : '定位已保存')
    } catch (e) {
      console.error('Geo error:', e)
      showToast('获取定位失败')
    }
    setGeoLoading(false)
  }

  const handleClearGeo = async () => {
    await window.mulby.storage.set('pet-geo', null)
    setGeoInfo(null)
    showToast('定位已清除')
  }

  const handleSave = async () => {
    try {
      await window.mulby.storage.set('pet-personality', personality)
      showToast('设置已保存')
      window.mulby.window.sendToParent('settings-updated', { personality })
    } catch (err) {
      console.error('Save error:', err)
    }
  }

  const handleTogglePin = async (id: string) => {
    const updated = memories.map(m => {
      if (m.id !== id) return m
      const pinnedCount = memories.filter(x => x.pinned).length
      if (!m.pinned && pinnedCount >= 10) return m
      return { ...m, pinned: !m.pinned }
    })
    setMemories(updated)
    await window.mulby.storage.set('pet-memories', updated)
    showToast('已更新')
  }

  const handleDeleteMemory = async (id: string) => {
    const updated = memories.filter(m => m.id !== id)
    setMemories(updated)
    await window.mulby.storage.set('pet-memories', updated)
    showToast('已删除')
  }

  const renderMemory = () => {
    const filtered = memoryFilter === 'pinned'
      ? memories.filter(m => m.pinned)
      : memories

    const typeLabels: Record<string, string> = {
      fact: '事实', preference: '偏好', event: '事件', habit: '习惯'
    }

    return (
      <div className="panel-content">
        <div className="memory-header">
          <span className="memory-count">共 {memories.length} 条记忆</span>
          <div className="memory-filter">
            <button className={`filter-btn ${memoryFilter === 'all' ? 'active' : ''}`} onClick={() => setMemoryFilter('all')}>全部</button>
            <button className={`filter-btn ${memoryFilter === 'pinned' ? 'active' : ''}`} onClick={() => setMemoryFilter('pinned')}>固定</button>
          </div>
        </div>
        {filtered.length === 0 && (
          <div className="memory-empty">
            {memoryFilter === 'pinned' ? '暂无固定记忆' : '宠物还没有形成记忆，多互动几次吧'}
          </div>
        )}
        <div className="memory-list">
          {filtered.map(m => (
            <div key={m.id} className={`memory-item ${m.pinned ? 'pinned' : ''}`}>
              <div className="memory-item-top">
                <span className="memory-type">{typeLabels[m.type] || m.type}</span>
                <span className="memory-date">{new Date(m.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="memory-content">{m.content}</div>
              {m.tags.length > 0 && (
                <div className="memory-tags">
                  {m.tags.map((t, i) => <span key={i} className="memory-tag">{t}</span>)}
                </div>
              )}
              <div className="memory-actions">
                <button
                  className={`mem-action-btn ${m.pinned ? 'unpin' : 'pin'}`}
                  onClick={() => handleTogglePin(m.id)}
                  title={m.pinned ? '取消固定' : '固定'}
                >
                  <Icon d={ICONS.pin} size={12} /> {m.pinned ? '取消固定' : '固定'}
                </button>
                <button
                  className="mem-action-btn delete"
                  onClick={() => handleDeleteMemory(m.id)}
                >
                  <Icon d={ICONS.trash} size={12} /> 删除
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderStats = () => {
    if (!stats) return <div className="panel-content"><p style={{ opacity: 0.6 }}>暂无数据</p></div>
    const days = Math.floor((Date.now() - stats.createdAt) / 86_400_000)
    const moodScore = stats.moodScore ?? 0
    const moodPercent = Math.round((moodScore + 100) / 2)
    const moodName = MOOD_LABELS[(stats.mood as PetMood) ?? 'neutral'] || '平静'

    return (
      <div className="panel-content">
        <div className="mood-bar">
          <div className="mood-label">
            <StatsIcon icon="smile">心情</StatsIcon>
            <span>{moodName}</span>
          </div>
          <div className="mood-track">
            <div className="mood-fill" style={{ width: `${moodPercent}%` }} />
          </div>
        </div>

        <div className="geo-card">
          <div className="geo-header">
            <StatsIcon icon="mapPin">位置信息</StatsIcon>
          </div>
          {geoInfo ? (
            <div className="geo-body">
              <span className="geo-text">{geoInfo.city && geoInfo.region ? `${geoInfo.region} · ${geoInfo.city}` : `${geoInfo.latitude.toFixed(2)}, ${geoInfo.longitude.toFixed(2)}`}</span>
              <div className="geo-actions">
                <button className="gen-btn" onClick={handleFetchGeo} disabled={geoLoading}>
                  <Icon d={ICONS.refresh} size={12} /> 刷新
                </button>
                <button className="mem-action-btn delete" onClick={handleClearGeo}>
                  <Icon d={ICONS.trash} size={12} /> 清除
                </button>
              </div>
            </div>
          ) : (
            <div className="geo-body">
              <span className="geo-text" style={{ opacity: 0.5 }}>未设置定位</span>
              <button className="gen-btn" onClick={handleFetchGeo} disabled={geoLoading}>
                {geoLoading ? '获取中...' : '获取当前位置'}
              </button>
            </div>
          )}
        </div>

        <div className="stats-card">
          <div className="stats-row"><StatsIcon icon="heart">亲密度</StatsIcon><span className="stats-value">{stats.intimacy}/100</span></div>
          <div className="stats-row"><StatsIcon icon="calendar">连续签到</StatsIcon><span className="stats-value">{stats.streakDays} 天</span></div>
          <div className="stats-row"><StatsIcon icon="target">今日番茄</StatsIcon><span className="stats-value">{stats.pomodoroToday} 个</span></div>
          <div className="stats-row"><StatsIcon icon="target">累计番茄</StatsIcon><span className="stats-value">{stats.pomodoroTotal} 个</span></div>
          <div className="stats-row"><StatsIcon icon="clock">专注时长</StatsIcon><span className="stats-value">{stats.totalFocusMinutes} 分钟</span></div>
          <div className="stats-row"><StatsIcon icon="hand">累计互动</StatsIcon><span className="stats-value">{stats.totalInteractions} 次</span></div>
          <div className="stats-row"><StatsIcon icon="gift">相伴天数</StatsIcon><span className="stats-value">{days} 天</span></div>
        </div>
      </div>
    )
  }

  return (
    <div className="settings-root">
      <div className="settings-header">
        <div className="tab-bar">
          <button className={`tab ${tab === 'personality' ? 'active' : ''}`} onClick={() => setTab('personality')}>性格设置</button>
          <button className={`tab ${tab === 'stats' ? 'active' : ''}`} onClick={() => setTab('stats')}>我的宠物</button>
          <button className={`tab ${tab === 'memory' ? 'active' : ''}`} onClick={() => setTab('memory')}>记忆</button>
        </div>
      </div>

      <div className="settings-body">
        {tab === 'stats' && renderStats()}
        {tab === 'memory' && renderMemory()}
        {tab === 'personality' && <div className="panel-content">
          <div className="field">
            <label className="field-label">宠物名称</label>
            <input
              className="field-input"
              value={personality.name}
              onChange={e => setPersonality(p => ({ ...p, name: e.target.value }))}
              placeholder="给宠物取个名字"
              maxLength={10}
            />
          </div>

          <div className="field">
            <label className="field-label">性格</label>
            <div className="trait-grid">
              {TRAITS.map(t => (
                <button
                  key={t.id}
                  className={`trait-card ${personality.trait === t.id ? 'active' : ''}`}
                  onClick={() => setPersonality(p => ({ ...p, trait: t.id }))}
                >
                  <span className="trait-name">{t.label}</span>
                  <span className="trait-desc">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label className="field-label">AI 模型</label>
            <select
              className="field-select"
              value={personality.model}
              onChange={e => setPersonality(p => ({ ...p, model: e.target.value }))}
            >
              {models.length === 0 && <option value="">未配置模型</option>}
              {models.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="field-label">说话频率</label>
            <div className="freq-row">
              {FREQUENCIES.map(f => (
                <button
                  key={f.id}
                  className={`freq-btn ${personality.frequency === f.id ? 'active' : ''}`}
                  onClick={() => setPersonality(p => ({ ...p, frequency: f.id }))}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label className="field-label">触发行为</label>
            <div className="trigger-list">
              {([
                ['idle', '闲置时打招呼'],
                ['typing', '打字时评论'],
                ['morning', '早晨问候'],
                ['lateNight', '深夜提醒'],
                ['clipboard', '剪贴板内容响应'],
                ['mousePattern', '鼠标行为响应'],
              ] as const).map(([key, label]) => (
                <label key={key} className="trigger-item">
                  <input
                    type="checkbox"
                    checked={personality.triggers[key] ?? true}
                    onChange={e => setPersonality(p => ({
                      ...p,
                      triggers: { ...p.triggers, [key]: e.target.checked }
                    }))}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>}
      </div>

      {tab === 'personality' && <div className="settings-footer">
        <button className="save-btn" onClick={handleSave}>保存设置</button>
      </div>}

      {toast && <div className="toast-wrap"><div className="toast">{toast}</div></div>}
    </div>
  )
}
