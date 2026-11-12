import { setArrive, useArrive } from '../store/arrive'
import { mo, ms } from './motion'

// «Улетает в список» — как окно в Dock на Mac.
// Кольцо очереди превращается в круглую миниатюру видео, по дуге летит к обложке строки в списке,
// по пути принимает её форму; список заранее раздвигает место; на месте обложка и текст появляются.

const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const visible = (el) => {
  const r = el.getBoundingClientRect()
  if (!r.width) return false
  const cs = getComputedStyle(el)
  return cs.visibility !== 'hidden' && cs.display !== 'none' && el.offsetParent !== null
}
const inView = (r) => r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth

// Все строки/карточки этого видео, которые сейчас на экране (боковая панель, список на телефоне, карточки)
function targets(vid) {
  return [...document.querySelectorAll(`[data-vid="${CSS.escape(vid)}"]`)].filter(visible)
}

async function waitTargets(vid, ms = 6000) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    const t = targets(vid)
    if (t.length) return t
    await sleep(150)
  }
  return []
}

export async function flyToList(vid, srcEl) {
  // откуда летим — запоминаем сразу: кольцо-источник может исчезнуть, пока ждём строку в списке
  const src = srcEl && srcEl.isConnected ? srcEl.getBoundingClientRect() : null
  const state = () => useArrive.getState().st[vid]
  const finish = () => { setArrive(vid, 'go'); setTimeout(() => state() === 'go' && setArrive(vid, null), ms(1100)) }
  if (document.hidden || reduce()) { finish(); return }

  await waitTargets(vid)                                     // хотя бы одно место для видео уже есть на экране
  if (state() === 'hidden') {
    setArrive(vid, 'wait')                                   // место раскрывается ОДНОВРЕМЕННО с вылетом шарика (полёт дольше раскрытия)
    await sleep(40)                                          // один кадр, чтобы строка/карточка появились в разметке
  }
  const els = targets(vid)                                   // после этого на экране могла появиться и карточка на главной
  const covers = els.map((el) => el.querySelector('.cover, .av')).filter((c) => c && inView(c.getBoundingClientRect()))
  const cover = covers.find((c) => c.classList.contains('cover')) || covers[0]   // на главной летим к большой карточке
  if (!cover || !src || !src.width) { finish(); return }
  const d = cover.getBoundingClientRect()                    // место посадки (строка уже стоит на своём месте)
  const S = src.width <= 40 ? Math.round(src.width) : 30      // из кольца очереди — того же размера, что кольцо
  const sx = src.left + src.width / 2, sy = src.top + src.height / 2
  const tx = d.left + d.width / 2, ty = d.top + d.height / 2

  // внешний слой летит по X, внутренний — по Y с другой кривой: вместе получается дуга
  const orbX = document.createElement('div')
  const orbY = document.createElement('div')
  const orb = document.createElement('div')
  orbX.className = 'fly-x'; orbY.className = 'fly-y'; orb.className = 'fly-orb'
  // шарик состоит из двух слоёв: зелёное кольцо с галочкой (то, что было в очереди) и обложка видео.
  // В полёте кольцо растворяется, а обложка проявляется — кольцо как будто превращается в видео.
  const img = document.createElement('span'), ring = document.createElement('span')
  img.className = 'fly-img'; ring.className = 'fly-ring'
  if (!String(vid).startsWith('ph-')) img.style.backgroundImage = `url("https://i.ytimg.com/vi/${vid}/mqdefault.jpg")`   // у фото-конспекта картинки YouTube нет
  ring.innerHTML = '<svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="14.5"/><path d="M12.6 18.3l3.7 3.7 7.2-7.4"/></svg>'
  orb.append(img, ring)
  Object.assign(orbX.style, { left: `${sx - S / 2}px`, top: `${sy - S / 2}px` })
  orbY.appendChild(orb); orbX.appendChild(orbY); document.body.appendChild(orbX)

  const dur = Math.min(1050, Math.max(760, Math.hypot(tx - sx, ty - sy) * 0.95)) * Math.max(.5, mo())
  const up = ty < sy
  const ax = orbX.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${tx - sx}px)` }],
    { duration: dur, easing: 'cubic-bezier(.65, 0, .35, 1)', fill: 'forwards' })
  orbY.animate([{ transform: 'translateY(0)' }, { transform: `translateY(${ty - sy}px)` }],
    { duration: dur, easing: up ? 'cubic-bezier(.12, .7, .3, 1)' : 'cubic-bezier(.7, 0, .85, .3)', fill: 'forwards' })
  // старт: кольцо «вспыхивает» и становится миниатюрой; в полёте — лёгкий шлейф; в конце — форма обложки
  orb.animate([
    { width: `${S}px`, height: `${S}px`, borderRadius: '50%', transform: 'translate(0,0) scale(.9)', opacity: 1, filter: 'blur(0) saturate(1.2)', boxShadow: '0 0 0 2px var(--success), 0 0 24px 6px color-mix(in srgb, var(--success) 70%, transparent)' },
    { offset: .14, transform: 'translate(0,0) scale(1.14)', opacity: 1, filter: 'blur(0) saturate(1.2)' },
    { offset: .55, filter: 'blur(1.5px) saturate(1.1)', boxShadow: '0 0 0 2px var(--success), 0 8px 26px 2px rgba(0,0,0,.35)' },
    { width: `${d.width}px`, height: `${d.height}px`, borderRadius: getComputedStyle(cover).borderRadius || '12px',
      transform: `translate(${(S - d.width) / 2}px, ${(S - d.height) / 2}px) scale(1)`, opacity: 1, filter: 'blur(0)', boxShadow: '0 0 0 0 transparent, 0 4px 14px rgba(0,0,0,.25)' },
  ], { duration: dur, easing: 'cubic-bezier(.32,.72,0,1)', fill: 'forwards' })

  img.animate([{ opacity: 0 }, { opacity: 0, offset: .2 }, { opacity: 1, offset: .62 }, { opacity: 1 }], { duration: dur, easing: 'linear', fill: 'forwards' })
  ring.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 1, transform: 'scale(1)', offset: .16 }, { opacity: 0, transform: 'scale(.7)', offset: .5 }, { opacity: 0, transform: 'scale(.7)' }], { duration: dur, easing: 'linear', fill: 'forwards' })

  await ax.finished.catch(() => {})
  finish()                                                   // обложка и текст появляются на месте шарика
  orbX.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms(320), easing: 'ease-out', fill: 'forwards' })
    .finished.catch(() => {}).then(() => orbX.remove())
}
