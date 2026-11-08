import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '../i18n'
import { useSettings } from '../store/settings'
import { useQueue, useToast, useIslandPrefs } from '../store/ui'
import { useAllSummaries, useIndex } from '../data/useData'
import { useLibrary } from '../store/library'
import Segmented from './Segmented'
import { IPlus, IExpand, ICollapse, ISearch, ISystem, ISun, IMoon, ITrash } from './Icons'

const ytId = (u) => u.match(/(?:youtu\.be\/|[?&]v=|shorts\/|live\/|embed\/)([\w-]{11})/)?.[1]

// Превью по ссылке: картинка сразу, название и канал подгружаются
function usePreview(url) {
  const id = ytId(url.trim())
  const [info, setInfo] = useState({ id: null })
  useEffect(() => {
    if (!id) { setInfo((s) => (s.id ? { ...s, gone: true } : s)); return }
    setInfo({ id, loading: true })
    const ctl = new AbortController()
    const tm = setTimeout(() => {
      fetch(`https://noembed.com/embed?url=${encodeURIComponent('https://www.youtube.com/watch?v=' + id)}`, { signal: ctl.signal })
        .then((r) => r.json()).then((j) => setInfo({ id, title: j.title, channel: j.author_name }))
        .catch(() => setInfo((s) => ({ ...s, loading: false })))
    }, 250)
    return () => { clearTimeout(tm); ctl.abort() }
  }, [id])
  return { ...info, valid: !!id, shown: !!id }
}

// «Пилюля» как в todo-main: клик — карточка над пилюлей; справа «уголки» и «шире»
export default function Island({ open, setOpen }) {
  const t = useT()
  const nav = useNavigate()
  const say = useToast((s) => s.say)
  const { items, sync, add, remove, setSync } = useQueue()
  const { wide, square, toggle } = useIslandPrefs()
  const { theme, lang, setTheme, setLang } = useSettings()
  const [url, setUrl] = useState('')
  const [q, setQ] = useState('')
  const [confirm, setConfirm] = useState(null)
  const box = useRef(null), input = useRef(null)
  const all = useAllSummaries(open)
  const prev = usePreview(url)
  const { data: index } = useIndex()
  const hidden = useLibrary((s) => s.hidden)
  // это видео уже есть на сайте или уже стоит в очереди?
  const dup = !prev.id ? null
    : index?.some((v) => v.id === prev.id && !hidden[v.id]) ? 'isl.dupVideo'
    : items.some((it) => (it.kind ?? 'add') === 'add' && it.status !== 'done' && it.status !== 'error' && ytId(it.url) === prev.id) ? 'isl.dupQueue' : null
  const lastPrev = useRef(prev)
  if (prev.shown) lastPrev.current = prev
  const p = lastPrev.current

  useEffect(() => { if (open) { const id = setTimeout(() => input.current?.focus({ preventScroll: true }), 300); return () => clearTimeout(id) } else setConfirm(null) }, [open])
  useEffect(() => {
    const on = () => setSync('ok'), off = () => setSync('off')
    addEventListener('online', on); addEventListener('offline', off)
    if (!navigator.onLine) setSync('off')
    return () => { removeEventListener('online', on); removeEventListener('offline', off) }
  }, [setSync])
  useEffect(() => {
    const onDoc = (e) => {
      if (!e.target.closest('.trash,.del')) setConfirm(null)
      if (!e.target.closest('.island') && !e.target.closest('[data-open-island]') && !e.target.closest('.menu')) setOpen(false)
    }
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('click', onDoc); document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('click', onDoc); document.removeEventListener('keydown', onKey) }
  }, [setOpen])

  const submit = () => {
    if (!prev.valid) {
      say(t('isl.badLink'))
      box.current.animate([{ translate: '0' }, { translate: '-6px' }, { translate: '6px' }, { translate: '0' }], { duration: 280 })
      return
    }
    if (dup) { say(t(dup)); box.current.animate([{ translate: '0' }, { translate: '-6px' }, { translate: '6px' }, { translate: '0' }], { duration: 280 }); return }
    add(url.trim(), 'add', { title: prev.title, channel: prev.channel, vid: prev.id }); setUrl(''); say(t('isl.queued'))
  }

  const lq = q.trim().toLowerCase()
  const results = []
  if (lq) for (const { id, summary } of all) {
    summary.sections.forEach((s) => `${s.title} ${s.body}`.toLowerCase().includes(lq) && results.push({ kind: 'r.notes', name: s.title, go: () => nav(`/v/${id}/notes?s=${s.id}&n=${Date.now()}`) }))
    summary.terms.forEach((x) => `${x.term} ${x.explain}`.toLowerCase().includes(lq) && results.push({ kind: 'r.term', name: x.term, go: () => nav(`/v/${id}/terms?s=${encodeURIComponent(x.id)}&n=${Date.now()}`) }))
    summary.guides.forEach((g) => `${g.title} ${JSON.stringify(g.steps)}`.toLowerCase().includes(lq) && results.push({ kind: 'r.guide', name: g.title, go: () => nav(`/v/${id}/guides?s=${g.id}&n=${Date.now()}`) }))
  }

  const shortUrl = (u) => u.replace(/^https?:\/\/(www\.)?/, '')
  return (
    <div className="island-dock">
      <div ref={box} className={`island ${open ? 'open' : ''} ${wide ? 'wide' : ''} ${square ? 'square' : ''}`}>
        <div className="isl-panel"><div className="isl-inner"><div className="isl-scroll">
          <div className="isl-link">
            <input ref={input} value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t('isl.link')} inputMode="url" autoCapitalize="off" autoCorrect="off"
              onKeyDown={(e) => e.key === 'Enter' && submit()} />
            <button className="go tap" onClick={submit}>{t('isl.go')}</button>
          </div>
          <div className={`isl-prev ${prev.shown ? 'show' : ''}`}><div>
            <div className="prev">
              {p.id && <img src={`https://i.ytimg.com/vi/${p.id}/mqdefault.jpg`} alt="" />}
              <div className="pt">{p.title ? <><b>{p.title}</b><small>{p.channel}</small></> : p.loading ? <span className="sk" /> : <small>{shortUrl(url)}</small>}{dup && <span className="dup">{t(dup)}</span>}</div>
            </div>
          </div></div>

          <div className="isl-h">{t('isl.queue')}</div>
          {items.length ? items.map((it) => (
            <div key={it.id} className={`isl-q ${confirm === it.id ? 'conf' : ''}`}>
              <div className="rc">
                {it.vid ? <img src={`https://i.ytimg.com/vi/${it.vid}/default.jpg`} alt="" /> : <span className={`sync ${it.status === 'processing' ? 'busy' : it.status === 'done' ? 'ok' : 'off'}`} />}
                <div className="qt"><b>{it.kind && it.kind !== 'add' ? `${t(`q.${it.kind}`)} · ` : ''}{it.title || shortUrl(it.url)}</b><small>{shortUrl(it.url)}</small></div>
                <span className="st">{t(`st.${it.status}`)}</span>
                {it.status === 'queued' && <button className="trash" title={t('m.delete')} onClick={() => setConfirm(confirm === it.id ? null : it.id)}><ITrash /></button>}
              </div>
              <button className="del" onClick={() => { remove(it.id); setConfirm(null) }}>{t('isl.confirm')}</button>
            </div>
          )) : <div className="isl-row"><span className="st" style={{ margin: 0 }}>{t('isl.empty')}</span></div>}

          <div className="isl-h">{t('isl.search')}</div>
          <label className="isl-search"><ISearch /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('isl.searchPh')} /></label>
          {results.slice(0, 8).map((r, i) => <button key={i} className="isl-row tap" onClick={() => { setOpen(false); r.go() }}><span className="nm">{r.name}</span><span className="st">{t(r.kind)}</span></button>)}
          {lq && !results.length && <div className="isl-row"><span className="st" style={{ margin: 0 }}>{t('isl.none')}</span></div>}

          <div className="isl-h">{t('isl.themeLang')}</div>
          <div className="isl-opts">
            <Segmented className="isl-seg" value={theme} onChange={setTheme}
              items={[{ id: 'system', label: <ISystem />, title: t('theme.system') }, { id: 'light', label: <ISun />, title: t('theme.light') }, { id: 'dark', label: <IMoon />, title: t('theme.dark') }]} />
            <Segmented className="isl-seg" value={lang} onChange={setLang}
              items={[{ id: 'uk', label: 'УКР' }, { id: 'ru', label: 'РУС' }, { id: 'en', label: 'ENG' }]} />
          </div>
        </div></div></div>

        <div className="isl-bar">
          <button className="isl-main" onClick={(e) => { e.stopPropagation(); setOpen(!open) }}><IPlus />{t('addVideo')}</button>
          <span className={`sync ${sync}`} title={t(`sync.${sync}`)} />
          <button className={`isl-btn ${square ? 'on' : ''}`} title={t('isl.corners')} onClick={(e) => { e.stopPropagation(); toggle('square') }}>
            <span className={`shape sq ${square ? 'off' : ''}`} /><span className={`shape round ${square ? '' : 'off'}`} />
          </button>
          <button className={`isl-btn wide-btn ${wide ? 'on' : ''}`} title={t('isl.wide')} onClick={(e) => { e.stopPropagation(); toggle('wide') }}>
            <IExpand className={`i ${wide ? 'off' : ''}`} /><ICollapse className={`i ${wide ? '' : 'off'}`} />
          </button>
        </div>
      </div>
    </div>
  )
}
