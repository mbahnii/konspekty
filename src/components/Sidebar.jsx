import { NavLink } from 'react-router-dom'
import { useSettings } from '../store/settings'
import { useT, LANGS } from '../i18n'
import { useMenu } from './Menu'
import { useAuth, setLoginOpen } from '../store/auth'
import { useVideoMenu } from './VideoMenu'
import { useVideos, tint } from '../lib/videos'
import { useTopicsCount, useLaterCount } from '../data/aggregate'
import { ICloud, IMore, ISidebar, IGear, IBook, IBookmark, ICheckSm, IPlaySm, IHourglass, IStack, IPlus, IPin } from './Icons'

const Tile = ({ color, children, lg }) => <span className={`tile ${lg ? 'lg' : ''}`} style={{ '--tile': color }}>{children}</span>

export default function Sidebar({ onAdd, onPick }) {
  const t = useT()
  const menu = useMenu()
  const videoMenu = useVideoMenu()
  const { videos } = useVideos()
  const topics = useTopicsCount()
  const later = useLaterCount()
  const { theme, lang, setTheme, setLang, toggleSidebar, sidebarCollapsed } = useSettings()
  const session = useAuth((s) => s.session)
  const learned = videos.filter((v) => v.learned).length

  const settings = (e) => { e.stopPropagation(); menu.open(e.currentTarget, [
    { header: t('theme') },
    ...['system', 'light', 'dark'].map((k) => ({ tick: theme === k, label: t(`theme.${k}`), onSelect: () => setTheme(k) })),
    '-',
    { header: t('language') },
    ...Object.entries(LANGS).map(([k, v]) => ({ tick: lang === k, label: v, onSelect: () => setLang(k) })),
    '-',
    { icon: <ICloud />, label: session ? t('login.menuOn') : t('login.menuOff'), onSelect: () => setLoginOpen(true) },
  ]) }
  const link = ({ isActive }) => `row tap ${isActive ? 'active' : ''}`

  return (
    <aside className="sidebar">
      <div className="brand">
        <button className="icon-btn tap collapse-btn" onClick={toggleSidebar} title={t(sidebarCollapsed ? 'expand' : 'collapse')}><ISidebar /></button>
        <NavLink to="/" onClick={onPick} style={{ display: 'contents' }}><Tile lg color="var(--island)"><IStack /></Tile><span className="t">{t('app')}</span></NavLink>
      </div>

      <div className="side-card">
        <div className="side-title"><span>{t('nav.learn')}</span></div>
        <NavLink to="/topics" className={link} onClick={onPick} title={t('nav.topics')}><span className="emoji"><Tile color="#0a84ff"><IBook /></Tile></span><span className="name">{t('nav.topics')}</span><span className="count">{topics || ''}</span></NavLink>
        <NavLink to="/learned" className={link} onClick={onPick} title={t('nav.learned')}><span className="emoji"><Tile color="#34c759"><ICheckSm /></Tile></span><span className="name">{t('nav.learned')}</span><span className="count">{learned || ''}</span></NavLink>
        <NavLink to="/later" className={link} onClick={onPick} title={t('nav.later')}><span className="emoji"><Tile color="#ff9f0a"><IBookmark /></Tile></span><span className="name">{t('nav.later')}</span><span className="count">{later || ''}</span></NavLink>
      </div>

      <div className="side-card">
        <div className="side-title"><span>{t('videos')}</span><span className="count">{videos.length}</span></div>
        {videos.map((v) => {
          const body = (
            <>
              <span className="emoji">{v.ready ? <Tile color={v.learned ? '#34c759' : tint(v.id)}>{v.learned ? <ICheckSm /> : <IPlaySm />}</Tile> : <Tile><IHourglass /></Tile>}</span>
              <span className="name">{v.title}</span>
              {v.pinned && <IPin className="i pin" />}
              <span className="count hide-on-hover">{v.ready ? `${v.done}/${v.total}` : ''}</span>
              <button className="more" aria-label={t('more')} onClick={(e) => { e.preventDefault(); e.stopPropagation(); menu.open(e.currentTarget, videoMenu(v)) }}><IMore /></button>
            </>
          )
          const ctx = (e) => { e.preventDefault(); menu.open(e.currentTarget, videoMenu(v), { point: { x: e.clientX, y: e.clientY } }) }
          return v.ready ? (
            <NavLink key={v.id} to={`/v/${v.id}`} className={link} title={v.title} onClick={onPick} onContextMenu={ctx}>{body}</NavLink>
          ) : (
            <div key={v.id} className="row" style={{ cursor: 'default', color: 'var(--text-3)' }} title={`${v.title} · ${t('processing')}`} onContextMenu={ctx}>{body}</div>
          )
        })}
        <button className="row add tap" data-open-island onClick={onAdd} title={t('addVideo')}><span className="emoji"><IPlus /></span><span className="name">{t('addVideo')}</span></button>
      </div>

      <div className="side-foot">
        <button className="row tap" onClick={settings} title={t('settings')}><span className="emoji"><IGear /></span><span className="name">{t('settings')}</span></button>
      </div>
    </aside>
  )
}
