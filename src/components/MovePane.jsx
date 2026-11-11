import { useLayoutEffect, useRef, useState } from 'react'
import { create } from 'zustand'
import { useT } from '../i18n'
import { supabase } from '../lib/supabase'
import { refreshData } from '../data/useData'
import { useToast } from '../store/ui'
import { ms } from '../lib/motion'
import { frameUrl } from '../lib/time'

// Отдельное состояние пилюли (как Face ID в Dynamic Island): «Де лежить конспект».
// Карточку конспекта можно перетащить пальцем/мышью в другое место или просто нажать на нужное место.
export const useMove = create((set) => ({ v: null, open: (v) => set({ v }), close: () => set({ v: null }) }))

const ZONES = [
  { id: 'private', ic: '🔒', t: 'mv.mine', sub: 'mv.mineSub' },
  { id: 'public', ic: '🌍', t: 'mv.pub', sub: 'mv.pubSub' },
]

export default function MovePane({ v, onDone }) {
  const t = useT()
  const say = useToast((s) => s.say)
  const [vis, setVis] = useState(v?.visibility === 'private' ? 'private' : 'public')
  const [over, setOver] = useState(null)        // над какой зоной сейчас карточка
  const [state, setState] = useState('idle')    // idle | saving | ok
  const card = useRef(null), zones = useRef({}), drag = useRef(null), prevRect = useRef(null)

  // карточка переезжает в другую зону плавно (FLIP: запомнили, где была, — анимируем из старого места в новое)
  useLayoutEffect(() => {
    const el = card.current, from = prevRect.current
    if (!el || !from) return
    prevRect.current = null
    const to = el.getBoundingClientRect()
    el.animate([{ transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(1.04)` }, { transform: 'none' }],
      { duration: ms(480), easing: 'cubic-bezier(.34, 1.26, .64, 1)' })
  }, [vis])

  const commit = async (to) => {
    if (to === vis || state === 'saving') return
    prevRect.current = card.current?.getBoundingClientRect() ?? null
    const was = vis
    setVis(to); setState('saving')
    const { error } = await supabase.rpc('set_note_visibility', { note_id: v.id, vis: to })
    if (error) {                                     // не получилось — возвращаем карточку на место
      prevRect.current = card.current?.getBoundingClientRect() ?? null
      setVis(was); setState('idle'); say(t('au.fail')); return
    }
    setState('ok'); refreshData(0); say(t(to === 'public' ? 'mv.donePub' : 'mv.doneMine'))
    setTimeout(onDone, ms(1100))
  }

  // перетаскивание: карточка едет за пальцем, зона под ней подсвечивается; отпустили над другой зоной — переносим
  const zoneAt = (x, y) => ZONES.find((z) => { const r = zones.current[z.id]?.getBoundingClientRect(); return r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom })?.id ?? null
  const down = (e) => {
    if (state !== 'idle') return
    drag.current = { x: e.clientX, y: e.clientY, moved: false }
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* указатель уже отпущен — продолжаем без захвата */ }
  }
  const move = (e) => {
    const d = drag.current; if (!d) return
    const dx = e.clientX - d.x, dy = e.clientY - d.y
    if (!d.moved && Math.hypot(dx, dy) < 6) return
    d.moved = true
    card.current.style.transform = `translate(${dx}px, ${dy}px) rotate(${Math.max(-4, Math.min(4, dx / 30))}deg) scale(1.04)`
    card.current.classList.add('dragging')
    setOver(zoneAt(e.clientX, e.clientY))
  }
  const up = (e) => {
    const d = drag.current; drag.current = null
    if (!d) return
    const el = card.current
    el.classList.remove('dragging')
    const target = d.moved ? zoneAt(e.clientX, e.clientY) : null
    setOver(null)
    if (target && target !== vis) {
      prevRect.current = el.getBoundingClientRect()   // летим из того места, где карточку отпустили
      el.style.transform = ''
      commit(target)
    } else {
      const from = el.style.transform; el.style.transform = ''
      if (from) el.animate([{ transform: from }, { transform: 'none' }], { duration: ms(420), easing: 'cubic-bezier(.34, 1.26, .64, 1)' })
    }
  }

  if (!v) return null
  const thumb = v.cover ? frameUrl(v.id, { file: v.cover }) : !String(v.id).startsWith('ph-') ? `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg` : null
  return (
    <div className={`mv ${state}`}>
      <div className="mv-head"><b>{t('mv.title')}</b><small>{t(state === 'ok' ? 'mv.saved' : 'mv.hint')}</small></div>
      <div className="mv-zones">
        {ZONES.map((z) => (
          <button key={z.id} ref={(el) => { zones.current[z.id] = el }} type="button"
            className={`mv-zone tap ${vis === z.id ? 'here' : ''} ${over === z.id ? 'over' : ''}`} onClick={() => commit(z.id)}>
            <span className="mv-zt"><i>{z.ic}</i><b>{t(z.t)}</b><small>{t(z.sub)}</small></span>
            {vis === z.id && (
              <span ref={card} className="mv-card" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onClick={(e) => e.stopPropagation()}>
                {thumb ? <img src={thumb} alt="" draggable="false" /> : <span className="mv-noimg">📄</span>}
                <span className="mv-ct">{v.title}</span>
                <span className="mv-ok" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span>
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
