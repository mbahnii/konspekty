import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '../i18n'
import { useSettings } from '../store/settings'
import { useQueue, useToast, useIslandPrefs } from '../store/ui'
import { useAllSummaries } from '../data/useData'
import { IPlus, IExpand, ICollapse, ISearch, ISystem, ISun, IMoon, ITrash } from './Icons'

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
  const box = useRef(null), input = useRef(null)
  const all = useAllSummaries(open)

  useEffect(() => { if (open) { const id = setTimeout(() => input.current?.focus({ preventScroll: true }), 300); return () => clearTimeout(id) } }, [open])
  useEffect(() => {
    const on = () => setSync('ok'), off = () => setSync('off')
    addEventListener('online', on); addEventListener('offline', off)
    if (!navigator.onLine) setSync('off')
    return () => { removeEventListener('online', on); removeEventListener('offline', off) }
  }, [setSync])
  useEffect(() => {
    const onDoc = (e) => { if (!e.target.closest('.island') && !e.target.closest('[data-open-island]') && !e.target.closest('.menu')) setOpen(false) }
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('click', onDoc); document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('click', onDoc); document.removeEventListener('keydown', onKey) }
  }, [setOpen])

  const submit = () => {
    if (!/youtu\.?be/.test(url.trim())) {
      say(t('isl.badLink'))
      box.current.animate([{ translate: '0' }, { translate: '-6px' }, { translate: '6px' }, { translate: '0' }], { duration: 280 })
      return
    }
    add(url.trim()); setUrl(''); say(t('isl.queued'))
  }

  const lq = q.trim().toLowerCase()
  const results = []
  if (lq) for (const { id, summary } of all) {
    summary.sections.forEach((s) => `${s.title} ${s.body}`.toLowerCase().includes(lq) && results.push({ kind: 'r.notes', name: s.title, go: () => nav(`/v/${id}/notes?s=${s.id}&n=${Date.now()}`) }))
    summary.terms.forEach((x) => `${x.term} ${x.explain}`.toLowerCase().includes(lq) && results.push({ kind: 'r.term', name: x.term, go: () => nav(`/v/${id}/terms?s=${encodeURIComponent(x.id)}&n=${Date.now()}`) }))
    summary.guides.forEach((g) => `${g.title} ${JSON.stringify(g.steps)}`.toLowerCase().includes(lq) && results.push({ kind: 'r.guide', name: g.title, go: () => nav(`/v/${id}/guides?s=${g.id}&n=${Date.now()}`) }))
  }

  return (
    <div className="island-dock">
      <div ref={box} className={`island ${open ? 'open' : ''} ${wide ? 'wide' : ''} ${square ? 'square' : ''}`}>
        <div className="isl-panel"><div className="isl-inner"><div className="isl-scroll">
          <div className="isl-link">
            <input ref={input} value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t('isl.link')} inputMode="url"
              onKeyDown={(e) => e.key === 'Enter' && submit()} />
            <button className="go tap" onClick={submit}>{t('isl.go')}</button>
          </div>
          <div className="isl-h">{t('isl.queue')}</div>
          {items.length ? items.map((it) => (
            <div key={it.id} className="isl-row">
              <span className={`sync ${it.status === 'processing' ? 'busy' : it.status === 'done' ? 'ok' : 'off'}`} />
              <span className="nm">{it.kind && it.kind !== 'add' ? `${t(`q.${it.kind}`)} · ` : ''}{it.url}</span>
              <span className="st">{t(`st.${it.status}`)}</span>
              {it.status === 'queued' && <button className="isl-btn" style={{ width: 28, height: 28, background: 'none' }} title={t('m.delete')} onClick={() => remove(it.id)}><ITrash /></button>}
            </div>
          )) : <div className="isl-row"><span className="st" style={{ margin: 0 }}>{t('isl.empty')}</span></div>}
          <div className="isl-h">{t('isl.search')}</div>
          <label className="isl-search"><ISearch /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('isl.searchPh')} /></label>
          {results.slice(0, 8).map((r, i) => <button key={i} className="isl-row tap" onClick={() => { setOpen(false); r.go() }}><span className="nm">{r.name}</span><span className="st">{t(r.kind)}</span></button>)}
          {lq && !results.length && <div className="isl-row"><span className="st" style={{ margin: 0 }}>{t('isl.none')}</span></div>}
          <div className="isl-h">{t('isl.themeLang')}</div>
          <div className="isl-opts">
            <div className="isl-seg">
              {[['system', <ISystem />], ['light', <ISun />], ['dark', <IMoon />]].map(([k, ic]) => <button key={k} className={theme === k ? 'on' : ''} title={t(`theme.${k}`)} onClick={() => setTheme(k)}>{ic}</button>)}
            </div>
            <div className="isl-seg">
              {[['uk', 'УКР'], ['ru', 'РУС'], ['en', 'ENG']].map(([k, l]) => <button key={k} className={lang === k ? 'on' : ''} onClick={() => setLang(k)}>{l}</button>)}
            </div>
          </div>
        </div></div></div>

        <div className="isl-bar">
          <button className="isl-main" onClick={(e) => { e.stopPropagation(); setOpen(!open) }}><IPlus />{t('addVideo')}</button>
          <span className={`sync ${sync}`} title={t(`sync.${sync}`)} />
          <button className={`isl-btn ${square ? 'on' : ''}`} title={t('isl.corners')} onClick={(e) => { e.stopPropagation(); toggle('square') }}>
            <span className={`shape sq ${square ? 'off' : ''}`} /><span className={`shape round ${square ? '' : 'off'}`} />
          </button>
          <button className={`isl-btn ${wide ? 'on' : ''}`} title={t('isl.wide')} onClick={(e) => { e.stopPropagation(); toggle('wide') }}>
            <IExpand className={`i ${wide ? 'off' : ''}`} /><ICollapse className={`i ${wide ? '' : 'off'}`} />
          </button>
        </div>
      </div>
    </div>
  )
}
