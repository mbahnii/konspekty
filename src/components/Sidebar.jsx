import { NavLink } from 'react-router-dom'
import { useSettings } from '../store/settings'
import { useT } from '../i18n'
import { useSettingsMenu } from './SettingsMenu'
import VideoRow from './VideoRow'
import CatalogFilter from './CatalogFilter'
import { useVideos } from '../lib/videos'
import { useTopicsCount, useLaterCount } from '../data/aggregate'
import { IBook, IBookmark, ICheckSm, IStack, IPlus, ISidebar, IGear, IPlaySm } from './Icons'

const Tile = ({ color, children, lg }) => <span className={`tile ${lg ? 'lg' : ''}`} style={{ '--tile': color }}>{children}</span>

export default function Sidebar({ onAdd }) {
  const t = useT()
  const settings = useSettingsMenu()
  const { videos } = useVideos()
  const topics = useTopicsCount()
  const later = useLaterCount()
  const { toggleSidebar, sidebarCollapsed } = useSettings()
  const learned = videos.filter((v) => v.learned).length
  const link = ({ isActive }) => `row tap ${isActive ? 'active' : ''}`

  return (
    <aside className="sidebar">
      <div className="brand">
        <button className="icon-btn tap collapse-btn" onClick={toggleSidebar} title={t(sidebarCollapsed ? 'expand' : 'collapse')}><ISidebar /></button>
        <NavLink to="/" style={{ display: 'contents' }}><Tile lg color="var(--island)"><IStack /></Tile><span className="t">{t('app')}</span></NavLink>
      </div>

      <div className="side-card">
        <NavLink to="/topics" className={link} title={t('nav.topics')}><span className="emoji"><Tile color="#0a84ff"><IBook /></Tile></span><span className="name">{t('nav.topics')}</span><span className="count">{topics || ''}</span></NavLink>
        <NavLink to="/learned" className={link} title={t('nav.learned')}><span className="emoji"><Tile color="#34c759"><ICheckSm /></Tile></span><span className="name">{t('nav.learned')}</span><span className="count">{learned || ''}</span></NavLink>
        <NavLink to="/later" className={link} title={t('nav.later')}><span className="emoji"><Tile color="#ff9f0a"><IBookmark /></Tile></span><span className="name">{t('nav.later')}</span><span className="count">{later || ''}</span></NavLink>
      </div>

      <div className="side-card">
        <div className="side-title"><span>{t('videos')}</span><span className="count">{videos.length}</span></div>
        <CatalogFilter />
        {videos.map((v) => <VideoRow key={v.id} v={v} />)}
        <button className="row add tap" data-open-island onClick={onAdd} title={t('addVideo')}><span className="emoji"><IPlus /></span><span className="name">{t('addVideo')}</span></button>
      </div>

      <div className="side-foot">
        <NavLink to="/guide" className={link} title={t('nav.guide')}><span className="emoji"><IPlaySm /></span><span className="name">{t('nav.guide')}</span></NavLink>
        <button className="row tap" onClick={settings} title={t('settings')}><span className="emoji"><IGear /></span><span className="name">{t('settings')}</span></button>
      </div>
    </aside>
  )
}
