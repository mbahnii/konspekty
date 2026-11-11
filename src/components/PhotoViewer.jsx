import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '../i18n'
import { IBack, IForward, IClose, IZoomIn, IOpen } from './Icons'

// Просмотр фото на весь экран: ‹ › и свайп — листать, нажатие — увеличить, Esc / фон / ✕ — закрыть.
// items: [{ src, label, turn? }]; index: номер открытого (null — закрыто); всегда в DOM, чтобы открывалось и закрывалось плавно.
export default function PhotoViewer({ items, index, onClose, onIndex }) {
  const t = useT()
  const open = index != null && !!items[index]
  const keep = useRef(null)
  if (open) keep.current = items[index]
  const cur = keep.current
  const [zoom, setZoom] = useState(false)
  const down = useRef(null)
  const stage = useRef(null)
  const go = (d) => { const j = index + d; if (open && j >= 0 && j < items.length) onIndex(j) }
  useEffect(() => { setZoom(false) }, [index])
  useEffect(() => { const el = stage.current; if (zoom && el) { el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2; el.scrollTop = 0 } }, [zoom])
  useEffect(() => {
    if (!open) return
    const k = (e) => { if (e.key === 'Escape') onClose(); else if (e.key === 'ArrowLeft') go(-1); else if (e.key === 'ArrowRight') go(1) }
    addEventListener('keydown', k); return () => removeEventListener('keydown', k)
  }) // eslint-disable-line
  const swapped = (cur?.turn ?? 0) % 2 === 1

  return createPortal(
    <div className={`pv ${open ? 'open' : ''}`} aria-hidden={!open} role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget || e.target.classList.contains('pv-stage')) onClose() }}>
      <div className="pv-top">
        <span className="pv-count">{cur ? `${cur.label} · ${(index ?? 0) + 1} / ${items.length}` : ''}</span>
        {cur && <a className="pv-btn tap" href={cur.src} target="_blank" rel="noreferrer" aria-label={t('pv.orig')} title={t('pv.orig')}><IOpen /></a>}
        <button className="pv-btn tap" onClick={() => setZoom((z) => !z)} aria-label={t('pv.zoom')} title={t('pv.zoom')}><IZoomIn /></button>
        <button className="pv-btn tap" onClick={onClose} aria-label={t('pv.close')} title={t('pv.close')}><IClose /></button>
      </div>
      <div ref={stage} className={`pv-stage ${zoom ? 'zoom' : ''}`}
        onPointerDown={(e) => { down.current = { x: e.clientX, y: e.clientY } }}
        onPointerUp={(e) => { const d = down.current; down.current = null; if (d && !zoom && Math.abs(e.clientX - d.x) > 50 && Math.abs(e.clientY - d.y) < 60) go(e.clientX < d.x ? 1 : -1) }}>
        {cur && <img key={cur.src} className={`pv-img ${swapped ? 'sw' : ''}`} src={cur.src} alt={cur.label} draggable="false"
          style={cur.turn ? { transform: `rotate(${cur.turn * 90}deg)` } : undefined}
          onClick={() => setZoom((z) => !z)} />}
      </div>
      {items.length > 1 && <>
        <button className="pv-nav pv-l tap" disabled={!open || index === 0} onClick={() => go(-1)} aria-label={t('pv.prev')}><IBack /></button>
        <button className="pv-nav pv-r tap" disabled={!open || index === items.length - 1} onClick={() => go(1)} aria-label={t('pv.next')}><IForward /></button>
      </>}
    </div>, document.body)
}
