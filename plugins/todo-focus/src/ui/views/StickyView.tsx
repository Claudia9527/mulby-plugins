import { useEffect } from 'react'
import { Check, Circle } from 'lucide-react'
import { useTodos } from '../hooks/useTodos'
import { useMulby } from '../hooks/useMulby'

const PLUGIN_ID = 'todo-focus'
const MAX_VISIBLE = 8

export default function StickyView() {
  const { todos, loading, toggleDone } = useTodos()
  const { window: win, notification } = useMulby(PLUGIN_ID)

  const open = todos.filter((t) => !t.done)
  const visible = open.slice(0, MAX_VISIBLE)
  const overflow = open.length - visible.length

  useEffect(() => {
    void win?.setAlwaysOnTop?.(true)
    void win?.setSize?.(320, 420)
    void win?.setBackgroundThrottling?.(false)
  }, [win])

  if (loading) {
    return <div className="sticky-view loading">加载中…</div>
  }

  return (
    <div className="sticky-view">
      <header className="sticky-header">
        <h1>待办便签</h1>
        <span className="sticky-count">{open.length} 项</span>
      </header>

      {visible.length === 0 ? (
        <p className="sticky-empty">暂无未完成待办</p>
      ) : (
        <ul className="sticky-list">
          {visible.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="sticky-row"
                onClick={() => void toggleDone(item.id)}
                onDoubleClick={() => notification.show('在主面板中查看详情', 'info')}
              >
                <span className="sticky-check">{item.done ? <Check size={14} /> : <Circle size={14} />}</span>
                <span className="sticky-title">{item.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {overflow > 0 && <p className="sticky-more">还有 {overflow} 项…</p>}

      <footer className="sticky-footer">单击勾选完成</footer>
    </div>
  )
}
