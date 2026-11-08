import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'

const Ctx = createContext(null)
export const useMenu = () => useContext(Ctx)

// Всплывающее меню: позиционируется так, чтобы всегда помещаться на экране (переворачивается), с размытием
export function MenuProvider({ children }) {
  const ref = useRef(null)
  const [st, setSt] = useState({ items: [], opts: {}, anchor: null, phase: 'closed', pos: { left: 0, top: 0, origin: 'top left' } })

  const close = useCallback(() => setSt((s) => { s.anchor?.classList.remove('open'); return s.phase === 'closed' ? s : { ...s, phase: 'closed', anchor: null } }), [])
  const open = useCallback((anchor, items, opts = {}) => {
    items = items.filter((it, i, a) => it !== '-' || (i > 0 && a[i - 1] !== '-' && i < a.length - 1))
    setSt((s) => { s.anchor?.classList.remove('open'); return { items, opts, anchor, phase: 'measure', pos: s.pos } })
  }, [])

  useLayoutEffect(() => {
    if (st.phase !== 'measure' || !ref.current) return
    const mw = ref.current.offsetWidth, mh = ref.current.offsetHeight, { anchor, opts } = st
    let x, y, ox = 'left', oy = 'top'
    const r = anchor?.getBoundingClientRect()
    if (opts.point) { x = opts.point.x; y = opts.point.y }
    else { x = opts.alignRight ? r.right - mw : r.left; y = r.bottom + 6 }
    if (x + mw > innerWidth - 8) { x = Math.max(8, x - (opts.point ? mw : 0)); if (x + mw > innerWidth - 8) x = innerWidth - mw - 8; ox = 'right' }
    if (y + mh > innerHeight - 8) { y = opts.point ? y - mh : r.top - mh - 6; oy = 'bottom' }
    if (y < 8) y = 8
    if (opts.alignRight) ox = 'right'
    anchor?.classList.add('open')
    setSt((s) => ({ ...s, phase: 'ready', pos: { left: x, top: y, origin: `${oy} ${ox}` } }))
    requestAnimationFrame(() => setSt((s) => (s.phase === 'ready' ? { ...s, phase: 'show' } : s)))
  }, [st.phase]) // eslint-disable-line

  useEffect(() => {
    const onDoc = (e) => { if (!e.target.closest('.menu')) close() }
    const onKey = (e) => e.key === 'Escape' && close()
    document.addEventListener('click', onDoc); document.addEventListener('keydown', onKey)
    addEventListener('scroll', close, { passive: true }); addEventListener('resize', close)
    return () => { document.removeEventListener('click', onDoc); document.removeEventListener('keydown', onKey); removeEventListener('scroll', close); removeEventListener('resize', close) }
  }, [close])

  return (
    <Ctx.Provider value={{ open, close }}>
      {children}
      <div ref={ref} className={`menu ${st.phase === 'show' ? 'show' : ''}`} role="menu"
        style={{ left: st.pos.left, top: st.pos.top, transformOrigin: st.pos.origin, visibility: st.phase === 'measure' ? 'hidden' : undefined }}>
        {st.items.map((it, i) => {
          if (it === '-') return <hr key={i} />
          if (it.header) return <div key={i} className="mh">{it.header}</div>
          return (
            <button key={i} className={`mi ${it.danger ? 'danger' : ''}`} style={{ '--d': i }}
              onClick={(e) => { e.stopPropagation(); close(); it.onSelect?.() }}>
              {it.tick !== undefined ? <span className="tick">{it.tick ? '✓' : ''}</span> : it.icon}
              <span>{it.label}</span>{it.sc && <span className="sc">{it.sc}</span>}
            </button>
          )
        })}
      </div>
    </Ctx.Provider>
  )
}
