import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '../i18n'
import './guide.css'

// Ролики лежат в public/guide (сделаны в Проекты/Туториал)
const CLIPS = [
  'v1-dobavit-video',
  'v2-otkryt-konspekt',
  'v3-hronologiya',
  'v4-chek-list',
  'v5-menyu-video',
  'v6-razdely',
  'v7-yazyk-i-tema',
]
const src = (name, ext) => `${import.meta.env.BASE_URL}guide/${name}.${ext}`

const ISound = ({ on }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" stroke="none" />
    {on ? <><path d="M15.5 9a4 4 0 0 1 0 6" /><path d="M18 6.5a7.5 7.5 0 0 1 0 11" /></> : <path d="M16 9.5l5 5M21 9.5l-5 5" />}
  </svg>
)

function Clip({ name, i, active, cardRef }) {
  const t = useT()
  const ref = useRef(null)
  const [sound, setSound] = useState(false)

  // Играет только ролик, который сейчас в центре экрана
  useEffect(() => {
    const v = ref.current
    if (!v) return
    if (active) v.play().catch(() => {})
    else v.pause()
  }, [active])

  const toggleSound = (e) => {
    e.stopPropagation()
    const v = ref.current
    if (!v) return
    if (!sound) document.querySelectorAll('.g-card video').forEach((o) => { if (o !== v) o.muted = true })
    v.muted = sound
    if (!sound) { v.currentTime = 0; v.play().catch(() => {}) }
    setSound(!sound)
  }
  useEffect(() => {
    const v = ref.current
    const onVol = () => setSound(!v.muted)
    v?.addEventListener('volumechange', onVol)
    return () => v?.removeEventListener('volumechange', onVol)
  }, [])

  const n = i + 1
  return (
    <article ref={cardRef} className={`g-card ${active ? 'active' : ''}`} style={{ '--i': i }}>
      <div className="g-media">
        <video ref={ref} src={src(name, 'mp4')} poster={src(name, 'jpg')} muted loop playsInline preload="metadata" />
        <button className={`g-sound tap ${sound ? 'on' : ''}`} onClick={toggleSound} aria-label={t('guide.sound')} title={t('guide.sound')}>
          <ISound on={sound} />
        </button>
      </div>
      <div className="g-text">
        <span className="g-num">{n}</span>
        <div>
          <h3>{t(`guide.${n}.t`)}</h3>
          <p>{t(`guide.${n}.d`)}</p>
        </div>
      </div>
    </article>
  )
}

// Какая карточка ближе всего к центру экрана
function useFocused(refs) {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    let raf = 0
    const check = () => {
      raf = 0
      const mid = innerHeight / 2
      let best = 0, dist = Infinity
      refs.current.forEach((el, i) => {
        if (!el) return
        const r = el.getBoundingClientRect()
        const d = Math.abs(r.top + r.height / 2 - mid)
        if (d < dist) { dist = d; best = i }
      })
      setIdx(best)
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(check) }
    check()
    addEventListener('scroll', on, { passive: true, capture: true })
    addEventListener('resize', on)
    return () => { removeEventListener('scroll', on, { capture: true }); removeEventListener('resize', on); cancelAnimationFrame(raf) }
  }, [refs])
  return idx
}

export default function Guide() {
  const t = useT()
  const nav = useNavigate()
  const cards = useRef([])
  const focused = useFocused(cards)
  return (
    <div className="guide">
      <div className="g-glow" aria-hidden><i /><i /><i /></div>
      <header className="g-hero">
        <span className="g-eyebrow">{t('guide.eyebrow')}</span>
        <h1>{t('guide.title')}</h1>
        <p className="page-sub">{t('guide.sub')}</p>
      </header>
      <div className="g-grid">
        {CLIPS.map((name, i) => <Clip key={name} name={name} i={i} active={i === focused} cardRef={(el) => { cards.current[i] = el }} />)}
      </div>
      <footer className="g-foot" style={{ '--i': CLIPS.length }}>
        <button className="g-start tap" onClick={() => nav('/')}>{t('guide.start')}</button>
        <p>{t('guide.music')}</p>
      </footer>
    </div>
  )
}
