import { useT } from '../i18n'
import { useMenu } from '../components/Menu'
import { useVideoMenu } from '../components/VideoMenu'
import { coverOf } from '../components/VideoRow'
import { IBack, IMore, IPlay, IClock, IHourglass } from '../components/Icons'
import { hello } from '../lib/hello'
import { fmt } from '../lib/time'

// Страница видео, у которого ещё нет конспекта: обложка, название, понятный статус
export default function Pending({ v, onBack }) {
  const t = useT()
  const menu = useMenu()
  const videoMenu = useVideoMenu()
  return (
    <div className="wrap">
      <div className="head"><div className="titles">
        <div className="hello"><span>{hello(t)} 👋</span></div>
        <h1>{v.title}</h1>
      </div>
      <div className="head-actions"><button className="pill-btn sq tap" onClick={(e) => { e.stopPropagation(); menu.open(e.currentTarget, videoMenu(v), { alignRight: true }) }} title={t('more')}><IMore /></button></div></div>
      <div className="meta">
        <a className="chip accent tap" href={v.url} target="_blank" rel="noreferrer"><IPlay /> {t('watch')}</a>
        {v.channel && <span className="chip">{v.channel}</span>}
        <span className="chip"><IClock /> {fmt(v.duration)}</span>
      </div>
      <div className="pend-cover" style={{ backgroundImage: `url("${coverOf(v)}")` }} />
      <div className="card pend"><span className="tile lg" style={{ '--tile': 'var(--warning)' }}><IHourglass /></span><div><h3>{t('pend.title')}</h3><p>{t('pend.text')}</p></div></div>
    </div>
  )
}
