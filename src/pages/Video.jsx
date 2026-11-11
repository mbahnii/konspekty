import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useVideo } from '../data/useData'
import { useT } from '../i18n'
import { hello } from '../lib/hello'
import { useMenu } from '../components/Menu'
import { useToast } from '../store/ui'
import { useProgress, stepOn } from '../store/progress'
import Segmented from '../components/Segmented'
import Timeline from '../components/Timeline'
import Rail from '../components/Rail'
import Pending from './Pending'
import { useVideoMenu } from '../components/VideoMenu'
import { useIndex } from '../data/useData'
import { IChevDown, IMore, IPlay, IClock, IYt, ILink, IPrint, ICopy, IOk, ICheck, ISearch, IBack } from '../components/Icons'
import { Md, inline } from '../lib/md'
import { fmt, ytLink, framesFor, frameUrl } from '../lib/time'

const TABS = ['main', 'notes', 'guides', 'terms', 'later']

const Tc = ({ id, t }) => (
  <a className="tc tap" href={ytLink(id, t)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}><IPlay />{fmt(t)}</a>
)

// Полоса вкладок получает фон, только когда прилипла к верху (иначе сквозь неё просвечивает свечение)
function useStuck() {
  const ref = useRef(null)
  useEffect(() => {
    const on = () => { const el = ref.current; if (el) el.classList.toggle('stuck', el.getBoundingClientRect().top <= 9) }
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
  const say = useToast((s) => s.say)
  const { summary, meta, error } = useVideo(id)
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
  if (!TABS.includes(tab)) { nav(`/v/${id}`, { replace: true }); return null }

  const words = JSON.stringify(summary.sections.filter((s) => !s.skip).map((s) => s.body)).split(/\s+/).length
  const readMin = Math.max(1, Math.round(words / 180))
  const url = meta.url
  const copyLink = () => { navigator.clipboard?.writeText(url); say(t('toast.linkCopied')) }

  const filterMenu = (e) => { e.stopPropagation(); menu.open(e.currentTarget, [
    { header: t('filter.show') },
    ...['all', 'clean', 'adv'].map((k) => ({ tick: filter === k, label: t(`filter.${k}`), onSelect: () => { setFilter(k); go('notes') } })),
  ], { alignRight: true }) }
  const moreMenu = (e) => { e.stopPropagation(); const v = index?.find((x) => x.id === id) ?? { id, url, ready: true }; const items = videoMenu(v); menu.open(e.currentTarget, [
    ...items.slice(1, -2), { icon: <IPrint />, label: t('print'), onSelect: () => print() }, ...items.slice(-2),
  ], { alignRight: true }) }

  const items = [
    { id: 'main', label: t('tab.main') },
    { id: 'notes', label: t('tab.notes'), count: summary.sections.length },
    { id: 'guides', label: t('tab.guides'), count: summary.guides.length },
    { id: 'terms', label: t('tab.terms'), count: summary.terms.length },
    { id: 'later', label: t('tab.later'), count: summary.later.length },
  ]
  const secOf = (tm) => (summary.sections.find((s) => tm >= s.t && tm < s.end) ?? summary.sections[0]).id

  return (
    <>
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
            <a className="chip accent tap" href={url} target="_blank" rel="noreferrer"><IPlay /> {t('watch')}</a>
            <span className="chip">{meta.channel}</span>
            <span className="chip"><IClock /> {fmt(meta.duration)} · {t('read', { n: readMin })}</span>
            <span className="chip">{t(`level.${summary.level}`)}</span>
          </div>

          <div className="sticky" ref={stickyRef}>
            <Segmented items={items} value={tab} onChange={(v) => { go(v); const top = document.querySelector('.sticky')?.offsetTop ?? 0; if (scrollY > top) scrollTo({ top }) }} />
            <Timeline id={id} summary={summary} meta={meta} current={current} onPick={goto} />
          </div>

          <section className="panel on" key={tab}>
            {tab === 'main' && (
              <>
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
                  {fr.length > 0 && <div className="frames">{fr.map((f) => (
                    <a key={f.t} className="frame" href={ytLink(id, f.t)} target="_blank" rel="noreferrer">
                      <div className="img"><img loading="lazy" src={frameUrl(id, f)} alt="" /><div className="play"><span><IPlay /></span></div></div>
                      <figcaption>{fmt(f.t)}</figcaption></a>
                  ))}</div>}
                  {s.note && <div className="note"><div className="who">✦ {t('claudeNote')}</div>{inline(s.note)}</div>}
                </article>
              )
            })}
            {tab === 'guides' && <Guides id={id} summary={summary} />}
            {tab === 'terms' && <Terms summary={summary} />}
            {tab === 'later' && (summary.later.length ? summary.later.map((x, i) => (
              <div key={i} className="card"><h3>{x.title} <Tc id={id} t={x.t} /></h3><div className="body" style={{ color: 'var(--text-2)' }}>{inline(x.text)}</div></div>
            )) : <p style={{ color: 'var(--text-3)', marginTop: 'var(--s5)' }}>{t('empty')}</p>)}
          </section>
        </div>
      </main>
      <Rail id={id} tab={tab} summary={summary} current={current} onGoto={goto} onTab={go} />
    </>
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
