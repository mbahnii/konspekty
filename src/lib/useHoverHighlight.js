import { useEffect } from 'react'

// Плашка наведения: одна на список, появляется плавно и дальше переезжает за курсором
const GROUPS = '.side-card, .side-foot, .toc, .list, .menu, .isl-scroll'
const ITEMS = '.row:not(.add), .toc a, .mini-row, .next.tap, .li, .mi, button.isl-row'

export function useHoverHighlight() {
  useEffect(() => {
    if (!matchMedia('(hover: hover)').matches) return
    let group = null, hl = null

    const hide = () => { hl?.classList.remove('on'); group = null; hl = null }
    const place = (item) => {
      const gr = group.getBoundingClientRect(), ir = item.getBoundingClientRect()
      const x = ir.left - gr.left + group.scrollLeft - group.clientLeft
      const y = ir.top - gr.top + group.scrollTop - group.clientTop
      const first = !hl.classList.contains('on')
      if (first) hl.classList.add('jump')
      hl.style.width = ir.width + 'px'; hl.style.height = ir.height + 'px'
      hl.style.transform = `translate(${x}px, ${y}px)`
      hl.style.borderRadius = getComputedStyle(item).borderRadius
      if (first) { void hl.offsetWidth; hl.classList.remove('jump') }
      hl.classList.add('on')
    }
    const over = (e) => {
      const t = e.target instanceof Element ? e.target : null
      const item = t?.closest(ITEMS)
      const g = (item ?? t)?.closest(GROUPS)
      if (!g) return hide()
      if (!item) { if (g !== group) hide(); return }          // в промежутке между пунктами — стоит на месте
      if (g !== group || !g.contains(hl)) {
        hide(); group = g
        hl = g.querySelector(':scope > .hl')
        if (!hl) { hl = document.createElement('span'); hl.className = 'hl'; g.prepend(hl) }
      }
      place(item)
    }
    const out = (e) => { if (!e.relatedTarget) hide() }      // курсор ушёл из окна
    document.addEventListener('pointerover', over)
    document.addEventListener('pointerout', out)
    return () => { document.removeEventListener('pointerover', over); document.removeEventListener('pointerout', out) }
  }, [])
}
