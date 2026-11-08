import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useT } from '../i18n'
import { hello } from '../lib/hello'
import { useVideos } from '../lib/videos'
import { useQueue } from '../store/ui'
import { useTopicsCount, useLaterCount } from '../data/aggregate'
import { useSettingsMenu } from '../components/SettingsMenu'
import VideoRow, { coverOf } from '../components/VideoRow'
import { IBack, IBook, IBookmark, ICheckSm, IGear, IForward } from '../components/Icons'
import { useNav } from '../store/nav'

export const PageHead = ({ title, sub, onBack }) => {
  const t = useT()
  return (
    <div className="head"><div className="titles">
      <div className="hello"><span>{hello(t)} 👋</span></div>
      <h1>{title}</h1>
      {sub && <p className="page-sub">{sub}</p>}
    </div></div>
  )
}

export function VideoCard({ v }) {
  const t = useT()
  const pct = v.total ? Math.round((v.done / v.total) * 100) : 0
  const inner = (
    <>
      <div className="cover" style={{ backgroundImage: `url("${coverOf(v)}")` }} />
      <b>{v.title}</b>
      <div className="sub">{v.ready ? <>{v.learned ? `✓ ${t('nav.learned')}` : t('rail.done', { a: v.done, b: v.total }) + ' · ' + t('tab.guides').toLowerCase()}</> : t('processing')}</div>
      {v.ready && <div className="bar"><i style={{ width: `${v.learned ? 100 : pct}%` }} /></div>}
    </>
  )
  return <Link className="vcard tap" to={`/v/${v.id}`} style={v.ready ? undefined : { opacity: .75 }}>{inner}</Link>
}

const Tile = ({ color, children }) => <span className="tile" style={{ '--tile': color }}>{children}</span>

export default function Home({ onBack }) {
  const t = useT()
  const nav = useNavigate()
  const last = useNav((s) => s.last)
  const { videos, loaded } = useVideos()
  const items = useQueue((s) => s.items)
  const queue = items.filter((x) => x.status !== 'done' && (x.kind ?? 'add') === 'add')
  const settings = useSettingsMenu()
  const topics = useTopicsCount(), later = useLaterCount()
  const learned = videos.filter((v) => v.learned).length

  return (
    <div className="wrap">
      {/* Телефон: список, как чаты в Telegram */}
      <div className="m-only">
        <div className="m-head"><h1>{t('app')}</h1><div className="m-actions">
          <button className="icon-btn tap" onClick={settings} aria-label={t('settings')}><IGear /></button>
          {last && <button className="ret tap" onClick={() => nav(last)} aria-label={t('return')} title={t('return')}><IForward /></button>}
        </div></div>
        <div className="side-card m-card">
          <NavLink to="/topics" className="row tap"><span className="emoji"><Tile color="#0a84ff"><IBook /></Tile></span><span className="name">{t('nav.topics')}</span><span className="count">{topics || ''}</span></NavLink>
          <NavLink to="/learned" className="row tap"><span className="emoji"><Tile color="#34c759"><ICheckSm /></Tile></span><span className="name">{t('nav.learned')}</span><span className="count">{learned || ''}</span></NavLink>
          <NavLink to="/later" className="row tap"><span className="emoji"><Tile color="#ff9f0a"><IBookmark /></Tile></span><span className="name">{t('nav.later')}</span><span className="count">{later || ''}</span></NavLink>
        </div>
        <div className="side-card m-card">
          <div className="side-title"><span>{t('videos')}</span><span className="count">{videos.length}</span></div>
          {videos.map((v) => <VideoRow key={v.id} v={v} big />)}
        </div>
      </div>

      {/* Ноутбук: карточки */}
      <div className="d-only">
        <PageHead title={t('app')} sub={t('home.sub', { n: videos.filter((v) => v.ready).length, q: queue.length + videos.filter((v) => !v.ready).length })} onBack={onBack} />
        {loaded && !videos.length && <div className="empty"><b>{t('empty')}</b>{t('home.empty')}</div>}
        <div className="grid-cards">{videos.map((v) => <VideoCard key={v.id} v={v} />)}</div>
      </div>
    </div>
  )
}
