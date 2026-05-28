import { useEffect, useState } from 'react'
import ListView from './views/ListView'
import StickyView from './views/StickyView'
import FocusView from './views/FocusView'

type AppView = 'list' | 'sticky' | 'focus'

interface PluginInitData {
  pluginName: string
  featureCode: string
  input: string
  mode?: string
  route?: string
}

function resolveView(data?: PluginInitData | null): AppView {
  const route = data?.route || ''
  const code = data?.featureCode || ''
  if (route.includes('sticky') || code === 'sticky') return 'sticky'
  if (route.includes('focus') || code === 'focus') return 'focus'
  return 'list'
}

export default function App() {
  const [view, setView] = useState<AppView>('list')
  const [initialInput, setInitialInput] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const initialTheme = (params.get('theme') as 'light' | 'dark') || 'light'
    document.documentElement.classList.toggle('dark', initialTheme === 'dark')

    window.mulby?.onThemeChange?.((newTheme: 'light' | 'dark') => {
      document.documentElement.classList.toggle('dark', newTheme === 'dark')
    })

    const route = params.get('route') || ''
    if (route.includes('sticky')) setView('sticky')
    else if (route.includes('focus')) setView('focus')

    window.mulby?.onPluginInit?.((data: PluginInitData) => {
      setView(resolveView(data))
      if (data.input?.trim() && data.featureCode === 'main') {
        setInitialInput(data.input.trim())
      }
    })
  }, [])

  if (view === 'sticky') return <StickyView />
  if (view === 'focus') return <FocusView />
  return <ListView initialInput={initialInput} />
}
