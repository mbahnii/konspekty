import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useVideo } from '../data/useData'
import { useT } from '../i18n'
import { hello } from '../lib/hello'
import { useMenu } from '../components/Menu'
import { useToast, useQueue } from '../store/ui'
import { useSettings } from '../store/settings'
import { useAuth } from '../store/auth'
import { LANGS } from '../i18n'
import { useProgress, stepOn } from '../store/progress'
import Segmented from '../components/Segmented'
import Timeline from '../components/Timeline'
import PhotoViewer from '../components/PhotoViewer'
import MiniTimeline from '../components/MiniTimeline'
import Rail from '../components/Rail'
import Pending from './Pending'
import { useVideoMenu } from '../components/VideoMenu'
import { useIndex } from '../data/useData'
import { IChevDown, IMore, IPlay, IClock, IYt, ILink, IPrint, ICopy, IOk, ICheck, ISearch, IBack, IPhoto, IZoomIn } from '../components/Icons'
import { Md, inline } from '../lib/md'
import { fmt, ytLink, framesFor, frameUrl, isPhotos, pageNo, stamp as pageStamp } from '../lib/time'   // не «stamp»: это имя занято переменной ссылки ?n=

const TABS = ['main', 'notes', 'guides', 'terms', 'later', 'pages']

const PhotosCtx = createContext(false)   // материал из фото: вместо времени — «стор. N», ссылок на YouTube нет
const Tc = ({ id, t }) => {
  const photos = useContext(PhotosCtx)
  const tr = useT()
  if (photos) return <span className="tc page">{pageStamp({ source: 'photos' }, t, tr('ph.page'))}</span>
  return <a className="tc tap" href={ytLink(id, t)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}><IPlay />{fmt(t)}</a>
}

// Полоса страниц фото-конспекта (вместо видео-хронологии): миниатюры, нажатие открывает фото
function PageStrip({ pages, onOpen, title }) {
  return (
    <div className="pstrip">
      <div className="tl-head"><IPhoto />{title}</div>
      <div className="pstrip-row">
        {pages.map((p, i) => (
          <button key={p.n} className="pstrip-it tap" onClick={() => onOpen(i)} aria-label={p.label}>
            <img loading="lazy" src={p.thumb} alt="" /><span>{p.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// Полоса вкладок получает фон, только когда прилипла к верху (иначе сквозь неё просвечивает свечение)
function useStuck() {
  const ref = useRef(null)
  useEffect(() => {
    const on = () => { const el = ref.current; if (el) el.classList.toggle('stuck', el.getBoundingClientRect().top <= 1) }
    on(); addEventListener('scroll', on, { passive: true }); addEventListener('resize', on)
    return () => { removeEventListener('scroll', on); removeEventListener('resize', on) }
  })
  return ref
}

export default function Video({ onBack }) {
  const stickyRef = useStuck()
  const { id, tab = 'main' } = useParams()
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const t = useT()
  const menu = useMenu()
  const [look, setLook] = useState(null)         // открытое фото (номер страницы в списке pages)
  const say = useToast((s) => s.say)
  const { summary: original, meta, error } = useVideo(id)
  // Язык конспекта — отдельная настройка для каждого видео (меню ⋯). Перевод делается по запросу и сохраняется.
  const origLang = original?.lang || 'uk'
  const noteLang = useSettings((s) => s.noteLang[id]) || origLang
  const setNoteLang = useSettings((s) => s.setNoteLang)
  const queueItems = useQueue((s) => s.items)
  const queueAdd = useQueue((s) => s.add)
  const translated = noteLang !== origLang ? original?.tr?.[noteLang] : null
  const summary = translated || original
  const trWaiting = !!original && noteLang !== origLang && !translated
  const videoMenu = useVideoMenu()
  const { data: index } = useIndex()
  const [filter, setFilter] = useState('all')
  const [current, setCurrent] = useState(null)

  const go = (tabName) => nav(`/v/${id}${tabName === 'main' ? '' : '/' + tabName}`)
  const goto = (secId) => nav(`/v/${id}/notes?s=${secId}&n=${Date.now()}`, { replace: tab === 'notes' })

  useLayoutEffect(() => { window.scrollTo({ top: 0 }) }, [id])

  // переход к разделу/термину/инструкции по ссылке ?s=...
  const target = sp.get('s'), stamp = sp.get('n')
  useEffect(() => {
    if (!target || !summary) return
    const prefix = tab === 'notes' ? 'sec-' : tab === 'terms' ? 'term-' : tab === 'guides' ? 'g-' : null
    if (!prefix) return
    const raf = requestAnimationFrame(() => {
      const el = document.getElementById(prefix + target)
      if (!el) return
      el.scrollIntoView({ behavior: 'smooth', block: tab === 'terms' ? 'center' : 'start' })
      el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 900)
    })
    return () => cancelAnimationFrame(raf)
  }, [target, stamp, tab, summary])

  // какой раздел сейчас на экране (для шкалы и содержания)
  useEffect(() => {
    if (tab !== 'notes' || !summary) { setCurrent(null); return }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) setCurrent(e.target.id.slice(4)) }), { rootMargin: '-150px 0px -60% 0px' })
    summary.sections.forEach((s) => { const el = document.getElementById('sec-' + s.id); el && io.observe(el) })
    return () => io.disconnect()
  }, [tab, summary, filter])

  const entry = index?.find((x) => x.id === id)
  const shell = (el) => <><main><div className="wrap">{el}</div></main><aside className="rail" /></>
  if (entry && !entry.ready) return <><main><Pending v={entry} onBack={onBack} /></main><aside className="rail" /></>
  if (error) return shell(<div className="empty" style={{ marginTop: 'var(--s8)' }}><b>{t('notFound')}</b>{t('notFound.d')}<div><button className="nf-btn tap" onClick={onBack}>{t('notFound.go')}</button></div></div>)
  if (!summary || !meta) return shell(<p style={{ color: 'var(--text-3)' }}>{t('loading')}</p>)
  const photos0 = isPhotos(meta)
  if (!TABS.includes(tab) || (tab === 'pages' && !photos0)) { nav(`/v/${id}`, { replace: true }); return null }

  const words = JSON.stringify(summary.sections.filter((s) => !s.skip).map((s) => s.body)).split(/\s+/).length
  const readMin = Math.max(1, Math.round(words / 180))
  const url = meta.url
  const photos = isPhotos(meta)
  const copyLink = () => { navigator.clipboard?.writeText(url); say(t('toast.linkCopied')) }

  const filterMenu = (e) => { e.stopPropagation(); menu.open(e.currentTarget, [
    { header: t('filter.show') },
    ...['all', 'clean', 'adv'].map((k) => ({ tick: filter === k, label: t(`filter.${k}`), onSelect: () => { setFilter(k); go('notes') } })),
  ], { alignRight: true }) }
  const pickLang = (l) => {
    if (l !== origLang && !original.tr?.[l]) {
      if (!useAuth.getState().session) { say(t('toast.trLogin')); return }
      const busy = queueItems.some((x) => x.vid === id && x.tr === l && (x.status === 'queued' || x.status === 'processing'))
      if (!busy) queueAdd(url || `photos:${id}`, 'reprocess', { title: meta.title, vid: id, tr: l })
      say(t('toast.translating'))
    }
    setNoteLang(id, l)
  }
  const moreMenu = (e) => { e.stopPropagation(); const v = index?.find((x) => x.id === id) ?? { id, url, ready: true }; const items = videoMenu(v); menu.open(e.currentTarget, [
    ...items.slice(1, -2), { icon: <IPrint />, label: t('print'), onSelect: () => print() },
    '-', { header: t('m.noteLang') },
    ...Object.keys(LANGS).map((l) => ({ tick: noteLang === l, label: LANGS[l], onSelect: () => pickLang(l) })),
    ...items.slice(-2),
  ], { alignRight: true }) }

  // страницы фото-конспекта: по одному снимку на страницу
  const seen = new Set()
  const pages = photos ? (meta.frames ?? []).filter((f) => { const k = pageNo(f.t); if (seen.has(k)) return false; seen.add(k); return true; }).map((f) => ({ src: frameUrl(id, f), thumb: frameUrl(id, f, true), n: pageNo(f.t), label: `${t('ph.page')} ${pageNo(f.t)}` })) : []
  const openPage = (n) => { const i = pages.findIndex((x) => x.n === n); if (i >= 0) setLook(i) }

  const items = [
    { id: 'main', label: t('tab.main') },
    ...(photos ? [{ id: 'pages', label: t('tab.pages'), count: pages.length }] : []),
    { id: 'notes', label: t('tab.notes'), count: summary.sections.length },
    { id: 'guides', label: t('tab.guides'), count: summary.guides.length },
    { id: 'terms', label: t('tab.terms'), count: summary.terms.length },
    { id: 'later', label: t('tab.later'), count: summary.later.length },
  ]
  const secOf = (tm) => (summary.sections.find((s) => tm >= s.t && tm < s.end) ?? summary.sections[0]).id

  return (
    <PhotosCtx.Provider value={photos}>
      <main>
        <div className="wrap">
          <div className="head">
            <div className="titles">
              <div className="hello"><span>{hello(t)} 👋</span></div>
              <h1>{meta.title}</h1>
            </div>
            <div className="head-actions">
              <button className="pill-btn sq tap" onClick={moreMenu} title={t('more')}><IMore /></button>
            </div>
          </div>

          <div className="meta">
            {!photos && <a className="chip accent tap" href={url} target="_blank" rel="noreferrer"><IPlay /> {t('watch')}</a>}
            <span className="chip">{meta.channel}</span>
            <span className="chip"><IClock /> {photos ? `${meta.pages} ${t('ph.page')}` : fmt(meta.duration)} · {t('read', { n: readMin })}</span>
            <span className="chip">{t(`level.${summary.level}`)}</span>
          </div>

          <div className="sticky" ref={stickyRef}>
            <div className="plate">
              <Segmented items={items} value={tab} onChange={(v) => { go(v); const top = document.querySelector('.sticky')?.offsetTop ?? 0; if (scrollY > top) scrollTo({ top }) }} />
              <MiniTimeline secs={summary.sections} current={current} onPick={goto} />
            </div>
          </div>
          {photos ? (tab === 'pages' ? null : <PageStrip pages={pages} onOpen={setLook} title={t('ph.pages')} />) : <Timeline id={id} summary={summary} meta={meta} current={current} onPick={goto} />}

          <section className="panel on" key={tab}>
            {tab === 'main' && (
              <>
                {trWaiting && <div className="card draft"><p>✦ {t('tr.pending', { l: LANGS[noteLang] })}</p></div>}
                {summary.engine && <div className="card draft"><p>✦ {t('draft', { m: summary.engine })}</p></div>}
                <div className="card"><p className="tldr">{inline(summary.tldr)}</p></div>
                <div className="card"><h2>{t('keyPoints')}</h2>
                  <div className="list">{summary.key_points.map((k, i) => (
                    <button key={i} className="li tap" onClick={() => goto(secOf(k.t))}><span className="n">{i + 1}</span><span className="t">{inline(k.text)}</span><Tc id={id} t={k.t} /></button>
                  ))}</div>
                </div>
                {summary.skipped_summary && <div className="card skip"><h2>{t('cut')}</h2><p className="body">{summary.skipped_summary}</p></div>}
              </>
            )}
            {tab === 'notes' && <div className="notes-bar"><button className="pill-btn tap" onClick={filterMenu}><IChevDown /><span>{t(`filter.${filter}`)}</span></button></div>}
            {tab === 'notes' && summary.sections.map((s) => {
              if ((filter === 'clean' && s.skip) || (filter === 'adv' && !s.adv)) return null
              const fr = s.skip ? [] : framesFor(meta, s)
              return (
                <article key={s.id} id={`sec-${s.id}`} className={`card ${s.skip ? 'skip' : ''}`}>
                  <h2>{s.title} <Tc id={id} t={s.t} />{s.adv && <span className="badge adv">{t('advanced')}</span>}{s.skip && <span className="badge">{t('skipped')}</span>}</h2>
                  <div className="body"><Md text={s.body} /></div>
                  {fr.length > 0 && <div className={`frames ${photos ? 'photos' : ''}`}>{fr.map((f) => (
                    <a key={f.t} className="frame" href={photos ? frameUrl(id, f) : ytLink(id, f.t)} target="_blank" rel="noreferrer" onClick={photos ? (e) => { e.preventDefault(); openPage(pageNo(f.t)) } : undefined}>
                      <div className="img"><img loading="lazy" src={frameUrl(id, f)} alt="" /><div className="play"><span>{photos ? <IZoomIn /> : <IPlay />}</span></div></div>
                      <figcaption>{pageStamp(meta, f.t, t('ph.page'))}</figcaption></a>
                  ))}</div>}
                  {s.note && <div className="note"><div className="who">✦ {t('claudeNote')}</div>{inline(s.note)}</div>}
                </article>
              )
            })}
            {tab === 'pages' && (
              <div className="pg-grid">
                {pages.map((p, i) => (
                  <button key={p.n} className="pg-card tap" onClick={() => setLook(i)} aria-label={`${t('ph.openPage')}: ${p.label}`}>
                    <span className="pg-img"><img loading="lazy" src={p.thumb} alt="" /><span className="pg-zoom"><IZoomIn /></span></span>
                    <b>{p.label}</b>
                  </button>
                ))}
              </div>
            )}
            {tab === 'guides' && <Guides id={id} summary={summary} />}
            {tab === 'terms' && <Terms summary={summary} />}
            {tab === 'later' && (summary.later.length ? summary.later.map((x, i) => (
              <div key={i} className="card"><h3>{x.title} <Tc id={id} t={x.t} /></h3><div className="body" style={{ color: 'var(--text-2)' }}>{inline(x.text)}</div></div>
            )) : <p style={{ color: 'var(--text-3)', marginTop: 'var(--s5)' }}>{t('empty')}</p>)}
          </section>
        </div>
      </main>
      <PhotoViewer items={pages.map((p) => ({ src: p.src, label: p.label }))} index={look != null && look < pages.length ? look : null} onClose={() => setLook(null)} onIndex={setLook} />
      <Rail id={id} tab={tab} summary={summary} current={current} onGoto={goto} onTab={go} photos={photos} />
    </PhotosCtx.Provider>
  )
}

function Guides({ id, summary }) {
  const t = useT()
  const say = useToast((s) => s.say)
  const marks = useProgress((p) => p.marks)
  const setMark = useProgress((p) => p.setMark)
  const [copied, setCopied] = useState(null)
  const copy = (key, text) => { navigator.clipboard?.writeText(text); setCopied(key); say(t('toast.copied')); setTimeout(() => setCopied(null), 1400) }
  return summary.guides.map((g) => (
    <article key={g.id} id={`g-${g.id}`} className="card">
      <h3>{g.title} <Tc id={id} t={g.t} />{g.done_already && <span className="badge ok">{t('alreadyDone')}</span>}</h3>
      {g.goal && <div className="goal">{g.goal}</div>}
      <div className="list">{g.steps.map((st, i) => {
        const on = stepOn(marks, id, g, i), key = `${id}/${g.id}/${i}`
        return (
          <div key={i} className={`li step ${on ? 'done' : ''}`}>
            <button className={`check tap ${on ? 'on' : ''}`} aria-label={t('checkStep')} onClick={() => setMark(key, !on)}><ICheck /></button>
            <div className="stext"><div>{inline(st.text)}</div>
              {st.command && <div className="code">{st.kind && <span className="kind">{st.kind}</span>}{st.command}
                <button className={`copy tap ${copied === key ? 'ok' : ''}`} aria-label={t('copy')} onClick={() => copy(key, st.command)}>{copied === key ? <IOk /> : <ICopy />}</button></div>}
            </div>
          </div>
        )
      })}</div>
    </article>
  ))
}

function Terms({ summary }) {
  const t = useT()
  const [q, setQ] = useState('')
  const l = q.trim().toLowerCase()
  return (
    <div className="card">
      <label className="search"><ISearch /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('termSearch')} /></label>
      <div className="list" style={{ marginTop: 'var(--s3)' }}>
        {summary.terms.filter((x) => !l || `${x.term} ${x.explain}`.toLowerCase().includes(l)).map((x) => (
          <div key={x.id} id={`term-${x.id}`} className="li term"><b>{x.term}</b><p>{inline(x.explain)}</p></div>
        ))}
      </div>
    </div>
  )
}
