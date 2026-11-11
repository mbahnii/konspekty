import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '../i18n'
import { useSettings } from '../store/settings'
import { useQueue, useToast, useIslandPrefs } from '../store/ui'
import { useAllSummaries, useIndex } from '../data/useData'
import { useLibrary } from '../store/library'
import { useAuth, setLoginOpen } from '../store/auth'
import Segmented from './Segmented'
import { QueueRing, StageLabel, ringColor, ringPct } from './QueueRing'
import PhotoPanel from './PhotoPanel'
import MovePane, { useMove } from './MovePane'
import { accountsOn } from '../lib/accounts'
import { supabase } from '../lib/supabase'
import { confirmQueue } from '../lib/sync'
import { flyToList } from '../lib/fly'
import { ms } from '../lib/motion'
import { shareDefault } from '../lib/share'
import { ytId } from '../lib/yt'
import { setArrive, useArrive } from '../store/arrive'
import { IYt, IPhoto, IPlus, IExpand, ICollapse, ISearch, ISystem, ISun, IMoon, ITrash } from './Icons'

// Сколько показываем «готово» и «скоро зникне», прежде чем видео улетит в список
const DONE_MS = 1100
const QMAX = 3                                           // строк очереди в пилюле (остальные — «ще N»), чтобы ничего не прокручивалось
const LEAVE_MS = 0                                       // обратного отсчёта нет: показали «Готово» — и видео сразу улетает в список
const STAGE = { download: 1, ocr: 1, pack: 1, 'waiting-summary': 2, summary: 2, translate: 2, published: 3 }
const short = (label) => label.replace(/^(st|stage)\./, 'sh.')          // короткая подпись для телефона

// Этап задачи очереди → номер шага кольца, вид кольца и подпись
function phaseOf(it, seen, now) {
  if (it.pending) return { k: 0, mode: 'local', label: 'st.local' }
  if (it.status === 'error') return { k: 0, mode: 'error', label: 'st.error' }
  if (it.status === 'queued') return { k: 0, mode: 'run', label: 'st.queued' }
  if (it.status === 'processing' && it.stage === 'needs-confirm') return { k: 2, mode: 'ask', label: 'st.ask' }
  if (it.status === 'processing') {
    const k = STAGE[it.stage] ?? 1
    return { k, mode: 'run', label: it.stage ? `stage.${it.stage}` : 'st.processing' }
  }
  const s = seen[it.id]
  if (!s || s.stale) return { gone: true, quiet: true }      // уже было готово до открытия сайта — не показываем
  const t = now - s.doneAt
  if (t < DONE_MS) return { k: 4, mode: 'done', label: 'st.done' }
  // остаток отсчёта считаем по настоящим часам, а не по анимации: после сна экрана или закрытия панели он не «залипает»
  if (t < DONE_MS + LEAVE_MS) return { k: 4, mode: 'leaving', label: 'st.leaving', frac: 1 - (t - DONE_MS) / LEAVE_MS }
  return { gone: true }
}

// Часы, которые тикают, только пока есть «готовые» задачи (для смены «готово» → «скоро зникне» → полёт)
function useClock(active) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setNow(Date.now()), 200)
    return () => clearInterval(id)
  }, [active])
  return active ? now : Date.now()
}


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
  const { items: allItems, sync, add, remove, setSync } = useQueue()
  // задачи «удалить видео» в очереди не показываем (строка видео просто плавно уходит); видно только ошибку
  const items = allItems.filter((it) => (it.kind ?? 'add') !== 'delete' || it.status === 'error')
  const session = useAuth((s) => s.session)
  const { wide, toggle } = useIslandPrefs()
  const [sizing, setSizing] = useState(false)               // идёт смена размера «шире»: высота панели следует за содержимым без задержки
  const sizeT = useRef(0)
  const flipWide = () => { setSizing(true); toggle('wide'); clearTimeout(sizeT.current); sizeT.current = setTimeout(() => setSizing(false), ms(760)) }
  const { theme, lang, setTheme, setLang, corners, setCorners, motion, setMotion } = useSettings()
  const [url, setUrl] = useState('')
  const [q, setQ] = useState('')
  const [confirm, setConfirm] = useState(null)
  const seenAlive = useRef(new Set())
  // Открытая пилюля — несколько «состояний», как Dynamic Island: видео, фото, поиск, вид. Без прокрутки: высота подстраивается сама.
  const [pane, setPane] = useState('video')
  const photoOpen = pane === 'photo'
  const setPhotoOpen = (v) => setPane(v ? 'photo' : 'video')
  const wantPhotos = useCallback(() => { setOpen(true); setPane('photo') }, [setOpen])      // файлы тащат над окном — открываем пилюлю с панелью фото
  // Высота панели всегда равна содержимому и меняется плавно (одна пружинистая кривая): ничего не прыгает
  const panel = useRef(null), inner = useRef(null), dock = useRef(null), searchIn = useRef(null)
  useLayoutEffect(() => {
    const pn = panel.current, i = inner.current
    if (!pn || !i || typeof ResizeObserver === 'undefined') return
    const fit = () => { pn.style.height = (open ? i.offsetHeight : 0) + 'px' }
    fit(); const ro = new ResizeObserver(fit); ro.observe(i)
    return () => ro.disconnect()
  }, [open])
  // Клавиатура iPhone: пилюля поднимается над ней (visualViewport), а не прячется под ней
  useEffect(() => {
    const vv = window.visualViewport, d = dock.current
    if (!vv || !d) return
    const on = () => {
      const kb = Math.max(0, innerHeight - vv.height - vv.offsetTop)
      d.style.setProperty('--kb', kb > 60 ? kb + 'px' : '0px')
      d.style.setProperty('--vvh', vv.height + 'px')
    }
    on(); vv.addEventListener('resize', on); vv.addEventListener('scroll', on)
    return () => { vv.removeEventListener('resize', on); vv.removeEventListener('scroll', on) }
  }, [])
  // --cw = ширина колонки контента на этой странице: пилюля «шире» никогда не выходит за неё
  useEffect(() => {
    const d = dock.current, m = document.querySelector('main')
    if (!d || !m) return
    const on = () => d.style.setProperty('--cw', Math.min(760, m.clientWidth || innerWidth - 32) + 'px')
    on(); addEventListener('resize', on)
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(on) : null
    ro?.observe(m)
    return () => { removeEventListener('resize', on); ro?.disconnect() }
  })
  // состояние «Де лежить конспект»: открывается из меню конспекта, вкладки при этом прячутся (отдельный режим, как Face ID)
  const mv = useMove((s) => s.v)
  const lastMv = useRef(null)
  if (mv) lastMv.current = mv
  useEffect(() => { if (mv) { setOpen(true); setPane('move') } }, [mv]) // eslint-disable-line
  useEffect(() => { if (!open && useMove.getState().v) useMove.getState().close() }, [open])
  const pickPane = (p) => {
    if (p !== 'move' && useMove.getState().v) useMove.getState().close()
    setPane(p)
    if (p === 'search') searchIn.current?.focus({ preventScroll: true })    // сразу в нажатии — иначе iPhone не покажет клавиатуру
  }
  const box = useRef(null), input = useRef(null)
  const all = useAllSummaries(open)
  const prev = usePreview(url)
  const { data: index } = useIndex()
  const hidden = useLibrary((s) => s.hidden)
  // это видео уже есть на сайте или уже стоит в очереди?
  const dup = !prev.id ? null
    : index?.some((v) => v.id === prev.id && !hidden[v.id]) ? 'isl.dupVideo'
    : items.some((it) => (it.kind ?? 'add') === 'add' && it.status !== 'done' && it.status !== 'error' && ytId(it.url) === prev.id) ? 'isl.dupQueue' : null
  // Когда этот экран впервые увидел задачу «готово». Старые «готово» (были до открытия сайта) не показываем.
  const seen = useRef({})
  for (const it of items) {
    if (it.status === 'done' && !seen.current[it.id]) {
      const age = Date.now() - (it.upd || it.at || 0)
      seen.current[it.id] = { doneAt: Date.now(), stale: !seenAlive.current.has(it.id) && age > 30000 }
    }
    if (it.status !== 'done') seenAlive.current.add(it.id)
  }
  const anyDone = items.some((it) => it.status === 'done')
  const now = useClock(anyDone)
  const [removing, setRemoving] = useState({})             // id → true: строку удалили корзиной, она сворачивается
  const firstIds = useRef(null)                             // задачи, которые были при открытии сайта, — без анимации появления
  if (firstIds.current === null) firstIds.current = new Set(items.map((x) => x.id))
  const drop = (id) => { setConfirm(null); setRemoving((s) => ({ ...s, [id]: true })); setTimeout(() => { remove(id); setRemoving((s) => { const n = { ...s }; delete n[id]; return n }) }, ms(420)) }
  const [leaving, setLeaving] = useState({})               // id → true: строка сворачивается (видео улетело)
  const flown = useRef(new Set())
  const ringEls = useRef({})
  const statusEl = useRef(null)
  const phases = Object.fromEntries(items.map((it) => [it.id, phaseOf(it, seen.current, now)]))
  // «ушедшая» строка остаётся на экране, пока из неё вылетает шарик и она сворачивается
  const shown = items.filter((it) => { const ph = phases[it.id]; return !ph.gone || leaving[it.id] || (!ph.quiet && !flown.current.has(it.id)) })
  const lead = shown.find((it) => !leaving[it.id])
  const leadPh = lead ? (phases[lead.id].gone ? { k: 4, mode: 'done', label: 'st.done' } : phases[lead.id]) : null

  // этап «скоро зникне» закончился → шарик летит в список, строка очереди сворачивается
  useEffect(() => {
    for (const it of items) {
      const ph = phases[it.id]
      if (!ph.gone || flown.current.has(it.id)) continue
      flown.current.add(it.id)
      if (ph.quiet) continue
      const vid = it.vid || ytId(it.url)
      if ((it.kind ?? 'add') === 'add' && !it.tr && vid) {
        // откуда летит шарик: из кольца в открытой очереди, из статуса в широкой закрытой пилюле, иначе — из кнопки «+»
        const src = open && pane === 'video' ? ringEls.current[it.id] : (!open && wide && statusEl.current ? statusEl.current : box.current?.querySelector('.dyn-main svg'))
        flyToList(vid, src)
      }
      setLeaving((s) => ({ ...s, [it.id]: true }))
      setTimeout(() => setLeaving((s) => { const n = { ...s }; delete n[it.id]; return n }), ms(520))
    }
  })

  const hid = useRef(new Set())
  useEffect(() => {
    const want = new Set()
    for (const it of items) {
      const ph = phases[it.id], vid = it.vid || ytId(it.url || '')
      if (!vid || (it.kind ?? 'add') !== 'add' || it.tr || ph.gone || ph.mode === 'error' || ph.mode === 'local') continue
      want.add(vid)
      if (!useArrive.getState().st[vid]) setArrive(vid, 'hidden')
    }
    for (const vid of hid.current) if (!want.has(vid) && useArrive.getState().st[vid] === 'hidden' && !items.some((it) => (it.vid || ytId(it.url || '')) === vid && phases[it.id].gone)) setArrive(vid, null)
    hid.current = want
  })

  const lastPrev = useRef(prev)
  if (prev.shown) lastPrev.current = prev
  const p = lastPrev.current

  useEffect(() => { if (open) { if (!matchMedia('(hover: hover)').matches) return; const id = setTimeout(() => (pane === 'search' ? searchIn : input).current?.focus({ preventScroll: true }), 300); return () => clearTimeout(id) } else setConfirm(null) }, [open]) // eslint-disable-line
  useEffect(() => {
    const on = () => setSync('ok'), off = () => setSync('off')
    addEventListener('online', on); addEventListener('offline', off)
    if (!navigator.onLine) setSync('off')
    return () => { removeEventListener('online', on); removeEventListener('offline', off) }
  }, [setSync])
  useEffect(() => {
    const onDoc = (e) => {
      // путь клика берём из события, а не из e.target: кнопки «корзина»/«Видалити» исчезают со страницы сразу после нажатия,
      // и у «оторванного» элемента closest('.dyn') уже ничего не находит — пилюля ошибочно считала клик внешним и закрывалась
      const path = e.composedPath ? e.composedPath() : []
      const hit = (sel) => path.some((n) => n.matches && n.matches(sel))
      if (!hit('.trash,.del')) setConfirm(null)
      if (!hit('.dyn') && !hit('[data-open-island]') && !hit('.menu') && !hit('.pv')) setOpen(false)
    }
    const onKey = (e) => e.key === 'Escape' && !document.querySelector('.pv.open') && setOpen(false)
    document.addEventListener('click', onDoc); document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('click', onDoc); document.removeEventListener('keydown', onKey) }
  }, [setOpen])

  const submit = async () => {
    if (!prev.valid) {
      say(t('isl.badLink'))
      box.current.animate([{ translate: '0' }, { translate: '-6px' }, { translate: '6px' }, { translate: '0' }], { duration: 280 })
      return
    }
    if (dup) { say(t(dup)); box.current.animate([{ translate: '0' }, { translate: '-6px' }, { translate: '6px' }, { translate: '0' }], { duration: 280 }); return }
    useLibrary.getState().setFlag('hidden', prev.id, false)   // если это видео раньше удаляли — снова показывать
    // Гость (если включены аккаунты): тихий анонимный вход Supabase, видео уходит в общий каталог (1 в день, локальная модель)
    let guest = !!session?.user?.is_anonymous
    if (!session && accountsOn()) {
      const { error } = await supabase.auth.signInAnonymously()
      if (error) { say(t('au.off')); setLoginOpen(true); return }
      guest = true
    }
    const share = guest || shareDefault()                       // общий каталог или только мне (см. lib/share.js)
    add(url.trim(), 'add', { title: prev.title, channel: prev.channel, vid: prev.id, guest, share }); setUrl('')
    if (!session && !accountsOn()) { say(t('isl.needLogin')); setLoginOpen(true) } else say(t(!accountsOn() || guest ? 'isl.queued' : share ? 'isl.queuedPub' : 'isl.queuedMine'))
  }

  const lq = q.trim().toLowerCase()
  const results = []
  // ищем по началу слова: «сад» найдёт «садок», но не «досадно»
  const re = lq ? new RegExp(`(^|[^\\p{L}\\p{N}])${lq.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'iu') : null
  const has = (txt) => re.test(txt)
  if (lq) for (const { id, title, summary } of all) {
    const from = title
    summary.sections.forEach((s) => has(`${s.title} ${s.body}`) && results.push({ kind: 'r.notes', name: s.title, from, go: () => nav(`/v/${id}/notes?s=${s.id}&n=${Date.now()}`) }))
    summary.terms.forEach((x) => has(`${x.term} ${x.explain}`) && results.push({ kind: 'r.term', name: x.term, from, go: () => nav(`/v/${id}/terms?s=${encodeURIComponent(x.id)}&n=${Date.now()}`) }))
    summary.guides.forEach((g) => has(`${g.title} ${g.steps.map((x) => `${x.text} ${x.prompt ?? ''} ${x.command ?? ''}`).join(' ')}`) && results.push({ kind: 'r.guide', name: g.title, from, go: () => nav(`/v/${id}/guides?s=${g.id}&n=${Date.now()}`) }))
  }

  const shortUrl = (u) => u.replace(/^https?:\/\/(www\.)?/, '')
  const queue = () => (
    <>
      <div className="isl-h">{t('isl.queue')}{shown.length > 0 && <span className="isl-hn">{shown.length}</span>}</div>
      {!session && <div className="isl-warn"><span>{t('isl.nologin')}</span><button className="tap" onClick={(e) => { e.stopPropagation(); setLoginOpen(true) }}>{t('login.go')}</button></div>}
      {shown.length ? shown.slice(0, QMAX).map((it) => {
        const ph = phases[it.id].gone ? { k: 4, mode: 'done', label: 'st.done' } : phases[it.id]
        const step = ph.mode === 'run' || ph.mode === 'done' ? t('q.step', { a: Math.min(ph.k + 1, 5), b: 5 }) : null
        const kindTag = it.tr ? `${t('q.translate')} ${it.tr.toUpperCase()} · ` : it.kind && it.kind !== 'add' ? `${t(`q.${it.kind}`)} · ` : ''
        return (
          <div key={it.id} className={`isl-qw ${leaving[it.id] || removing[it.id] ? 'out' : ''} ${firstIds.current.has(it.id) ? '' : 'enter'}`}><div>
            <div className={`isl-q ${confirm === it.id ? 'conf' : ''} m-${ph.mode}`} style={{ '--sc': ringColor(ph.k, ph.mode), '--prog': ringPct(ph.k, ph.mode, ph.frac) / 100 }}>
              <div className="rc">
                {it.thumb ? <img className="qthumb" src={it.thumb} alt="" /> : it.vid && !String(it.vid).startsWith('ph-') ? <img src={`https://i.ytimg.com/vi/${it.vid}/mqdefault.jpg`} alt="" /> : <span className="noimg">{it.photos && <IPhoto />}</span>}
                <div className="qt">
                  <b key={it.title} className="qtitle">{kindTag}{it.title || shortUrl(it.url)}</b>
                  <span className="qsub">
                    <StageLabel text={t(ph.label)} className={`st-${ph.mode}`} />
                    {step && <span className="qstep">{step}</span>}
                  </span>
                </div>
                <QueueRing k={ph.k} mode={ph.mode} frac={ph.frac} ringRef={(el) => { ringEls.current[it.id] = el }} />
                <button className="trash" aria-label={t('m.delete')} title={t('m.delete')} onClick={() => setConfirm(confirm === it.id ? null : it.id)}><ITrash /></button>
              </div>
              <button className="del" onClick={() => drop(it.id)}>{t('isl.confirm')}</button>
            </div>
            {/* нейросеть сомневается, что это материал для конспекта: объясняем почему и даём решить */}
            <div className={`dyn-grow ${ph.mode === 'ask' ? 'on' : ''}`}><div>
              <div className="q-ask">
                <p>{it.reason || t('q.askDefault')}</p>
                <div className="q-ask-b">
                  <button className="tap" onClick={() => setConfirm(it.id)}>{t('m.delete')}</button>
                  <button className="tap go" onClick={() => confirmQueue(it.id).then(() => say(t('q.askOk'))).catch(() => say(t('au.fail')))}>{t('q.askYes')}</button>
                </div>
              </div>
            </div></div>
          </div></div>
        )
      }) : <div className="isl-empty">{t('isl.empty')}</div>}
      {shown.length > QMAX && <div className="isl-more">{t('isl.more', { n: shown.length - QMAX })}</div>}
    </>
  )
  const paneCls = (id) => `dyn-pane ${pane === id ? 'on' : ''}`

  return (
    <div className="dyn-dock" ref={dock}>
      <div ref={box} className={`dyn ${open ? 'open' : ''} ${wide ? 'wide' : ''} ${sizing ? 'sizing' : ''}`}>
        <div className="dyn-panel" ref={panel} aria-hidden={!open}>
          <div className="dyn-inner" ref={inner}>
            <div className={`dyn-grow ${pane === 'move' ? '' : 'on'}`}><div>
            <Segmented className="isl-seg isl-tabs" value={pane} onChange={pickPane}
              items={[['video', <IYt key="i" />, 'pane.video'], ['photo', <IPhoto key="i" />, 'pane.photo'], ['search', <ISearch key="i" />, 'pane.search'], ['look', <ISun key="i" />, 'pane.look']]
                .map(([id, ic, lb]) => ({ id, label: <>{ic}<span>{t(lb)}</span></> }))} />
            </div></div>
            <div className="dyn-panes">
              <div className={paneCls('video')} aria-hidden={pane !== 'video'}>
                <div className="isl-link">
                  <input ref={input} value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t('isl.link')} inputMode="url" autoCapitalize="off" autoCorrect="off"
                    onKeyDown={(e) => e.key === 'Enter' && submit()} />
                  <button className="go tap" onClick={submit}>{t('isl.go')}</button>
                </div>
                <div className={`dyn-grow ${prev.shown ? 'on' : ''}`}><div>
                  <div className="prev">
                    {p.id && <img src={`https://i.ytimg.com/vi/${p.id}/mqdefault.jpg`} alt="" />}
                    <div className="pt">{p.title ? <><b>{p.title}</b><small>{p.channel}</small></> : p.loading ? <span className="sk" /> : <small>{shortUrl(url)}</small>}{dup && <span className="dup">{t(dup)}</span>}</div>
                  </div>
                </div></div>
                {queue()}
              </div>
              <div className={paneCls('photo')} aria-hidden={pane !== 'photo'}>
                <PhotoPanel open={open} onDone={() => setPane('video')} onWantOpen={wantPhotos} />
              </div>
              <div className={paneCls('search')} aria-hidden={pane !== 'search'}>
                <label className="isl-search"><ISearch /><input ref={searchIn} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('isl.searchPh')} enterKeyHint="search" /></label>
                {results.slice(0, 5).map((r, i) => <button key={i} className="isl-row tap" onClick={() => { setOpen(false); r.go() }}><span className="nm">{r.name}<small className="from">{r.from}</small></span><span className="st">{t(r.kind)}</span></button>)}
                {lq && !results.length && <div className="isl-empty">{t('isl.none')}</div>}
                {!lq && <div className="isl-empty">{t('isl.searchHint')}</div>}
              </div>
              <div className={paneCls('move')} aria-hidden={pane !== 'move'}>
                {lastMv.current && <MovePane key={lastMv.current.id} v={lastMv.current} onDone={() => { useMove.getState().close(); setPane('video') }} />}
              </div>
              <div className={paneCls('look')} aria-hidden={pane !== 'look'}>
                <div className="dyn-set"><span>{t('isl.theme')}</span>
                  <Segmented className="isl-seg" value={theme} onChange={setTheme}
                    items={[{ id: 'system', title: t('theme.system'), label: <ISystem /> }, { id: 'light', title: t('theme.light'), label: <ISun /> }, { id: 'dark', title: t('theme.dark'), label: <IMoon /> }]} /></div>
                <div className="dyn-set"><span>{t('isl.lang')}</span>
                  <Segmented className="isl-seg" value={lang} onChange={setLang}
                    items={[{ id: 'uk', title: 'Українська', label: 'УКР' }, { id: 'ru', title: 'Русский', label: 'РУС' }, { id: 'en', title: 'English', label: 'ENG' }]} /></div>
                <div className="dyn-set"><span>{t('isl.corners')}</span>
                  <Segmented className="isl-seg" value={corners} onChange={setCorners}
                    items={[{ id: 'round', title: t('isl.round'), label: <span className="shape round" /> }, { id: 'square', title: t('isl.square'), label: <span className="shape sq" /> }]} /></div>
                <div className="dyn-set"><span>{t('isl.motion')}</span>
                  <Segmented className="isl-seg" value={motion} onChange={setMotion}
                    items={[{ id: 'min', title: t('mo.min'), label: t('mo.minS') }, { id: 'mid', title: t('mo.mid'), label: t('mo.midS') }, { id: 'max', title: t('mo.max'), label: t('mo.maxS') }]} /></div>
              </div>
            </div>
          </div>
        </div>

        <div className="dyn-bar">
          <button className="dyn-main" onClick={(e) => { e.stopPropagation(); setOpen(!open) }}><IPlus /><span className="dyn-lab"><span className="lg">{t('addVideo')}</span><span className="sh">{t('addShort')}</span></span></button>
          <span className={`dyn-col ${!open && wide ? 'on' : ''}`}><span>
            <span className="isl-status" ref={statusEl} style={{ '--sc': leadPh ? ringColor(leadPh.k, leadPh.mode) : 'transparent' }}>
              <span className={`chip ${lead ? '' : 'idle'}`}>
                {lead
                  ? <>{shown.length > 1 && <i className="cnt">{shown.length}</i>}<StageLabel text={t(short(leadPh.label))} className={`st-${leadPh.mode}`} /></>
                  : <span>{t('sh.idle')}</span>}
              </span>
            </span>
          </span></span>
          <span className={`sync ${sync}`} title={t(`sync.${sync}`)} role={sync === 'nologin' ? 'button' : undefined} onClick={sync === 'nologin' ? (e) => { e.stopPropagation(); setLoginOpen(true) } : undefined} />
          <button className={`dyn-btn ${wide ? 'on' : ''}`} title={t('isl.wide')} aria-pressed={wide} onClick={(e) => { e.stopPropagation(); flipWide() }}>
            <IExpand className={`i ${wide ? 'off' : ''}`} /><ICollapse className={`i ${wide ? '' : 'off'}`} />
          </button>
        </div>
      </div>
    </div>
  )
}
