import { useT } from '../i18n'
import { useProgress, stepOn, guideDone } from '../store/progress'
import { fmt } from '../lib/time'
import { inline } from '../lib/md'

const Ring = ({ done, total }) => (
  <svg viewBox="0 0 44 44"><circle className="bg" cx="22" cy="22" r="18" /><circle className="fg" cx="22" cy="22" r="18" strokeDasharray="113.1" style={{ strokeDashoffset: 113.1 * (1 - (total ? done / total : 0)) }} /></svg>
)

// Правая колонка — зависит от вкладки
export default function Rail({ id, tab, summary, current, onGoto, onTab }) {
  const t = useT()
  const marks = useProgress((p) => p.marks)
  const gs = summary.guides
  const done = gs.filter((g) => guideDone(marks, id, g)).length
  const next = gs.find((g) => !guideDone(marks, id, g))
  const nextStep = next ? next.steps.findIndex((_, i) => !stepOn(marks, id, next, i)) : -1
  const scrollTo = (el, block = 'start') => { if (!el) return; el.scrollIntoView({ behavior: 'smooth', block }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 900) }

  let body = null
  if (tab === 'main') body = (
    <>
      <div className="side-card"><div className="ring"><Ring done={done} total={gs.length} /><div><b>{t('rail.done', { a: done, b: gs.length })}</b><span>{t('rail.guidesDone')}</span></div></div></div>
      <div className="side-card" style={{ marginTop: 'var(--s4)' }}><div className="side-title"><span>{t('rail.next')}</span></div>
        {next ? <button className="next tap" onClick={() => onTab('guides')}>{next.title}<small>{t('rail.step', { a: nextStep + 1, b: next.steps.length })}</small></button> : <div className="next">{t('rail.allDone')}</div>}</div>
      <div className="side-card" style={{ marginTop: 'var(--s4)' }}><div className="side-title"><span>{t('rail.topics')}</span></div>
        <div className="topics">{(summary.topics ?? []).map((x) => <span key={x} className="chip">{x}</span>)}</div></div>
    </>
  )
  else if (tab === 'notes') body = (
    <div className="side-card"><div className="side-title"><span>{t('rail.toc')}</span></div>
      <nav className="toc">{summary.sections.map((s) => (
        <a key={s.id} href={`#sec-${s.id}`} className={`${s.skip ? 'skip' : ''} ${s.id === current ? 'on' : ''}`} onClick={(e) => { e.preventDefault(); onGoto(s.id) }}><span className="tm">{fmt(s.t)}</span>{s.title}</a>
      ))}</nav></div>
  )
  else if (tab === 'guides') body = (
    <>
      <div className="side-card"><div className="ring"><Ring done={done} total={gs.length} /><div><b>{t('rail.done', { a: done, b: gs.length })}</b><span>{t('rail.done2')}</span></div></div></div>
      <div className="side-card" style={{ marginTop: 'var(--s4)' }}><div className="side-title"><span>{t('rail.tasks')}</span></div>
        {gs.map((g) => <a key={g.id} href={`#g-${g.id}`} className={`mini-row tap ${guideDone(marks, id, g) ? 'ok' : ''}`} onClick={(e) => { e.preventDefault(); scrollTo(document.getElementById('g-' + g.id)) }}><span className="dot" />{g.title}</a>)}
        {next && <div className="next" style={{ marginTop: 'var(--s2)' }}><small>{t('rail.nextStep')}</small>{inline(next.steps[nextStep].text)}</div>}</div>
    </>
  )
  else if (tab === 'terms') body = (
    <div className="side-card"><div className="side-title"><span>{t('rail.terms')}</span></div>
      {[...summary.terms].sort((a, b) => a.term.localeCompare(b.term)).map((x) => (
        <a key={x.id} href={`#term-${x.id}`} className="mini-row tap" onClick={(e) => { e.preventDefault(); scrollTo(document.getElementById('term-' + x.id), 'center') }}><span className="l">{x.term[0].toUpperCase()}</span>{x.term}</a>
      ))}</div>
  )

  return <aside className="rail">{body && <div className="rail-in" key={tab}>{body}</div>}</aside>
}
