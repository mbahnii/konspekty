import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useSettings } from './store/settings'
import { MenuProvider } from './components/Menu'
import Toast from './components/Toast'
import Sidebar from './components/Sidebar'
import Island from './components/Island'
import Home from './pages/Home'
import Video from './pages/Video'
import Topics from './pages/Topics'
import Learned from './pages/Learned'
import Later from './pages/Later'
import { useHoverHighlight } from './lib/useHoverHighlight'

export default function App() {
  const { theme, lang, sidebarCollapsed } = useSettings()
  const [island, setIsland] = useState(false)
  const [sideOpen, setSideOpen] = useState(false)
  const loc = useLocation()
  useHoverHighlight()

  useEffect(() => {
    const el = document.documentElement
    if (theme === 'system') el.removeAttribute('data-theme'); else el.setAttribute('data-theme', theme)
  }, [theme])
  useEffect(() => { document.documentElement.lang = lang }, [lang])
  useEffect(() => { setSideOpen(false) }, [loc.pathname])

  const back = () => setSideOpen(true)
  const page = (El) => <><main><El onBack={back} /></main><aside className="rail" /></>

  return (
    <MenuProvider>
      <div className={`shell ${sidebarCollapsed ? 'mini' : ''} ${sideOpen ? 'side-open' : ''}`}>
        <Sidebar onAdd={(e) => { e.stopPropagation(); setIsland(true); setSideOpen(false) }} onPick={() => setSideOpen(false)} />
        <Routes>
          <Route path="/" element={page(Home)} />
          <Route path="/topics" element={page(Topics)} />
          <Route path="/learned" element={page(Learned)} />
          <Route path="/later" element={page(Later)} />
          <Route path="/v/:id/:tab?" element={<Video onBack={back} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <Island open={island} setOpen={setIsland} />
      <Toast />
    </MenuProvider>
  )
}
