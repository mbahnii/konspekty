import React from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './styles/tokens.css'
import './styles/design.css'
import './app.css'
import './styles/glass.css'
import './styles/island.css'
import './styles/motion.css'
import './styles/profile.css'

// Вход через Telegram (стандартный): после подтверждения Telegram возвращает на сайт с #tgAuthResult=… — забираем до роутера
try {
  const m = location.hash.match(/tgAuthResult=([^&]+)/)
  if (m) {
    const json = decodeURIComponent(escape(atob(m[1].replace(/-/g, '+').replace(/_/g, '/'))))
    sessionStorage.setItem('konspekty-tg', json)
    history.replaceState(null, '', location.pathname + location.search + '#/')
  }
} catch { /* ignore */ }

document.documentElement.classList.add('no-anim')
requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.remove('no-anim')))
createRoot(document.getElementById('root')).render(<HashRouter><App /></HashRouter>)

// PWA (добавлено на экран «Домой») часто не перезагружается полностью, а просто
// «просыпается» из памяти, поэтому проверка обновления при обычной загрузке страницы
// может не сработать месяцами. Поэтому, пока приложение открыто, сами проверяем
// раз в 25 секунд: если на сервере новая версия — подключаем её и сайт обновляется сам.
if ('serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({
      immediate: true,
      onRegisteredSW(url, reg) {
        if (!reg) return
        setInterval(() => { reg.update().catch(() => {}) }, 25000)
        document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}) })
      },
    })
  })
}
