import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
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
import Guide from './pages/Guide'
import Glow from './components/Glow'
import LoginModal from './components/LoginModal'
import BackButton from './components/BackButton'
import { useHoverHighlight } from './lib/useHoverHighlight'
import { initAuth } from './store/auth'
import { useNav } from './store/nav'
import { initSync } from './lib/sync'

const LIST_PAGES = ['/', '/topics', '/learned', '/later']        // здесь фон «оживает» на весь экран

export default function App() {
  const { theme, lang, sidebarCollapsed } = useSettings()
  const [island, setIsland] = useState(false)
  const nav = useNavigate()
  const loc = useLocation()
  const depth = useRef(null)
  useHoverHighlight()
  useEffect(() => { initAuth(); initSync() }, [])
  // Самый первый вход на этом устройстве — сразу показываем «Як користуватися»
  useEffect(() => {
    const s = useSettings.getState()
    if (s.seenGuide) return
    s.setSeenGuide()
    if (loc.pathname === '/') nav('/guide', { replace: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = document.documentElement
    if (theme === 'system') el.removeAttribute('data-theme'); else el.setAttribute('data-theme', theme)
  }, [theme])
  const corners = useSettings((s) => s.corners), motion = useSettings((s) => s.motion)
  useEffect(() => { document.documentElement.dataset.corners = corners }, [corners])
  useEffect(() => { document.documentElement.dataset.motion = motion }, [motion])
  useEffect(() => { document.documentElement.lang = lang }, [lang])
  useEffect(() => { if (loc.pathname !== '/') useNav.getState().setLast(loc.pathname + loc.search) }, [loc.pathname, loc.search])
  // Переход список ⇄ страница: новая страница плавно въезжает (вперёд — справа, назад — слева)
  useLayoutEffect(() => {
    const d = loc.pathname === '/' ? 0 : 1, prev = depth.current
    depth.current = d
    if (prev === null || prev === d || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const el = document.querySelector('.shell > main')
    const dx = (d > prev ? 1 : -1) * (innerWidth < 860 ? 36 : 20)
    el?.animate([{ opacity: 0, transform: `translateX(${dx}px)` }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(0.32, 0.72, 0, 1)' })
    scrollTo({ top: 0 })
  }, [loc.pathname])

  const back = () => nav('/')           // «‹ Відео» всегда ведёт к списку
  const page = (El) => <><main><El onBack={back} /></main><aside className="rail" /></>

  return (
    <MenuProvider>
      <Glow mode={loc.pathname === '/guide' ? 'center' : LIST_PAGES.includes(loc.pathname) ? 'alive' : 'calm'} />
      <div className={`shell ${sidebarCollapsed ? 'mini' : ''}`}>
        <Sidebar onAdd={(e) => { e.stopPropagation(); setIsland(true) }} />
        <Routes>
          <Route path="/" element={page(Home)} />
          <Route path="/topics" element={page(Topics)} />
          <Route path="/learned" element={page(Learned)} />
          <Route path="/later" element={page(Later)} />
          <Route path="/guide" element={page(Guide)} />
          <Route path="/v/:id/:tab?" element={<Video onBack={back} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <Island open={island} setOpen={setIsland} />
      <BackButton visible={loc.pathname !== '/'} onClick={back} />
      <LoginModal />
      <Toast />
    </MenuProvider>
  )
}
