import { useLayoutEffect, useRef, useState } from 'react'
import { create } from 'zustand'
import { useT } from '../i18n'
import { supabase } from '../lib/supabase'
import { refreshData } from '../data/useData'
import { useToast } from '../store/ui'
import { useAuth } from '../store/auth'
import { ms } from '../lib/motion'
import { frameUrl } from '../lib/time'

// Отдельное состояние пилюли (как Face ID в Dynamic Island): «Де лежить конспект».
// Две чёрные зоны; карточку можно перетащить или просто нажать на нужную зону. Переносить можно сколько угодно раз.
export const useMove = create((set) => ({ v: null, open: (v) => set({ v }), close: () => set({ v: null }) }))

const ZONES = [
  { id: 'private', ic: '🔒', t: 'mv.mine', sub: 'mv.mineSub' },
  { id: 'public', ic: '🌍', t: 'mv.pub', sub: 'mv.pubSub' },
]

export default function MovePane({ v, onDone }) {
  const t = useT()
  const say = useToast((s) => s.say)
  const uid = useAuth((s) => s.session?.user?.id)
  const mineNote = !!uid && v?.owner === uid            // переносить можно только свои конспекты
  const [vis, setVis] = useState(v?.visibility === 'private' ? 'private' : 'public')
  const [over, setOver] = useState(null)
  const [flash, setFlash] = useState(false)             // короткая зелёная галочка «Збережено» после переноса
  const busy = useRef(false)
  const card = useRef(null), zones = useRef({}), drag = useRef(null), prevRect = useRef(null)

  // карточка переезжает в другую зону плавно (FLIP: из старого места в новое)
  useLayoutEffect(() => {
    const el = card.current, from = prevRect.current
    if (!el || !from) return
    prevRect.current = null
    const to = el.getBoundingClientRect()
    el.animate([{ transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(1.05)` }, { transform: 'none' }],
      { duration: ms(520), easing: 'cubic-bezier(.34, 1.26, .64, 1)' })
  }, [vis])

  const commit = async (to, from) => {
    if (to === vis || busy.current || !mineNote) { if (!mineNote) say(t('mv.notMine')); return }
    busy.current = true
    prevRect.current = from ?? card.current?.getBoundingClientRect() ?? null
    const was = vis
    setVis(to)
    const { error } = await supabase.rpc('set_note_visibility', { note_id: v.id, vis: to })
    if (error) {                                         // не получилось — карточка возвращается на место
      prevRect.current = card.current?.getBoundingClientRect() ?? null
      setVis(was); say(t('au.fail')); busy.current = false; return
    }
    refreshData(0); setFlash(true); setTimeout(() => setFlash(false), ms(1200))
    busy.current = false                                 // сразу можно переносить дальше
  }

  const zoneAt = (x, y) => ZONES.find((z) => { const r = zones.current[z.id]?.getBoundingClientRect(); return r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom })?.id ?? null
  const down = (e) => {
    if (!mineNote || busy.current) return
    drag.current = { x: e.clientX, y: e.clientY, moved: false }
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* указатель уже отпущен */ }
  }
  const move = (e) => {
    const d = drag.current; if (!d) return
    const dx = e.clientX - d.x, dy = e.clientY - d.y
    if (!d.moved && Math.hypot(dx, dy) < 6) return
    d.moved = true
    card.current.style.transform = `translate(${dx}px, ${dy}px) rotate(${Math.max(-3, Math.min(3, dx / 40))}deg) scale(1.05)`
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
    const here = el.getBoundingClientRect()
    if (target && target !== vis) {
      el.style.transform = ''
      commit(target, here)                               // летим из того места, где карточку отпустили
    } else if (el.style.transform) {
      const from = el.style.transform; el.style.transform = ''
      el.animate([{ transform: from }, { transform: 'none' }], { duration: ms(420), easing: 'cubic-bezier(.34, 1.26, .64, 1)' })
    }
  }

  if (!v) return null
  const thumb = v.cover ? frameUrl(v.id, { file: v.cover }) : !String(v.id).startsWith('ph-') ? `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg` : null
  return (
    <div className="mv">
      <div className="mv-head"><b>{v.title}</b><small className={flash ? 'ok' : ''}>{flash ? t('mv.saved') : t(mineNote ? 'mv.hint' : 'mv.notMine')}</small></div>
      <div className="mv-zones">
        {ZONES.map((z) => (
          <button key={z.id} ref={(el) => { zones.current[z.id] = el }} type="button"
            className={`mv-zone tap ${vis === z.id ? 'here' : ''} ${over === z.id ? 'over' : ''}`} onClick={() => commit(z.id)}>
            <i>{z.ic}</i><b>{t(z.t)}</b><small>{t(z.sub)}</small>
            {vis === z.id && (
              <span ref={card} className={`mv-card ${mineNote ? '' : 'lock'}`} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onClick={(e) => e.stopPropagation()}>
                {thumb ? <img src={thumb} alt="" draggable="false" /> : <span className="mv-noimg">📄</span>}
                <span className={`mv-ok ${flash ? 'on' : ''}`} aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span>
              </span>
            )}
          </button>
        ))}
      </div>
      <button type="button" className="mv-done tap" onClick={onDone}>{t('mv.done')}</button>
    </div>
  )
}
