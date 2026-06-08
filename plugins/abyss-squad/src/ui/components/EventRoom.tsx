import type { RoomEvent } from '../game/types'

interface Props {
  event: RoomEvent
  crystals: number
  onChoice: (idx: number) => void
}

export default function EventRoom({ event, crystals, onChoice }: Props) {
  const isDisabled = (choice: RoomEvent['choices'][0]) => {
    if (choice.disabled) return true
    if (choice.costType === 'crystal' && choice.cost && crystals < choice.cost) return true
    return false
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.85)', zIndex: 100,
    }}>
      <div style={{
        background: '#1a1a2e', border: '2px solid #533483', borderRadius: 16,
        padding: '28px 32px', maxWidth: 420, width: '90%', color: '#fff', textAlign: 'center',
      }}>
        {/* 图标 */}
        <div style={{ fontSize: 40, marginBottom: 8 }}>
          {event.type === 'merchant' ? '🧙' : event.type === 'altar' ? '⛩️' : '📦'}
        </div>

        {/* 标题 */}
        <h2 style={{ color: '#e94560', margin: '0 0 8px', fontSize: 22 }}>{event.title}</h2>

        {/* 描述 */}
        <p style={{ color: '#aaa', margin: '0 0 20px', fontSize: 14, lineHeight: 1.5 }}>{event.desc}</p>

        {/* 选项 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {event.choices.map((choice, i) => {
            const disabled = isDisabled(choice)
            return (
              <button
                key={i}
                disabled={disabled}
                onClick={() => onChoice(i)}
                style={{
                  padding: '10px 16px',
                  background: disabled ? '#333' : '#0f3460',
                  border: '1px solid #533483',
                  borderRadius: 8,
                  color: disabled ? '#666' : '#fff',
                  fontSize: 14,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => { if (!disabled) (e.target as HTMLButtonElement).style.background = '#16213e' }}
                onMouseLeave={e => { if (!disabled) (e.target as HTMLButtonElement).style.background = '#0f3460' }}
              >
                <span>{choice.label}</span>
                {choice.cost && (
                  <span style={{ float: 'right', color: '#e94560', fontSize: 12 }}>
                    {choice.costType === 'crystal' ? `◆${choice.cost}` :
                     choice.costType === 'hp_percent' ? `${choice.cost}% HP` : '道具'}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* 水晶显示 */}
        <div style={{ marginTop: 16, fontSize: 12, color: '#888' }}>
          当前水晶: ◆{crystals}
        </div>
      </div>
    </div>
  )
}
