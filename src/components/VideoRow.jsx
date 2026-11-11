import { fileUrl } from '../lib/files'
import { NavLink } from 'react-router-dom'
import { useT } from '../i18n'
import { useMenu } from './Menu'
import { useVideoMenu } from './VideoMenu'
import { IMore, IPin, IHourglass, ICheckSm } from './Icons'
import { useArriveOf } from '../store/arrive'
import { useLibrary } from '../store/library'
import { TAG_COLORS } from './VideoMenu'

export const coverOf = (v) => (v.cover ? fileUrl(v.id, v.cover) : String(v.id).startsWith('ph-') ? '' : `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`)   // у фото-материала нет обложки YouTube

// Строка видео: обложка, название, подпись («1/5 · 8 мин»), меню по ⋯ и правому клику
export default function VideoRow({ v, big, onPick }) {
  const t = useT()
  const menu = useMenu()
  const videoMenu = useVideoMenu()
  const arr = useArriveOf(v.id)
  const tag = useLibrary((s) => s.tags[v.id])
  const sub = v.ready ? `${v.learned ? '✓ ' + t('nav.learned') : `${v.done}/${v.total}`} · ${v.source === 'photos' ? `${v.pages} ${t('ph.page')}` : `${Math.max(1, Math.round(v.duration / 60))} ${t('min')}`}` : t('processing')
  const av = <span className="av" style={v.ready ? { backgroundImage: `url("${coverOf(v)}")` } : undefined}>{!v.ready && <IHourglass />}</span>
  const body = (
    <>
      {av}
      <span className="vt"><b>{v.title}</b><small>{sub}</small></span>
      <span className="vr">{tag?.e && <span className="vtag-e">{tag.e}</span>}{tag?.c && <span className="vtag-c" style={{ '--c': TAG_COLORS[tag.c] }} />}{v.pinned && <IPin />}{v.learned && <ICheckSm style={{ color: 'var(--success)' }} />}</span>
      <button className="more" aria-label={t('more')} onClick={(e) => { e.preventDefault(); e.stopPropagation(); menu.open(e.currentTarget, videoMenu(v)) }}><IMore /></button>
    </>
  )
  const ctx = (e) => { e.preventDefault(); menu.open(e.currentTarget, videoMenu(v), { point: { x: e.clientX, y: e.clientY } }) }
  const cls = `vrow tap ${big ? 'big' : ''}`
  // обёртка раскрывается по высоте, когда новое видео «прилетает» из очереди
  return (
    <div className={`vwrap ${arr === 'hidden' ? 'closed' : ''}`}><div>
      <NavLink to={`/v/${v.id}`} data-vid={v.id} data-arrive={arr || undefined} className={({ isActive }) => `${cls} ${v.ready ? '' : 'pending'} ${isActive ? 'active' : ''}`} title={v.title} onClick={onPick} onContextMenu={ctx}>{body}</NavLink>
    </div></div>
  )
}
