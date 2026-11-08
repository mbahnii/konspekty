import { useLayoutEffect, useRef, useState } from 'react'

// Вкладки: рамка («ползунок») стоит на активной и ездит за курсором; активная остаётся подкрашенной
export default function Segmented({ items, value, onChange }) {
  const box = useRef(null), thumb = useRef(null), placed = useRef(false)
  const [hover, setHover] = useState(null)
  const target = hover ?? value

  const move = () => {
    const btn = box.current?.querySelector(`button[data-id="${target}"]`), th = thumb.current
    if (!btn || !th) return
    if (!placed.current) th.classList.add('init')
    th.style.left = btn.offsetLeft + 'px'; th.style.width = btn.offsetWidth + 'px'
    th.style.top = btn.offsetTop + 'px'; th.style.height = btn.offsetHeight + 'px'
    if (!placed.current) { void th.offsetWidth; th.classList.remove('init'); placed.current = true }
  }
  useLayoutEffect(move)
  useLayoutEffect(() => { addEventListener('resize', move); return () => removeEventListener('resize', move) })

  return (
    <div className="seg" ref={box} role="tablist" onPointerLeave={() => setHover(null)}>
      <span className="thumb" ref={thumb} />
      {items.map((it) => (
        <button key={it.id} data-id={it.id} className={value === it.id ? 'on' : ''} role="tab"
          onPointerEnter={(e) => e.pointerType === 'mouse' && setHover(it.id)} onClick={() => onChange(it.id)}>
          {it.label}{it.count != null && <> <span className="badge-n">{it.count}</span></>}
        </button>
      ))}
    </div>
  )
}
