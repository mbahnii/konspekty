import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '../i18n'
import { IFilm } from './Icons'
import { fmt, framesFor, frameUrl, isPhotos, stamp } from '../lib/time'

// «Плёнка» видео: отрезки с кадрами, подсказка с 6 кадрами (всегда целиком на экране)
export default function Timeline({ id, summary, meta, current, onPick }) {
  const t = useT()
  const tip = useRef(null)
  const hideT = useRef(0)
  const hide = (delay = 0) => { clearTimeout(hideT.current); hideT.current = setTimeout(() => tip.current?.classList.remove('show'), delay) }
  const secs = summary.sections
  const photos = isPhotos(meta)
  const lab = (x) => stamp(meta, x, t('ph.page'))
  const total = secs[secs.length - 1].end
  const step = photos ? 60 * Math.max(1, Math.ceil(total / 60 / 12)) : total > 3600 ? 600 : total > 900 ? 120 : 60
  const marks = []
  for (let x = 0; x < total; x += step) if (x / total < 0.9) marks.push(x)

  useEffect(() => {
    const onScroll = () => hide()
    addEventListener('scroll', onScroll, { passive: true })
    return () => removeEventListener('scroll', onScroll)
  }, [])

  const show = (e, s) => {
    clearTimeout(hideT.current)
    const el = tip.current, fr = s.skip ? [] : framesFor(meta, s)
    const first = !el.classList.contains('show')
    el.innerHTML = `<div class="tt"><b></b><span class="h"></span></div>` + (fr.length ? `<div class="grid">${fr.map((f) => `<img src="${frameUrl(id, f, true)}" alt="">`).join('')}</div>` : '')
    el.querySelector('b').textContent = `${lab(s.t)} · ${s.title}`
    el.querySelector('.h').textContent = (s.hint || '') + (s.skip ? t('tl.skipped') : '')
    const r = e.currentTarget.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight, gap = 10
    const below = r.bottom + gap + h <= innerHeight - 8
    const x = Math.min(Math.max(r.left + r.width / 2 - w / 2, 8), innerWidth - w - 8)
    el.classList.toggle('jump', first)
    if (first) { el.classList.remove('show'); void el.offsetWidth }
    el.style.left = x + 'px'; el.style.top = (below ? r.bottom + gap : Math.max(8, r.top - gap - h)) + 'px'
    el.style.setProperty('--ox', r.left + r.width / 2 - x + 'px'); el.style.setProperty('--oy', below ? '0%' : '100%')
    el.classList.add('show')
  }

  return (
    <div className="timeline">
      <div className="tl-head"><IFilm />{t('tlTitle')}<span className="hint">{t(matchMedia('(hover: none)').matches ? 'tlHintTouch' : 'tlHint')}</span></div>
      <div className="tl-bar">
        {secs.map((s) => {
          const f = s.skip ? null : framesFor(meta, s, 1)[0]
          return <button key={s.id} className={`tl-seg ${s.skip ? 'skip' : ''} ${current === s.id ? 'on' : ''}`} aria-label={s.title}
            style={{ flex: s.end - s.t, backgroundImage: f ? `url("${frameUrl(id, f, true)}")` : undefined }}
            onMouseEnter={(e) => show(e, s)} onMouseLeave={() => hide(120)}
            onClick={() => { hide(); onPick(s.id) }} />
        })}
      </div>
      <div className="tl-scale">
        {marks.map((x) => <span key={x} style={{ left: `${(x / total) * 100}%` }}>{lab(x)}</span>)}
        {!photos && <span style={{ left: '100%' }}>{fmt(total)}</span>}
      </div>
      {createPortal(<div className="tip" ref={tip} />, document.body)}
    </div>
  )
}
